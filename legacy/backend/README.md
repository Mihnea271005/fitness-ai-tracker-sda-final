# Backend — Fitness AI Tracker API

FastAPI wrapper around the existing `src/` modules (`database`, `analytics`,
`model`, `features`, `seed`, `constants`). No ML/analytics logic lives here —
see [`docs/adr/0002-fastapi-backend-wrapper.md`](../docs/adr/0002-fastapi-backend-wrapper.md).

## Run locally

From the **repo root** (so `src/` and `backend/` are both importable):

```bash
pip install -r requirements.txt -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs: http://localhost:8000/docs

Verified manually in development: `/health`, `/exercises`,
`/analytics/dashboard`, `POST /sets`, `POST /ai/train`,
`GET /ai/predict`, `DELETE /sets?confirm=true` all round-trip correctly
against the existing SQLite database and `src/` pipeline.

## Endpoints

See [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md#api-surface-v1) for the
full list, or just open `/docs` once the server is running.

## Notes

- Uses the same `fitness_ai.db` SQLite file as the Streamlit app
  (`src/database.py` → `BASE_DIR / "fitness_ai.db"`). Running the Streamlit
  app and this API against the same file at the same time is fine for local
  dev/demo (SQLite handles it), but there is no multi-writer story beyond
  that — see `docs/ARCHITECTURE.md` → "Data model evolution".
- CORS is wide open (`allow_origins=["*"]`) for local development only.
