import express from "express";
import axios from "axios";
import prisma from "../config/prisma.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/predict", async (req, res) => {
    try {
        const response = await axios.post(
            "http://127.0.0.1:8001/predict",
            req.body
        );

        res.json(response.data);
    } catch (error) {
        console.error("AI prediction error:", error.message);

        res.status(500).json({
            error: "AI prediction service unavailable",
            details: error.message
        });
    }
});

router.post("/analyze", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const response = await axios.post(
            "http://127.0.0.1:8001/predict",
            {
                userId,
                health: req.body.health,
                environment: req.body.environment
            }
        );

        const aiResult = response.data;
        const risk = aiResult.risk;

        const prediction = await prisma.riskPrediction.create({
            data: {
                userId,
                riskScore: risk.riskScore,
                riskLevel: risk.riskLevel,
                explanation: JSON.stringify(
                    risk.explanation
                )
            }
        });

        res.status(201).json({
            message: "Live risk analysis completed",
            prediction,
            ai: aiResult
        });
    } catch (error) {
        console.error("Risk analysis error:", error);

        res.status(500).json({
            error: "Failed to analyze health risk",
            details: error.message
        });
    }
});

router.get("/history", authenticateToken, async (req, res) => {
    try {
        const predictions = await prisma.riskPrediction.findMany({
            where: {
                userId: req.user.userId
            },
            orderBy: {
                predictedAt: "desc"
            },
            take: 50
        });

        res.json({
            count: predictions.length,
            predictions
        });
    } catch (error) {
        console.error("Risk history error:", error);

        res.status(500).json({
            error: "Failed to fetch risk history",
            details: error.message
        });
    }
});

export default router;