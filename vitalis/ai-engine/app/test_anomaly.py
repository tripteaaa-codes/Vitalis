from services.data_loader import get_health_readings
from services.anomaly_detector import detect_anomaly


USER_ID = "e133e0f7-5f25-4c71-a012-59ddd3cc3309"

readings = get_health_readings(
    USER_ID,
    limit=20
)

current_health = {
    "heartRate": 108,
    "spo2": 96,
    "bodyTemperature": 38.2,
    "activity": 72
}

result = detect_anomaly(
    readings,
    current_health
)

print("\n VITALIS ML ANOMALY DETECTOR")
print("==============================")

print(f"\nAnomaly Detected : {result['isAnomaly']}")
print(f"Anomaly Score    : {result['anomalyScore']}/100")