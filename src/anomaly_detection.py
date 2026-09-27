import pandas as pd

import joblib
from sklearn.ensemble import IsolationForest


# --------------------------------------------------
# 1. Load dataset
# --------------------------------------------------

df = pd.read_csv("data/ai4i2020.csv")


# --------------------------------------------------
# 2. Select sensor features
# --------------------------------------------------

sensor_features = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]"
]

X = df[sensor_features]


# --------------------------------------------------
# 3. Use healthy machines to learn normal behavior
# --------------------------------------------------

healthy_data = df[df["Machine failure"] == 0]

X_healthy = healthy_data[sensor_features]

print("Total observations:", len(df))
print("Healthy observations used for learning:", len(X_healthy))


# --------------------------------------------------
# 4. Create Isolation Forest
# --------------------------------------------------

anomaly_model = IsolationForest(
    n_estimators=200,
    contamination=0.03,
    random_state=42
)


# --------------------------------------------------
# 5. Train on healthy machine behavior
# --------------------------------------------------

anomaly_model.fit(X_healthy)

joblib.dump(
    anomaly_model,
    "models/isolation_forest.joblib"
)

print("Isolation Forest model saved successfully.")


# --------------------------------------------------
# 6. Detect anomalies across all observations
# --------------------------------------------------

anomaly_predictions = anomaly_model.predict(X)


# Isolation Forest:
#  1  = normal
# -1  = anomaly

df["Anomaly"] = anomaly_predictions

df["Anomaly Status"] = df["Anomaly"].map({
    1: "Normal",
    -1: "Anomaly"
})


# --------------------------------------------------
# 7. Display results
# --------------------------------------------------

print("\nAnomaly Distribution:")
print(df["Anomaly Status"].value_counts())

print("\nAnomaly Percentage:")
print(
    df["Anomaly Status"]
    .value_counts(normalize=True) * 100
)


# --------------------------------------------------
# 8. Compare anomalies with actual failures
# --------------------------------------------------

print("\nActual Failure vs Anomaly:")

print(
    pd.crosstab(
        df["Machine failure"],
        df["Anomaly Status"]
    )
)