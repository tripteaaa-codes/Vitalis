import pandas as pd
from sklearn.ensemble import IsolationForest


def detect_anomaly(readings, current):

    if len(readings) < 5:
        return {
            "isAnomaly": False,
            "anomalyScore": 0
        }

    columns = [
        "heartRate",
        "spo2",
        "bodyTemperature",
        "activity"
    ]

    df = pd.DataFrame(readings)

    df = df[columns].apply(
        pd.to_numeric,
        errors="coerce"
    ).dropna()

    if len(df) < 5:
        return {
            "isAnomaly": False,
            "anomalyScore": 0
        }

    model = IsolationForest(
        contamination=0.1,
        random_state=42
    )

    model.fit(df)

    current_data = pd.DataFrame([{
        column: current.get(column)
        for column in columns
    }])

    if current_data.isnull().any().any():
        return {
            "isAnomaly": False,
            "anomalyScore": 0
        }

    prediction = model.predict(current_data)[0]
    score = model.decision_function(current_data)[0]

    anomaly_score = round(
        max(0, min(100, (0.5 - score) * 100)),
        2
    )

    return {
    "isAnomaly": bool(prediction == -1),
    "anomalyScore": float(anomaly_score)
    }