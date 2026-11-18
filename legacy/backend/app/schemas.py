from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class WorkoutSetIn(BaseModel):
    workout_date: date
    exercise: str
    set_number: int = Field(ge=1)
    reps: int = Field(ge=1)
    weight: float = Field(ge=0)
    notes: str = ""


class WorkoutSetOut(BaseModel):
    id: int
    workout_date: str
    exercise: str
    set_number: int
    reps: int
    weight: float
    notes: str | None = None


class DashboardMetrics(BaseModel):
    total_sets: int
    total_sessions: int
    total_exercises: int
    streak_days: int
    total_volume_tonnes: float


class PersonalRecord(BaseModel):
    exercise: str
    max_weight: float
    achieved_on: str
    muscle_group: str | None = None


class WeeklyVolumePoint(BaseModel):
    week: str
    total_volume: float


class MuscleVolumePoint(BaseModel):
    muscle_group: str
    total_volume: float


class StagnationResult(BaseModel):
    exercise: str
    is_stagnating: bool
    is_declining: bool
    trend: float
    sessions_checked: int
    last_weight: float | None = None


class TrainResult(BaseModel):
    message: str
    trained: bool
    weight_mae: float | None = None
    reps_mae: float | None = None
    samples: int | None = None


class PredictionResult(BaseModel):
    exercise: str
    suggested_weight: float
    suggested_reps: float


class FeatureImportance(BaseModel):
    feature: str
    importance: float


class ModelComparisonEntry(BaseModel):
    model: str
    weight_mae: float
    reps_mae: float
