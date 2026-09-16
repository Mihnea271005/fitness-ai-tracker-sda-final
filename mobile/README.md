# Mobile — Fitness AI Tracker (React Native / Expo)

Client for the FastAPI backend in [`../backend`](../backend). Screens mirror
the five Streamlit tabs in `app.py`: Dashboard, Log Workout, History,
AI Coach, Records.

## Status

This is a **structural scaffold**, not a finished app. It has not been run
through the Expo/Metro toolchain in this environment (no Node.js available
here) — treat it as a starting point to `npm install` and iterate on, not as
verified-working code. The backend it talks to *has* been verified end to
end (see `../backend/README.md`).

## Run locally

```bash
cd mobile
npm install
npx expo start
```

Then set the backend URL for your device/emulator — `localhost` only
resolves inside the iOS simulator:

```bash
# physical device on the same Wi-Fi as your backend:
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000 npx expo start

# Android emulator:
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000 npx expo start
```

## Structure

```
mobile/
├── App.tsx                    # entry point
├── src/
│   ├── config/env.ts          # API base URL
│   ├── services/
│   │   ├── api.ts             # typed fetch wrapper for every backend route
│   │   └── types.ts           # mirrors backend/app/schemas.py
│   ├── navigation/AppNavigator.tsx
│   └── screens/
│       ├── DashboardScreen.tsx
│       ├── LogWorkoutScreen.tsx
│       ├── HistoryScreen.tsx
│       ├── AICoachScreen.tsx
│       └── RecordsScreen.tsx
```

## Not implemented yet

Camera/CV rep counting, GPS auto-logging, HealthKit/Health Connect sync,
push notifications, and offline support are all described in
[`../docs/MOBILE_STRATEGY.md`](../docs/MOBILE_STRATEGY.md) but intentionally
**not** built in this scaffold — see
[`../.claude/skills/mobile-fitness-app/SKILL.md`](../.claude/skills/mobile-fitness-app/SKILL.md)
for the conventions to follow when adding them.
