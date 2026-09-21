import express from "express";
import twilio from "twilio";

const router = express.Router();

const client =
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ? twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        )
        : null;

let emergencyMessage =
    "VITALIS emergency alert. A critical health risk has been detected. Please check the user immediately.";

router.post("/call", async (req, res) => {
    try {
        if (!client) {
            return res.status(500).json({
                error: "Twilio is not configured."
            });
        }

        const {
            source = "AUTOMATIC",
            reason = "Critical health risk detected.",
            health = {},
            environment = {},
            risk = {}
        } = req.body || {};

        const to = process.env.EMERGENCY_CONTACT_NUMBER;
        const from = process.env.TWILIO_PHONE_NUMBER;

        if (!to || !from) {
            return res.status(500).json({
                error: "Emergency contact number or Twilio phone number is missing."
            });
        }

        const heartRate = health?.heartRate ?? "unavailable";
        const spo2 = health?.spo2 ?? "unavailable";

        const temperature =
            health?.bodyTemperature ??
            environment?.ambientTemperature ??
            environment?.temperature ??
            "unavailable";

        const aqi = environment?.aqi ?? "unavailable";

        const riskScore =
            risk?.riskScore !== undefined &&
                risk?.riskScore !== null
                ? Number(risk.riskScore).toFixed(1)
                : "unavailable";

        emergencyMessage =
            source === "MANUAL" || source === "MANUAL_CALL"
                ? `VITALIS emergency demonstration activated. ${reason} Current heart rate is ${heartRate} beats per minute. Blood oxygen is ${spo2} percent. Temperature is ${temperature} degrees Celsius. Air quality index is ${aqi}. AI risk score is ${riskScore} out of 100. Please check the user immediately.`
                : `VITALIS emergency alert. Critical health risk has been detected. ${reason} Current heart rate is ${heartRate} beats per minute. Blood oxygen is ${spo2} percent. Temperature is ${temperature} degrees Celsius. Air quality index is ${aqi}. AI risk score is ${riskScore} out of 100. Please check the user immediately.`;

        const twimlUrl =
            `${process.env.PUBLIC_BACKEND_URL}/api/emergency/twiml`;

        console.log("TWILIO CALL DEBUG");
        console.log("TO:", to);
        console.log("FROM:", from);
        console.log("URL:", twimlUrl);

        const call = await client.calls.create({
            to,
            from,
            url: twimlUrl
        });

        console.log(
            `VITALIS emergency call started: ${call.sid}`
        );

        res.json({
            success: true,
            callSid: call.sid,
            status: call.status,
            source
        });
    } catch (error) {
        console.error(
            "VITALIS emergency call error:",
            error
        );

        res.status(500).json({
            error: "Failed to initiate emergency call",
            details: error.message
        });
    }
});

router.post("/twiml", (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();

    twiml.pause({
        length: 1
    });

    twiml.say(
        {
            voice: "alice",
            language: "en-IN"
        },
        emergencyMessage
    );

    twiml.pause({
        length: 1
    });

    twiml.say(
        {
            voice: "alice",
            language: "en-IN"
        },
        "This is an automated VITALIS emergency notification."
    );

    res.type("text/xml");
    res.send(twiml.toString());
});

export default router;