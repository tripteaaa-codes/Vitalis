import express from "express";
import prisma from "../config/prisma.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

async function getLiveEnvironment() {
    const weatherResponse = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=12.9716&longitude=77.5946&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FKolkata"
    );

    const airResponse = await fetch(
        "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=12.9716&longitude=77.5946&current=pm2_5,us_aqi&timezone=Asia%2FKolkata"
    );

    if (!weatherResponse.ok || !airResponse.ok) {
        throw new Error("Unable to fetch live environment data");
    }

    const weather = await weatherResponse.json();
    const air = await airResponse.json();

    const temperature = weather.current.temperature_2m;
    const humidity = weather.current.relative_humidity_2m;
    const aqi = air.current.us_aqi;
    const pm25 = air.current.pm2_5;

    let score = 100;

    if (aqi <= 50) score -= 0;
    else if (aqi <= 100) score -= 15;
    else if (aqi <= 150) score -= 30;
    else if (aqi <= 200) score -= 45;
    else if (aqi <= 300) score -= 60;
    else score -= 80;

    if (temperature > 35) score -= 15;
    else if (temperature > 32) score -= 8;

    if (humidity > 80 || humidity < 25) score -= 8;

    score = Math.max(0, Math.min(100, score));

    let rating;

    if (score >= 90) rating = "EXCELLENT";
    else if (score >= 75) rating = "GOOD";
    else if (score >= 55) rating = "MODERATE";
    else if (score >= 35) rating = "POOR";
    else rating = "VERY POOR";

    return {
        location: "Bengaluru",
        ambientTemperature: temperature,
        humidity,
        aqi,
        pm25,
        environmentScore: score,
        rating,
        event: null,
        source: "Open-Meteo / CAMS",
        live: true,
        timestamp: new Date().toISOString()
    };
}

router.get("/live", async (req, res) => {
    try {
        const environment = await getLiveEnvironment();

        res.json(environment);
    } catch (error) {
        console.error("Live environment error:", error);

        res.status(500).json({
            error: "Failed to fetch live environment data",
            details: error.message
        });
    }
});

router.post(
    "/readings",
    authenticateToken,
    async (req, res) => {
        try {
            const {
                ambientTemperature,
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
                        ambientTemperature:
                            ambientTemperature ?? temperature,
                        humidity,
                        aqi,
                        pm25,
                        event
                    }
                });

            res.status(201).json({
                message: "Environment reading saved successfully",
                reading
            });
        } catch (error) {
            console.error(
                "Environment reading error:",
                error
            );

            res.status(500).json({
                error: "Failed to record environment reading",
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
                error: "Failed to fetch environment readings",
                details: error.message
            });
        }
    }
);

export default router;