from __future__ import annotations

from fastapi import APIRouter

from src.seed import load_seed_data

router = APIRouter(tags=["seed"])


@router.post("/seed/load")
def load_seed() -> dict:
    load_seed_data()
    return {"status": "loaded"}
