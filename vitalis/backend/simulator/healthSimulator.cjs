const axios = require("axios");

const BASE_URL = process.env.VITALIS_API_URL || "http://localhost:5000/api";
const EMAIL = process.env.VITALIS_EMAIL || "test@vitalis.com";
const PASSWORD = process.env.VITALIS_PASSWORD || "vitalis123";
const INTERVAL_MS = 3000;

const scenarios = {
    GOOD: {
        heartRate: [68, 80], spo2: [97, 99], bodyTemperature: [36.4, 37.0], activity: [45, 75]
    },
    MODERATE: {
        heartRate: [82, 94], spo2: [95, 97], bodyTemperature: [37.0, 37.4], activity: [30, 60]
    },
    ELEVATED: {
        heartRate: [96, 110], spo2: [91, 94], bodyTemperature: [37.5, 38.0], activity: [15, 45]
    },
    HIGH_RISK: {
        heartRate: [116, 130], spo2: [87, 91], bodyTemperature: [38.1, 39.0], activity: [5, 25]
    },
    EARLY_WARNING: {
        heartRate: [0, 0], spo2: [0, 0], bodyTemperature: [0, 0], activity: [0, 0]
    }
};

const selectedScenario = (process.env.SCENARIO || "GOOD").toUpperCase();

if (selectedScenario !== "CYCLE" && !scenarios[selectedScenario]) {
    throw new Error(`Unknown SCENARIO: ${selectedScenario}. Use GOOD, MODERATE, ELEVATED, HIGH_RISK, EARLY_WARNING, or CYCLE.`);
}

let token = null;
let scenarioIndex = 0;
let readingsInScenario = 0;
let earlyWarningStep = 0;
const scenarioNames = ["GOOD", "MODERATE", "ELEVATED", "HIGH_RISK"];

function random(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function activeScenarioName() {
    return selectedScenario === "CYCLE"
        ? scenarioNames[scenarioIndex]
        : selectedScenario;
}

function generateReading() {
    const scenarioName = activeScenarioName();

    // Each reading worsens slightly. The dashboard's existing trend logic
    // projects that slope forward five minutes for the jury demonstration.
    if (scenarioName === "EARLY_WARNING") {
        earlyWarningStep = Math.min(earlyWarningStep + 1, 12);

        return {
            scenarioName,
            heartRate: 76 + earlyWarningStep * 3,
            spo2: Number(Math.max(92, 98 - earlyWarningStep * 0.45).toFixed(1)),
            bodyTemperature: Number(Math.min(38.3, 36.6 + earlyWarningStep * 0.14).toFixed(1)),
            activity: Math.max(20, 62 - earlyWarningStep * 3)
        };
    }

    const range = scenarios[scenarioName];

    return {
        scenarioName,
        heartRate: random(...range.heartRate),
        spo2: random(...range.spo2),
        bodyTemperature: random(...range.bodyTemperature),
        activity: random(...range.activity)
    };
}

async function login() {
    const response = await axios.post(`${BASE_URL}/users/login`, {
        email: EMAIL,
        password: PASSWORD
    });

    token = response.data.token;
    console.log("Health simulator authenticated successfully.");
}

async function sendHealthReading() {
    const reading = generateReading();
    const { scenarioName, ...healthReading } = reading;

    try {
        await axios.post(`${BASE_URL}/health/readings`, healthReading, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(
            `[${scenarioName}] HR: ${reading.heartRate} BPM | ` +
            `SpO2: ${reading.spo2}% | Temp: ${reading.bodyTemperature}°C | ` +
            `Activity: ${reading.activity}`
        );

        if (selectedScenario === "CYCLE") {
            readingsInScenario++;
            if (readingsInScenario === 5) {
                scenarioIndex = (scenarioIndex + 1) % scenarioNames.length;
                readingsInScenario = 0;
            }
        }
    } catch (error) {
        console.error("Health reading failed:", error.response?.data || error.message);
    }
}

async function start() {
    console.log("VITALIS Health Sensor Simulator");
    console.log(`Scenario: ${selectedScenario}`);
    console.log("Starting live health stream...");

    await login();
    await sendHealthReading();
    setInterval(sendHealthReading, INTERVAL_MS);
}

start().catch((error) => {
    console.error("Simulator failed to start:", error.response?.data || error.message);
    process.exit(1);
});
