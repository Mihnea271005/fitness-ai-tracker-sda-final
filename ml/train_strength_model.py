"""
Trains the "no history yet" strength model from OpenPowerlifting (OpenIPF) data.

    ml/.venv/Scripts/python ml/train_strength_model.py

Input : ml/data/openipf-latest.zip  (https://openpowerlifting.gitlab.io/opl-csv/files/openipf-latest.zip)
Output: src/lib/ai/strength-model.json  (coefficients the app evaluates in TypeScript)

What it predicts: a lifter's best squat / bench / deadlift (kg) from sex, age and
body weight. Trained on each lifter's FIRST raw (no supportive gear) competition,
which is the closest population in the data to ordinary trained gym-goers. The app
then scales that by self-reported experience and lets logged workouts take over.

Data: "This page uses data from the OpenPowerlifting project,
https://www.openpowerlifting.org. You may download a copy of the data at
https://data.openpowerlifting.org." The competition data is public domain.
"""

from __future__ import annotations

import json
import sys
import zipfile
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import GroupShuffleSplit

ROOT = Path(__file__).resolve().parent
ZIP = ROOT / "data" / "openipf-latest.zip"
OUT = ROOT.parent / "src" / "lib" / "ai" / "strength-model.json"

LIFTS = {"squat": ("Best3SquatKg", "S"), "bench": ("Best3BenchKg", "B"), "deadlift": ("Best3DeadliftKg", "D")}
COLS = ["Name", "Sex", "Event", "Equipment", "Age", "BodyweightKg", "Best3SquatKg", "Best3BenchKg", "Best3DeadliftKg", "Date"]


def load() -> pd.DataFrame:
    if not ZIP.exists():
        sys.exit(f"Missing {ZIP}. Download openipf-latest.zip into ml/data/ first.")
    with zipfile.ZipFile(ZIP) as z:
        csv_name = next(n for n in z.namelist() if n.endswith(".csv"))
        with z.open(csv_name) as f:
            df = pd.read_csv(f, usecols=COLS, low_memory=False)
    df = df[(df.Equipment == "Raw") & df.Sex.isin(["M", "F"])]
    df = df[df.Age.between(16, 75) & df.BodyweightKg.between(40, 180)]
    return df


def features(age: pd.Series | np.ndarray, bw: pd.Series | np.ndarray) -> np.ndarray:
    """Same features the app computes: log body weight + a cubic in (age-30)/10."""
    a = (np.asarray(age, dtype=float) - 30.0) / 10.0
    return np.column_stack([np.log(np.asarray(bw, dtype=float)), a, a**2, a**3])


def main() -> None:
    df = load()
    print(f"raw-equipment rows after filtering: {len(df):,}")
    model: dict = {
        "version": 1,
        "trained_on": date.today().isoformat(),
        "source": "OpenPowerlifting (OpenIPF subset), public domain. https://www.openpowerlifting.org",
        "population": "Each lifter's first raw competition (16–75 y, 40–180 kg).",
        "features": ["ln(bodyweight_kg)", "a", "a^2", "a^3  where a = (age - 30) / 10"],
        "target": "ln(best lift kg)",
        "models": {},
        "evaluation": {},
    }

    for lift, (col, letter) in LIFTS.items():
        d = df[df.Event.str.contains(letter, na=False) & (df[col] > 0)].copy()
        d["Date"] = pd.to_datetime(d.Date, errors="coerce")
        d = d.sort_values("Date").groupby(["Name", "Sex"], as_index=False).first()  # first meet per lifter
        model["models"][lift] = {}
        model["evaluation"][lift] = {}
        for sex in ["M", "F"]:
            s = d[d.Sex == sex]
            X = features(s.Age, s.BodyweightKg)
            y = np.log(s[col].to_numpy())
            groups = s.Name.to_numpy()
            tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42).split(X, y, groups))

            lin = LinearRegression().fit(X[tr], y[tr])
            gbm = HistGradientBoostingRegressor(max_iter=300, random_state=42).fit(
                np.column_stack([s.Age.to_numpy(), s.BodyweightKg.to_numpy()])[tr], y[tr]
            )
            truth = np.exp(y[te])
            pred_lin = np.exp(lin.predict(X[te]))
            pred_gbm = np.exp(gbm.predict(np.column_stack([s.Age.to_numpy(), s.BodyweightKg.to_numpy()])[te]))
            # Baseline: median lift per 10 kg body-weight band
            band = (s.BodyweightKg // 10).to_numpy()
            med = pd.Series(np.exp(y[tr])).groupby(band[tr]).median()
            pred_base = pd.Series(band[te]).map(med).fillna(np.median(np.exp(y[tr]))).to_numpy()

            resid = y[tr] - lin.predict(X[tr])
            model["models"][lift][sex] = {
                "intercept": round(float(lin.intercept_), 6),
                "coef": [round(float(c), 6) for c in lin.coef_],
                # spread of real lifters around the prediction (log space) → 25th / 75th percentile range
                "resid_p25": round(float(np.percentile(resid, 25)), 4),
                "resid_p75": round(float(np.percentile(resid, 75)), 4),
                "n_train": int(len(tr)),
            }
            ev = {
                "n_test": int(len(te)),
                "mae_kg_baseline_bw_band": round(float(mean_absolute_error(truth, pred_base)), 2),
                "mae_kg_linear (shipped)": round(float(mean_absolute_error(truth, pred_lin)), 2),
                "mae_kg_gradient_boosting": round(float(mean_absolute_error(truth, pred_gbm)), 2),
                "mape_linear_pct": round(float(np.mean(np.abs(pred_lin - truth) / truth) * 100), 1),
            }
            model["evaluation"][lift][sex] = ev
            print(f"{lift:9s} {sex}: n={len(s):>7,}  baseline MAE {ev['mae_kg_baseline_bw_band']:6.2f} kg | "
                  f"linear {ev['mae_kg_linear (shipped)']:6.2f} kg ({ev['mape_linear_pct']}%) | GBM {ev['mae_kg_gradient_boosting']:6.2f} kg")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(model, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
