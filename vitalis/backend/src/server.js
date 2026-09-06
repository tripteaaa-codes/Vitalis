import express from "express";
import cors from "cors";
import "dotenv/config";

import healthRoutes from "./routes/healthRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import environmentRoutes from "./routes/environmentRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api/health", healthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/environment", environmentRoutes); 
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
    res.json({
        project: "VITALIS",
        status: "online",
        message: "AI-Powered Personal Health Digital Twin"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "VITALIS Backend"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`VITALIS backend running on port ${PORT}`);
});