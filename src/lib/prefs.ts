"use client";

// Per-device preferences kept in localStorage (e.g. the rest timer). Every access is
// wrapped in try/catch: storage can be blocked (private mode, disabled site data), and the
// app must still work with the defaults.

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "fitness-prefs-change";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** A boolean preference stored on this device. Server render and blocked storage use `fallback`. */
export function useBooleanPref(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const value = raw === null ? fallback : raw === "1";
  const set = useCallback(
    (v: boolean) => {
      try {
        window.localStorage.setItem(key, v ? "1" : "0");
      } catch {
        // Storage blocked: the choice just won't persist.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}

export const REST_TIMER_PREF = "pref:rest-timer";
