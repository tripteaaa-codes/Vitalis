const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

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