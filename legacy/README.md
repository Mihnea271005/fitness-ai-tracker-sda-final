# Fitness AI Tracker - SDA Academy Final Project

Python application with Streamlit and machine learning for tracking workouts and getting AI recommendations for the next session.

This version uses the Kaggle dataset `joep89/weightlifting` as the seed/training source, replacing the synthetic generator used previously.

## What changed in this version

- synthetic seed data was replaced with an import from the real Kaggle dataset
- the app's exercise list was expanded based on the dataset
- exercise names are normalized to avoid obvious duplicates
- weights from Kaggle are converted from pounds to kg
- cardio rows or rows with `reps = 0` stay in the history, but are ignored by the AI component

## Features

- manually add sets with date, exercise, reps, weight, and notes
- local storage in SQLite
- full history with CSV export
- progress charts and personal records
- train the AI model directly from the interface
- weight + reps recommendation for the next session
- stagnation / decline alerts
- model comparison
- explanations via feature importance

## Dataset

Seed/training data source:
- Kaggle: `joep89/weightlifting`

CSV used in the project:
- `data/weightlifting_721_workouts.csv`

On load, the app maps the data as follows:
- `Date` -> `workout_date`
- `Exercise Name` -> `exercise`
- `Set Order` -> `set_number`
- `Reps` -> `reps`
- `Weight` -> `weight` (converted from lb to kg)
- `Notes` + `Workout Notes` -> `notes`

## AI Component

Main model:
- `RandomForestRegressor(n_estimators=150)`

Features:
- `exercise`
- `prev_max_weight`
- `prev_avg_reps`
- `prev_total_volume`
- `prev_total_sets`
- `prev_days_since_last`
- `prev_session_count`
- `prev_weight_trend_3`

Output:
- recommended weight
- recommended reps

Evaluation:
- MAE on a chronological 80/20 split

## Project structure

```text
fitness-ai-tracker-sda-final/
|-- app.py
|-- requirements.txt
|-- README.md
|-- data/
|   |-- weightlifting_721_workouts.csv
|   `-- seed_workouts.csv
|-- models/
|   `-- next_workout_model.joblib
`-- src/
    |-- __init__.py
    |-- analytics.py
    |-- constants.py
    |-- database.py
    |-- features.py
    |-- model.py
    `-- seed.py
```

## Installation

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Running

```bash
streamlit run app.py
```

The app usually opens at:
- [http://localhost:8501](http://localhost:8501)

## Recommended demo flow

Note: the Streamlit UI itself is still in Romanian, so the labels below are quoted exactly as they appear on screen.

1. Click `Incarca date Kaggle` ("Load Kaggle data")
2. Click `Antreneaza modelul AI` ("Train AI model")
3. Go to the `AI Coach` tab
4. Select an exercise
5. Show the recommendation, the progress chart, and the model comparison

## Limitations

- single user only
- some cardio exercises from the dataset aren't useful for recommendations
- the model depends on the consistency of historical data

## Extension ideas

- upload data exported from other apps
- multi-user authentication
- PDF export
- permanent cloud deployment
