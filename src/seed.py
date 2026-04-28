from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.constants import normalize_exercise_name
from src.database import replace_with_dataframe


BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATASET_PATH = BASE_DIR / "data" / "weightlifting_721_workouts.csv"
SEED_PATH = BASE_DIR / "data" / "seed_workouts.csv"


def _combine_notes(row: pd.Series) -> str:
    notes: list[str] = []
    for column in ["Notes", "Workout Notes", "Workout Name"]:
        value = str(row.get(column, "")).strip()
        if value and value.lower() != "nan" and value not in notes:
            if column == "Workout Name":
                notes.append(f"Workout: {value}")
            else:
                notes.append(value)
    return " | ".join(notes)


def pounds_to_kg(value: float) -> float:
    return round(value * 0.45359237, 1)


def build_seed_dataframe(dataset_path: Path | None = None) -> pd.DataFrame:
    source_path = dataset_path or RAW_DATASET_PATH
    if not source_path.exists():
        raise FileNotFoundError(
            f"Nu am gasit dataset-ul Kaggle la: {source_path}"
        )

    raw_df = pd.read_csv(source_path)

    dataframe = pd.DataFrame(
        {
            "workout_date": pd.to_datetime(raw_df["Date"], errors="coerce").dt.strftime("%Y-%m-%d"),
            "exercise": raw_df["Exercise Name"].astype(str).map(normalize_exercise_name),
            "set_number": pd.to_numeric(raw_df["Set Order"], errors="coerce"),
            "reps": pd.to_numeric(raw_df["Reps"], errors="coerce"),
            "weight": pd.to_numeric(raw_df["Weight"], errors="coerce").map(pounds_to_kg),
            "notes": raw_df.apply(_combine_notes, axis=1),
        }
    )

    dataframe = dataframe.dropna(subset=["workout_date", "exercise", "set_number", "reps", "weight"]).copy()
    dataframe["set_number"] = dataframe["set_number"].astype(int)
    dataframe["reps"] = dataframe["reps"].astype(int)

    # Remove exact duplicates from the exported Strong/Kaggle history after normalization.
    dataframe = dataframe.drop_duplicates(
        subset=["workout_date", "exercise", "set_number", "reps", "weight", "notes"]
    )

    dataframe = dataframe.sort_values(["workout_date", "exercise", "set_number"]).reset_index(drop=True)
    return dataframe


def load_seed_data() -> None:
    dataframe = build_seed_dataframe()
    replace_with_dataframe(dataframe)
    SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
    dataframe.to_csv(SEED_PATH, index=False)
