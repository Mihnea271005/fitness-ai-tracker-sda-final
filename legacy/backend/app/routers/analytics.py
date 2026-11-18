from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.analytics import (
    compute_workout_streak,
    detect_stagnation,
    get_personal_records,
    get_total_volume_per_muscle,
    get_weekly_volume,
)
from src.constants import MUSCLE_GROUPS
from src.database import load_sets

from backend.app.schemas import (
    DashboardMetrics,
    MuscleVolumePoint,
    PersonalRecord,
    StagnationResult,
    WeeklyVolumePoint,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardMetrics)
def dashboard() -> DashboardMetrics:
    df = load_sets()
    if df.empty:
        return DashboardMetrics(
            total_sets=0, total_sessions=0, total_exercises=0,
            streak_days=0, total_volume_tonnes=0.0,
        )
    total_sessions = df[["workout_date", "exercise"]].drop_duplicates().shape[0]
    return DashboardMetrics(
        total_sets=len(df),
        total_sessions=total_sessions,
        total_exercises=df["exercise"].nunique(),
        streak_days=compute_workout_streak(df),
        total_volume_tonnes=round((df["reps"] * df["weight"]).sum() / 1000, 1),
    )


@router.get("/personal-records", response_model=list[PersonalRecord])
def personal_records() -> list[dict]:
    df = load_sets()
    prs = get_personal_records(df)
    if prs.empty:
        return []
    prs = prs.copy()
    prs["muscle_group"] = prs["exercise"].map(MUSCLE_GROUPS)
    return prs.to_dict(orient="records")


@router.get("/weekly-volume", response_model=list[WeeklyVolumePoint])
def weekly_volume(exercise: str = Query(...)) -> list[dict]:
    df = load_sets()
    result = get_weekly_volume(df, exercise)
    if result.empty:
        return []
    out = result.copy()
    out["week"] = out["week"].astype(str)
    return out.to_dict(orient="records")


@router.get("/muscle-volume", response_model=list[MuscleVolumePoint])
def muscle_volume() -> list[dict]:
    df = load_sets()
    result = get_total_volume_per_muscle(df, MUSCLE_GROUPS)
    return result.to_dict(orient="records") if not result.empty else []


@router.get("/stagnation", response_model=StagnationResult)
def stagnation(exercise: str = Query(...)) -> StagnationResult:
    df = load_sets()
    if df.empty:
        raise HTTPException(404, "No data logged yet.")
    result = detect_stagnation(df, exercise)
    return StagnationResult(exercise=exercise, **result)
