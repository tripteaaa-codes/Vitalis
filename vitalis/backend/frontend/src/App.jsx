import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import {
    login,
    register,
    getCurrentUser,
    getHealthReadings,
    getRiskHistory,
    analyzeRisk
} from "./api";
import "./App.css";
import "leaflet/dist/leaflet.css";

const BACKEND_URL = "http://localhost:5000";

const menu = [
    { title: "OVERVIEW", items: ["Dashboard", "Health", "Environment", "AI Risk"] },
    { title: "INTELLIGENCE", items: ["Digital Twin", "Risk Analysis", "Health History"] },
    { title: "RESILIENCE", items: ["Safety Mode", "Safety Map", "Emergency Help"] },
    { title: "SYSTEM", items: ["Device", "Settings"] }
];

function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        restoreSession();
    }, []);

    async function restoreSession() {
        const token = localStorage.getItem("vitalis_token");
        if (!token) {
            setAuthLoading(false);
            return;
        }

        try {
            const response = await getCurrentUser();
            setUser(response.user);
        } catch {
            localStorage.removeItem("vitalis_token");
            setUser(null);
        } finally {
            setAuthLoading(false);
        }
    }

    function handleLogin(data) {
        localStorage.setItem("vitalis_token", data.token);
        setUser(data.user);
    }

    function handleLogout() {
        localStorage.removeItem("vitalis_token");
        setUser(null);
    }

    if (authLoading) {
        return (
            <div className="app-loader">
                <div className="loader-brand">VITALIS</div>
                <div className="loader-text">Securing Health Intelligence</div>
                <div className="loader-bar"><span></span></div>
            </div>
        );
    }

    if (!user) return <AuthScreen onLogin={handleLogin} />;

    return <DashboardApp user={user} onLogout={handleLogout} />;
}

