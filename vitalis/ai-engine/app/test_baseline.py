from services.data_loader import get_health_readings
from services.baseline import calculate_baseline

USER_ID = "e133e0f7-5f25-4c71-a012-59ddd3cc3309"

readings = get_health_readings(USER_ID, limit=20)

baseline = calculate_baseline(readings)

print("\n VITALIS PERSONAL HEALTH DIGITAL TWIN")

print(f"\n Historical readings: {len(readings)}")

print("\n PERSONAL BASELINE")

for metric, values in baseline.items():
    print(f"\n{metric}:")
    print(values)