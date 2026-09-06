from services.data_loader import get_health_readings
from services.baseline import calculate_baseline
from services.anomaly_detector import detect_anomaly
from services.risk_engine import calculate_risk


USER_ID = "e133e0f7-5f25-4c71-a012-59ddd3cc3309"

readings = get_health_readings(
    USER_ID,
    limit=20
)

baseline = calculate_baseline(readings)

current_health = {
    "heartRate": 108,
    "spo2": 96,
    "bodyTemperature": 38.2,
    "activity": 72
}

environment = {
    "ambientTemperature": 42.5,
    "humidity": 72,
    "aqi": 180,
    "pm25": 95
}

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

print("\n VITALIS AI RISK ENGINE")
print("============================")

print(f"\n Rule Risk Score : {result['ruleScore']}/100")
print(f"ML Anomaly Score: {result['anomalyScore']}/100")
print(f"Final Risk Score: {result['riskScore']}/100")
print(f"Risk Level      : {result['riskLevel']}")

print("\n Explanation")
print("----------------------------")

for explanation in result["explanation"]:
    print("•", explanation)