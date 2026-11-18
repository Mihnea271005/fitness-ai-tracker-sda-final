import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTimeZone } from "@/lib/data";
import { trainingCalendar } from "@/lib/calendar";
import { localYmd } from "@/lib/format";

/** Downloads the user's training days as recurring calendar events with a reminder. */
export async function GET(req: NextRequest) {
  const profile = await getCurrentUser();
  // Prefer the browser's own zone (sent by Settings): on a brand-new account the tz cookie
  // may not be set yet, and the reminders would land at UTC times.
  const asked = req.nextUrl.searchParams.get("tz") ?? "";
  let tz = await getTimeZone();
  try {
    // Canonical IANA name only ("Europe/London", "UTC"): Intl also accepts "+01:00" and
    // lowercase names, which calendar apps can't resolve and a colon would break the TZID.
    const canonical = asked && asked.length <= 64 ? new Intl.DateTimeFormat("en", { timeZone: asked }).resolvedOptions().timeZone : "";
    if (/^(UTC|[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+)$/.test(canonical)) tz = canonical;
  } catch {
    // unknown zone name: keep the cookie's
  }
  const q = req.nextUrl.searchParams;
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(q.get("time") ?? "") ? q.get("time")! : "18:00";
  // Missing or invalid → 30 min (Number(null) is 0, which would mean "at the start").
  const remindRaw = q.get("remind");
  const remind = remindRaw === null || remindRaw.trim() === "" ? NaN : Number(remindRaw);
  const remindBefore = [0, 15, 30, 60, 120].includes(remind) ? remind : 30;

  const body = trainingCalendar({
    daysPerWeek: profile.daysPerWeek ?? 3,
    sessionMinutes: profile.sessionMinutes ?? 60,
    planMode: profile.planMode,
    time,
    tz,
    remindBefore,
    today: localYmd(new Date(), tz),
    uidSeed: profile.id,
    appUrl: req.nextUrl.origin,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="workouts.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
