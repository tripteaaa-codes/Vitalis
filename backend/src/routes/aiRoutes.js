import express from "express";
import axios from "axios";

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

export default router;