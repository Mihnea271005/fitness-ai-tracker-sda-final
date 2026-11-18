import { describe, expect, it } from "vitest";
import { trainingCalendar, type CalendarOptions } from "./calendar";

const base: CalendarOptions = {
  daysPerWeek: 3,
  sessionMinutes: 60,
  time: "18:30",
  tz: "Europe/Bucharest",
  planMode: "weekly",
  remindBefore: 30,
  today: "2026-11-18", // a Wednesday
  uidSeed: "user-1",
  appUrl: "https://example.test",
  now: new Date("2026-11-18T10:00:00Z"),
};

describe("training calendar (.ics)", () => {
  it("one weekly repeating event per training day, starting from today onwards", () => {
    const ics = trainingCalendar(base);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    // 3 days = Mon / Wed / Fri; from Wednesday the 18th: Mon 23rd, Wed 18th, Fri 20th.
    expect(ics).toContain("DTSTART;TZID=Europe/Bucharest:20261123T183000");
    expect(ics).toContain("DTSTART;TZID=Europe/Bucharest:20261118T183000");
    expect(ics).toContain("DTSTART;TZID=Europe/Bucharest:20261120T183000");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=FR");
    expect(ics).toContain("DURATION:PT60M");
    expect(ics).toContain("TRIGGER:-PT30M");
  });

  it("names the day in weekly mode, plain 'Workout' in session mode", () => {
    expect(trainingCalendar(base)).toContain("SUMMARY:Workout: Full Body A");
    expect(trainingCalendar({ ...base, planMode: "session" })).toMatch(/SUMMARY:Workout\r\n/);
  });

  it("stable UIDs, so re-importing updates instead of duplicating", () => {
    expect(trainingCalendar(base)).toContain("UID:user-1-MO@fitness-ai-tracker");
  });

  it("uses CRLF and keeps every line within 75 octets", () => {
    const ics = trainingCalendar({ ...base, appUrl: "https://a-very-long-host-name-for-testing-line-folding.example.test" });
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
    expect(ics.includes("\n") && !/[^\r]\n/.test(ics)).toBe(true);
  });
});
