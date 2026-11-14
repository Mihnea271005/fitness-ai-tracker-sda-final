# Fitness AI Tracker

A workout tracker for phone, tablet and desktop with a built-in AI coach. You log strength, bodyweight, cardio and timed-hold exercises; the AI builds workouts for you and suggests the weight and reps for every set, starting from your profile on day one and learning from what you log. It's an installable web app (a PWA) built with **Next.js 16, TypeScript and Tailwind CSS v4**, with accounts and data in **Supabase** (Postgres + Auth).

> The original Streamlit / FastAPI / Expo version is kept in [`legacy/`](legacy/).

## Status

| Stage | What | State |
|---|---|---|
| 1 | Design and layout: every page, responsive, PWA | Done |
| 2 | Accounts: email/password + Google sign-in, private data per user | Done |
| 3 | Workouts, custom exercises, routines, body measurements, history, CSV export | Done |
| 4 | AI coach: training profile, strength prediction, generated workouts, live set coaching | **In progress** |
| 5 | Goals, achievements, reminders, sharing | Planned |

## Setup

1. Create a free Supabase project. Run the files in [`supabase/migrations/`](supabase/migrations/) in order in its SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key.
3. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/**` to the Redirect URLs.

## The AI coach

All of it is free and runs inside the app: no paid AI service, and your data never leaves your database.

1. **Training profile.** An optional questionnaire covers sex (male / female / prefer not to say), age, height, weight, experience, days per week, session length, goal, focus areas, equipment (gym / dumbbells / bodyweight only), exercises to avoid, and whether you want a weekly plan or one workout at a time.
2. **No-history prediction** ([`ml/train_strength_model.py`](ml/train_strength_model.py)). A model trained on public-domain OpenPowerlifting results predicts squat, bench and deadlift from sex, age and body weight. Other exercises are derived through typical strength ratios ([`src/lib/ai/catalog.ts`](src/lib/ai/catalog.ts)), then scaled to your experience. On held-out lifters it's within about ±16–20% on average. That spread is why the first workout is deliberately light.
3. **History model** ([`src/lib/ai/estimator.ts`](src/lib/ai/estimator.ts)). Your logged sets take over from the profile guess, with recent sessions weighted most. It accounts for how sets felt (too easy / just right / too hard) and for time off. Its settings were tuned on the first half of a real 721-workout training log and tested on the second half:

   | Predictor (next-session estimated max) | Mean error |
   |---|---|
   | Same as last session | 16.4% |
   | Average of last 3 | 14.8% |
   | **AI estimator** | **14.4%** |

4. **Workout generator** ([`src/lib/ai/generator.ts`](src/lib/ai/generator.ts)). It picks a split from your training days (full body, upper/lower, or push/pull/legs) and fills each slot with an exercise that fits your equipment, focus and history. Sets, reps and rest follow your goal, and weights come from the estimator.
5. **Live coaching** ([`src/lib/ai/prescribe.ts`](src/lib/ai/prescribe.ts)). Each set's suggestion adapts to the previous one. It also adds a weight step when every set was hit, and suggests a lighter week after two sessions of missed reps.

Run `npm test` for the unit tests and the training-log evaluation. To retrain the population model:

```bash
python -m venv ml/.venv && ml/.venv/Scripts/pip install -r ml/requirements.txt
curl -L -o ml/data/openipf-latest.zip https://openpowerlifting.gitlab.io/opl-csv/files/openipf-latest.zip
ml/.venv/Scripts/python ml/train_strength_model.py
```

This app uses data from the OpenPowerlifting project, https://www.openpowerlifting.org. You may download a copy of the data at https://gitlab.com/openpowerlifting/opl-data.

## Running it

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # http://localhost:3000
```

To try it on your phone, open `http://<your-computer's-LAN-IP>:3000` while the phone is on the same Wi-Fi.

| Command | Does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build && npm start` | Production build, plus a service worker for the offline page |
| `npm run lint` | ESLint |
| `node scripts/make-icons.mjs` | Regenerate the app icons |

## Design

The visual design follows Apple's Human Interface Guidelines (the iOS 26 "Liquid Glass" design):

- **Colours:** system colours and semantic tokens (label, background, fill, separator) defined in [`src/app/globals.css`](src/app/globals.css). Light and dark mode follow the device setting, as the guidelines recommend, so there's no in-app switch. In light mode the accent is Apple's increased-contrast blue, so small blue text passes 4.5:1 contrast.
- **Type:** the iOS Dynamic Type scale (Large Title 34, Body 17, …) in `rem`, so the browser's text-size setting scales everything. Fonts are the device's system fonts (San Francisco on Apple devices); big numbers use the rounded version.
- **Layout:** a floating bottom tab bar on phones and a sidebar from tablet width (768 px) up. There are 5 tabs, each a single word. Starting a workout is a button, not a tab. Everything you can tap is at least 44 × 44 px, and the layout respects the notch and home-indicator areas.
- **Glass:** the frosted "glass" look is used only on navigation (tab bar, sidebar, top bars, the workout-in-progress pill). Content sits on solid grouped lists. If the device asks for reduced transparency, the app uses solid backgrounds instead.
- **Charts:** one data series each, a 2 px line, bars no wider than 24 px, hover/keyboard tooltips, and a "Show as table" view for every chart.

## Planned data model (stage 3)

```
profiles           id (= auth user), display_name, unit (kg|lb), weekly_goal
exercises          id, owner_id (null = built-in), name, kind, primary_muscle, equipment, weight_increment_kg
workouts           id, user_id, title, started_at, ended_at, notes
workout_exercises  id, workout_id, exercise_id, position, notes
sets               id, workout_exercise_id, index, type, weight_kg, reps, duration_s, distance_m, rpe, completed
```

`kind` is one of `strength | bodyweight | cardio | timed`, and it decides which set fields are used. Weights are stored in kg. Database access rules (Postgres row-level security) restrict every row to its owner. The TypeScript types in [`src/lib/types.ts`](src/lib/types.ts) already match this model.

## Project structure

```
src/
  app/
    page.tsx                landing page
    (auth)/                 login, signup, forgot-password
    (app)/                  signed-in app: home, workout, history, exercises, progress, settings
    manifest.ts             PWA manifest
  components/
    ui/                     buttons, grouped lists, segmented control, sheet, page header
    shell/                  sidebar + tab bar
    workout/                active-workout state + logger
    charts.tsx              line + bar charts
  lib/
    types.ts                domain types
    mock-data.ts            stage 1 sample data
    stats.ts                weekly totals, personal records, per-exercise history
    suggest.ts              next-set suggestions (placeholder until stage 4)
public/sw.js                service worker (offline fallback page only)
legacy/                     previous Streamlit / FastAPI / Expo app
```
