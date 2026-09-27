import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load dataset
df = pd.read_csv("data/ai4i2020.csv")

# --------------------------------------------------
# 1. Failure distribution
# --------------------------------------------------

print("Machine Failure Distribution:")
print(df["Machine failure"].value_counts())

print("\nFailure Percentage:")
print(df["Machine failure"].value_counts(normalize=True) * 100)


# --------------------------------------------------
# 2. Average sensor values by failure
# --------------------------------------------------

sensor_columns = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]"
]

print("\nAverage Sensor Values by Machine Failure:")
print(df.groupby("Machine failure")[sensor_columns].mean())


# --------------------------------------------------
# 3. Visualizations
# --------------------------------------------------

sns.set_theme(style="whitegrid")


# Torque vs Machine Failure
plt.figure(figsize=(8, 5))
sns.boxplot(
    data=df,
    x="Machine failure",
    y="Torque [Nm]"
)
plt.title("Torque Distribution by Machine Failure")
plt.xlabel("Machine Failure (0 = No, 1 = Yes)")
plt.ylabel("Torque [Nm]")
plt.show()


# Tool Wear vs Machine Failure
plt.figure(figsize=(8, 5))
sns.boxplot(
    data=df,
    x="Machine failure",
    y="Tool wear [min]"
)
plt.title("Tool Wear Distribution by Machine Failure")
plt.xlabel("Machine Failure (0 = No, 1 = Yes)")
plt.ylabel("Tool Wear [min]")
plt.show()


# Rotational Speed vs Machine Failure
plt.figure(figsize=(8, 5))
sns.boxplot(
    data=df,
    x="Machine failure",
    y="Rotational speed [rpm]"
)
plt.title("Rotational Speed Distribution by Machine Failure")
plt.xlabel("Machine Failure (0 = No, 1 = Yes)")
plt.ylabel("RPM")
plt.show()

# --------------------------------------------------
# 4. Correlation Analysis
# --------------------------------------------------

numeric_columns = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
    "Machine failure"
]

correlation_matrix = df[numeric_columns].corr()

print("\nCorrelation Matrix:")
print(correlation_matrix)

# Visualize correlation matrix
plt.figure(figsize=(10, 7))

sns.heatmap(
    correlation_matrix,
    annot=True,
    cmap="coolwarm",
    fmt=".2f"
)

plt.title("Correlation Matrix")
plt.tight_layout()
plt.show()

# --------------------------------------------------
# 5. Prepare features for machine learning
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

print("\nFeatures selected for ML:")
print(X.columns.tolist())

print("\nTarget:")
print(target)

print("\nFeature shape:", X.shape)
print("Target shape:", y.shape)