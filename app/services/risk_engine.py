def calculate_risk(
    current_health,
    baseline,
    environment,
    anomaly
):
    current_health = current_health or {}
    baseline = baseline or {}
    environment = environment or {}
    anomaly = anomaly or {}

    rule_score = 0
    explanation = []

    heart_rate = current_health.get("heartRate")
    hr_baseline = baseline.get("heartRate", {})
    hr_mean = hr_baseline.get("mean")

    if heart_rate is not None and hr_mean is not None:
        deviation = abs(heart_rate - hr_mean)

        if deviation >= 25:
            rule_score += 25
            explanation.append(
                f"Heart rate is significantly different from your personal baseline "
                f"({heart_rate:.1f} vs {hr_mean:.1f} BPM)."
            )
        elif deviation >= 15:
            rule_score += 15
            explanation.append(
                f"Heart rate is moderately different from your personal baseline "
                f"({heart_rate:.1f} vs {hr_mean:.1f} BPM)."
            )

    spo2 = current_health.get("spo2")

    if spo2 is not None:
        if spo2 < 90:
            rule_score += 40
            explanation.append(
                f"SpO₂ is critically low at {spo2:.1f}%."
            )
        elif spo2 < 94:
            rule_score += 25
            explanation.append(
                f"SpO₂ is below the preferred range at {spo2:.1f}%."
            )
        elif spo2 < 96:
            rule_score += 10
            explanation.append(
                f"SpO₂ is slightly below the normal range at {spo2:.1f}%."
            )

    temperature = current_health.get("bodyTemperature")

    if temperature is not None:
        if temperature >= 39:
            rule_score += 30
            explanation.append(
                f"Body temperature is significantly elevated at {temperature:.1f}°C."
            )
        elif temperature >= 38:
            rule_score += 20
            explanation.append(
                f"Body temperature is elevated at {temperature:.1f}°C."
            )
        elif temperature <= 35:
            rule_score += 20
            explanation.append(
                f"Body temperature is unusually low at {temperature:.1f}°C."
            )

    aqi = environment.get("aqi")
    pm25 = environment.get("pm25")
    environmental_risk = 0

    if aqi is not None:
        if aqi >= 300:
            environmental_risk += 25
            explanation.append(
                f"Very poor air quality detected (AQI {aqi:.0f})."
            )
        elif aqi >= 200:
            environmental_risk += 18
            explanation.append(
                f"Poor air quality detected (AQI {aqi:.0f})."
            )
        elif aqi >= 150:
            environmental_risk += 12
            explanation.append(
                f"Unhealthy air quality detected (AQI {aqi:.0f})."
            )

    if pm25 is not None:
        if pm25 >= 150:
            environmental_risk += 20
            explanation.append(
                f"High PM2.5 exposure detected ({pm25:.1f})."
            )
        elif pm25 >= 90:
            environmental_risk += 12
            explanation.append(
                f"Elevated PM2.5 exposure detected ({pm25:.1f})."
            )

    rule_score += environmental_risk

    event = environment.get("event")

    if event:
        event_lower = str(event).lower()

        if event_lower not in ["normal", "none", "null", ""]:
            rule_score += 15
            explanation.append(
                f"Environmental event detected: {event}."
            )

    anomaly_score = anomaly.get("score", 0)

    try:
        anomaly_score = float(anomaly_score)
    except (TypeError, ValueError):
        anomaly_score = 0

    anomaly_score = max(0, min(100, anomaly_score))
    rule_score = min(100, rule_score)

    final_score = (
        rule_score * 0.70
        + anomaly_score * 0.30
    )

    final_score = max(0, min(100, final_score))

    if final_score >= 70:
        risk_level = "CRITICAL"
        recommendation = (
            "Immediate attention recommended. "
            "Move to a safe environment, reduce physical exertion "
            "and consider contacting emergency support if symptoms persist."
        )
    elif final_score >= 40:
        risk_level = "WARNING"
        recommendation = (
            "Monitor your condition closely. "
            "Consider reducing exposure to environmental stressors, "
            "resting and rechecking your health signals."
        )
    else:
        risk_level = "SAFE"
        recommendation = (
            "Current signals are within the expected personal range. "
            "Continue normal monitoring."
        )

    if not explanation:
        explanation.append(
            "Current physiological and environmental signals "
            "are close to the learned personal baseline."
        )

    return {
        "riskScore": round(final_score, 2),
        "riskLevel": risk_level,
        "ruleScore": round(rule_score, 2),
        "anomalyScore": round(anomaly_score, 2),
        "explanation": explanation,
        "recommendation": recommendation
    }