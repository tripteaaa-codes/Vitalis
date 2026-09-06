import express from "express";
import prisma from "../config/prisma.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/readings", authenticateToken, async (req, res) => {
    try {
        const { heartRate, spo2, bodyTemperature, activity } = req.body;
        const userId = req.user.userId || req.user.id;

        const reading = await prisma.healthReading.create({
            data: {
                userId,
                heartRate,
                spo2,
                bodyTemperature,
                activity
            }
        });

        res.status(201).json({
            message: "Health reading saved successfully",
            reading
        });
    } catch (error) {
        console.error("Health reading error:", error);
        res.status(500).json({
            error: "Failed to record health reading",
            details: error.message
        });
    }
});

router.get(
    "/readings",
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;

            const readings =
                await prisma.healthReading.findMany({
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
                "Fetch health readings error:",
                error
            );

            res.status(500).json({
                error: "Failed to fetch health readings",
                details: error.message
            });
        }
    }
);

export default router;