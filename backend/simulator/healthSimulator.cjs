const axios = require("axios");

const API_URL = "http://localhost:5000/api/health/readings";

const USER_ID = "e133e0f7-5f25-4c71-a012-59ddd3cc3309";

let scenario = "NORMAL";
let step = 0;

function generateReading() {
    step++;

    let heartRate;
    let spo2;
    let bodyTemperature;
    let activity;

    if (scenario === "NORMAL") {
        heartRate = 70 + Math.random() * 15;
        spo2 = 97 + Math.random() * 2;
        bodyTemperature = 36.5 + Math.random() * 0.5;
        activity = 20 + Math.random() * 30;
    }

    else if (scenario === "HEATWAVE") {
        heartRate = 80 + step * 7 + Math.random() * 5;
        spo2 = 98 - step * 0.4;
        bodyTemperature = 36.8 + step * 0.35;
        activity = 40 + step * 5;
    }

    else if (scenario === "RECOVERY") {
        heartRate = Math.max(72, 115 - step * 6);
        spo2 = Math.min(99, 94 + step * 0.8);
        bodyTemperature = Math.max(36.6, 38.5 - step * 0.3);
        activity = Math.max(20, 70 - step * 5);
    }

    return {
        userId: USER_ID,
        heartRate: Number(heartRate.toFixed(1)),
        spo2: Number(spo2.toFixed(1)),
        bodyTemperature: Number(bodyTemperature.toFixed(1)),
        activity: Number(activity.toFixed(1))
    };
}

async function sendReading() {
    const reading = generateReading();

    console.log("Sending:", reading);

    try {
        const response = await axios.post(
            API_URL,
            reading,
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(
            `[${scenario}]`,
            `HR: ${reading.heartRate}`,
            `| SpO2: ${reading.spo2}`,
            `| Temp: ${reading.bodyTemperature}`,
            `| Activity: ${reading.activity}`
        );

    } catch (error) {
        console.error(
            "Failed to send reading:",
            error.response?.data || error.message
        );
    }
}

console.log("VITALIS Health Sensor Simulator");
console.log("Scenario:", scenario);
console.log("User:", USER_ID);
console.log("-----------------------------------");

sendReading();

setInterval(sendReading, 3000);