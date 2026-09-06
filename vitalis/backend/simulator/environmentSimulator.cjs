const axios = require("axios");

const API_URL =
    "http://localhost:5000/api/environment/readings";

const LOGIN_URL =
    "http://localhost:5000/api/users/login";

const EMAIL = "test@vitalis.com";
const PASSWORD = "vitalis123";

let token = null;
let scenario = "NORMAL";
let step = 0;

async function login() {
    try {
        console.log("Authenticating environment simulator...");

        const response = await axios.post(
            LOGIN_URL,
            {
                email: EMAIL,
                password: PASSWORD
            }
        );

        token = response.data.token;

        console.log(
            "Environment simulator authenticated successfully."
        );

    } catch (error) {
        console.error(
            "Simulator login failed:",
            error.response?.data || error.message
        );

        process.exit(1);
    }
}

function generateReading() {

    step++;

    let temperature;
    let humidity;
    let aqi;
    let pm25;

    if (scenario === "NORMAL") {

        temperature =
            25 + Math.random() * 8;

        humidity =
            45 + Math.random() * 20;

        aqi =
            40 + Math.random() * 40;

        pm25 =
            20 + Math.random() * 15;

    } else if (scenario === "HEATWAVE") {

        temperature =
            38 + Math.random() * 7;

        humidity =
            55 + Math.random() * 20;

        aqi =
            80 + Math.random() * 50;

        pm25 =
            35 + Math.random() * 20;

    } else if (scenario === "POLLUTION") {

        temperature =
            28 + Math.random() * 5;

        humidity =
            55 + Math.random() * 15;

        aqi =
            Math.min(350, 150 + step * 5);

        pm25 =
            Math.min(250, 80 + step * 3);
    }

    return {
        temperature:
            Number(temperature.toFixed(1)),

        humidity:
            Number(humidity.toFixed(1)),

        aqi:
            Number(aqi.toFixed(1)),

        pm25:
            Number(pm25.toFixed(1)),

        event: scenario
    };
}

async function sendReading() {

    if (!token) {
        console.log(
            "No authentication token available."
        );

        return;
    }

    const reading = generateReading();

    try {

        await axios.post(
            API_URL,
            reading,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"
                }
            }
        );

        console.log(
            `[${scenario}]`,
            `Temp: ${reading.temperature}°C`,
            `Humidity: ${reading.humidity}%`,
            `AQI: ${reading.aqi}`,
            `PM2.5: ${reading.pm25}`
        );

    } catch (error) {

        console.error(
            "Failed to send environment reading:",
            error.response?.data ||
            error.message
        );

        if (error.response?.status === 401) {
            console.error(
                "Authentication token is invalid or expired."
            );

            process.exit(1);
        }
    }
}

async function start() {

    console.log(
        "VITALIS Environment Sensor Simulator"
    );

    console.log(
        "Scenario:",
        scenario
    );

    await login();

    await sendReading();

    setInterval(
        sendReading,
        3000
    );
}

start();