// Workout reminders without any server: an iCalendar (.ics) file with one weekly repeating
// event per training day. The phone's own calendar shows it and sends the reminder.

import { DAY_LABEL, splitFor, weekdaysFor, type DayType } from "./ai/generator";

const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

/** Escape text per RFC 5545 (backslash, comma, semicolon, newline). */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");

/** Fold lines longer than 75 octets (RFC 5545 §3.1). Our lines are ASCII apart from user text. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export interface CalendarOptions {
  daysPerWeek: number;
  sessionMinutes: number;
  /** "HH:MM", local time in `tz` */
  time: string;
  tz: string;
  /** weekly plan: name each day ("Push", "Upper Body"); session mode: just "Workout" */
  planMode: "session" | "weekly";
  /** minutes before the workout to remind (0 = at the start time) */
  remindBefore: number;
  /** today, YYYY-MM-DD in `tz`: the series starts on the first training day from here */
  today: string;
  /** stable per user, so re-importing updates the events instead of duplicating them */
  uidSeed: string;
  appUrl: string;
  now?: Date;
}

export function trainingCalendar(o: CalendarOptions): string {
  const [hh, mm] = o.time.split(":").map(Number);
  const cycle = splitFor(o.daysPerWeek);
  const stamp = (o.now ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const todayMs = Date.parse(`${o.today}T12:00:00Z`);
  const todayDow = (new Date(todayMs).getUTCDay() + 6) % 7; // 0 = Monday

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fitness AI Tracker//Training days//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Workouts"];
  weekdaysFor(o.daysPerWeek).forEach((dow, k) => {
    const first = new Date(todayMs + ((dow - todayDow + 7) % 7) * 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
    const day: DayType = cycle[k % cycle.length];
    const summary = o.planMode === "weekly" ? `Workout: ${DAY_LABEL[day]}` : "Workout";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${o.uidSeed}-${BYDAY[dow]}@fitness-ai-tracker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${o.tz}:${first}T${String(hh).padStart(2, "0")}${String(mm).padStart(2, "0")}00`,
      `DURATION:PT${Math.max(15, Math.round(o.sessionMinutes))}M`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[dow]}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(`Your AI coach has today's workout ready: ${o.appUrl}/workout`)}`,
      `URL:${o.appUrl}/workout`,
    );
    if (o.remindBefore >= 0) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(summary)}`, `TRIGGER:-PT${o.remindBefore}M`, "END:VALARM");
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
