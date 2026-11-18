# Mobile Strategy — Fitness AI Tracker

Strategic ideation for converting the Streamlit prototype into a native mobile
product (React Native client + FastAPI backend, see [ARCHITECTURE.md](ARCHITECTURE.md)).
Each idea below is tied back to a concrete extension point in the existing
codebase so it's clear what changes, not just what's possible in theory.

## 1. Mobile hardware

### Camera
- **CV rep counting & form scoring.** On-device pose estimation (MediaPipe
  Pose on Android, Vision framework on iOS) counts reps automatically and
  scores range-of-motion / bar path. A `form_score` per set becomes a new
  feature alongside the existing `prev_avg_reps`, `prev_max_weight`, etc. in
  [`src/features.py`](../src/features.py) — the model can then discount
  progression suggestions when form is degrading, not just when weight
  plateaus.
- **Progress photos with pose-landmark diffing.** Opt-in photo check-ins,
  aligned via pose landmarks, to visualize physique change over time
  alongside the PR table in `get_personal_records`.
- **Barcode/QR scan** for gym equipment or supplement logging (low priority,
  nice-to-have).

### Accelerometer / gyroscope
- **Passive rep counting** from wrist/phone motion as a fallback when the
  camera isn't pointed at the user — cross-validates the camera-based count.
- **Real rest-timer capture.** Detect stillness between sets to log *actual*
  rest duration per set, not just `days_since_last` at the session level.
  This is a strictly richer signal than anything `aggregate_sessions()`
  currently derives and would plug in as `prev_avg_rest_seconds`.
- **Failure/drop detection** during heavy lifts (barbell drop signature) as a
  safety feature — optional alert to an emergency contact.

### GPS
- **Auto-logged cardio.** Route, pace, elevation for running/cycling sessions
  turns the currently-excluded cardio rows (`Cycling`, `Stairmaster` —
  filtered out in `aggregate_sessions` because `reps == 0`) into real
  training-load data instead of dead weight in the history table.
- **Geofenced auto-start.** Detect arrival at a saved gym location and prompt
  "Start workout?" — removes the single biggest logging-friction point in
  the current manual-entry form (`tab_log` in `app.py`).
- **Weather-aware coaching.** Suggest an indoor substitute on days with poor
  outdoor conditions if the user's plan includes outdoor cardio.

## 2. Wearables & biometrics

- **Heart-rate streaming during sets** (Apple Watch / Wear OS / BLE chest
  strap) → per-set/session HR features (avg, peak, HR-recovery slope). This
  is a materially better fatigue signal than the pure weight-trend heuristic
  in `detect_stagnation()` today, and slots in as new columns next to
  `prev_weight_trend_3`.
- **HealthKit / Health Connect sync** for sleep, resting HR, HRV, steps, and
  active energy → a daily **readiness score** computed *before* the session
  starts. The AI coach can then adjust `suggested_weight` down on a
  poor-readiness day instead of only reacting after the fact — a genuinely
  new capability, not just a mobile port of the existing model.
- **Real-time coaching on the watch.** Haptic/voice cues mid-set ("2 reps
  to your target", "rest complete") driven by the same `predict_next_workout`
  output already computed server-side.
- **Auto workout detection** from the watch's built-in workout sensors to
  catch sessions the user forgot to log manually — this directly addresses a
  real weakness in the current `compute_workout_streak()`, which has no way
  to know about a workout that was never logged.
- **Recovery-budget–bounded suggestions.** A rolling multi-day HRV/sleep
  trend caps how aggressively the model is allowed to increase suggested
  weight, independent of the lifting-history trend alone.

## 3. Retention & adaptive AI (anti-churn)

- **Dynamic daily plan, not a static suggestion.** Factor in readiness score,
  missed-session history, and time available today ("only have 20 minutes")
  to generate a shorter-but-effective session instead of always suggesting
  the same style of session.
- **Streak nudges anchored to real time.** The current `compute_workout_streak()`
  doesn't check the streak against *today's* date (see code review notes) —
  fixing that is a prerequisite for trustworthy "you're about to lose your
  12-day streak" push notifications, one of the highest-leverage retention
  mechanics in habit apps.
- **Churn-risk scoring.** A lightweight classifier over session cadence,
  streak breaks, and the declining-volume trend already computed in
  `detect_stagnation()` predicts P(churn in 14 days) and triggers a
  re-engagement nudge (easier workout, check-in prompt) above a threshold.
- **Reward loop for PRs.** `get_personal_records()` already computes PR data
  server-side — surface it as an in-app celebration + shareable card the
  moment it happens, not just a table in a "Recorduri" tab.
- **Active plateau-breaking, not just a warning.** When `detect_stagnation`
  flags stagnation, auto-generate a modified session (rep-range change,
  exercise variation) instead of leaving the current passive `st.info()`
  banner for the user to act on (most users ignore static warnings).
- **Habit-stacking reminders.** Infer typical workout day/time from
  `workout_date` history and offer a one-tap recurring reminder at that time.

## 4. Architectural implications

- Move from a single-user local SQLite file to a real backend with
  per-user accounts — see [ARCHITECTURE.md](ARCHITECTURE.md) and
  [adr/0002-fastapi-backend-wrapper.md](adr/0002-fastapi-backend-wrapper.md).
- Treat wearable/sensor ingestion as an event stream feeding an expanded
  feature store (a natural growth of `src/features.py`), decoupled from the
  batch model-training job.
- Feature-flag the retention interventions (nudge copy, timing, deload
  logic) so they can be A/B tested — churn-prevention claims should be
  measured, not assumed.
- Keep heavy model training/inference server-side (per the FastAPI decision);
  revisit an on-device model (Core ML / TFLite) later only for latency- or
  offline-sensitive decisions like the readiness nudge.
