from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "fitness_ai.db"


def get_connection() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS workout_sets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_date TEXT NOT NULL,
                exercise TEXT NOT NULL,
                set_number INTEGER NOT NULL,
                reps INTEGER NOT NULL,
                weight REAL NOT NULL,
                notes TEXT
            )
            """
        )
        connection.commit()


def insert_set(workout_date: str, exercise: str, set_number: int, reps: int, weight: float, notes: str = "") -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO workout_sets (workout_date, exercise, set_number, reps, weight, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (workout_date, exercise, set_number, reps, weight, notes),
        )
        connection.commit()


def load_sets() -> pd.DataFrame:
    with get_connection() as connection:
        return pd.read_sql_query(
            """
            SELECT id, workout_date, exercise, set_number, reps, weight, notes
            FROM workout_sets
            ORDER BY workout_date ASC, exercise ASC, set_number ASC
            """,
            connection,
        )


def clear_sets() -> None:
    with get_connection() as connection:
        connection.execute("DELETE FROM workout_sets")
        connection.commit()


def replace_with_dataframe(dataframe: pd.DataFrame) -> None:
    with get_connection() as connection:
        connection.execute("DELETE FROM workout_sets")
        dataframe.to_sql("workout_sets", connection, if_exists="append", index=False)
        connection.commit()
