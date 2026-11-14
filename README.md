# Fitness AI Tracker

A workout tracker for phone, tablet and desktop. You log strength, bodyweight, cardio and timed-hold exercises, and it suggests your next set from what you did last time. It's built as an installable web app (a PWA) using **Next.js 16, TypeScript and Tailwind CSS v4**. Accounts and data will come from **Supabase** (Postgres + Auth).

> SDA Academy final project. The original Streamlit / FastAPI / Expo version is kept in [`legacy/`](legacy/).

## Status

| Stage | What | State |
|---|---|---|
| 1 | Design and layout: every page, responsive, PWA, sample data | **Done** |
| 2 | Accounts: email/password + Google sign-in (Supabase Auth), private data per user | Next |
| 3 | Workout logging saved to Postgres, custom exercises, history, CSV export | Planned |
| 4 | Next-set suggestions: progressive-overload rules with unit tests | Planned |

In stage 1 everything runs on sample data in [`src/lib/mock-data.ts`](src/lib/mock-data.ts). The workout logger already works. An in-progress workout is kept in the browser, so refreshing the page doesn't lose it, but "Finish" doesn't save anything yet.

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
