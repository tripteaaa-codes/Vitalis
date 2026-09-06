import { useEffect, useState } from "react";
import {
    login,
    register,
    getCurrentUser,
    getHealthReadings,
    getEnvironmentReadings,
    getRiskHistory,
    analyzeRisk
} from "./api";
import "./App.css";

const menu = [
    {
        title: "OVERVIEW",
        items: ["Dashboard", "Health", "Environment", "AI Risk"]
    },
    {
        title: "INTELLIGENCE",
        items: ["Digital Twin", "Risk Analysis", "Health History"]
    },
    {
        title: "RESILIENCE",
        items: ["Disaster Mode", "Safe Zones", "Emergency"]
    },
    {
        title: "SYSTEM",
        items: ["Device", "Settings"]
    }
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
                <div className="loader-text">
                    Securing Health Intelligence
                </div>
                <div className="loader-bar">
                    <span></span>
                </div>
            </div>
        );
    }

    if (!user) {
        return <AuthScreen onLogin={handleLogin} />;
    }

    return (
        <DashboardApp
            user={user}
            onLogout={handleLogout}
        />
    );
}

function AuthScreen({ onLogin }) {
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        age: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    function updateField(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });

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

                setSuccess(
                    "Account created successfully. You can now sign in."
                );

                setMode("login");

                setForm({
                    name: "",
                    email: form.email,
                    password: "",
                    age: ""
                });
            } else {
                const data = await login({
                    email: form.email,
                    password: form.password
                });

                onLogin(data);
            }
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to connect to VITALIS."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-shell">
                <div className="auth-brand-panel">
                    <div>
                        <div className="auth-brand">
                            <span>V</span>
                            VITALIS
                        </div>

                        <div className="auth-label">
                            PERSONAL HEALTH INTELLIGENCE
                        </div>

                        <h1>
                            Understand your health
                            <br />
                            before it becomes
                            <br />
                            an emergency.
                        </h1>

                        <p>
                            AI-powered continuous health monitoring
                            that combines personal physiological
                            patterns with environmental conditions.
                        </p>
                    </div>

                    <div className="auth-features">
                        <div>
                            <strong>01</strong>
                            PERSONAL BASELINE
                        </div>

                        <div>
                            <strong>02</strong>
                            ENVIRONMENTAL INTELLIGENCE
                        </div>

                        <div>
                            <strong>03</strong>
                            EARLY RISK DETECTION
                        </div>
                    </div>
                </div>

                <div className="auth-form-panel">
                    <div className="auth-form-header">
                        <div className="eyebrow">
                            VITALIS SECURE ACCESS
                        </div>

                        <h2>
                            {mode === "login"
                                ? "Welcome back"
                                : "Create your account"}
                        </h2>

                        <p>
                            {mode === "login"
                                ? "Sign in to access your personal health intelligence."
                                : "Create a secure personal profile for VITALIS monitoring."}
                        </p>
                    </div>

                    {error && (
                        <div className="auth-message error">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="auth-message success">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {mode === "register" && (
                            <>
                                <label>
                                    FULL NAME
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={updateField}
                                        placeholder="Enter your name"
                                        required
                                    />
                                </label>

                                <label>
                                    AGE
                                    <input
                                        type="number"
                                        name="age"
                                        value={form.age}
                                        onChange={updateField}
                                        placeholder="Optional"
                                        min="1"
                                        max="120"
                                    />
                                </label>
                            </>
                        )}

                        <label>
                            EMAIL ADDRESS
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={updateField}
                                placeholder="you@example.com"
                                required
                            />
                        </label>

                        <label>
                            PASSWORD
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={updateField}
                                placeholder="Minimum 6 characters"
                                minLength="6"
                                required
                            />
                        </label>

                        <button
                            className="auth-submit"
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? "AUTHENTICATING..."
                                : mode === "login"
                                    ? "SIGN IN TO VITALIS"
                                    : "CREATE VITALIS ACCOUNT"}
                        </button>
                    </form>

                    <div className="auth-switch">
                        {mode === "login"
                            ? "Don't have a VITALIS account?"
                            : "Already have a VITALIS account?"}

                        <button
                            onClick={() => {
                                setMode(
                                    mode === "login"
                                        ? "register"
                                        : "login"
                                );
                                setError("");
                                setSuccess("");
                            }}
                        >
                            {mode === "login"
                                ? "Create account"
                                : "Sign in"}
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

function DashboardApp({ user, onLogout }) {
    const [page, setPage] = useState("Dashboard");
    const [health, setHealth] = useState(null);
    const [environment, setEnvironment] = useState(null);
    const [risk, setRisk] = useState(null);
    const [riskHistory, setRiskHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLiveData();

        const timer = setInterval(
            fetchLiveData,
            5000
        );

        return () => clearInterval(timer);
    }, []);

    async function fetchLiveData() {
        try {
            const [
                healthData,
                environmentData
            ] = await Promise.all([
                getHealthReadings(),
                getEnvironmentReadings()
            ]);

            const latestHealth =
                healthData.readings?.[0] || null;

            const latestEnvironment =
                environmentData.readings?.[0] || null;

            setHealth(latestHealth);
            setEnvironment(latestEnvironment);

            if (
                latestHealth &&
                latestEnvironment
            ) {
                const analysis = await analyzeRisk({
                    health: latestHealth,
                    environment: latestEnvironment
                });

                setRisk(
                    analysis.prediction
                );
            }

            const history =
                await getRiskHistory();

            setRiskHistory(
                history.predictions || []
            );
        } catch (error) {
            console.error(
                "VITALIS live data error:",
                error
            );

            if (
                error.response?.status === 401
            ) {
                onLogout();
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="app">
            <Sidebar
                page={page}
                setPage={setPage}
                risk={risk}
                user={user}
                onLogout={onLogout}
            />

            <main className="main">
                <Topbar
                    page={page}
                    user={user}
                />

                <div className="main-scroll">
                    {page === "Dashboard" ? (
                        <Dashboard
                            health={health}
                            environment={environment}
                            risk={risk}
                            riskHistory={riskHistory}
                        />
                    ) : (
                        <ModulePage
                            title={page}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

function Sidebar({
    page,
    setPage,
    risk,
    user,
    onLogout
}) {
    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="brand">
                    <div className="brand-symbol">
                        V
                    </div>

                    <div>
                        <div className="brand-title">
                            VITALIS
                        </div>

                        <div className="brand-subtitle">
                            HEALTH INTELLIGENCE
                        </div>
                    </div>
                </div>

                <div className="live-status">
                    <span className="pulse"></span>
                    <span>LIVE MONITORING</span>
                </div>

                <nav>
                    {menu.map((section) => (
                        <div
                            className="menu-section"
                            key={section.title}
                        >
                            <div className="menu-title">
                                {section.title}
                            </div>

                            {section.items.map(
                                (item) => (
                                    <button
                                        key={item}
                                        className={
                                            page === item
                                                ? "menu-item active"
                                                : "menu-item"
                                        }
                                        onClick={() =>
                                            setPage(item)
                                        }
                                    >
                                        <span>
                                            {item}
                                        </span>

                                        {item ===
                                            "AI Risk" &&
                                            risk && (
                                                <span className="risk-mini">
                                                    {Math.round(
                                                        risk.riskScore ||
                                                        0
                                                    )}
                                                </span>
                                            )}
                                    </button>
                                )
                            )}
                        </div>
                    ))}
                </nav>
            </div>

            <div className="sidebar-bottom">
                <div className="device-card">
                    <div className="device-indicator">
                        <span className="pulse"></span>
                    </div>

                    <div>
                        <div className="device-title">
                            DEVICE CONNECTED
                        </div>

                        <div className="device-text">
                            Continuous monitoring active
                        </div>
                    </div>
                </div>

                <button
                    className="emergency-button"
                    onClick={() =>
                        setPage("Emergency")
                    }
                >
                    EMERGENCY SOS
                </button>

                <button
                    className="logout"
                    onClick={onLogout}
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}

function Topbar({ page, user }) {
    const initial =
        user?.name?.charAt(0)?.toUpperCase() ||
        "U";

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div className="breadcrumb">
                    VITALIS
                    <span>/</span>
                    {page}
                </div>
            </div>

            <div className="topbar-right">
                <div className="system-status">
                    <span className="pulse"></span>
                    SYSTEM OPERATIONAL
                </div>

                <div className="user-profile">
                    <div className="user-avatar">
                        {initial}
                    </div>

                    <div>
                        <div className="user-name">
                            {user?.name ||
                                "Health User"}
                        </div>

                        <div className="user-type">
                            Personal Profile
                        </div>
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
    riskHistory
}) {
    return (
        <div className="dashboard">
            <section className="dashboard-heading">
                <div>
                    <div className="eyebrow">
                        PERSONAL HEALTH INTELLIGENCE
                    </div>

                    <h1>
                        Health Intelligence
                    </h1>

                    <p>
                        Real-time understanding of
                        physiological state,
                        environmental exposure and
                        potential health risk.
                    </p>
                </div>

                <div className="monitoring-badge">
                    <span className="pulse"></span>
                    MONITORING
                </div>
            </section>

            <section className="section">
                <SectionTitle
                    title="LIVE HEALTH SIGNALS"
                    subtitle="Current physiological measurements"
                />

                <div className="health-grid">
                    <HealthMetric
                        title="HEART RATE"
                        value={
                            health?.heartRate ??
                            "--"
                        }
                        unit="BPM"
                        baseline="Personal baseline"
                    />

                    <HealthMetric
                        title="SpO₂"
                        value={
                            health?.spo2 ??
                            "--"
                        }
                        unit="%"
                        baseline="Personal baseline"
                    />

                    <HealthMetric
                        title="BODY TEMPERATURE"
                        value={
                            health?.bodyTemperature ??
                            "--"
                        }
                        unit="°C"
                        baseline="Personal baseline"
                    />

                    <HealthMetric
                        title="ACTIVITY"
                        value={
                            health?.activity ??
                            "--"
                        }
                        unit="INDEX"
                        baseline="Current activity"
                    />
                </div>
            </section>

            <section className="section">
                <SectionTitle
                    title="HUMAN × ENVIRONMENT"
                    subtitle="Personal health combined with environmental context"
                />

                <div className="intelligence-grid">
                    <RiskPanel risk={risk} />

                    <EnvironmentPanel
                        environment={environment}
                    />
                </div>
            </section>

            <section className="section">
                <SectionTitle
                    title="RISK TRAJECTORY"
                    subtitle="Recent AI-generated risk observations"
                />

                <RiskChart
                    history={riskHistory}
                />
            </section>

            <section className="section">
                <SectionTitle
                    title="PERSONAL DIGITAL TWIN"
                    subtitle="Learned physiological baseline"
                />

                <DigitalTwin
                    health={health}
                />
            </section>

            <section className="section">
                <SectionTitle
                    title="SYSTEM STATUS"
                    subtitle="VITALIS infrastructure"
                />

                <div className="system-grid">
                    <SystemStatus
                        title="HEALTH MONITORING"
                        value="ACTIVE"
                    />

                    <SystemStatus
                        title="AI ENGINE"
                        value="ONLINE"
                    />

                    <SystemStatus
                        title="ENVIRONMENT"
                        value="ACTIVE"
                    />

                    <SystemStatus
                        title="DATABASE"
                        value="CONNECTED"
                    />
                </div>
            </section>

            <footer className="footer">
                VITALIS · AI-POWERED PERSONAL HEALTH
                DIGITAL TWIN
            </footer>
        </div>
    );
}

function HealthMetric({
    title,
    value,
    unit,
    baseline
}) {
    return (
        <div className="health-card">
            <div className="health-card-top">
                <span>{title}</span>
                <span className="live-label">
                    LIVE
                </span>
            </div>

            <div className="health-value">
                {value}

                <small>
                    {unit}
                </small>
            </div>

            <div className="health-baseline">
                {baseline}
            </div>
        </div>
    );
}

function RiskPanel({ risk }) {
    const score = Number(
        risk?.riskScore || 0
    );

    const level =
        risk?.riskLevel ||
        (score >= 70
            ? "CRITICAL"
            : score >= 40
                ? "WARNING"
                : "SAFE");

    return (
        <div
            className={`panel risk-panel ${level.toLowerCase()}`}
        >
            <div className="panel-header">
                <div>
                    <div className="panel-label">
                        AI RISK ENGINE
                    </div>

                    <h2>
                        Personal Risk
                    </h2>

                    <p>
                        AI-assisted live risk
                        estimation
                    </p>
                </div>

                <div className="risk-level">
                    {level}
                </div>
            </div>

            <div className="risk-score">
                <strong>
                    {score.toFixed(1)}
                </strong>

                <span>/100</span>
            </div>

            <div className="risk-track">
                <span
                    style={{
                        width: `${Math.min(
                            score,
                            100
                        )}%`
                    }}
                ></span>
            </div>

            <div className="risk-note">
                {risk
                    ? "Risk is calculated from current physiological signals, personal baseline and environmental conditions."
                    : "Waiting for live AI risk analysis."}
            </div>
        </div>
    );
}

function EnvironmentPanel({
    environment
}) {
    return (
        <div className="panel environment-panel">
            <div className="panel-header">
                <div>
                    <div className="panel-label">
                        ENVIRONMENT
                    </div>

                    <h2>
                        Current Conditions
                    </h2>

                    <p>
                        Environmental health
                        context
                    </p>
                </div>

                <div className="environment-state">
                    MONITORING
                </div>
            </div>

            <div className="environment-grid">
                <EnvironmentMetric
                    title="TEMPERATURE"
                    value={
                        environment?.ambientTemperature
                    }
                    unit="°C"
                />

                <EnvironmentMetric
                    title="HUMIDITY"
                    value={
                        environment?.humidity
                    }
                    unit="%"
                />

                <EnvironmentMetric
                    title="AQI"
                    value={
                        environment?.aqi
                    }
                    unit=""
                />

                <EnvironmentMetric
                    title="PM2.5"
                    value={
                        environment?.pm25
                    }
                    unit=""
                />
            </div>
        </div>
    );
}

function EnvironmentMetric({
    title,
    value,
    unit
}) {
    return (
        <div className="environment-metric">
            <span>{title}</span>

            <strong>
                {value ?? "--"}

                {value !== undefined &&
                    unit}
            </strong>
        </div>
    );
}

function RiskChart({ history }) {
    const values = history
        .slice(0, 10)
        .reverse()
        .map((item) =>
            Number(
                item.riskScore || 0
            )
        );

    if (!values.length) {
        return (
            <div className="chart-panel empty">
                Waiting for risk history...
            </div>
        );
    }

    return (
        <div className="chart-panel">
            <div className="chart">
                {values.map(
                    (value, index) => (
                        <div
                            className="chart-column"
                            key={index}
                        >
                            <div className="chart-number">
                                {value.toFixed(
                                    1
                                )}
                            </div>

                            <div className="chart-bar">
                                <span
                                    style={{
                                        height: `${Math.max(
                                            value,
                                            5
                                        )}%`
                                    }}
                                ></span>
                            </div>

                            <div className="chart-index">
                                {index + 1}
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

function DigitalTwin({ health }) {
    const metrics = [
        {
            name: "Heart Rate",
            baseline: "Adaptive",
            current:
                health?.heartRate
        },
        {
            name: "SpO₂",
            baseline: "Adaptive",
            current:
                health?.spo2
        },
        {
            name: "Body Temperature",
            baseline: "Adaptive",
            current:
                health?.bodyTemperature
        },
        {
            name: "Activity",
            baseline: "Adaptive",
            current:
                health?.activity
        }
    ];

    return (
        <div className="twin-panel">
            <div className="twin-description">
                <div className="twin-mark">
                    VT
                </div>

                <div>
                    <div className="panel-label">
                        PERSONAL MODEL
                    </div>

                    <h2>
                        Adaptive Health
                        Baseline
                    </h2>

                    <p>
                        VITALIS learns individual
                        physiological patterns
                        to understand deviations
                        from personal normal.
                    </p>
                </div>
            </div>

            <div className="twin-metrics">
                {metrics.map(
                    (metric) => (
                        <div
                            className="twin-metric"
                            key={metric.name}
                        >
                            <span>
                                {metric.name}
                            </span>

                            <strong>
                                {metric.baseline}
                            </strong>

                            <small>
                                Current:{" "}
                                {metric.current ??
                                    "--"}
                            </small>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

function SystemStatus({
    title,
    value
}) {
    return (
        <div className="system-card">
            <span>{title}</span>
            <strong>{value}</strong>
        </div>
    );
}

function SectionTitle({
    title,
    subtitle
}) {
    return (
        <div className="section-title">
            <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
            </div>
        </div>
    );
}

function ModulePage({ title }) {
    return (
        <div className="module-page">
            <div className="eyebrow">
                VITALIS MODULE
            </div>

            <h1>{title}</h1>

            <p>
                This module is part of the VITALIS
                health intelligence platform and
                will be integrated with its dedicated
                functionality.
            </p>
        </div>
    );
}

export default App;