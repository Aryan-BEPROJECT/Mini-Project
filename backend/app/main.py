import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import joblib
import pandas as pd

from .database import get_db
from .models import Machine, Prediction

DEFAULT_FRONTEND_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", DEFAULT_FRONTEND_ORIGINS).split(",")
    if origin.strip()
]


app = FastAPI(
    title="AI Predictive Maintenance API",
    description="AI-powered machine failure prediction and anomaly detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load("models/random_forest_pipeline.joblib")
anomaly_model = joblib.load("models/isolation_forest.joblib")

class MachineData(BaseModel):
    machine_id: int
    machine_type: str
    air_temperature: float
    process_temperature: float
    rotational_speed: float
    torque: float
    tool_wear: float


@app.get("/")
def root():
    return {
        "message": "AI Predictive Maintenance API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.post("/api/predict")
def predict_failure(data: MachineData, db: Session = Depends(get_db)):

    input_data = pd.DataFrame([{
        "Type": data.machine_type,
        "Air temperature [K]": data.air_temperature,
        "Process temperature [K]": data.process_temperature,
        "Rotational speed [rpm]": data.rotational_speed,
        "Torque [Nm]": data.torque,
        "Tool wear [min]": data.tool_wear
    }])

    # 1. Failure prediction
    failure_probability = model.predict_proba(input_data)[0][1]

    # 2. Anomaly detection
    sensor_data = input_data[
        [
            "Air temperature [K]",
            "Process temperature [K]",
            "Rotational speed [rpm]",
            "Torque [Nm]",
            "Tool wear [min]"
        ]
    ]

    anomaly_result = anomaly_model.predict(sensor_data)[0]

    is_anomaly = anomaly_result == -1

    # 3. Risk calculation
    if failure_probability >= 0.80 and is_anomaly:
        risk_level = "CRITICAL"
    elif failure_probability >= 0.70:
        risk_level = "HIGH"
    elif failure_probability >= 0.40 or is_anomaly:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # 4. Save prediction
    prediction = Prediction(
        machine_id=data.machine_id,
        failure_probability=float(failure_probability),
        risk_level=risk_level,
        is_anomaly=bool(is_anomaly)
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return {
        "prediction_id": prediction.id,
        "machine_id": prediction.machine_id,
        "failure_probability": round(float(failure_probability), 4),
        "is_anomaly": bool(is_anomaly),
        "risk_level": risk_level
    }


@app.get("/api/machines")
def get_machines(db: Session = Depends(get_db)):

    machines = db.query(Machine).all()

    return [
        {
            "id": machine.id,
            "name": machine.name,
            "type": machine.type,
            "location": machine.location,
            "status": machine.status
        }
        for machine in machines
    ]


@app.get("/api/predictions")
def get_predictions(db: Session = Depends(get_db)):
    try:
        predictions = (
            db.query(Prediction)
            .order_by(Prediction.created_at.desc(), Prediction.id.desc())
            .all()
        )
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve predictions",
        ) from error

    return [
        {
            "id": prediction.id,
            "machine_id": prediction.machine_id,
            "failure_probability": prediction.failure_probability,
            "is_anomaly": prediction.is_anomaly,
            "risk_level": prediction.risk_level,
            "created_at": prediction.created_at,
        }
        for prediction in predictions
    ]