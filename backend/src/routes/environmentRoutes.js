import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();

router.post("/readings", async(req, res) => {
    try {
        console.log("Incoming health body:", req.body);

        const body = req.body || {};

        const {
            userId,
            ambientTemperature,
            humidity,
            aqi,
            pm25
        } = body;

        if(!userId) {
            return res.status(400).json({
                error: "userId is required"
            });
        }

        const reading = await prisma.environmentReading.create({
            data: {
                userId,
                ambientTemperature,
                humidity,
                aqi,
                pm25
            }
        });

        res.status(201).json({
            message: "Environment reading saved successfully",
            reading
        });

    } catch (error) {
        console.error("Environment reading error:", error);

        res.status(500).json({
            error: "Failed to record environment reading",
            details: error.message,
            code: error.code || null
        });
    }
});

router.get("/readings/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const readings = await prisma.environmentReading.findMany({
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
        console.error("Fetch environment readings error:", error);

        res.status(500).json({
            error: "Failed to fetch environment readings",
            details: error.message
        });
    }
});

export default router;