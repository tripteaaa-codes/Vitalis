import express from "express";
import prisma from "../config/prisma.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
    "/readings",
    authenticateToken,
    async (req, res) => {
        try {
            const {
                temperature,
                humidity,
                aqi,
                pm25,
                event
            } = req.body;

            const userId = req.user.userId;

            const reading =
                await prisma.environmentReading.create({
                    data: {
                        userId,
                        temperature,
                        humidity,
                        aqi,
                        pm25,
                        event
                    }
                });

            res.status(201).json({
                message:
                    "Environment reading saved successfully",
                reading
            });

        } catch (error) {
            console.error(
                "Environment reading error:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to record environment reading",
                details: error.message
            });
        }
    }
);

router.get(
    "/readings",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.userId;

            const readings =
                await prisma.environmentReading.findMany({
                    where: {
                        userId
                    },
                    orderBy: {
                        timestamp: "desc"
                    },
                    take: 20
                });

            res.json({
                count: readings.length,
                readings
            });

        } catch (error) {
            console.error(
                "Fetch environment readings error:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to fetch environment readings",
                details: error.message
            });
        }
    }
);

export default router;