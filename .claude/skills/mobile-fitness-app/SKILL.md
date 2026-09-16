---
name: mobile-fitness-app
description: Workflow and conventions for the React Native + FastAPI mobile conversion of the Fitness AI Tracker. Use when adding backend endpoints, mobile screens, or wiring up sensor/wearable features described in docs/MOBILE_STRATEGY.md.
---

# Mobile Fitness App — working conventions

This skill governs work under `backend/` and `mobile/`, added on top of the
original Streamlit project (`app.py`, `src/`). Read
[docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) and
[docs/MOBILE_STRATEGY.md](../../../docs/MOBILE_STRATEGY.md) first — they hold
the "why", this file holds the "how".

## Ground rules

1. **`src/` stays the single source of truth for ML/analytics logic.**
   Never reimplement feature engineering, model training, or stagnation/PR
   logic inside `backend/`. If a new mobile feature needs new derived data
   (e.g. HR-based fatigue, rest-timer features), add it to
   `src/features.py` / `src/analytics.py` first, then expose it through a
   backend router. Both `app.py` (Streamlit) and `backend/` import from
   `src/` — changes there affect both.
2. **Never touch `app.py`, `src/`, `data/`, or the root `README.md`/`requirements.txt`
   for mobile-conversion work.** Those are the existing academic deliverable.
   Mobile/backend changes live entirely under `backend/`, `mobile/`, and `docs/`.
3. **The backend is a thin wrapper, not a rewrite.** New endpoints should be
   a short router function that calls an existing `src/` function and
   serializes the result with a Pydantic schema in `backend/app/schemas.py`.
4. **Mobile screens mirror the Streamlit tabs 1:1** unless a task explicitly
   asks for a new mobile-only feature (camera, GPS, wearables). Check
   `app.py`'s tab implementation for the reference behavior before building
   a new screen.
5. **Hardware/wearable features are additive and optional.** They must
   degrade gracefully (feature detection, not hard requirement) since not
   every device has every sensor/wearable paired. Follow the extension
   points named in `docs/MOBILE_STRATEGY.md` rather than inventing new ones
   ad hoc.

## Running the stack locally

Backend (from repo root, so `src/` is importable):
```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Mobile (from `mobile/`):
```bash
npm install
npx expo start
```
Set `EXPO_PUBLIC_API_URL` (see `mobile/src/config/env.ts`) to the backend's
LAN address (not `localhost`) when testing on a physical device.

## When adding a backend endpoint

1. Add/extend the Pydantic model in `backend/app/schemas.py`.
2. Add the route in the relevant `backend/app/routers/*.py` file
   (`sets.py`, `analytics.py`, or `ai.py` — create a new router file only for
   a genuinely new domain, e.g. `wearables.py`).
3. Call the existing `src/` function — don't inline pandas/sklearn logic in
   the router.
4. Update `docs/ARCHITECTURE.md`'s API surface table and
   `mobile/src/services/types.ts` + `api.ts` in the same change.

## When adding a mobile screen

1. Add the screen under `mobile/src/screens/`.
2. Register it in `mobile/src/navigation/AppNavigator.tsx`.
3. Data access goes through `mobile/src/services/api.ts` — screens should not
   call `fetch` directly.
4. Keep screens thin; put any non-trivial data shaping in a hook under
   `mobile/src/hooks/`.

## Known gaps in the current scaffold (do not assume these are done)

- No authentication / multi-user support (see ADR 0002 consequences).
- No push notifications, wearable sync, camera/CV, or GPS integration wired
  up yet — `docs/MOBILE_STRATEGY.md` describes the target, the scaffold only
  has the screen/service skeleton.
- No automated tests for `backend/` or `mobile/` yet.
- The FastAPI CORS config in `backend/app/main.py` is wide open
  (`allow_origins=["*"]`) for local dev only — must be restricted before any
  non-local deployment.
- Nothing in `backend/` or `mobile/` has been executed/verified end-to-end
  in this session (no Node/Expo toolchain or mobile emulator available) —
  treat it as a structural starting point to compile/run and fix forward,
  not as tested code.
