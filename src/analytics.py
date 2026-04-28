from __future__ import annotations

import pandas as pd

from src.features import aggregate_sessions


def get_personal_records(sets_df: pd.DataFrame) -> pd.DataFrame:
    """Returns the personal record (max weight ever lifted) per exercise."""
    if sets_df.empty:
        return pd.DataFrame(columns=["exercise", "max_weight", "achieved_on"])

    df = sets_df.copy()
    df["reps"] = pd.to_numeric(df["reps"], errors="coerce")
    df = df[df["reps"] > 0].copy()
    if df.empty:
        return pd.DataFrame(columns=["exercise", "max_weight", "achieved_on"])
    df["workout_date"] = pd.to_datetime(df["workout_date"])

    idx = df.groupby("exercise")["weight"].idxmax()
    prs = df.loc[idx, ["exercise", "weight", "workout_date"]].copy()
    prs.columns = ["exercise", "max_weight", "achieved_on"]
    prs["achieved_on"] = prs["achieved_on"].dt.strftime("%Y-%m-%d")
    return prs.sort_values("exercise").reset_index(drop=True)


def detect_stagnation(sets_df: pd.DataFrame, exercise: str, n_sessions: int = 4) -> dict:
    """
    Analyses the last n_sessions for an exercise.

    Returns a dict with:
    - is_stagnating : weight spread over the window is below 2.5 kg
    - is_declining  : last session weight is lower than the previous one
    - trend         : average weight change per session (kg)
    - sessions_checked : number of sessions analysed
    - last_weight   : max weight in the most recent session
    """
    sessions = aggregate_sessions(sets_df)
    ex_sessions = sessions[sessions["exercise"] == exercise].sort_values("workout_date")

    result: dict = {
        "is_stagnating": False,
        "is_declining": False,
        "trend": 0.0,
        "sessions_checked": 0,
        "last_weight": None,
    }

    if len(ex_sessions) < 2:
        return result

    recent = ex_sessions.tail(n_sessions)
    result["sessions_checked"] = len(recent)
    result["last_weight"] = float(recent.iloc[-1]["max_weight"])

    weights = recent["max_weight"].values.tolist()

    if weights[-1] < weights[-2]:
        result["is_declining"] = True

    if len(weights) >= n_sessions:
        if max(weights) - min(weights) < 2.5:
            result["is_stagnating"] = True

    if len(weights) >= 2:
        changes = [weights[i + 1] - weights[i] for i in range(len(weights) - 1)]
        result["trend"] = round(sum(changes) / len(changes), 2)

    return result


def compute_workout_streak(sets_df: pd.DataFrame, gap_days: int = 4) -> int:
    """
    Returns the number of distinct workout days in the current active streak.
    A streak breaks if the gap between consecutive sessions exceeds gap_days.
    """
    if sets_df.empty:
        return 0

    df = sets_df.copy()
    df["workout_date"] = pd.to_datetime(df["workout_date"])
    unique_days = sorted(df["workout_date"].dt.date.unique(), reverse=True)

    if not unique_days:
        return 0

    streak = 1
    for i in range(len(unique_days) - 1):
        delta = (unique_days[i] - unique_days[i + 1]).days
        if delta <= gap_days:
            streak += 1
        else:
            break

    return streak


def get_weekly_volume(sets_df: pd.DataFrame, exercise: str) -> pd.DataFrame:
    """Returns total weekly volume (reps × weight) for a given exercise."""
    if sets_df.empty:
        return pd.DataFrame()

    df = sets_df[sets_df["exercise"] == exercise].copy()
    if df.empty:
        return pd.DataFrame()

    df["workout_date"] = pd.to_datetime(df["workout_date"])
    df["volume"] = df["reps"] * df["weight"]
    df["week"] = df["workout_date"].dt.to_period("W").apply(lambda r: r.start_time)

    weekly = df.groupby("week", as_index=False)["volume"].sum()
    weekly.columns = ["week", "total_volume"]
    return weekly


def get_total_volume_per_muscle(sets_df: pd.DataFrame, muscle_groups: dict[str, str]) -> pd.DataFrame:
    """Returns total volume lifted per muscle group across all recorded sets."""
    if sets_df.empty:
        return pd.DataFrame()

    df = sets_df.copy()
    df["volume"] = df["reps"] * df["weight"]
    df["muscle_group"] = df["exercise"].map(muscle_groups).fillna("Altele")

    result = df.groupby("muscle_group", as_index=False)["volume"].sum()
    result.columns = ["muscle_group", "total_volume"]
    return result.sort_values("total_volume", ascending=False)
