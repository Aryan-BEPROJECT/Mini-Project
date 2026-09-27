def calculate_risk(failure_probability, is_anomaly):
    """
    Combine ML failure probability and anomaly detection
    into an operational risk level.
    """

    if failure_probability >= 0.80 and is_anomaly:
        return "CRITICAL"

    elif failure_probability >= 0.70:
        return "HIGH"

    elif failure_probability >= 0.40 or is_anomaly:
        return "MEDIUM"

    else:
        return "LOW"


def get_recommendation(risk_level):
    recommendations = {
        "LOW": "Continue normal monitoring.",
        "MEDIUM": "Schedule inspection and monitor sensor trends.",
        "HIGH": "Schedule maintenance inspection soon.",
        "CRITICAL": "Prioritize maintenance and inspect machine immediately."
    }

    return recommendations[risk_level]


# --------------------------------------------------
# Test the risk engine
# --------------------------------------------------

test_cases = [
    (0.10, False),
    (0.45, False),
    (0.30, True),
    (0.75, False),
    (0.85, True)
]

print("Risk Engine Test Results:\n")

for probability, anomaly in test_cases:

    risk = calculate_risk(
        probability,
        anomaly
    )

    recommendation = get_recommendation(risk)

    print(
        f"Failure Probability: {probability * 100:.0f}% | "
        f"Anomaly: {anomaly} | "
        f"Risk: {risk}"
    )

    print(f"Recommendation: {recommendation}\n")