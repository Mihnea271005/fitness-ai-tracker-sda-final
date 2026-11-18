from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.constants import EXERCISE_OPTIONS
from src.database import clear_sets, insert_set, load_sets

from backend.app.schemas import WorkoutSetIn, WorkoutSetOut

router = APIRouter(tags=["sets"])


@router.get("/exercises", response_model=list[str])
def list_exercises() -> list[str]:
    return EXERCISE_OPTIONS


@router.get("/sets", response_model=list[WorkoutSetOut])
def get_sets(exercise: str | None = Query(default=None)) -> list[dict]:
    df = load_sets()
    if exercise:
        df = df[df["exercise"] == exercise]
    return df.to_dict(orient="records")


@router.post("/sets", response_model=dict, status_code=201)
def create_set(payload: WorkoutSetIn) -> dict:
    insert_set(
        str(payload.workout_date),
        payload.exercise,
        payload.set_number,
        payload.reps,
        payload.weight,
        payload.notes,
    )
    return {"status": "created"}


@router.delete("/sets")
def delete_all_sets(confirm: bool = Query(default=False)) -> dict:
    if not confirm:
        raise HTTPException(400, "Pass ?confirm=true to wipe all sets.")
    clear_sets()
    return {"status": "cleared"}
