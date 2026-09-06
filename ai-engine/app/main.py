from fastapi import FastAPI

from app.services.data_loader import get_health_readings
from app.services.baseline import calculate_baseline
from app.services.anomaly_detector import detect_anomaly
from app.services.risk_engine import calculate_risk


app = FastAPI(
    title="VITALIS AI ENGINE",
    description="AI-powered Personal Health Digital Twin",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "project": "VITALIS",
        "service": "AI Engine",
        "status": "online"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "VITALIS AI Engine"
    }


@app.post("/predict")
def predict(data: dict):

    user_id = data.get("userId")

    current_health = data.get("health", {})
    environment = data.get("environment", {})

    readings = get_health_readings(
        user_id,
        limit=20
    )

    baseline = calculate_baseline(readings)

    anomaly = detect_anomaly(
        readings,
        current_health
    )

    result = calculate_risk(
        current_health,
        baseline,
        environment,
        anomaly
    )

    return {
        "userId": user_id,
        "baseline": baseline,
        "anomaly": anomaly,
        "risk": result
    }