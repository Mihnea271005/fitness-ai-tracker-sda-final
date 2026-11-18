---
name: run-fitness-ai-tracker
description: Start, run and drive the Fitness AI Tracker web app in a real (headless Edge) browser — sign up a throwaway account, click through pages, take screenshots, smoke-test or end-to-end test a change. Use when asked to run the app, take a screenshot of a page, test it in a browser, check mobile or dark mode, or verify a UI change before shipping.
---

Next.js 16 + Supabase PWA. An agent drives it with `.claude/skills/run-fitness-ai-tracker/driver.mjs`:
playwright-core controlling the **installed Microsoft Edge** headless (no browser download), against the dev
server on http://localhost:3000. Every run signs up its own `@example.com` account and deletes it afterwards.

All paths are relative to the repo root. Verified on Windows 11 (Git Bash), Node 26, Edge installed.

## Setup (once)

```bash
npm install                                                   # the app
npm --prefix .claude/skills/run-fitness-ai-tracker install    # the driver's own playwright-core (git-ignored)
```

`.env.local` must hold the Supabase URL and publishable key (see README → Setup). The project has email
confirmation off, so sign-up returns a session immediately; that's what lets the driver create accounts.

## Run (agent path)

1. Make sure the dev server is up (the user usually has it running — never stop theirs):

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://localhost:3000/login   # 200 = up
```

If it isn't, start it in the background and poll the port:

```bash
npm run dev > /tmp/fitness-dev.log 2>&1 &
timeout 90 bash -c 'until curl -sf -o /dev/null http://localhost:3000/login; do sleep 1; done' && echo ready
```

2. Drive it:

```bash
node .claude/skills/run-fitness-ai-tracker/driver.mjs smoke
node .claude/skills/run-fitness-ai-tracker/driver.mjs shot progress --sample --mobile --dark
```

| command | what it does |
|---|---|
| `smoke` | sign up → onboarding → empty Home → sample data → Home, Progress, History, Achievements, Settings, a workout detail → delete account. Exit code 1 if any console error / page exception / 5xx. |
| `shot <path> [--sample] [--mobile] [--dark] [--reduced-motion]` | fresh account (+ 12 weeks of sample workouts with `--sample`), screenshot one page, delete the account. `<path>` has **no leading slash** (`progress`, `achievements`). |

Screenshots: `.claude/skills/run-fitness-ai-tracker/shots/<area>/NN-name.png` (git-ignored; override with
`SHOTS_DIR`). **Look at them** with the Read tool. `BASE_URL` overrides the server address.

For longer flows, write a script that imports the driver's helpers:
`open(area, {mobile, dark, reducedMotion})` → `{page, shot(name), errors, close}`, `signup(page, tag)`,
`onboard(page)`, `addSampleData(page)`, `login(page, email, pw)`, `deleteAccount(page)`, `settle(page)`.
Always call `deleteAccount` in a `finally`. Several agents can run in parallel, one account each.

## Run (human path)

`npm run dev`, open http://localhost:3000, Ctrl-C to stop.

## Test

```bash
npm test     # vitest: unit tests + the AI evaluation on a real training log (AI estimator error 14.35%)
npm run lint
npm run build
```

## Gotchas

- **Git Bash rewrites arguments starting with `/`** into Windows paths (`/progress` → `C:/Program Files/Git/progress`). Pass app paths without the slash; the driver adds it.
- **Next 16 allows one dev server per project.** A second `npm run dev` prints the running one's PID and exits with code 1. The server is still up; just use it.
- **The dev server compiles routes on first visit** (10 s+), and streams pages with Suspense: a "Rendering…" pill in the bottom-left means it isn't done. Wait for real content (`settle(page)` or a specific `getByRole(...)`) before screenshots.
- **The dev server can serve a stale `globals.css`** after edits (seen with new `@keyframes`): the rule is in `npm run build` output but not in the served chunk. Restart `npm run dev` before judging CSS-only changes.
- **Type decimals key by key** to test inputs like a user: `locator.pressSequentially("82,5")`. `fill()` sets the whole string at once and hid a real bug (82,5 → 825).
- **Open the app by name, not IP.** Supabase's firewall answers auth requests whose redirect URL is a raw IP (e.g. `http://100.x.y.z:3000`) with a 403 HTML page.
- **Phone full-page screenshots show the fixed tab bar mid-page.** That's how full-page capture works; to judge overlap, take a viewport screenshot (`page.screenshot({ fullPage: false })`).
- **Headless Edge reports `navigator.canShare` as true** but sharing produces nothing; to test the share image, fetch `/share/workout/<id>?format=story|square` with `page.request.get(...)` in the logged-in context and save the PNG.
- **The active workout lives in localStorage** until "Finish"; a fresh browser context starts with none.
- **`npm run build` next to the running dev server is fine** (dev uses `.next/dev`), but don't run several builds at once.

## Troubleshooting

- **`page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/...`**: the dev server isn't running. Start it (above).
- **`usage: driver.mjs smoke | …` for a `shot` command**: the path started with `/` and Git Bash rewrote it. Drop the slash.
- **A stuck `node` test process** that the permission system won't let you stop: it times out on its own; ask the user to end it in Task Manager if it matters.
