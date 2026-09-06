import pandas as pd
import numpy as np


def calculate_baseline(readings):
    """
    Calculate a personal health baseline
    from historical health readings.
    """

    if not readings:
        return {
            "heartRate": None,
            "spo2": None,
            "bodyTemperature": None,
            "activity": None
        }

    df = pd.DataFrame(readings)

    baseline = {}

    columns = [
        "heartRate",
        "spo2",
        "bodyTemperature",
        "activity"
    ]

    for column in columns:

        if column in df.columns:

            values = pd.to_numeric(
                df[column],
                errors="coerce"
            ).dropna()

            if len(values) > 0:

                baseline[column] = {
                    "mean": round(float(values.mean()), 2),
                    "std": round(float(values.std()), 2),
                    "min": round(float(values.min()), 2),
                    "max": round(float(values.max()), 2)
                }

            else:
                baseline[column] = None

        else:
            baseline[column] = None

    return baseline