from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import init_db

from backend.app.routers import ai, analytics, seed, sets

app = FastAPI(title="Fitness AI Tracker API", version="0.1.0")

# Local-dev-only CORS config — see docs/adr/0002-fastapi-backend-wrapper.md.
# Must be restricted to known origins before any non-local deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


app.include_router(sets.router)
app.include_router(analytics.router)
app.include_router(ai.router)
app.include_router(seed.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
