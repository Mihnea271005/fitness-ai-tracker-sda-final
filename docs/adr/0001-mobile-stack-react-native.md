# ADR 0001: Mobile client stack — React Native (TypeScript)

## Status
Accepted (2026-09-16)

## Context
Converting the Streamlit prototype into a native iOS/Android app. Candidates
considered: React Native, Flutter, fully native (Swift + Kotlin), or holding
off on code entirely.

## Decision
Use React Native with TypeScript (via Expo for faster iteration on sensor
APIs: camera, GPS, HealthKit/Health Connect, BLE).

## Rationale
- Single codebase for iOS + Android — roughly half the engineering and
  maintenance surface of separate Swift/Kotlin apps.
- Mature ecosystem for the exact hardware integrations this product needs:
  `expo-camera`, `expo-location`, `expo-sensors`, `react-native-health`
  (HealthKit), `react-native-health-connect` (Android), BLE via
  `react-native-ble-plx`.
- The backend is a plain REST API (ADR 0002), so the client choice doesn't
  lock in the ML/analytics logic either way.

## Consequences
- Some advanced camera-based pose estimation (real-time CV rep counting) may
  eventually need a native module bridge (e.g. MediaPipe via a custom RN
  native module) rather than a pure-JS library — acceptable, isolated to one
  feature.
- If a highly custom, animation-heavy UI becomes a priority later, revisit
  Flutter; not needed for the v1 scaffold.
