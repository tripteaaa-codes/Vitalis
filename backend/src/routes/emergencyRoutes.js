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

router.post("/call", async (req, res) => {
    try {
        if (!client) {
            return res.status(500).json({
                error: "Twilio is not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to backend .env."
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
        const publicUrl = process.env.TWILIO_WEBHOOK_URL;

        if (!to || !from) {
            return res.status(500).json({
                error: "Emergency contact or Twilio phone number is not configured."
            });
        }

        if (!publicUrl) {
            return res.status(500).json({
                error: "TWILIO_WEBHOOK_URL is not configured in backend .env."
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

        const riskScore = Number(risk?.riskScore || 0).toFixed(1);

        const webhookUrl = new URL(
            `${publicUrl.replace(/\/$/, "")}/api/emergency/twiml`
        );

        webhookUrl.searchParams.set("source", source);
        webhookUrl.searchParams.set("reason", reason);
        webhookUrl.searchParams.set("heartRate", String(heartRate));
        webhookUrl.searchParams.set("spo2", String(spo2));
        webhookUrl.searchParams.set("temperature", String(temperature));
        webhookUrl.searchParams.set("aqi", String(aqi));
        webhookUrl.searchParams.set("riskScore", String(riskScore));

        const call = await client.calls.create({
            to,
            from,
            url: webhookUrl.toString(),
            method: "POST"
        });

        console.log(`VITALIS emergency call started: ${call.sid}`);

        res.json({
            success: true,
            callSid: call.sid,
            status: call.status,
            message: "Emergency caregiver call initiated."
        });
    } catch (error) {
        console.error("VITALIS emergency call error:", error);

        res.status(500).json({
            error: "Failed to initiate emergency call",
            details: error.message
        });
    }
});

router.post("/twiml", (req, res) => {
    try {
        const source = req.query.source || "AUTOMATIC";
        const reason =
            req.query.reason ||
            "Critical health risk detected.";

        const heartRate =
            req.query.heartRate ||
            "unavailable";

        const spo2 =
            req.query.spo2 ||
            "unavailable";

        const temperature =
            req.query.temperature ||
            "unavailable";

        const aqi =
            req.query.aqi ||
            "unavailable";

        const riskScore =
            req.query.riskScore ||
            "0.0";

        const twiml = new twilio.twiml.VoiceResponse();

        const message =
            source === "MANUAL" || source === "MANUAL_CALL"
                ? `VITALIS emergency demonstration activated. ${reason} Current heart rate is ${heartRate} beats per minute. Blood oxygen is ${spo2} percent. Temperature is ${temperature} degrees Celsius. Air quality index is ${aqi}. AI risk score is ${riskScore} out of 100. Please check the user immediately.`
                : `VITALIS emergency alert. Critical health risk has been detected. ${reason} Current heart rate is ${heartRate} beats per minute. Blood oxygen is ${spo2} percent. Temperature is ${temperature} degrees Celsius. Air quality index is ${aqi}. AI risk score is ${riskScore} out of 100. Please check the user immediately.`;

        twiml.pause({
            length: 1
        });

        twiml.say(
            {
                voice: "alice",
                language: "en-IN"
            },
            message
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
    } catch (error) {
        console.error("VITALIS TwiML error:", error);

        res.status(500).type("text/xml").send(`
            <Response>
                <Say voice="alice" language="en-IN">
                    VITALIS emergency alert. Please contact the user immediately.
                </Say>
            </Response>
        `);
    }
});

export default router;

