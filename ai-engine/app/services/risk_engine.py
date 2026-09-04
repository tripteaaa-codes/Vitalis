def calculate_risk(current, baseline, environment, anomaly=None):

    score = 0
    explanations = []

    hr = current.get("heartRate")
    hr_base = baseline.get("heartRate")

    if hr is not None and hr_base:
        deviation = abs(hr - hr_base["mean"])

        if deviation > hr_base["std"] * 3:
            score += 25
            explanations.append(
                "Heart rate is significantly above the personal baseline."
            )

        elif deviation > hr_base["std"] * 2:
            score += 15
            explanations.append(
                "Heart rate is elevated compared with the personal baseline."
            )

    spo2 = current.get("spo2")
    spo2_base = baseline.get("spo2")

    if spo2 is not None and spo2_base:
        deviation = spo2_base["mean"] - spo2

        if deviation > spo2_base["std"] * 3:
            score += 30
            explanations.append(
                "SpO2 is significantly below the personal baseline."
            )

        elif deviation > spo2_base["std"] * 2:
            score += 20
            explanations.append(
                "SpO2 is lower than the personal baseline."
            )

    temperature = current.get("bodyTemperature")
    temp_base = baseline.get("bodyTemperature")

    if temperature is not None and temp_base:
        deviation = temperature - temp_base["mean"]

        if deviation > temp_base["std"] * 3:
            score += 25
            explanations.append(
                "Body temperature is significantly above the personal baseline."
            )

        elif deviation > temp_base["std"] * 2:
            score += 15
            explanations.append(
                "Body temperature is elevated compared with the personal baseline."
            )

    ambient = environment.get("ambientTemperature")
    humidity = environment.get("humidity")
    aqi = environment.get("aqi")
    pm25 = environment.get("pm25")

    if ambient is not None:
        if ambient >= 42:
            score += 20
            explanations.append(
                "Extreme ambient temperature increases heat-stress risk."
            )

        elif ambient >= 38:
            score += 10
            explanations.append(
                "High ambient temperature increases environmental stress."
            )

    if humidity is not None and humidity >= 70:
        score += 10
        explanations.append(
            "High humidity can increase heat stress."
        )

    if aqi is not None:
        if aqi >= 200:
            score += 20
            explanations.append(
                "Very poor air quality increases environmental health stress."
            )

        elif aqi >= 150:
            score += 10
            explanations.append(
                "Poor air quality increases environmental health stress."
            )

    if pm25 is not None and pm25 >= 90:
        score += 15
        explanations.append(
            "High PM2.5 indicates significant particulate pollution."
        )

    score = min(score, 100)

    anomaly_score = 0

    if anomaly:
        anomaly_score = anomaly.get("anomalyScore", 0)

        if anomaly.get("isAnomaly"):
            explanations.append(
                "ML detected an unusual health pattern compared with historical data."
            )

    final_score = round(
        (score * 0.7) + (anomaly_score * 0.3),
        2
    )

    if final_score >= 70:
        risk_level = "CRITICAL"

    elif final_score >= 40:
        risk_level = "WARNING"

    else:
        risk_level = "SAFE"

    return {
        "riskScore": final_score,
        "riskLevel": risk_level,
        "ruleScore": score,
        "anomalyScore": anomaly_score,
        "explanation": explanations
    }