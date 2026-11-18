---
paths:
  - "src/lib/ai/**"
  - "src/lib/ai-server.ts"
  - "src/components/workout/**"
  - "src/components/ai-workout-card.tsx"
  - "ml/**"
---

# AI coach rules

- `src/lib/ai/` holds pure functions: no Supabase, no `fetch`, no `Date.now()` without an injectable `now`. Data loading belongs in `src/lib/ai-server.ts`.
- **Never suggest less than the user just lifted.** This is enforced in `suggestStart` (prescribe.ts), not in the estimator. The estimator is a tuned *predictor*: it averages sessions on purpose, and a hard floor there measurably predicts worse. The only exceptions are the lighter week after two sessions of missed reps and time off over 2 weeks.
- The profile prior may only raise a history-based estimate, never lower it. For cardio, where a lower pace is better, the directions are inverted.
- Each exercise kind (`strength`, `bodyweight`, `timed`, `cardio`) has its own math. Handle all four whenever you change a `switch (ex.kind)`.
- Every suggestion carries a human-readable `reason`. Keep it accurate when you change the logic.
- Any behavior change needs a test in `src/lib/ai/ai.test.ts`. Estimator changes also need a check of `history-eval.test.ts`. The README's mean-error table (AI estimator 14.4%) is the baseline: don't regress it silently, and update the README if it changes.
- The cold-start model is trained offline in `ml/` (OpenPowerlifting data, with attribution kept in the README). Never hand-edit `strength-model.json`.
