import pandas as pd

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)


# --------------------------------------------------
# 1. Load dataset
# --------------------------------------------------

df = pd.read_csv("data/ai4i2020.csv")


# --------------------------------------------------
# 2. Select features and target
# --------------------------------------------------

features = [
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]"
]

target = "Machine failure"

X = df[features]
y = df[target]


# --------------------------------------------------
# 3. Identify categorical and numerical features
# --------------------------------------------------

categorical_features = ["Type"]

numerical_features = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]"
]


# --------------------------------------------------
# 4. Create preprocessing pipeline
# --------------------------------------------------

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        ),
        (
            "numerical",
            "passthrough",
            numerical_features
        )
    ]
)


# --------------------------------------------------
# 5. Train/Test Split
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# --------------------------------------------------
# 6. Fit preprocessing only on training data
# --------------------------------------------------

X_train_processed = preprocessor.fit_transform(X_train)
X_test_processed = preprocessor.transform(X_test)


# --------------------------------------------------
# 7. Display results
# --------------------------------------------------

print("Original dataset:")
print("X:", X.shape)
print("y:", y.shape)

print("\nTraining data:")
print("X_train:", X_train.shape)
print("y_train:", y_train.shape)

print("\nTesting data:")
print("X_test:", X_test.shape)
print("y_test:", y_test.shape)

print("\nProcessed training shape:")
print(X_train_processed.shape)

print("\nProcessed testing shape:")
print(X_test_processed.shape)

print("\nPreprocessing completed successfully!")

# --------------------------------------------------
# 8. Build Logistic Regression model
# --------------------------------------------------

model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "classifier",
            LogisticRegression(
                max_iter=1000,
                class_weight="balanced"
            )
        )
    ]
)


# --------------------------------------------------
# 9. Train model
# --------------------------------------------------

model.fit(X_train, y_train)


# --------------------------------------------------
# 10. Make predictions
# --------------------------------------------------

y_pred = model.predict(X_test)


# --------------------------------------------------
# 11. Evaluate model
# --------------------------------------------------

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print("\n==============================")
print("LOGISTIC REGRESSION RESULTS")
print("==============================")

print(f"Accuracy:  {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# --------------------------------------------------
# 12. Random Forest Model
# --------------------------------------------------

random_forest = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=200,
                random_state=42,
                class_weight="balanced",
                n_jobs=-1
            )
        )
    ]
)


# --------------------------------------------------
# 13. Train Random Forest
# --------------------------------------------------

random_forest.fit(X_train, y_train)


# --------------------------------------------------
# 14. Make predictions
# --------------------------------------------------

rf_pred = random_forest.predict(X_test)


# --------------------------------------------------
# 15. Evaluate Random Forest
# --------------------------------------------------

rf_accuracy = accuracy_score(y_test, rf_pred)
rf_precision = precision_score(y_test, rf_pred)
rf_recall = recall_score(y_test, rf_pred)
rf_f1 = f1_score(y_test, rf_pred)

print("\n==============================")
print("RANDOM FOREST RESULTS")
print("==============================")

print(f"Accuracy:  {rf_accuracy:.4f}")
print(f"Precision: {rf_precision:.4f}")
print(f"Recall:    {rf_recall:.4f}")
print(f"F1 Score:  {rf_f1:.4f}")

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, rf_pred))

print("\nClassification Report:")
print(classification_report(y_test, rf_pred))

# --------------------------------------------------
# 16. Failure Probability
# --------------------------------------------------

failure_probability = random_forest.predict_proba(X_test)[:, 1]

print("\nFirst 10 Failure Probabilities:")

for i, probability in enumerate(failure_probability[:10]):
    print(
        f"Machine {i + 1}: "
        f"{probability * 100:.2f}% failure probability"
    )

    # --------------------------------------------------
# 17. Risk Classification
# --------------------------------------------------

def get_risk_level(probability):
    if probability < 0.30:
        return "LOW"
    elif probability < 0.70:
        return "MEDIUM"
    else:
        return "HIGH"


print("\nRisk Classification:")

for i, probability in enumerate(failure_probability[:10]):
    risk = get_risk_level(probability)

    print(
        f"Machine {i + 1}: "
        f"{probability * 100:.2f}% → {risk}"
    )

joblib.dump(random_forest, "models/random_forest_pipeline.joblib")

print("Random Forest model saved successfully.")
