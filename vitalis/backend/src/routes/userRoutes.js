import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, age } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Name, email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: {
                email: normalizedEmail
            }
        });

        if (existingUser) {
            return res.status(409).json({
                error: "An account with this email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                age: age ? Number(age) : null,
                authCredential: {
                    create: {
                        passwordHash
                    }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                age: true,
                createdAt: true
            }
        });

        res.status(201).json({
            message: "VITALIS account created successfully",
            user
        });
    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            error: "Registration failed",
            details: error.message
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: {
                email: normalizedEmail
            },
            include: {
                authCredential: true
            }
        });

        if (!user || !user.authCredential) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.authCredential.passwordHash
        );

        if (!validPassword) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                age: user.age
            }
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            error: "Login failed",
            details: error.message
        });
    }
});

router.get("/me", authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user.userId
            },
            select: {
                id: true,
                name: true,
                email: true,
                age: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        res.json({
            user
        });
    } catch (error) {
        console.error("Profile error:", error);

        res.status(500).json({
            error: "Failed to load profile"
        });
    }
});

export default router;