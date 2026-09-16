from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.database import load_sets
from src.model import (
    compare_models,
    get_feature_importances,
    predict_next_workout,
    train_model,
)

from backend.app.schemas import (
    FeatureImportance,
    ModelComparisonEntry,
    PredictionResult,
    TrainResult,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/train", response_model=TrainResult)
def train() -> TrainResult:
    df = load_sets()
    model, message, metrics = train_model(df)
    return TrainResult(
        message=message,
        trained=model is not None,
        weight_mae=metrics["weight_mae"] if metrics else None,
        reps_mae=metrics["reps_mae"] if metrics else None,
        samples=int(metrics["samples"]) if metrics else None,
    )


@router.get("/predict", response_model=PredictionResult)
def predict(exercise: str = Query(...)) -> PredictionResult:
    df = load_sets()
    suggestion = predict_next_workout(df, exercise)
    if suggestion is None:
        raise HTTPException(
            409,
            "Model not trained yet, or not enough history for this exercise. "
            "Call POST /ai/train first.",
        )
    return PredictionResult(exercise=exercise, **suggestion)


@router.get("/feature-importance", response_model=list[FeatureImportance])
def feature_importance() -> list[FeatureImportance]:
    df = load_sets()
    importances = get_feature_importances(df)
    if importances is None:
        raise HTTPException(409, "Model not trained yet.")
    return [
        FeatureImportance(feature=name, importance=float(value))
        for name, value in importances.items()
    ]


@router.post("/compare", response_model=list[ModelComparisonEntry])
def compare() -> list[ModelComparisonEntry]:
    df = load_sets()
    results = compare_models(df)
    if results is None:
        raise HTTPException(409, "Not enough data to compare models (need >= 10 training rows).")
    return [ModelComparisonEntry(model=name, **metrics) for name, metrics in results.items()]
