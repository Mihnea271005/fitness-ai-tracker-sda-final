# Architecture — Mobile Conversion

## Decision summary

| Layer | Choice | Why |
|---|---|---|
| Mobile client | React Native (TypeScript), Expo | Single cross-platform codebase; mature libs for HealthKit / Health Connect, camera, BLE, GPS. See [adr/0001](adr/0001-mobile-stack-react-native.md). |
| Backend | FastAPI wrapping the existing `src/` Python modules | Reuses the already-working pandas/sklearn pipeline as-is; mobile app becomes a thin client. See [adr/0002](adr/0002-fastapi-backend-wrapper.md). |
| Existing Streamlit app | Kept as-is | Still the graded deliverable / local demo tool; not touched by this conversion. |

## System diagram

```
┌─────────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐
│   React Native app      │ ───────────────────────▶ │   FastAPI backend        │
│   (iOS / Android)       │ ◀─────────────────────── │   backend/app/main.py    │
│                         │                           │                          │
│  screens/               │                           │  routers/sets.py         │
│  services/api.ts        │                           │  routers/analytics.py    │
│  HealthKit/Health       │                           │  routers/ai.py           │
│   Connect, GPS, camera  │                           │                          │
└─────────────────────────┘                           │  imports src.database,  │
                                                        │  src.analytics,         │
                                                        │  src.model, src.features│
                                                        └────────────┬─────────────┘
                                                                     │
                                                        ┌────────────▼─────────────┐
                                                        │  fitness_ai.db (SQLite)  │
                                                        │  models/*.joblib         │
                                                        └──────────────────────────┘
```

The backend does **not** duplicate any ML/analytics logic — it imports
`src.database`, `src.analytics`, `src.model`, and `src.features` directly, so
the RandomForest pipeline, feature engineering, and stagnation/streak logic
stay in one place regardless of which client (Streamlit or mobile) calls it.

## API surface (v1)

See `backend/app/routers/*.py` for the implementation. Summary:

- `GET  /health`
- `GET  /exercises` — dropdown options (`EXERCISE_OPTIONS`)
- `GET  /sets` — list logged sets (optional `?exercise=`)
- `POST /sets` — log a new set
- `DELETE /sets?confirm=true` — wipe all sets (mirrors the sidebar "reset" button)
- `POST /seed/load` — import the Kaggle seed dataset (mirrors "Încarcă date Kaggle")
- `GET  /analytics/dashboard` — the 5 header metrics
- `GET  /analytics/personal-records`
- `GET  /analytics/weekly-volume?exercise=`
- `GET  /analytics/muscle-volume`
- `GET  /analytics/stagnation?exercise=`
- `POST /ai/train` — train + persist the model
- `GET  /ai/predict?exercise=`
- `GET  /ai/feature-importance`
- `POST /ai/compare` — RF vs GradientBoosting vs Ridge

## Data model evolution (future work, not yet implemented)

The scaffold ships against the **existing single-user SQLite schema** so it
runs today with zero data migration. Multi-user support (needed before any
real mobile release) requires:

1. Add a `user_id` column to `workout_sets` (and any new sensor/wearable
   tables) plus an auth layer (e.g. JWT) in front of the FastAPI routes.
2. Swap SQLite for a networked database (Postgres) once more than one
   client/device needs concurrent write access.
3. Namespace the trained model artifact (`models/next_workout_model.joblib`)
   per user, or move to a shared model with `user_id` as a feature — a real
   product decision, not a default to bake in silently.

This is intentionally **not** scaffolded yet — see the "Known gaps /
blockers" section in the top-level handoff message for why.

## Mobile app structure

```
mobile/
├── App.tsx
├── src/
│   ├── config/env.ts        # API base URL, env switching
│   ├── services/
│   │   ├── api.ts           # fetch wrapper for the FastAPI backend
│   │   └── types.ts         # TS types mirroring backend/app/schemas.py
│   ├── navigation/AppNavigator.tsx
│   └── screens/
│       ├── DashboardScreen.tsx
│       ├── LogWorkoutScreen.tsx
│       ├── HistoryScreen.tsx
│       ├── AICoachScreen.tsx
│       └── RecordsScreen.tsx
```

This mirrors the five Streamlit tabs 1:1 (`tab_log`, `tab_history`, `tab_ai`,
`tab_records`) so behavior parity is easy to verify, plus a `Dashboard`
screen for the header metrics. Hardware/wearable features from
[MOBILE_STRATEGY.md](MOBILE_STRATEGY.md) are **not** wired up in this initial
scaffold — see the handoff message for what's stubbed vs. real.
