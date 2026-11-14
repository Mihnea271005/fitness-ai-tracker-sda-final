"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Stores the browser's time zone in a `tz` cookie so the server can show workout
 * dates and weeks in the user's local time. Refreshes once if it changed.
 */
export function TimeZoneSync() {
  const router = useRouter();
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const current = document.cookie.match(/(?:^|; )tz=([^;]*)/)?.[1];
      if (tz && decodeURIComponent(current ?? "") !== tz) {
        document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }
    } catch {
      /* cookies blocked: dates fall back to UTC */
    }
  }, [router]);
  return null;
}
