from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from src.features import build_training_dataframe, latest_feature_row


MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "next_workout_model.joblib"

FEATURE_COLUMNS = [
    "exercise",
    "prev_avg_reps",
    "prev_max_weight",
    "prev_total_volume",
    "prev_total_sets",
    "prev_days_since_last",
    "prev_session_count",
    "prev_weight_trend_3",
]

NUMERIC_FEATURES = [
    "prev_avg_reps",
    "prev_max_weight",
    "prev_total_volume",
    "prev_total_sets",
    "prev_days_since_last",
    "prev_session_count",
    "prev_weight_trend_3",
]


def _build_pipeline(regressor=None) -> Pipeline:
    """Build a scikit-learn Pipeline with OHE preprocessing and a regressor."""
    if regressor is None:
        regressor = RandomForestRegressor(n_estimators=150, random_state=42)

    preprocessor = ColumnTransformer(
        transformers=[
            ("exercise", OneHotEncoder(handle_unknown="ignore"), ["exercise"]),
            ("numeric", "passthrough", NUMERIC_FEATURES),
        ]
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", regressor),
        ]
    )


def _chronological_split(training_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split data 80/20 in chronological order (no random shuffling)."""
    ordered = training_df.reset_index(drop=True)
    split_idx = max(int(len(ordered) * 0.8), 1)
    return ordered.iloc[:split_idx], ordered.iloc[split_idx:]


def evaluate_model(sets_df: pd.DataFrame) -> dict[str, float] | None:
    """Quick evaluation of the default RandomForest on the chronological test split."""
    training_df = build_training_dataframe(sets_df)
    if len(training_df) < 10:
        return None

    train_df, test_df = _chronological_split(training_df)
    if test_df.empty:
        return None

    model = _build_pipeline()
    model.fit(train_df[FEATURE_COLUMNS], train_df[["target_weight", "target_reps"]])
    preds = model.predict(test_df[FEATURE_COLUMNS])

    return {
        "samples": float(len(training_df)),
        "weight_mae": round(mean_absolute_error(test_df["target_weight"], preds[:, 0]), 3),
        "reps_mae": round(mean_absolute_error(test_df["target_reps"], preds[:, 1]), 3),
    }


def compare_models(sets_df: pd.DataFrame) -> dict[str, dict] | None:
    """
    Train and evaluate three models on the same chronological split.

    Returns a dict mapping model name -> {'weight_mae', 'reps_mae'}.
    """
    training_df = build_training_dataframe(sets_df)
    if len(training_df) < 10:
        return None

    train_df, test_df = _chronological_split(training_df)
    if test_df.empty:
        return None

    candidates: dict[str, Pipeline] = {
        "Random Forest": _build_pipeline(
            RandomForestRegressor(n_estimators=150, random_state=42)
        ),
        "Gradient Boosting": _build_pipeline(
            MultiOutputRegressor(GradientBoostingRegressor(n_estimators=100, random_state=42))
        ),
        "Ridge Regression": _build_pipeline(
            MultiOutputRegressor(Ridge(alpha=1.0))
        ),
    }

    results: dict[str, dict] = {}
    for name, model in candidates.items():
        model.fit(train_df[FEATURE_COLUMNS], train_df[["target_weight", "target_reps"]])
        preds = model.predict(test_df[FEATURE_COLUMNS])
        results[name] = {
            "weight_mae": round(mean_absolute_error(test_df["target_weight"], preds[:, 0]), 3),
            "reps_mae": round(mean_absolute_error(test_df["target_reps"], preds[:, 1]), 3),
        }

    return results


def train_model(sets_df: pd.DataFrame) -> tuple[Pipeline | None, str, dict[str, float] | None]:
    """Train the RandomForest model on all available data and persist it to disk."""
    training_df = build_training_dataframe(sets_df)
    if len(training_df) < 6:
        return (
            None,
            "Nu exista suficiente sesiuni pentru antrenare. Adauga mai multe date sau incarca seed data.",
            None,
        )

    model = _build_pipeline()
    model.fit(training_df[FEATURE_COLUMNS], training_df[["target_weight", "target_reps"]])

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    metrics = evaluate_model(sets_df)
    message = f"Model antrenat pe {len(training_df)} exemple."
    return model, message, metrics


def load_model() -> Pipeline | None:
    """Load the persisted model from disk, or return None if not found."""
    if not MODEL_PATH.exists():
        return None
    return joblib.load(MODEL_PATH)


def predict_next_workout(sets_df: pd.DataFrame, exercise: str) -> dict[str, float] | None:
    """
    Predict the suggested weight and reps for the next session of an exercise.
    Returns None if the model is not trained or data is insufficient.
    """
    model = load_model()
    if model is None:
        return None

    feature_row = latest_feature_row(sets_df, exercise)
    if feature_row.empty:
        return None

    try:
        prediction = model.predict(feature_row[FEATURE_COLUMNS])[0]
    except Exception:
        # Model was trained with a different feature set — needs retraining
        return None

    return {
        "suggested_weight": round(float(prediction[0]), 1),
        "suggested_reps": round(float(prediction[1]), 1),
    }


def get_feature_importances(sets_df: pd.DataFrame) -> pd.Series | None:
    """
    Extract feature importances from the trained RandomForest model.

    Returns a pd.Series sorted descending, or None if not available.
    """
    model = load_model()
    if model is None:
        return None

    try:
        rf: RandomForestRegressor = model.named_steps["regressor"]
        ohe: OneHotEncoder = model.named_steps["preprocessor"].named_transformers_["exercise"]
        ohe_names = list(ohe.get_feature_names_out())
        all_names = ohe_names + NUMERIC_FEATURES
        importances = rf.feature_importances_
        if len(importances) != len(all_names):
            return None
        return pd.Series(importances, index=all_names).sort_values(ascending=False)
    except Exception:
        return None
