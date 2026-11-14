"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds (offline fallback page). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      /* non-fatal: the app works without it */
    });
  }, []);
  return null;
}
