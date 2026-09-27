from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func

from .database import Base


class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)
    location = Column(String(100))
    status = Column(String(30), default="ACTIVE")
    created_at = Column(DateTime, server_default=func.now())


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    timestamp = Column(DateTime, server_default=func.now())
    air_temperature = Column(Float, nullable=False)
    process_temperature = Column(Float, nullable=False)
    rotational_speed = Column(Float, nullable=False)
    torque = Column(Float, nullable=False)
    tool_wear = Column(Float, nullable=False)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    failure_probability = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    is_anomaly = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class MaintenanceWorkOrder(Base):
    __tablename__ = "maintenance_work_orders"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    issue = Column(String(255), nullable=False)
    priority = Column(String(20), nullable=False)
    status = Column(String(30), default="OPEN")
    assigned_to = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)