const axios = require("axios");

const API_URL = "http://localhost:5000/api/environment/readings";

const USER_ID = "e133e0f7-5f25-4c71-a012-59ddd3cc3309";

let scenario = "NORMAL";
let step = 0;

function generateReading() {
    step++;

    let ambientTemperature;
    let humidity;
    let aqi;
    let pm25;

    if (scenario === "NORMAL") {
        ambientTemperature = 25 + Math.random() * 8;
        humidity = 45 + Math.random() * 20;
        aqi = 40 + Math.random() * 40;
        pm25 = 20 + Math.random() * 15;
    }

    else if (scenario === "POLLUTION") {
        ambientTemperature = 28 + Math.random() * 5;
        humidity = 55 + Math.random() * 15;
        aqi = 150 + step * 15;
        pm25 = 80 + step * 8;
    }

    else if (scenario === "POLLUTION") {
        ambidentTemperature = 28 + Math.random() * 5;
        humidity = 55 + Math.random() * 15;
        aqi = 150 + step * 15;
        pm25 = 80 + step * 8;
    }

    return {
        userId: USER_ID,
        ambientTemperature: Number(ambientTemperature.toFixed(1)),
        humidity: Number(humidity.toFixed(1)),
        aqi: Number(aqi.toFixed(1)),
        pm25: Number(pm25.toFixed(1)),
    };
}

async function sendReading() {
    const reading = generateReading();

    console.log("Sending:", reading);

    try {
        await axios.post(
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
            `Temp: ${reading.ambientTemperature}°C`,
            `Humidity: ${reading.humidity}%`,
            `AQI: ${reading.aqi}`,
            `PM2.5: ${reading.pm25}`
        );

    } catch (error) {
        console.error(
            "Failed to send environment reading:",
            error.response?.data || error.message
        );
    }    
}

console.log("VITALIS Environment Sensor Simulator");
console.log("Scenario:", scenario);
console.log("User:", USER_ID);

sendReading();

setInterval(sendReading, 3000);


