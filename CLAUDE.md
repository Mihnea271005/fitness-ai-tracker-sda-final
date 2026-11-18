@AGENTS.md

# Fitness AI Tracker

Installable workout-tracker PWA with a free, self-built AI coach. Personal project.
Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth) · Vitest.
Stage status and setup live in README.md. Check there instead of assuming what's done.

## Commands

- `npm run dev`: dev server on http://localhost:3000
- `npm test`: Vitest unit tests plus the AI evaluation on a real training log
- `npm run lint`: ESLint
- `npm run build`: production build (also type-checks). Run it before saying a change is done.

## Layout

- `src/app/(app)/`: signed-in pages. Each feature folder has `page.tsx` and `actions.ts` (Server Actions).
- `src/app/(auth)/`: login, signup and password flows.
- `src/lib/data.ts`, `src/lib/auth.ts`: the data access layer. All reads of user data go through these.
- `src/lib/ai/`: the AI coach as pure functions (estimator, generator, prescribe), with tests next to them.
- `src/lib/ai-server.ts`: loads data and calls the AI. It's the only bridge between Supabase and `src/lib/ai/`.
- `src/components/ui/`: the shared UI kit (`Button`, `ListSection`, `ListRow`, `Sheet`, `SegmentedControl`, …).
- `supabase/migrations/`: numbered SQL files, run by hand in the Supabase SQL Editor.
- `ml/`: offline Python training for the cold-start strength model, which writes `src/lib/ai/strength-model.json`.
- `legacy/`: the old Streamlit/FastAPI/Expo app. Ignore it. Don't read it, edit it, or copy patterns from it.

## Rules that apply everywhere

- Next 16 differs from older versions. For example, `src/proxy.ts` replaces `middleware.ts`, and `cookies()` needs `await connection()` first. Check `node_modules/next/dist/docs/` before using an API you're unsure of.
- Weights are stored in **kg** in the database and in all code. Convert only at the edges with `toDisplayWeight` / `fromDisplayWeight` / `formatWeight` from `src/lib/format.ts`.
- Check every Supabase `error`. Never treat a failed query as "no data".
- Server-only modules start with `import "server-only"`.
- No paid services or paid APIs (LLMs included) without asking first. The AI must stay free and run inside the app.
- Out of scope unless the user brings it up: nutrition, wearables, social feeds and leaderboards, exercise videos, business features.
- Keep comments and UI text in plain English. Don't mention course or assignment context.

## Workflow

- Work in stages. Propose before writing a lot of code, and stop for review at the end of each stage.
- Work on the `redesign` branch. Never merge into `main` or open a PR unless asked.
- The GitHub repo is **public**: never commit `.env*` files except `.env.example`.
- Before calling something done, run `npm test`, `npm run lint` and `npm run build`, and report what failed.
