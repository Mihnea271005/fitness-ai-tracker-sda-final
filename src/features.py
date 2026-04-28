from __future__ import annotations

import pandas as pd


def aggregate_sessions(sets_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate raw sets into one row per (date, exercise) session."""
    if sets_df.empty:
        return pd.DataFrame()

    df = sets_df.copy()
    df["reps"] = pd.to_numeric(df["reps"], errors="coerce")
    df["weight"] = pd.to_numeric(df["weight"], errors="coerce")
    # Keep AI features focused on strength-training rows. Cardio-only imported rows
    # such as Cycling/Stairmaster have zero reps and should not affect predictions.
    df = df[(df["reps"] > 0) & (df["weight"] >= 0)].copy()
    if df.empty:
        return pd.DataFrame()

    df["workout_date"] = pd.to_datetime(df["workout_date"])
    df["volume"] = df["reps"] * df["weight"]

    sessions = (
        df.groupby(["workout_date", "exercise"], as_index=False)
        .agg(
            total_sets=("set_number", "count"),
            avg_reps=("reps", "mean"),
            max_weight=("weight", "max"),
            total_volume=("volume", "sum"),
        )
        .sort_values(["exercise", "workout_date"])
        .reset_index(drop=True)
    )

    # Days since the previous session for the same exercise
    sessions["days_since_last"] = (
        sessions.groupby("exercise")["workout_date"].diff().dt.days
    )
    sessions["days_since_last"] = sessions["days_since_last"].fillna(7)

    # Cumulative session count per exercise (1-indexed)
    sessions["session_count"] = sessions.groupby("exercise").cumcount() + 1

    # Weight trend: difference between current session and 3 sessions ago
    sessions["weight_3_ago"] = sessions.groupby("exercise")["max_weight"].shift(3)
    sessions["weight_trend_3"] = (sessions["max_weight"] - sessions["weight_3_ago"]).fillna(0.0)

    return sessions


def build_training_dataframe(sets_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build the supervised-learning table.

    Each row represents a (exercise, session) pair where:
    - prev_* features come from the previous session
    - target_weight / target_reps are the values for the current session
    """
    sessions = aggregate_sessions(sets_df)
    if sessions.empty:
        return sessions

    lag_columns = [
        "avg_reps",
        "max_weight",
        "total_volume",
        "total_sets",
        "days_since_last",
        "session_count",
        "weight_trend_3",
    ]
    for col in lag_columns:
        sessions[f"prev_{col}"] = sessions.groupby("exercise")[col].shift(1)

    required = ["prev_avg_reps", "prev_max_weight", "prev_total_volume", "prev_total_sets", "prev_days_since_last"]
    training_df = sessions.dropna(subset=required).copy()

    # Fill optional new features that may still be NaN on early rows
    training_df["prev_session_count"] = training_df["prev_session_count"].fillna(1.0)
    training_df["prev_weight_trend_3"] = training_df["prev_weight_trend_3"].fillna(0.0)

    training_df["target_weight"] = training_df["max_weight"]
    training_df["target_reps"] = training_df["avg_reps"]

    return training_df[
        [
            "exercise",
            "prev_avg_reps",
            "prev_max_weight",
            "prev_total_volume",
            "prev_total_sets",
            "prev_days_since_last",
            "prev_session_count",
            "prev_weight_trend_3",
            "target_weight",
            "target_reps",
        ]
    ]


def latest_feature_row(sets_df: pd.DataFrame, exercise: str) -> pd.DataFrame:
    """Return a one-row DataFrame with the most recent session's features for prediction."""
    sessions = aggregate_sessions(sets_df)
    ex_sessions = sessions[sessions["exercise"] == exercise].sort_values("workout_date")
    if ex_sessions.empty:
        return pd.DataFrame()

    latest = ex_sessions.iloc[-1]
    return pd.DataFrame(
        [
            {
                "exercise": exercise,
                "prev_avg_reps": latest["avg_reps"],
                "prev_max_weight": latest["max_weight"],
                "prev_total_volume": latest["total_volume"],
                "prev_total_sets": latest["total_sets"],
                "prev_days_since_last": latest["days_since_last"],
                "prev_session_count": latest["session_count"],
                "prev_weight_trend_3": latest["weight_trend_3"],
            }
        ]
    )
