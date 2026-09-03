import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();

router.post("/readings", async (req, res) => {
    try {
        console.log("Incoming health body:", req.body);

        const body = req.body || {};

        const {
            userId,
            heartRate,
            spo2,
            bodyTemperature,
            activity
        } = body;

        if (!userId) {
            return res.status(400).json({
                error: "userId is required"
            });
        }

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
            details: error.message,
            code: error.code || null
        });
    }
});

router.get("/readings/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const readings = await prisma.healthReading.findMany({
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
        console.error("Fetch health readings error:", error);

        res.status(500).json({
            error: "Failed to fetch health readings",
            details: error.message
        });
    }
});

export default router;