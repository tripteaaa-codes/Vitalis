import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { name, email, age } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                error: "Name and email are required"
            });
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                age
            }
        });

        res.status(201).json({
            message: "VITALIS user created",
            user
        });

    } catch (error) {
        console.log("User creation error:", error);

        res.status(500).json({
            error: "Failed to create user"
        });
    }
});

export default router;