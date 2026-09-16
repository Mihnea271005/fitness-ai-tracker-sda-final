// Set EXPO_PUBLIC_API_URL to the backend's LAN address when testing on a
// physical device — "localhost" only works in the iOS simulator, not on a
// real phone or Android emulator (use http://10.0.2.2:8000 for the Android
// emulator specifically).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
