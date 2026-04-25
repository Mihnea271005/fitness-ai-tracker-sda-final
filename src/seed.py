from __future__ import annotations

import random
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from src.database import replace_with_dataframe


SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "seed_workouts.csv"

# ─── Training split definition ────────────────────────────────────────────────

PUSH_EXERCISES = ["Bench Press", "Overhead Press", "Incline Dumbbell Press"]
PULL_EXERCISES = ["Barbell Row", "Deadlift", "Pull-Up"]
LEG_EXERCISES = ["Back Squat", "Romanian Deadlift"]

# Starting weights (kg) for a realistic intermediate lifter
_STARTING_WEIGHTS: dict[str, float] = {
    "Bench Press": 60.0,
    "Overhead Press": 40.0,
    "Incline Dumbbell Press": 22.5,
    "Barbell Row": 55.0,
    "Deadlift": 90.0,
    "Pull-Up": 0.0,  # bodyweight only
    "Back Squat": 72.5,
    "Romanian Deadlift": 55.0,
}

# Weight added every 2 sessions (linear progression)
_INCREMENT_KG: dict[str, float] = {
    "Bench Press": 2.5,
    "Overhead Press": 2.5,
    "Incline Dumbbell Press": 2.0,
    "Barbell Row": 2.5,
    "Deadlift": 5.0,
    "Pull-Up": 0.0,
    "Back Squat": 2.5,
    "Romanian Deadlift": 2.5,
}

# Template reps for 3 sets (descending as fatigue sets in)
_STARTING_REPS: dict[str, list[int]] = {
    "Bench Press": [8, 8, 6],
    "Overhead Press": [8, 8, 6],
    "Incline Dumbbell Press": [10, 10, 8],
    "Barbell Row": [8, 8, 6],
    "Deadlift": [5, 5, 4],
    "Pull-Up": [5, 6, 7],
    "Back Squat": [8, 8, 6],
    "Romanian Deadlift": [10, 10, 8],
}

_NOTES_POOL = [
    "forma buna",
    "obosit spre final",
    "solid",
    "greutate grea",
    "usor",
    "muschi obositi",
    "progres vizibil",
    "",
    "",
    "",
    "",
    "",
]


def _generate_sets_for_session(workout_date: date, exercise: str, session_index: int) -> list[dict]:
    """Generate 3 sets for one exercise on one training day."""
    rnd = random.Random(hash((str(workout_date), exercise)) % (2 ** 31))

    base = _STARTING_WEIGHTS[exercise]
    inc = _INCREMENT_KG[exercise]

    # Progressive overload: weight increases every 2 sessions
    steps = session_index // 2
    top_weight = base + steps * inc

    # Planned deload every 8th session: 10 % reduction to simulate recovery week
    if session_index > 0 and session_index % 8 == 0:
        top_weight = round(top_weight * 0.90 / 2.5) * 2.5

    # Three sets: warm-up → working → optional PR attempt
    if exercise == "Pull-Up":
        # Bodyweight only, no increments
        set_weights = [0.0, 0.0, 0.0]
    else:
        warmup = max(base, top_weight - inc)
        working = top_weight
        pr_attempt = top_weight + (inc if session_index % 3 == 0 else 0)
        set_weights = [warmup, working, pr_attempt]

    reps_template = list(_STARTING_REPS[exercise])

    # Pull-Up: increase reps over sessions instead of weight
    if exercise == "Pull-Up":
        bonus = session_index // 3
        reps_template = [min(12, r + bonus) for r in reps_template]

    rows = []
    for i, (w, base_r) in enumerate(zip(set_weights, reps_template), start=1):
        actual_reps = max(1, base_r + rnd.choice([-1, 0, 0, 1]))
        rows.append(
            {
                "workout_date": str(workout_date),
                "exercise": exercise,
                "set_number": i,
                "reps": actual_reps,
                "weight": round(w, 1),
                "notes": rnd.choice(_NOTES_POOL),
            }
        )

    return rows


def generate_seed_records(weeks: int = 14) -> pd.DataFrame:
    """
    Generate realistic progressive-overload data for `weeks` training weeks.

    Schedule: Push (Mon) / Pull (Wed) / Legs (Fri).
    14 weeks × 3 days × 8 exercises × 3 sets = ~1 008 rows.
    """
    start_date = date(2026, 1, 5)  # First Monday of 2026
    session_counts: dict[str, int] = {ex: 0 for ex in _STARTING_WEIGHTS}
    all_rows: list[dict] = []

    for week in range(weeks):
        week_start = start_date + timedelta(weeks=week)

        # Monday — Push
        push_date = week_start
        for ex in PUSH_EXERCISES:
            all_rows.extend(_generate_sets_for_session(push_date, ex, session_counts[ex]))
            session_counts[ex] += 1

        # Wednesday — Pull
        pull_date = week_start + timedelta(days=2)
        for ex in PULL_EXERCISES:
            all_rows.extend(_generate_sets_for_session(pull_date, ex, session_counts[ex]))
            session_counts[ex] += 1

        # Friday — Legs
        leg_date = week_start + timedelta(days=4)
        for ex in LEG_EXERCISES:
            all_rows.extend(_generate_sets_for_session(leg_date, ex, session_counts[ex]))
            session_counts[ex] += 1

    return pd.DataFrame(all_rows)


def load_seed_data() -> None:
    """Generate and load seed data into the database, and save a CSV copy."""
    dataframe = generate_seed_records(weeks=14)
    replace_with_dataframe(dataframe)
    SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
    dataframe.to_csv(SEED_PATH, index=False)
