# ADR 0002: Backend — FastAPI wrapper around existing `src/` modules

## Status
Accepted (2026-09-16)

## Context
The mobile app needs a network API. The existing ML/analytics logic
(`src/analytics.py`, `src/model.py`, `src/features.py`, `src/database.py`)
already works and is exercised by the Streamlit app. Options considered:
wrap it as a REST API, port it to on-device inference (TFLite/Core ML), or
defer the decision.

## Decision
Add a `backend/` FastAPI service that imports `src/*` directly and exposes
it over HTTP/JSON. No ML logic is duplicated or rewritten.

## Rationale
- Lowest risk: the trained-model logic, feature engineering, and SQLite
  access are already correct and tested via the Streamlit app; wrapping
  avoids re-implementing them in a second language/runtime.
- Fastest path to a working mobile app — the client only needs a thin
  `services/api.ts` layer (see `mobile/src/services/api.ts`).
- Keeps the door open for on-device inference later (ADR revisit) for
  specific latency-/offline-sensitive features (e.g. the readiness nudge
  described in `docs/MOBILE_STRATEGY.md`), without blocking v1.

## Consequences
- `backend/` and `app.py` (Streamlit) both depend on `src/`, so any change
  to `src/` must be checked against both consumers going forward.
- The current SQLite file (`fitness_ai.db`) is single-user and local; this
  is fine for a local dev/demo backend but must be revisited (see
  `docs/ARCHITECTURE.md` → "Data model evolution") before a real multi-user
  mobile release. Not addressed in this scaffold.
- CORS must be enabled on the FastAPI app for the RN dev client to reach it
  over LAN — configured permissively in `backend/app/main.py` for local
  development only; must be locked down before any non-local deployment.