function AuthScreen({ onLogin }) {
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({ name: "", email: "", password: "", age: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    function updateField(event) {
        setForm({ ...form, [event.target.name]: event.target.value });
        setError("");
        setSuccess("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            if (mode === "register") {
                await register({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    age: form.age || null
                });

                setSuccess("Account created successfully. You can now sign in.");
                setMode("login");
                setForm({ name: "", email: form.email, password: "", age: "" });
            } else {
                const data = await login({
                    email: form.email,
                    password: form.password
                });
                onLogin(data);
            }
        } catch (err) {
            setError(err.response?.data?.error || "Unable to connect to VITALIS.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-shell">
                <div className="auth-brand-panel">
                    <div>
                        <div className="auth-brand"><span>V</span>VITALIS</div>
                        <div className="auth-label">PERSONAL HEALTH INTELLIGENCE</div>
                        <h1>
                            Understand your health<br />
                            before it becomes<br />
                            an emergency.
                        </h1>
                        <p>
                            AI-powered continuous health monitoring that combines
                            personal physiological patterns with environmental conditions.
                        </p>
                    </div>

                    <div className="auth-features">
                        <div><strong>01</strong> PERSONAL BASELINE</div>
                        <div><strong>02</strong> ENVIRONMENTAL INTELLIGENCE</div>
                        <div><strong>03</strong> EARLY RISK DETECTION</div>
                    </div>
                </div>

                <div className="auth-form-panel">
                    <div className="auth-form-header">
                        <div className="eyebrow">VITALIS SECURE ACCESS</div>
                        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
                        <p>
                            {mode === "login"
                                ? "Sign in to access your personal health intelligence."
                                : "Create a secure personal profile for VITALIS monitoring."}
                        </p>
                    </div>

                    {error && <div className="auth-message error">{error}</div>}
                    {success && <div className="auth-message success">{success}</div>}

                    <form onSubmit={handleSubmit}>
                        {mode === "register" && (
                            <>
                                <label>
                                    FULL NAME
                                    <input name="name" value={form.name} onChange={updateField}
                                        placeholder="Enter your name" required />
                                </label>
                                <label>
                                    AGE
                                    <input type="number" name="age" value={form.age} onChange={updateField}
                                        placeholder="Optional" min="1" max="120" />
                                </label>
                            </>
                        )}

                        <label>
                            EMAIL ADDRESS
                            <input type="email" name="email" value={form.email} onChange={updateField}
                                placeholder="you@example.com" required />
                        </label>

                        <label>
                            PASSWORD
                            <input type="password" name="password" value={form.password} onChange={updateField}
                                placeholder="Minimum 6 characters" minLength="6" required />
                        </label>

                        <button className="auth-submit" type="submit" disabled={loading}>
                            {loading
                                ? "AUTHENTICATING..."
                                : mode === "login"
                                    ? "SIGN IN TO VITALIS"
                                    : "CREATE VITALIS ACCOUNT"}
                        </button>
                    </form>

                    <div className="auth-switch">
                        {mode === "login" ? "Don't have a VITALIS account?" : "Already have a VITALIS account?"}
                        <button onClick={() => {
                            setMode(mode === "login" ? "register" : "login");
                            setError("");
                            setSuccess("");
                        }}>
                            {mode === "login" ? "Create account" : "Sign in"}
                        </button>
                    </div>

                    <div className="auth-security">
                        AUTHENTICATED SESSION · ENCRYPTED CREDENTIALS
                    </div>
                </div>
            </div>
        </div>
    );
}

function getRiskReasons(health, environment, score, projectedScore = score) {
    const reasons = [];
    const heartRate = Number(health?.heartRate || 0);
    const spo2 = Number(health?.spo2 || 0);
    const activity = String(health?.activity || "").toLowerCase();
    const bodyTemperature = Number(health?.bodyTemperature || 0);
    const temperature = Number(environment?.ambientTemperature ?? environment?.temperature ?? 0);
    const humidity = Number(environment?.humidity || 0);
    const aqi = Number(environment?.aqi || 0);
    const pm25 = Number(environment?.pm25 || 0);

    if (heartRate >= 120) reasons.push(`Heart rate is elevated at ${Math.round(heartRate)} BPM.`);
    else if (heartRate >= 105 && activity.includes("high")) reasons.push(`Heart rate is elevated during high activity at ${Math.round(heartRate)} BPM.`);
    if (spo2 > 0 && spo2 <= 92) reasons.push(`SpO₂ is low at ${Math.round(spo2)}%.`);
    else if (spo2 > 0 && spo2 <= 94) reasons.push(`SpO₂ is below the preferred range at ${Math.round(spo2)}%.`);
    if (bodyTemperature >= 38) reasons.push(`Body temperature is elevated at ${bodyTemperature.toFixed(1)} °C.`);
    if (temperature >= 40) reasons.push(`Ambient temperature is extreme at ${temperature.toFixed(1)} °C.`);
    else if (temperature >= 35) reasons.push(`Ambient temperature is high at ${temperature.toFixed(1)} °C.`);
    if (humidity >= 85 && temperature >= 30) reasons.push(`High humidity (${Math.round(humidity)}%) may increase heat stress.`);
    if (aqi >= 200) reasons.push(`AQI is very high at ${Math.round(aqi)}.`);
    else if (aqi >= 150) reasons.push(`AQI is high at ${Math.round(aqi)}.`);
    if (pm25 >= 55) reasons.push(`PM2.5 exposure is elevated at ${pm25.toFixed(1)} μg/m³.`);
    if (projectedScore > score + 2) reasons.push(`The AI risk trend is rising and projects a higher risk score within the next 5 minutes.`);
    if (!reasons.length && score >= 40) reasons.push(`Multiple health and environmental signals are contributing to the combined AI risk score.`);
    if (!reasons.length) reasons.push(`No single threshold dominates; the AI is combining the available health and environmental signals.`);

    return reasons;
}


function DashboardApp({ user, onLogout }) {
    const [page, setPage] = useState("Dashboard");
    const [health, setHealth] = useState(null);
    const [environment, setEnvironment] = useState(null);
    const [risk, setRisk] = useState(null);
    const [riskHistory, setRiskHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState("CHECKING");
    const [lastUpdated, setLastUpdated] = useState(null);
    const accessibilityNeed = localStorage.getItem("vitalis_accessibility_need") === "yes";
    const [voiceMode, setVoiceMode] = useState(
        accessibilityNeed || localStorage.getItem("vitalis_voice_mode") !== "false"
    );
    const [notificationsEnabled, setNotificationsEnabled] =
    useState(localStorage.getItem("vitalis_notifications") === "true");
    const [alertMessage, setAlertMessage] = useState("");
    const lastAlertLevelRef = useRef("");
    const lastEnvironmentAlertRef = useRef("");
    const earlyWarningRef = useRef("");
    const riskSamplesRef = useRef([]);
    const environmentSamplesRef = useRef([]);
    const voiceReadyRef = useRef(false);
    const emergencyActiveRef = useRef(false);
    const [emergencyActive, setEmergencyActive] = useState(false);
    const [emergencyReason, setEmergencyReason] = useState("");
    const [emergencyStartedAt, setEmergencyStartedAt] = useState(null);
    const [emergencyCallStatus, setEmergencyCallStatus] = useState("");
    const [demoMode, setDemoMode] = useState(false);
    const [demoScenario, setDemoScenario] = useState("SAFE");
    const [demoAutoCycle, setDemoAutoCycle] = useState(false);
    const [preEmergencyActive, setPreEmergencyActive] = useState(false);
    const [preEmergencyCountdown, setPreEmergencyCountdown] = useState(0);
    const [earlyWarning, setEarlyWarning] = useState(null);
    const preEmergencyTimerRef = useRef(null);
    const preEmergencyIntervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (preEmergencyTimerRef.current) clearTimeout(preEmergencyTimerRef.current);
            if (preEmergencyIntervalRef.current) clearInterval(preEmergencyIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        fetchLiveData();
        const timer = setInterval(fetchLiveData, 5000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let notificationAttempted = false;

        const unlockAccessibility = async () => {
            voiceReadyRef.current = true;

            if ("speechSynthesis" in window) {
                window.speechSynthesis.getVoices();
            }

            if (!notificationAttempted && "Notification" in window) {
                notificationAttempted = true;
                try {
                    if (Notification.permission === "default") {
                        const permission = await Notification.requestPermission();
                        const enabled = permission === "granted";
                        setNotificationsEnabled(enabled);
                        localStorage.setItem("vitalis_notifications", String(enabled));
                    } else if (Notification.permission === "granted") {
                        setNotificationsEnabled(true);
                        localStorage.setItem("vitalis_notifications", "true");
                    } else {
                        setNotificationsEnabled(false);
                        localStorage.setItem("vitalis_notifications", "false");
                    }
                } catch (error) {
                    console.error("Notification permission error:", error);
                }
            }
        };

        window.addEventListener("click", unlockAccessibility);
        window.addEventListener("keydown", unlockAccessibility);
        window.addEventListener("touchstart", unlockAccessibility);

        return () => {
            window.removeEventListener("click", unlockAccessibility);
            window.removeEventListener("keydown", unlockAccessibility);
            window.removeEventListener("touchstart", unlockAccessibility);
        };
    }, []);

    useEffect(() => {
        if (localStorage.getItem("vitalis_accessibility_need") === "yes") {
            setVoiceMode(true);
            localStorage.setItem("vitalis_voice_mode", "true");
        }
    }, []);

    function speak(message, force = false) {
        if (!force && !voiceMode) return;
        if (!("speechSynthesis" in window)) return;

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = "en-IN";
        utterance.rate = 0.92;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.cancel();

        try {
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Voice alert error:", error);
        }
    }

    async function enableNotifications() {
        if (!("Notification" in window)) {
            setAlertMessage("This browser does not support notifications.");
            return;
        }

        const permission = await Notification.requestPermission();
        const enabled = permission === "granted";
        setNotificationsEnabled(enabled);
        localStorage.setItem("vitalis_notifications", String(enabled));

        if (enabled) {
            new Notification("VITALIS", {
                body: "Health notifications are now enabled."
            });
        }
    }

    function notifyBrowser(title, body, critical = false) {
        if (
            "Notification" in window &&
            Notification.permission === "granted"
        ) {
            try {
                new Notification(title, {
                    body,
                    requireInteraction: critical,
                    tag: critical ? "vitalis-critical" : "vitalis-alert"
                });
                setNotificationsEnabled(true);
                localStorage.setItem("vitalis_notifications", "true");
            } catch (error) {
                console.error("Browser notification error:", error);
            }
        }
    }

    async function callEmergencyContact(source = "AUTOMATIC", reasonOverride = null, healthSnapshot = health, environmentSnapshot = environment, riskSnapshot = risk) {
        try {
            setEmergencyCallStatus("CALLING CAREGIVER...");

            const response = await fetch(`${BACKEND_URL}/api/emergency/call`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    source,
                    reason: reasonOverride || emergencyReason || "Critical health risk detected.",
                    health: healthSnapshot,
                    environment: environmentSnapshot,
                    risk: riskSnapshot
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Emergency call failed");
            }

            setEmergencyCallStatus(`CALL CONNECTED · ${data.callSid}`);
            speak("Emergency caregiver call has been initiated.", true);
            notifyBrowser(
                "VITALIS CAREGIVER CALL",
                "Emergency caregiver call has been initiated.",
                true
            );
        } catch (error) {
            console.error("VITALIS emergency call error:", error);
            setEmergencyCallStatus(`CALL FAILED · ${error.message}`);
            speak("Emergency caregiver call could not be initiated. Please use the emergency call button.", true);
        }
    }

    function cancelPreEmergency(reason = "Emergency warning cancelled.") {
        if (preEmergencyTimerRef.current) {
            clearTimeout(preEmergencyTimerRef.current);
            preEmergencyTimerRef.current = null;
        }
        if (preEmergencyIntervalRef.current) {
            clearInterval(preEmergencyIntervalRef.current);
            preEmergencyIntervalRef.current = null;
        }
        setPreEmergencyActive(false);
        setPreEmergencyCountdown(0);
        if (reason) {
            setAlertMessage(reason);
        }
    }

    function schedulePreEmergency(reason, healthSnapshot, environmentSnapshot, prediction) {
        if (emergencyActiveRef.current || preEmergencyActive || preEmergencyTimerRef.current) return;

        setPreEmergencyActive(true);
        setPreEmergencyCountdown(15);
        const message = `VITALIS PRE-EMERGENCY WARNING. AI predicts that a critical health state may occur in approximately 15 seconds. Caregiver notification is being prepared. ${getImmediateAdvice(healthSnapshot, environmentSnapshot, Number(prediction?.riskScore || 0))}`;
        setAlertMessage(message);
        speak(message, true);
        notifyBrowser("VITALIS PRE-EMERGENCY WARNING", message, true);

        let remaining = 15;
        preEmergencyIntervalRef.current = setInterval(() => {
            remaining -= 1;
            setPreEmergencyCountdown(Math.max(remaining, 0));
        }, 1000);

        preEmergencyTimerRef.current = setTimeout(async () => {
            if (preEmergencyIntervalRef.current) {
                clearInterval(preEmergencyIntervalRef.current);
                preEmergencyIntervalRef.current = null;
            }
            preEmergencyTimerRef.current = null;
            setPreEmergencyCountdown(0);
            setEmergencyReason(reason);
            setEmergencyCallStatus("CALLING CAREGIVER FROM PRE-EMERGENCY ALERT...");
            setAlertMessage("VITALIS is notifying the caregiver before the predicted critical event.");
            notifyBrowser("VITALIS CAREGIVER ALERT", "Caregiver notification initiated before predicted critical danger.", true);
            speak("VITALIS is notifying your caregiver before the predicted critical event.", true);
            await callEmergencyContact("PRE_EMERGENCY", reason, healthSnapshot, environmentSnapshot, prediction);
            setPreEmergencyActive(false);
        }, 15000);
    }

    function activateEmergency(
        reason,
        source = "AUTOMATIC",
        healthSnapshot = health,
        environmentSnapshot = environment,
        riskSnapshot = risk
    ) {
        if (emergencyActiveRef.current) return;

        emergencyActiveRef.current = true;

        setEmergencyActive(true);
        setEmergencyReason(reason);
        setEmergencyStartedAt(new Date());

        const message =
            source === "MANUAL"
                ? "VITALIS emergency simulation activated. Emergency protocol is now running."
                : `Critical danger detected. VITALIS emergency protocol activated. ${reason}`;

        setAlertMessage(message);
        setEmergencyCallStatus("STARTING EMERGENCY CALL...");

        speak(message, true);

        notifyBrowser(
            "VITALIS EMERGENCY",
            message,
            true
        );

        callEmergencyContact(
            source,
            reason,
            healthSnapshot,
            environmentSnapshot,
            riskSnapshot
        );

        const event = {
            type: "EMERGENCY_EVENT",
            source,
            reason,
            timestamp: new Date().toISOString(),

            health: healthSnapshot
                ? {
                    heartRate: healthSnapshot.heartRate,
                    spo2: healthSnapshot.spo2,
                    bodyTemperature: healthSnapshot.bodyTemperature,
                    activity: healthSnapshot.activity
                }
                : null,

            environment: environmentSnapshot
                ? {
                    temperature:
                        environmentSnapshot.ambientTemperature ??
                        environmentSnapshot.temperature,
                    humidity: environmentSnapshot.humidity,
                    aqi: environmentSnapshot.aqi,
                    pm25: environmentSnapshot.pm25
                }
                : null,

            risk: riskSnapshot
                ? {
                    riskScore: riskSnapshot.riskScore,
                    riskLevel: riskSnapshot.riskLevel
                }
                : null
        };

        const previousEvents = JSON.parse(
            localStorage.getItem("vitalis_emergency_events") || "[]"
        );

        localStorage.setItem(
            "vitalis_emergency_events",
            JSON.stringify(
                [event, ...previousEvents].slice(0, 20)
            )
        );
    }


    function getImmediateAdvice(health, environment, score) {
        const heartRate = Number(health?.heartRate || 0);
        const spo2 = Number(health?.spo2 || 0);
        const activity = String(health?.activity || "").toLowerCase();
        const temperature = Number(
            environment?.ambientTemperature ?? environment?.temperature ?? 0
        );
        const aqi = Number(environment?.aqi || 0);

        if (spo2 > 0 && spo2 <= 92) {
            return `Your blood oxygen is lower than expected. Please sit upright, stay calm, and seek help if you feel unwell.`;
        }

        if (heartRate >= 120 || (heartRate >= 105 && activity.includes("high"))) {
            return `Your heart rate is elevated. Please slow down, stop strenuous activity, and sit somewhere safe.`;
        }

        if (temperature >= 38 || (temperature >= 35 && heartRate >= 110)) {
            return `Heat-related stress may be developing. Please reduce activity, move to a cooler place, and drink water.`;
        }

        if (aqi >= 150) {
            return `Air quality is poor. Please reduce prolonged outdoor exposure and avoid strenuous activity.`;
        }

        if (score >= 40) {
            return `Your combined health and environmental risk is increasing. Please slow down, rest, and keep monitoring how you feel.`;
        }

        return `Your risk trend is starting to increase. Stay somewhere safe while VITALIS continues monitoring.`;
    }

    function processEarlyWarning(prediction, health, environment) {
        const score = Number(prediction?.riskScore || 0);
        const now = Date.now();

        riskSamplesRef.current = [
            ...riskSamplesRef.current.filter((sample) => now - sample.time <= 60000),
            { score, time: now }
        ].slice(-12);

        environmentSamplesRef.current = [
            ...environmentSamplesRef.current.filter((sample) => now - sample.time <= 120000),
            {
                temperature: Number(environment?.ambientTemperature ?? environment?.temperature ?? 0),
                aqi: Number(environment?.aqi || 0),
                time: now
            }
        ].slice(-24);

        if (score >= 70 || riskSamplesRef.current.length < 2) {
            if (score >= 70) {
                earlyWarningRef.current = "";
                setEarlyWarning(null);
            }
            return;
        }

        const samples = riskSamplesRef.current;
        const first = samples[0];
        const last = samples[samples.length - 1];
        const elapsedSeconds = Math.max((last.time - first.time) / 1000, 1);
        const risePerSecond = (last.score - first.score) / elapsedSeconds;
        const projectedScore = last.score + risePerSecond * 300;

        const envSamples = environmentSamplesRef.current;
        let projectedTemperature = Number(environment?.ambientTemperature ?? environment?.temperature ?? 0);
        let projectedAqi = Number(environment?.aqi || 0);

        if (envSamples.length >= 2) {
            const envFirst = envSamples[0];
            const envLast = envSamples[envSamples.length - 1];
            const envElapsed = Math.max((envLast.time - envFirst.time) / 1000, 1);
            projectedTemperature = envLast.temperature + ((envLast.temperature - envFirst.temperature) / envElapsed) * 300;
            projectedAqi = envLast.aqi + ((envLast.aqi - envFirst.aqi) / envElapsed) * 300;
        }

        const projectedEnvironmentRisk =
            projectedTemperature >= 40 || projectedAqi >= 200
                ? "CRITICAL"
                : projectedTemperature >= 35 || projectedAqi >= 150
                    ? "ELEVATED"
                    : "STABLE";

        if (risePerSecond <= 0 && projectedEnvironmentRisk === "STABLE") {
            setEarlyWarning(null);
            return;
        }

        const reasons = getRiskReasons(health, environment, score, Math.max(projectedScore, score));
        const warningKey = `${Math.floor(Math.max(projectedScore, score) / 10)}-${projectedEnvironmentRisk}-${Math.floor(last.score / 5)}`;
        setEarlyWarning({
            projectedScore: Math.max(projectedScore, score),
            environmentRisk: projectedEnvironmentRisk,
            reasons,
            minutes: 5
        });

        if (earlyWarningRef.current === warningKey) return;
        earlyWarningRef.current = warningKey;

        if (projectedScore >= 70 || projectedEnvironmentRisk === "CRITICAL") {
            const message = `VITALIS predictive warning. Your risk may become critical within approximately 5 minutes. ${reasons.join(" ")}`;
            setAlertMessage(message);
            speak(message, true);
            notifyBrowser("VITALIS PREDICTIVE WARNING", message, true);
            return;
        }

        if (projectedScore >= 40 || projectedEnvironmentRisk === "ELEVATED") {
            const message = `VITALIS early warning. Your personal risk may increase within approximately 5 minutes. ${reasons.join(" ")}`;
            setAlertMessage(message);
            speak(message, true);
            notifyBrowser("VITALIS EARLY WARNING", message, false);
        }
    }

    function processRiskAlert(
        prediction,
        healthSnapshot = health,
        environmentSnapshot = environment
    ) {
        const score = Number(prediction?.riskScore || 0);

        const rawLevel = String(
            prediction?.riskLevel || ""
        ).toUpperCase();

        let level;

        if (
            score >= 70 ||
            rawLevel === "CRITICAL"
        ) {
            level = "CRITICAL";
        } else if (
            score >= 60 ||
            rawLevel === "RISK" ||
            rawLevel === "HIGH_RISK" ||
            rawLevel === "HIGH"
        ) {
            level = "RISK";
        } else if (
            score >= 40 ||
            rawLevel === "WARNING" ||
            rawLevel === "WARN" ||
            rawLevel === "MODERATE"
        ) {
            level = "WARNING";
        } else {
            level = "SAFE";
        }

        processEarlyWarning(
            prediction,
            healthSnapshot,
            environmentSnapshot
        );

        if (level === "SAFE") {
            lastAlertLevelRef.current = "";
            return;
        }

        if (lastAlertLevelRef.current === level) {
            return;
        }

        lastAlertLevelRef.current = level;

        const advice = getImmediateAdvice(
            healthSnapshot,
            environmentSnapshot,
            score
        );

        const message =
            level === "WARNING"
                ? `VITALIS WARNING. AI risk score is ${score.toFixed(1)} out of 100. ${advice}`
                : level === "RISK"
                    ? `VITALIS RISK ALERT. AI risk score is ${score.toFixed(1)} out of 100. ${advice} Immediate attention is required.`
                    : `VITALIS CRITICAL ALERT. Critical health risk detected. AI risk score is ${score.toFixed(1)} out of 100. ${advice} Emergency assistance is being activated.`;

        setAlertMessage(message);

        speak(message, true);

        notifyBrowser(
            `VITALIS ${level} ALERT`,
            message,
            level === "CRITICAL"
        );

        if (level === "CRITICAL") {
            activateEmergency(
                `AI risk score ${score.toFixed(1)} requires caregiver attention. ${advice}`,
                "AI_RISK_ALERT",
                healthSnapshot,
                environmentSnapshot,
                prediction
            );
        }
    }

    function processEnvironmentAlert(data, healthSnapshot = health) {
        const aqi = Number(data?.aqi || 0);
        const temperature = Number(
            data?.ambientTemperature ?? data?.temperature ?? 0
        );

        let level = "SAFE";
        let message = "";

        if (aqi >= 200) {
            level = "AIR_CRITICAL";
            message = `Environmental emergency warning. Air quality is very unhealthy. AQI is ${Math.round(aqi)}. Move indoors immediately and avoid strenuous activity.`;
        } else if (aqi >= 150) {
            level = "AIR_HIGH";
            message = `Air quality warning. AQI is ${Math.round(aqi)}. Please move indoors and avoid strenuous activity.`;
        } else if (temperature >= 40) {
            level = "HEAT_CRITICAL";
            message = `Extreme heat warning. Temperature is ${temperature.toFixed(1)} degrees Celsius. Please stop activity, sit somewhere cool, and drink water.`;
        } else if (temperature >= 35) {
            level = "HEAT_HIGH";
            message = `Heat warning. Temperature is ${temperature.toFixed(1)} degrees Celsius. Please reduce activity, sit in a cool place, and drink water.`;
        }

        if (level === "SAFE") {
            lastEnvironmentAlertRef.current = "";
            return;
        }

        if (lastEnvironmentAlertRef.current === level) return;
        lastEnvironmentAlertRef.current = level;

        setAlertMessage(message);
        speak(message, true);
        notifyBrowser(
            `VITALIS ENVIRONMENT ${level.replace("_", " ")}`,
            message,
            level.includes("CRITICAL")
        );

        if (level.includes("CRITICAL")) {
            activateEmergency(message);
        }
    }

    async function fetchLiveData() {
        try {
            const [healthData, environmentResponse] = await Promise.all([
                getHealthReadings(),
                fetch(`${BACKEND_URL}/api/environment/live`)
            ]);

            if (!environmentResponse.ok) {
                throw new Error("Live environment endpoint unavailable");
            }

            const environmentData = await environmentResponse.json();
            const latestHealth = healthData.readings?.[0] || null;

            const latestEnvironment = {
                ...environmentData,
                temperature:
                    environmentData.ambientTemperature ??
                    environmentData.temperature
            };

            setHealth(latestHealth);
            setEnvironment(latestEnvironment);
            setConnectionStatus("LIVE");
            setLastUpdated(new Date());

            processEnvironmentAlert(latestEnvironment, latestHealth);

            if (latestHealth && latestEnvironment) {
                try {
                    const analysis = await analyzeRisk({
                        health: latestHealth,
                        environment: latestEnvironment,
                    });

                    const prediction = analysis.prediction;
                    setRisk(prediction);
                    processRiskAlert(prediction, latestHealth, latestEnvironment);
                } catch (riskError) {
                    console.error("VITALIS risk error:", riskError);
                }
            }

            try {
                const history = await getRiskHistory();
                setRiskHistory(history.predictions || []);
            } catch (historyError) {
                console.error("Risk history error:", historyError);
            }
        } catch (error) {
            console.error("VITALIS live data error:", error);
            setConnectionStatus("OFFLINE");

            if (error.response?.status === 401) onLogout();
        } finally {
            setLoading(false);
        }
    }

    function getDemoScenario(key) {
        const scenarios = {
            SAFE: {
                health: {
                    heartRate: 72,
                    spo2: 98,
                    bodyTemperature: 36.7,
                    activity: "normal"
                },
                environment: {
                    ambientTemperature: 28,
                    temperature: 28,
                    humidity: 55,
                    aqi: 70,
                    pm25: 25,
                    rating: "GOOD",
                    environmentScore: 15,
                    live: false,
                    source: "VITALIS DEMO"
                },
                risk: {
                    riskScore: 20,
                    riskLevel: "SAFE"
                }
            },

            WARNING: {
                health: {
                    heartRate: 96,
                    spo2: 96,
                    bodyTemperature: 37.2,
                    activity: "moderate"
                },
                environment: {
                    ambientTemperature: 34.5,
                    temperature: 34.5,
                    humidity: 65,
                    aqi: 120,
                    pm25: 55,
                    rating: "MODERATE",
                    environmentScore: 40,
                    live: false,
                    source: "VITALIS DEMO"
                },
                risk: {
                    riskScore: 48,
                    riskLevel: "WARNING"
                }
            },

            RISK: {
                health: {
                    heartRate: 112,
                    spo2: 93,
                    bodyTemperature: 38,
                    activity: "high"
                },
                environment: {
                    ambientTemperature: 38,
                    temperature: 38,
                    humidity: 70,
                    aqi: 170,
                    pm25: 90,
                    rating: "POOR",
                    environmentScore: 65,
                    live: false,
                    source: "VITALIS DEMO"
                },
                risk: {
                    riskScore: 65,
                    riskLevel: "RISK"
                }
            },

            CRITICAL: {
                health: {
                    heartRate: 138,
                    spo2: 88,
                    bodyTemperature: 41.5,
                    activity: "high"
                },
                environment: {
                    ambientTemperature: 41.5,
                    temperature: 41.5,
                    humidity: 78,
                    aqi: 260,
                    pm25: 180,
                    rating: "HAZARDOUS",
                    environmentScore: 95,
                    live: false,
                    source: "VITALIS DEMO"
                },
                risk: {
                    riskScore: 92,
                    riskLevel: "CRITICAL"
                }
            }
        };

        return scenarios[key];
    }

    function activateDemoScenario(key, stopCycle = true) {
        if (stopCycle) {
            setDemoAutoCycle(false);
        }

        if (preEmergencyTimerRef.current) {
            clearTimeout(preEmergencyTimerRef.current);
            preEmergencyTimerRef.current = null;
        }

        if (preEmergencyIntervalRef.current) {
            clearInterval(preEmergencyIntervalRef.current);
            preEmergencyIntervalRef.current = null;
        }

        setPreEmergencyActive(false);
        setPreEmergencyCountdown(0);

        const scenario = getDemoScenario(key);

        if (!scenario) return;

        setDemoMode(true);
        setDemoScenario(key);

        if (key !== "CRITICAL") {
            emergencyActiveRef.current = false;
            setEmergencyActive(false);
            setEmergencyReason("");
            setEmergencyCallStatus("");
        }

        lastAlertLevelRef.current = "";

        setHealth(scenario.health);
        setEnvironment(scenario.environment);
        setRisk(scenario.risk);

        setRiskHistory((previous) => [
            {
                ...scenario.risk,
                timestamp: new Date().toISOString()
            },
            ...previous
        ].slice(0, 20));

        processRiskAlert(
            scenario.risk,
            scenario.health,
            scenario.environment
        );
    }

    function activateDemoPreEmergency() {
        if (demoAutoCycle) {
            setDemoAutoCycle(false);
        }

        const scenario = getDemoScenario("RISK");

        setDemoMode(true);
        setDemoScenario("PRE_EMERGENCY");

        setHealth(scenario.health);
        setEnvironment(scenario.environment);
        setRisk({
            ...scenario.risk,
            riskScore: 68,
            riskLevel: "RISK"
        });

        schedulePreEmergency(
            "Multiple danger signals detected. Prepare for emergency assistance.",
            scenario.health,
            scenario.environment,
            {
                riskScore: 68,
                riskLevel: "RISK"
            }
        );
    }

    function triggerDemoManualSOS() {
        setDemoMode(true);
        setDemoScenario("MANUAL_SOS");

        const scenario = getDemoScenario("CRITICAL");

        setHealth(scenario.health);
        setEnvironment(scenario.environment);
        setRisk(scenario.risk);

        emergencyActiveRef.current = false;

        activateEmergency(
            "Manual SOS activated by the user.",
            "MANUAL",
            scenario.health,
            scenario.environment,
            scenario.risk
        );
    }

    function handleSOS() {
        activateEmergency(
            "Emergency SOS manually activated by the user.",
            "MANUAL"
        );
    }

    function resetEmergency() {
        emergencyActiveRef.current = false;
        setEmergencyActive(false);
        setEmergencyReason("");
        setEmergencyStartedAt(null);
        setAlertMessage("");
        setEmergencyCallStatus("");
        speak("VITALIS emergency mode cleared. Continuous monitoring continues.", true);
    }

    function call112() {
        speak("Opening the emergency calling interface for 112.", true);
        window.location.href = "tel:112";
    }

    return (
        <div className="app">
            <Sidebar
                page={page}
                setPage={setPage}
                risk={risk}
                user={user}
                onLogout={onLogout}
                onSOS={handleSOS}
            />

            <main className="main">
                <Topbar page={page} user={user} connectionStatus={connectionStatus} />

                <div className="main-scroll">
                    {preEmergencyActive && !emergencyActive && (
                        <div className="pre-emergency-overlay">
                            <div className="pre-emergency-card">
                                <div className="pre-emergency-label">VITALIS PRE-EMERGENCY PROTOCOL</div>
                                <h2>Critical event predicted</h2>
                                <div className="pre-emergency-countdown">{preEmergencyCountdown}s</div>
                                <p>VITALIS is preparing an automatic caregiver call before the predicted critical event.</p>
                                <button className="secondary-button" onClick={() => cancelPreEmergency("Pre-emergency caregiver call cancelled by user.")}>CANCEL ALERT</button>
                            </div>
                        </div>
                    )}

                    {emergencyActive && (
                        <div style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 50,
                            marginBottom: 18,
                            padding: 22,
                            border: "2px solid #ff3b30",
                            background: "#220b0b",
                            boxShadow: "0 12px 40px rgba(255,59,48,.25)"
                        }}>
                            <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 800 }}>VITALIS EMERGENCY PROTOCOL</div>
                            <div style={{ fontSize: 30, fontWeight: 900, marginTop: 8 }}>CRITICAL DANGER DETECTED</div>
                            <div style={{ marginTop: 8, opacity: .9 }}>{emergencyReason}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 18 }}>
                                <div><strong>HEART RATE</strong><br />{health?.heartRate ?? "--"} BPM</div>
                                <div><strong>SpO₂</strong><br />{health?.spo2 ?? "--"}%</div>
                                <div><strong>TEMPERATURE</strong><br />{health?.bodyTemperature ?? "--"} °C</div>
                                <div><strong>AQI</strong><br />{environment?.aqi ?? "--"}</div>
                                <div><strong>AI RISK</strong><br />{Number(risk?.riskScore || 0).toFixed(1)}/100</div>
                            </div>
                            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button className="emergency-button large" onClick={call112}>CALL 112</button>
                                <button className="secondary-button" onClick={() => callEmergencyContact("MANUAL_CALL")}>CALL CAREGIVER</button>
                                <button className="secondary-button" onClick={resetEmergency}>CLEAR EMERGENCY MODE</button>
                            </div>
                            <div style={{ marginTop: 12, fontSize: 12, opacity: .9 }}>
                                CALL STATUS: <strong>{emergencyCallStatus || "WAITING"}</strong>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 12, opacity: .75 }}>
                                Activated: {emergencyStartedAt ? emergencyStartedAt.toLocaleTimeString() : "--"} · Voice guidance active · Event recorded locally
                            </div>
                        </div>
                    )}

                    {alertMessage && (
                        <div className="vitalis-alert" role="alert" aria-live="assertive">
                            <div>
                                <strong>VITALIS ALERT</strong>
                                <span>{alertMessage}</span>
                            </div>
                            <button onClick={() => setAlertMessage("")}>DISMISS</button>
                        </div>
                    )}

                    {earlyWarning && !emergencyActive && (
                        <div className="predictive-warning-panel" role="status" aria-live="polite">
                            <div className="panel-label">5-MINUTE EARLY WARNING</div>
                            <h3>Potential elevated risk detected</h3>
                            <p>VITALIS projects that your combined risk may increase within approximately the next 5 minutes.</p>
                            <div className="predictive-warning-grid">
                                <div><span>PROJECTED RISK</span><strong>{earlyWarning.projectedScore.toFixed(1)}/100</strong></div>
                                <div><span>ENVIRONMENT</span><strong>{earlyWarning.environmentRisk}</strong></div>
                            </div>
                            <div className="panel-label">DETECTED REASONS</div>
                            <div className="risk-reason-list">
                                {earlyWarning.reasons.map((reason, index) => (
                                    <div key={index} className="risk-reason-item">{reason}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {page === "Dashboard" ? (
                        <Dashboard
                            health={health}
                            environment={environment}
                            risk={risk}
                            riskHistory={riskHistory}
                            connectionStatus={connectionStatus}
                            lastUpdated={lastUpdated}
                            loading={loading}
                            demoMode={demoMode}
                            demoScenario={demoScenario}
                            demoAutoCycle={demoAutoCycle}
                            setDemoAutoCycle={setDemoAutoCycle}
                            activateDemoScenario={activateDemoScenario}
                            activateDemoPreEmergency={activateDemoPreEmergency}
                            triggerDemoManualSOS={triggerDemoManualSOS}
                            preEmergencyCountdown={preEmergencyCountdown}
                            setPreEmergencyActive={setPreEmergencyActive}
                            setPreEmergencyCountdown={setPreEmergencyCountdown}
                            setAlertMessage={setAlertMessage}
                            emergencyActiveRef={emergencyActiveRef}
                            setEmergencyActive={setEmergencyActive}
                            setEmergencyReason={setEmergencyReason}
                            setEmergencyCallStatus={setEmergencyCallStatus}
                            fetchLiveData={fetchLiveData}
                        />
                    ) : (
                        <ModulePage
                            title={page}
                            health={health}
                            environment={environment}
                            risk={risk}
                            riskHistory={riskHistory}
                            voiceMode={voiceMode}
                            setVoiceMode={setVoiceMode}
                            notificationsEnabled={notificationsEnabled}
                            enableNotifications={enableNotifications}
                            onSOS={handleSOS}
                            connectionStatus={connectionStatus}
                            speak={speak}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

function Sidebar({ page, setPage, risk, user, onLogout, onSOS }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="brand">
                    <div className="brand-symbol">V</div>
                    <div>
                        <div className="brand-title">VITALIS</div>
                        <div className="brand-subtitle">HEALTH INTELLIGENCE</div>
                    </div>
                </div>

                <div className="live-status">
                    <span className="pulse"></span>
                    <span>LIVE MONITORING</span>
                </div>

                <nav>
                    {menu.map((section) => (
                        <div className="menu-section" key={section.title}>
                            <div className="menu-title">{section.title}</div>
                            {section.items.map((item) => (
                                <button
                                    key={item}
                                    className={page === item ? "menu-item active" : "menu-item"}
                                    onClick={() => setPage(item)}
                                >
                                    <span>{item}</span>
                                    {item === "AI Risk" && risk && (
                                        <span className="risk-mini">
                                            {Math.round(risk.riskScore || 0)}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>
            </div>

            <div className="sidebar-bottom">
                <div className="device-card">
                    <div className="device-indicator"><span className="pulse"></span></div>
                    <div>
                        <div className="device-title">DEVICE CONNECTED</div>
                        <div className="device-text">Continuous monitoring active</div>
                    </div>
                </div>

                <button className="emergency-button" onClick={onSOS}>
                    EMERGENCY SOS
                </button>

                <button className="logout" onClick={onLogout}>Logout</button>
            </div>
        </aside>
    );
}

function Topbar({ page, user, connectionStatus }) {
    const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div className="breadcrumb">
                    VITALIS <span>/</span> {page}
                </div>
            </div>

            <div className="topbar-right">
                <div className="system-status">
                    <span className="pulse"></span>
                    {connectionStatus === "LIVE" ? "SYSTEM OPERATIONAL" : connectionStatus}
                </div>

                <div className="user-profile">
                    <div className="user-avatar">{initial}</div>
                    <div>
                        <div className="user-name">{user?.name || "Health User"}</div>
                        <div className="user-type">Personal Profile</div>
                    </div>
                </div>
            </div>
        </header>
    );
}

function Dashboard({
    health,
    environment,
    risk,
    riskHistory,
    connectionStatus,
    lastUpdated,
    loading,
    demoMode,
    demoScenario,
    demoAutoCycle,
    setDemoAutoCycle,
    activateDemoScenario,
    activateDemoPreEmergency,
    triggerDemoManualSOS,
    preEmergencyCountdown,
    setPreEmergencyActive,
    setPreEmergencyCountdown,
    setAlertMessage,
    emergencyActiveRef,
    setEmergencyActive,
    setEmergencyReason,
    setEmergencyCallStatus,
    fetchLiveData
}) {
    return (
        <div className="dashboard">
            <section className="dashboard-heading">
                <div>
                    <div className="eyebrow">PERSONAL HEALTH INTELLIGENCE</div>
                    <h1>Health Intelligence</h1>
                    <p>
                        Real-time understanding of physiological state,
                        environmental exposure and potential health risk.
                    </p>
                </div>

                <div className="monitoring-badge">
                    <span className="pulse"></span>
                    {connectionStatus === "LIVE" ? "LIVE" : "CONNECTING"}
                </div>
            </section>

            {(
                <section className="section">
                    <div className="panel">
                        <div className="panel-label">SIH DEMONSTRATION CONTROL</div>

                        <h2>
                            VITALIS Simulation Control Center
                        </h2>

                        <p>
                            Test the complete VITALIS alert pipeline without changing
                            backend sensor data.
                        </p>

                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                            gap: 10,
                            marginTop: 18
                        }}>
                            <button
                                className="secondary-button"
                                onClick={() => activateDemoScenario("SAFE")}
                            >
                                SAFE
                            </button>

                            <button
                                className="secondary-button"
                                onClick={() => activateDemoScenario("WARNING")}
                            >
                                WARNING
                            </button>

                            <button
                                className="secondary-button"
                                onClick={() => activateDemoScenario("RISK")}
                            >
                                RISK
                            </button>

                            <button
                                className="emergency-button"
                                onClick={() => activateDemoScenario("CRITICAL")}
                            >
                                CRITICAL · CALL CAREGIVER
                            </button>

                            <button
                                className="secondary-button"
                                onClick={activateDemoPreEmergency}
                            >
                                PRE-EMERGENCY · 15 SEC
                            </button>

                            <button
                                className="emergency-button"
                                onClick={triggerDemoManualSOS}
                            >
                                MANUAL SOS · CALL NOW
                            </button>

                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setDemoMode(true);
                                    setDemoAutoCycle(true);
                                }}
                            >
                                AUTO CYCLE
                            </button>

                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setDemoAutoCycle(false);
                                    setDemoMode(false);
                                    setDemoScenario("SAFE");
                                    setPreEmergencyActive(false);
                                    setPreEmergencyCountdown(0);
                                    setAlertMessage("");
                                    emergencyActiveRef.current = false;
                                    setEmergencyActive(false);
                                    setEmergencyReason("");
                                    setEmergencyCallStatus("");
                                    fetchLiveData();
                                }}
                            >
                                EXIT DEMO
                            </button>
                        </div>

                        {demoMode && (
                            <div style={{
                                marginTop: 18,
                                padding: 14,
                                border: "1px solid rgba(255,255,255,.15)"
                            }}>
                                <strong>DEMO STATE: {demoScenario}</strong>

                                <div style={{
                                    marginTop: 6,
                                    fontSize: 13,
                                    opacity: 0.75
                                }}>
                                    Dashboard values are currently simulated.
                                </div>
                            </div>
                        )}

                        {demoAutoCycle && (
                            <div style={{
                                marginTop: 12,
                                padding: 14,
                                border: "1px solid rgba(255,180,0,.4)"
                            }}>
                                <strong>AUTO CYCLE ACTIVE</strong>

                                <div style={{
                                    marginTop: 6,
                                    fontSize: 13
                                }}>
                                    SAFE → WARNING → RISK → CRITICAL every 10 seconds.
                                </div>

                                <div style={{
                                    marginTop: 6,
                                    fontSize: 13
                                }}>
                                    CRITICAL can initiate a real caregiver call.
                                </div>
                            </div>
                        )}

                        {preEmergencyCountdown > 0 && (
                            <div style={{
                                marginTop: 12,
                                padding: 16,
                                border: "2px solid #ffb020"
                            }}>
                                <strong>
                                    CAREGIVER CALL IN {preEmergencyCountdown} SECONDS
                                </strong>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section className="section">
                <SectionTitle title="LIVE HEALTH SIGNALS" subtitle="Current physiological measurements" />
                <div className="health-grid">
                    <HealthMetric
                        title="HEART RATE"
                        value={health?.heartRate ?? "--"}
                        unit="BPM"
                        baseline={demoMode ? "DEMO SCENARIO" : "Personal baseline"}
                    />

                    <HealthMetric
                        title="SpO₂"
                        value={health?.spo2 ?? "--"}
                        unit="%"
                        baseline={demoMode ? "DEMO SCENARIO" : "Personal baseline"}
                    />

                    <HealthMetric
                        title="BODY TEMPERATURE"
                        value={health?.bodyTemperature ?? "--"}
                        unit="°C"
                        baseline={demoMode ? "DEMO SCENARIO" : "Personal baseline"}
                    />
                    <HealthMetric title="ACTIVITY" value={health?.activity ?? "--"} unit="INDEX" baseline="Current activity" />
                </div>
            </section>

            <section className="section">
                <SectionTitle title="HUMAN × ENVIRONMENT" subtitle="Personal health combined with environmental context" />
                <div className="intelligence-grid">
                    <RiskPanel risk={risk} health={health} environment={environment} />
                    <EnvironmentPanel environment={environment} />
                </div>
            </section>

            <section className="section">
                <SectionTitle title="RISK TRAJECTORY" subtitle="Recent AI-generated risk observations" />
                <RiskChart history={riskHistory} />
            </section>

            <section className="section">
                <SectionTitle title="PERSONAL DIGITAL TWIN" subtitle="Learned physiological baseline" />
                <DigitalTwin health={health} />
            </section>

            <section className="section">
                <SectionTitle title="SYSTEM STATUS" subtitle="VITALIS infrastructure" />
                <div className="system-grid">
                    <SystemStatus title="HEALTH MONITORING" value={health ? "ACTIVE" : "WAITING"} />
                    <SystemStatus title="AI ENGINE" value={risk ? "ONLINE" : "WAITING"} />
                    <SystemStatus title="ENVIRONMENT" value={environment ? "LIVE" : "WAITING"} />
                    <SystemStatus title="DATABASE" value={connectionStatus === "LIVE" ? "CONNECTED" : "CHECKING"} />
                </div>
                <div className="live-meta">
                    {loading ? "Synchronizing..." : `Last update: ${lastUpdated ? lastUpdated.toLocaleTimeString() : "--"}`}
                </div>
            </section>

            <footer className="footer">
                VITALIS · AI-POWERED PERSONAL HEALTH DIGITAL TWIN
            </footer>
        </div>
    );
}


function RecenterMap({ location }) {
    const map = useMap();

    useEffect(() => {
        if (location) {
            map.setView([location.lat, location.lng], 14);
        }
    }, [location, map]);

    return null;
}

function SafetyMap({ speak }) {
    const [location, setLocation] = useState(null);
    const [places, setPlaces] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [voiceListening, setVoiceListening] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("Location services are not supported by this browser.");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            () => {
                setError("Location permission is required to find nearby hospitals and safe places.");
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, []);

    useEffect(() => {
        if (!location) return;

        async function loadPlaces() {
            setLoading(true);
            setError("");

            const query = `
                [out:json][timeout:30];
                (
                    node[amenity=hospital](around:15000,${location.lat},${location.lng});
                    way[amenity=hospital](around:15000,${location.lat},${location.lng});
                    relation[amenity=hospital](around:15000,${location.lat},${location.lng});
                    node[healthcare=hospital](around:15000,${location.lat},${location.lng});
                    way[healthcare=hospital](around:15000,${location.lat},${location.lng});
                    relation[healthcare=hospital](around:15000,${location.lat},${location.lng});
                    node[amenity=shelter](around:15000,${location.lat},${location.lng});
                    way[amenity=shelter](around:15000,${location.lat},${location.lng});
                    relation[amenity=shelter](around:15000,${location.lat},${location.lng});
                    node[shelter_type](around:15000,${location.lat},${location.lng});
                    way[shelter_type](around:15000,${location.lat},${location.lng});
                    relation[shelter_type](around:15000,${location.lat},${location.lng});
                    node[emergency=assembly_point](around:15000,${location.lat},${location.lng});
                    way[emergency=assembly_point](around:15000,${location.lat},${location.lng});
                    relation[emergency=assembly_point](around:15000,${location.lat},${location.lng});
                    node[amenity=fire_station](around:15000,${location.lat},${location.lng});
                    way[amenity=fire_station](around:15000,${location.lat},${location.lng});
                    relation[amenity=fire_station](around:15000,${location.lat},${location.lng});
                    node[amenity=police](around:15000,${location.lat},${location.lng});
                    way[amenity=police](around:15000,${location.lat},${location.lng});
                    relation[amenity=police](around:15000,${location.lat},${location.lng});
                );
                out center tags;
            `;

            try {
                const endpoints = [
                    "https://overpass-api.de/api/interpreter",
                    "https://overpass.kumi.systems/api/interpreter"
                ];

                let data = null;
                let lastError = null;

                for (const endpoint of endpoints) {
                    try {
                        const response = await fetch(endpoint, {
                            method: "POST",
                            headers: { "Content-Type": "text/plain;charset=UTF-8" },
                            body: query
                        });

                        if (!response.ok) {
                            throw new Error(`Location service returned ${response.status}`);
                        }

                        data = await response.json();
                        break;
                    } catch (endpointError) {
                        lastError = endpointError;
                    }
                }

                if (!data) {
                    throw lastError || new Error("Location service unavailable");
                }
                const mapped = (data.elements || [])
                    .map((item) => {
                        const lat = item.lat ?? item.center?.lat;
                        const lng = item.lon ?? item.center?.lon;
                        if (lat == null || lng == null) return null;

                        const amenity = item.tags?.amenity;
                        const healthcare = item.tags?.healthcare;
                        const emergency = item.tags?.emergency;
                        const type = amenity === "hospital" || healthcare === "hospital"
                            ? "hospital"
                            : "safe";

                        const tags = item.tags || {};
                        const street = tags['addr:street'] || tags['addr:place'] || "";
                        const city = tags['addr:city'] || tags['addr:suburb'] || tags['addr:district'] || "";
                        const locality = [street, city].filter(Boolean).join(", ");
                        const resolvedName =
                            tags.name ||
                            tags.official_name ||
                            tags['name:en'] ||
                            tags.brand ||
                            tags.operator ||
                            (type === "hospital" ? `Hospital near ${city || "your location"}` : `Safe place near ${city || "your location"}`);

                        return {
                            id: `${item.type}-${item.id}`,
                            name: resolvedName,
                            type,
                            lat,
                            lng,
                            address: locality || tags['addr:full'] || tags.description || "Address not listed",
                            phone: tags.phone || tags['contact:phone'] || "",
                            emergencyPhone: tags['emergency_phone'] || tags['emergency:phone'] || tags['contact:emergency_phone'] || "",
                            ambulancePhone: tags.ambulance || tags['contact:ambulance'] || "",
                            operator: tags.operator || "",
                            website: tags.website || tags['contact:website'] || ""
                        };
                    })
                    .filter(Boolean)
                    .filter((item, index, array) =>
                        array.findIndex((candidate) =>
                            candidate.name === item.name &&
                            Math.abs(candidate.lat - item.lat) < 0.0001 &&
                            Math.abs(candidate.lng - item.lng) < 0.0001
                        ) === index
                    )
                    .sort((a, b) => {
                        const da = Math.hypot(a.lat - location.lat, a.lng - location.lng);
                        const db = Math.hypot(b.lat - location.lat, b.lng - location.lng);
                        return da - db;
                    });

                setPlaces(mapped);
            } catch (loadError) {
                console.error("VITALIS safety map error:", loadError);
                setError("Nearby location data could not be loaded. You can still use your current location on the map.");
            } finally {
                setLoading(false);
            }
        }

        loadPlaces();
    }, [location]);

    function startVoiceSearch() {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!Recognition) {
            speak("Voice search is not supported by this browser. Please use the buttons on the map.", true);
            return;
        }

        const recognition = new Recognition();
        recognition.lang = "en-IN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setVoiceListening(true);
        speak("Tell me what you need. You can say hospital, safe place, or safety map.", true);

        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();

            if (command.includes("hospital") || command.includes("medical")) {
                setFilter("hospital");
                speak("Showing nearby hospitals.", true);
            } else if (
                command.includes("safe place") ||
                command.includes("safe zone") ||
                command.includes("shelter") ||
                command.includes("assembly")
            ) {
                setFilter("safe");
                speak("Showing nearby safe places and shelters.", true);
            } else if (command.includes("safety map") || command.includes("map")) {
                setFilter("all");
                speak("Showing the safety map.", true);
            } else {
                speak("I could not understand that. Try saying hospital or safe place.", true);
            }
        };

        recognition.onerror = () => {
            speak("Voice search could not be completed. Please try again.", true);
        };

        recognition.onend = () => setVoiceListening(false);
        recognition.start();
    }

    function openDirections(place) {
        const destination = `${place.lat},${place.lng}`;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, "_blank", "noopener,noreferrer");
    }

    function phoneHref(phone) {
        return `tel:${String(phone).replace(/[^+0-9]/g, "")}`;
    }

    function callPlace(place, number, label) {
        if (!number) {
            speak(`${label} is not listed for ${place.name}. Please use emergency services if this is urgent.`, true);
            return;
        }
        window.location.href = phoneHref(number);
    }

    const visiblePlaces = places.filter((place) => filter === "all" || place.type === filter);

    if (!location && loading) {
        return (
            <ModuleShell
                eyebrow="VITALIS RESILIENCE"
                title="Safety Map"
                description="Finding your location and nearby safety services."
            >
                <div className="safety-status-card">Locating you...</div>
            </ModuleShell>
        );
    }

    if (error && !location) {
        return (
            <ModuleShell
                eyebrow="VITALIS RESILIENCE"
                title="Safety Map"
                description="Find nearby hospitals and safe places."
            >
                <div className="safety-status-card error">{error}</div>
            </ModuleShell>
        );
    }

    return (
        <ModuleShell
            eyebrow="VITALIS RESILIENCE"
            title="Safety Map"
            description="Find nearby hospitals, shelters and available safe places."
        >
            <div className="safety-toolbar">
                <button
                    className={filter === "all" ? "map-filter active" : "map-filter"}
                    onClick={() => {
                        setFilter("all");
                        speak("Showing all nearby safety services.");
                    }}
                >
                    ALL
                </button>
                <button
                    className={filter === "hospital" ? "map-filter active" : "map-filter"}
                    onClick={() => {
                        setFilter("hospital");
                        speak("Showing nearby hospitals.");
                    }}
                >
                    HOSPITALS
                </button>
                <button
                    className={filter === "safe" ? "map-filter active" : "map-filter"}
                    onClick={() => {
                        setFilter("safe");
                        speak("Showing nearby safe places and shelters.");
                    }}
                >
                    SAFE PLACES
                </button>
                <button className="voice-map-button" onClick={startVoiceSearch}>
                    {voiceListening ? "LISTENING..." : "VOICE SEARCH"}
                </button>
            </div>

            {error && <div className="safety-inline-warning">{error}</div>}

            <div className="safety-map-layout">
                <div className="safety-map-wrapper">
                    <MapContainer
                        center={[location.lat, location.lng]}
                        zoom={14}
                        scrollWheelZoom={true}
                        className="safety-map"
                    >
                        <RecenterMap location={location} />
                        <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <CircleMarker
                            center={[location.lat, location.lng]}
                            radius={10}
                            pathOptions={{ color: "#4aa8ff", fillColor: "#4aa8ff", fillOpacity: 0.9 }}
                        >
                            <Popup>
                                <strong>You are here</strong>
                                <br />
                                VITALIS current location
                            </Popup>
                        </CircleMarker>

                        {visiblePlaces.map((place) => (
                            <CircleMarker
                                key={place.id}
                                center={[place.lat, place.lng]}
                                radius={place.type === "hospital" ? 9 : 8}
                                pathOptions={place.type === "hospital"
                                    ? { color: "#ff6b6b", fillColor: "#ff6b6b", fillOpacity: 0.9 }
                                    : { color: "#43d17a", fillColor: "#43d17a", fillOpacity: 0.9 }}
                            >
                                <Tooltip
                                    direction="top"
                                    offset={[0, -8]}
                                    opacity={0.98}
                                    permanent={false}
                                >
                                    <strong>{place.name}</strong>
                                </Tooltip>
                                <Popup>
                                    <div className="map-popup-title">{place.name}</div>
                                    <div className="map-popup-type">{place.type === "hospital" ? "HOSPITAL" : "SHELTER / SAFE PLACE"}</div>
                                    <div className="map-popup-address">{place.address}</div>
                                    {place.operator && <div className="map-popup-meta">Operator: {place.operator}</div>}
                                    {place.type === "hospital" && (place.emergencyPhone || place.phone) && (
                                        <>
                                            <br />
                                            <span>{place.emergencyPhone ? `Emergency: ${place.emergencyPhone}` : `Hospital: ${place.phone}`}</span>
                                        </>
                                    )}
                                    {place.type === "hospital" && place.ambulancePhone && (
                                        <>
                                            <br />
                                            <span>Ambulance: {place.ambulancePhone}</span>
                                        </>
                                    )}
                                    <div className="popup-action-row">
                                        {place.type === "hospital" && (place.emergencyPhone || place.phone) && (
                                            <button className="popup-call-button" onClick={() => callPlace(place, place.emergencyPhone || place.phone, place.emergencyPhone ? "Hospital emergency contact" : "Hospital phone")}>
                                                CALL HOSPITAL
                                            </button>
                                        )}
                                        <button className="popup-call-button emergency" onClick={() => window.location.href = "tel:112"}>
                                            CALL 112
                                        </button>
                                        <button className="popup-direction-button" onClick={() => openDirections(place)}>
                                            DIRECTIONS
                                        </button>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}
                    </MapContainer>
                </div>

                <div className="safety-place-list">
                    <div className="safety-list-header">
                        <div>
                            <div className="panel-label">NEARBY SERVICES</div>
                            <h2>{filter === "hospital" ? "Hospitals" : filter === "safe" ? "Safe Places" : "Safety Services"}</h2>
                        </div>
                        <span>{visiblePlaces.length}</span>
                    </div>

                    {loading && <div className="safety-empty">Loading nearby locations...</div>}

                    {!loading && !visiblePlaces.length && (
                        <div className="safety-empty">
                            No matching locations were found in the current search area.
                        </div>
                    )}

                    {!loading && visiblePlaces.slice(0, 8).map((place) => (
                        <div className="safety-place-card" key={place.id}>
                            <div className={place.type === "hospital" ? "place-icon hospital" : "place-icon safe"}>
                                {place.type === "hospital" ? "H" : "S"}
                            </div>
                            <div className="place-info">
                                <strong className="place-name">{place.name}</strong>
                                <span>{place.type === "hospital" ? "Hospital" : "Shelter / Safe Place"}</span>
                                <small>{place.address}</small>
                                {place.operator && <small>Operator: {place.operator}</small>}
                                {place.type === "hospital" && place.emergencyPhone && <small className="place-phone">Emergency: {place.emergencyPhone}</small>}
                                {place.type === "hospital" && !place.emergencyPhone && place.phone && <small className="place-phone">Hospital: {place.phone}</small>}
                                {place.type === "hospital" && place.ambulancePhone && <small className="place-phone">Ambulance: {place.ambulancePhone}</small>}
                            </div>
                            <div className="place-actions">
                                {place.type === "hospital" && (place.emergencyPhone || place.phone) && (
                                    <button className="place-call-button" onClick={() => callPlace(place, place.emergencyPhone || place.phone, place.emergencyPhone ? "Hospital emergency contact" : "Hospital phone")}>CALL</button>
                                )}
                                <button className="place-112-button" onClick={() => window.location.href = "tel:112"}>112</button>
                                <button onClick={() => openDirections(place)}>GO</button>
                            </div>
                        </div>
                    ))}

                    <div className="safety-source-note">
                        Location data: OpenStreetMap contributors via Overpass API. Safe-place entries are mapped shelters/assembly points and should be verified with local authorities during a real emergency.
                    </div>
                </div>
            </div>
        </ModuleShell>
    );
}

function ModulePage({
    title,
    health,
    environment,
    risk,
    riskHistory,
    voiceMode,
    setVoiceMode,
    notificationsEnabled,
    enableNotifications,
    onSOS,
    connectionStatus,
    speak
}) {
    if (title === "Health") {
        return (
            <ModuleShell eyebrow="LIVE HEALTH MONITORING" title="Health Signals"
                description="Current physiological signals from the VITALIS monitoring pipeline.">
                <div className="health-grid">
                    <HealthMetric title="HEART RATE" value={health?.heartRate} unit="BPM" baseline="LIVE STREAM" />
                    <HealthMetric title="SpO₂" value={health?.spo2} unit="%" baseline="LIVE STREAM" />
                    <HealthMetric title="BODY TEMPERATURE" value={health?.bodyTemperature} unit="°C" baseline="LIVE STREAM" />
                    <HealthMetric title="ACTIVITY" value={health?.activity} unit="INDEX" baseline="LIVE STREAM" />
                </div>
            </ModuleShell>
        );
    }

    if (title === "Environment") {
        return (
            <ModuleShell eyebrow="LIVE ENVIRONMENT" title="Environmental Intelligence"
                description="Live Bengaluru environmental conditions from Open-Meteo/CAMS.">
                <EnvironmentPanel environment={environment} />
                <div className="source-note">
                    LIVE SOURCE · Open-Meteo weather + CAMS air-quality model
                </div>
            </ModuleShell>
        );
    }

    if (title === "AI Risk" || title === "Risk Analysis") {
        return (
            <ModuleShell eyebrow="ARTIFICIAL INTELLIGENCE" title="Risk Analysis"
                description="AI-assisted assessment combining physiological and environmental signals.">
                <RiskPanel risk={risk} health={health} environment={environment} />
                <div className="panel detail-panel">
                    <h2>How VITALIS assesses risk</h2>
                    <p>Current health signals are evaluated together with environmental exposure and the AI risk engine.</p>
                    <p>Risk score: <strong>{Number(risk?.riskScore || 0).toFixed(1)}/100</strong></p>
                    <p>Risk level: <strong>{risk?.riskLevel || "WAITING"}</strong></p>
                </div>
            </ModuleShell>
        );
    }

    if (title === "Digital Twin") {
        return (
            <ModuleShell eyebrow="PERSONAL MODEL" title="Digital Twin"
                description="Adaptive personal health baseline and current physiological state.">
                <DigitalTwin health={health} />
            </ModuleShell>
        );
    }

    if (title === "Health History") {
        return (
            <ModuleShell eyebrow="HISTORICAL INTELLIGENCE" title="Health History"
                description="Recent AI risk observations from the VITALIS system.">
                <RiskChart history={riskHistory} />
            </ModuleShell>
        );
    }

    if (title === "Safety Mode") {
        const aqi = Number(environment?.aqi || 0);
        const temperature = Number(environment?.temperature ?? environment?.ambientTemperature ?? 0);
        const pm25 = Number(environment?.pm25 || 0);

        return (
            <ModuleShell eyebrow="RESILIENCE SYSTEM" title="Safety Mode"
                description="Context-aware protection during environmental and emergency situations.">
                <div className="panel">
                    <div className="panel-label">CURRENT SAFETY CONDITIONS</div>
                    <div className="disaster-grid">
                        <div><span>Temperature</span><strong>{temperature || "--"} °C</strong></div>
                        <div><span>AQI</span><strong>{aqi || "--"}</strong></div>
                        <div><span>PM2.5</span><strong>{pm25 || "--"} μg/m³</strong></div>
                    </div>
                    <div className="guidance-box">
                        {temperature >= 35 && (
                            <p>HEAT SAFETY: Stay hydrated, reduce outdoor activity and move to a cool indoor environment.</p>
                        )}
                        {aqi >= 150 && (
                            <p>AIR QUALITY SAFETY: Reduce prolonged outdoor exposure and follow local health guidance.</p>
                        )}
                        {temperature < 35 && aqi < 150 && (
                            <p>No major environmental stress condition detected. Continue normal precautions.</p>
                        )}
                    </div>
                </div>
            </ModuleShell>
        );
    }

    if (title === "Safety Map") {
        return <SafetyMap speak={speak} />;
    }

    if (title === "Safety Guidance") {
        return (
            <ModuleShell eyebrow="RESILIENCE" title="Safety Guidance"
                description="Recommended protective actions based on current environmental conditions.">
                <div className="panel">
                    <h2>Recommended Actions</h2>
                    <div className="guidance-list">
                        <p>01 · Move toward a cool indoor environment during extreme heat.</p>
                        <p>02 · Minimize prolonged outdoor exposure when air quality deteriorates.</p>
                        <p>03 · Keep emergency contacts accessible during elevated health risk.</p>
                        <p>04 · Follow official local disaster and weather advisories.</p>
                    </div>
                </div>
            </ModuleShell>
        );
    }

    if (title === "Emergency Help") {
        return (
            <ModuleShell eyebrow="EMERGENCY RESPONSE" title="Emergency Help"
                description="Emergency response interface for high-risk situations.">
                <div className="panel emergency-panel">
                    <div className="panel-label">CURRENT AI RISK</div>
                    <div className="risk-score">
                        <strong>{Number(risk?.riskScore || 0).toFixed(1)}</strong>
                        <span>/100</span>
                    </div>
                    <div className="risk-note">{risk?.riskLevel || "WAITING FOR AI ANALYSIS"}</div>
                    <button className="emergency-button large" onClick={onSOS}>
                        ACTIVATE EMERGENCY SOS
                    </button>
                    <p>One click runs the same emergency pipeline used for automatically detected critical danger.</p>
                    <div className="guidance-list">
                        <p>01 · Automatic critical-risk detection activates this protocol.</p>
                        <p>02 · Voice guidance announces the emergency for blind users.</p>
                        <p>03 · Current health, environment and AI-risk context are captured.</p>
                        <p>04 · Emergency event is recorded for the demonstration workflow.</p>
                        <p>05 · CALL 112 opens the device emergency calling interface.</p>
                    </div>
                </div>
            </ModuleShell>
        );
    }

    if (title === "Device") {
        return (
            <ModuleShell eyebrow="DEVICE" title="Device Monitoring"
                description="Wearable and VITALIS data-stream status.">
                <div className="panel">
                    <h2>Monitoring Connection</h2>
                    <p>Status: <strong>{connectionStatus === "LIVE" ? "HEALTH STREAM ACTIVE" : "WAITING"}</strong></p>
                    <p>Environment: <strong>{environment ? "LIVE" : "WAITING"}</strong></p>
                    <p>AI Engine: <strong>{risk ? "ONLINE" : "WAITING"}</strong></p>
                </div>
            </ModuleShell>
        );
    }

    if (title === "Settings") {
        return (
            <ModuleShell eyebrow="ACCESSIBILITY & SYSTEM" title="Settings"
                description="Configure accessibility and browser health notifications.">
                <div className="panel">
                    <h2>Accessibility</h2>
                    <label className="setting-row">
                        <input
                            type="checkbox"
                            checked={voiceMode}
                            onChange={(event) => {
                                const enabled = event.target.checked;
                                setVoiceMode(enabled);
                                localStorage.setItem("vitalis_voice_mode", String(enabled));
                                if (enabled) {
                                    speak("VITALIS voice accessibility enabled.", true);
                                }
                            }}
                        />
                        Automatic Voice Accessibility
                    </label>
                    <p>
                        VITALIS can automatically announce important health and safety alerts.
                        Voice accessibility is intended for users who need spoken assistance.
                    </p>

                    <hr />

                    <h2>Accessibility Needs</h2>
                    <p>
                        Tell VITALIS if you have a visual disability or another accessibility need
                        that requires spoken assistance. This setting controls accessibility features
                        only; it does not diagnose or assess a medical condition.
                    </p>

                    <label className="setting-row">
                        <span>Do you have a visual disability or accessibility need?</span>
                        <select
                            value={localStorage.getItem("vitalis_accessibility_need") || "no"}
                            onChange={(event) => {
                                const needsAccessibility = event.target.value === "yes";
                                localStorage.setItem(
                                    "vitalis_accessibility_need",
                                    event.target.value
                                );

                                if (needsAccessibility) {
                                    setVoiceMode(true);
                                    localStorage.setItem("vitalis_voice_mode", "true");
                                    speak(
                                        "VITALIS accessibility mode is now enabled. Important health and safety alerts will be announced automatically.",
                                        true
                                    );
                                }
                            }}
                        >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </label>

                    <p className="settings-note">
                        When Yes is selected, VITALIS automatically turns on voice accessibility
                        and keeps it enabled for future sessions.
                    </p>
                    <hr />

                    <h2>Notifications</h2>
                    <button className="secondary-button" onClick={enableNotifications}>
                        {notificationsEnabled ? "NOTIFICATIONS ENABLED" : "ENABLE HEALTH NOTIFICATIONS"}
                    </button>
                    <p>
                        VITALIS automatically uses browser notifications after notification
                        permission is granted. Alerts can appear even when the user is on
                        another browser tab.
                    </p>
                    <div className="settings-status">
                        <strong>Automatic safety communication</strong>
                        <span>Voice alerts: {voiceMode ? "ON" : "OFF"}</span>
                        <span>Browser notifications: {notificationsEnabled ? "ON" : "WAITING FOR PERMISSION"}</span>
                        <span>Predictive monitoring: ON</span>
                    </div>
                </div>
            </ModuleShell>
        );
    }

    return (
        <ModuleShell eyebrow="VITALIS MODULE" title={title}
            description="VITALIS health intelligence module.">
            <div className="panel">
                <h2>{title}</h2>
                <p>This module is active inside the VITALIS platform.</p>
            </div>
        </ModuleShell>
    );
}

function ModuleShell({ eyebrow, title, description, children }) {
    return (
        <div className="module-page">
            <div className="eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
            <p>{description}</p>
            <div className="module-content">{children}</div>
        </div>
    );
}

function HealthMetric({ title, value, unit, baseline }) {
    return (
        <div className="health-card">
            <div className="health-card-top">
                <span>{title}</span>
                <span className="live-label">LIVE</span>
            </div>
            <div className="health-value">
                {value ?? "--"} <small>{unit}</small>
            </div>
            <div className="health-baseline">{baseline}</div>
        </div>
    );
}

function RiskPanel({ risk, health, environment }) {
    const score = Number(risk?.riskScore || 0);
    const level =
        risk?.riskLevel ||
        (score >= 70 ? "CRITICAL" : score >= 40 ? "WARNING" : "SAFE");

    return (
        <div className={`panel risk-panel ${level.toLowerCase()}`}>
            <div className="panel-header">
                <div>
                    <div className="panel-label">AI RISK ENGINE</div>
                    <h2>Personal Risk</h2>
                    <p>AI-assisted live risk estimation</p>
                </div>
                <div className="risk-level">{level}</div>
            </div>

            <div className="risk-score">
                <strong>{score.toFixed(1)}</strong>
                <span>/100</span>
            </div>

            <div className="risk-track">
                <span style={{ width: `${Math.min(score, 100)}%` }}></span>
            </div>

            <div className="risk-note">
                {risk
                    ? "Risk is calculated from current physiological signals and environmental conditions."
                    : "Waiting for live AI risk analysis."}
            </div>

            {risk && (
                <div className="risk-reasons">
                    <div className="panel-label">WHY THIS RISK IS HAPPENING</div>
                    <div className="risk-reason-list">
                        {getRiskReasons(health, environment, score).map((reason, index) => (
                            <div key={index} className="risk-reason-item">{reason}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function EnvironmentPanel({ environment }) {
    const temperature =
        environment?.ambientTemperature ?? environment?.temperature;

    return (
        <div className="panel environment-panel">
            <div className="panel-header">
                <div>
                    <div className="panel-label">LIVE ENVIRONMENT</div>
                    <h2>Bengaluru Conditions</h2>
                    <p>Current environmental health context</p>
                </div>
                <div className="environment-state">
                    {environment?.live ? "LIVE" : "WAITING"}
                </div>
            </div>

            <div className="environment-grid">
                <EnvironmentMetric title="TEMPERATURE" value={temperature} unit="°C" />
                <EnvironmentMetric title="HUMIDITY" value={environment?.humidity} unit="%" />
                <EnvironmentMetric title="AQI" value={environment?.aqi} unit="" />
                <EnvironmentMetric title="PM2.5" value={environment?.pm25} unit=" μg/m³" />
            </div>

            <div className="environment-rating">
                <span>ENVIRONMENT RATING</span>
                <strong>{environment?.rating || "--"}</strong>
                {environment?.environmentScore !== undefined && (
                    <small>{environment.environmentScore}/100</small>
                )}
            </div>

            <div className="source-note">
                Source: {environment?.source || "Waiting for live source"}
            </div>
        </div>
    );
}

function EnvironmentMetric({ title, value, unit }) {
    return (
        <div className="environment-metric">
            <span>{title}</span>
            <strong>{value ?? "--"}{value !== undefined && value !== null ? unit : ""}</strong>
        </div>
    );
}

function RiskChart({ history = [] }) {
    const values = history
        .slice(0, 10)
        .reverse()
        .map((item) => Number(item.riskScore || 0));

    if (!values.length) {
        return <div className="chart-panel empty">Waiting for risk history...</div>;
    }

    return (
        <div className="chart-panel">
            <div className="chart">
                {values.map((value, index) => (
                    <div className="chart-column" key={index}>
                        <div className="chart-number">{value.toFixed(1)}</div>
                        <div className="chart-bar">
                            <span style={{ height: `${Math.max(value, 5)}%` }}></span>
                        </div>
                        <div className="chart-index">{index + 1}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DigitalTwin({ health }) {
    const metrics = [
        { name: "Heart Rate", current: health?.heartRate },
        { name: "SpO₂", current: health?.spo2 },
        { name: "Body Temperature", current: health?.bodyTemperature },
        { name: "Activity", current: health?.activity }
    ];

    return (
        <div className="twin-panel">
            <div className="twin-description">
                <div className="twin-mark">VT</div>
                <div>
                    <div className="panel-label">PERSONAL MODEL</div>
                    <h2>Adaptive Health Baseline</h2>
                    <p>
                        VITALIS learns individual physiological patterns
                        to understand deviations from personal normal.
                    </p>
                </div>
            </div>

            <div className="twin-metrics">
                {metrics.map((metric) => (
                    <div className="twin-metric" key={metric.name}>
                        <span>{metric.name}</span>
                        <strong>Adaptive</strong>
                        <small>Current: {metric.current ?? "--"}</small>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SystemStatus({ title, value }) {
    return (
        <div className="system-card">
            <span>{title}</span>
            <strong>{value}</strong>
        </div>
    );
}

function SectionTitle({ title, subtitle }) {
    return (
        <div className="section-title">
            <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
            </div>
        </div>
    );
}

export default App;
