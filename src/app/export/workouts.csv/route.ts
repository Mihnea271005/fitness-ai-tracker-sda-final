import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getTimeZone, getWorkouts } from "@/lib/data";
import { localYmd } from "@/lib/format";

/** Escapes a CSV field, and neutralises spreadsheet formulas in user-typed text. */
function cell(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Downloads every set the user has logged, one row per set. */
export async function GET() {
  const profile = await getCurrentUser();
  const [workouts, exercises, tz] = await Promise.all([getWorkouts(), getExerciseMap(), getTimeZone()]);

  const rows = [["date", "started_at", "workout", "exercise", "type_of_exercise", "set", "set_type", "weight_kg", "reps", "duration_s", "distance_m"].join(",")];
  for (const w of [...workouts].reverse()) {
    for (const we of w.exercises) {
      const ex = exercises.get(we.exerciseId);
      we.sets.forEach((s, i) => {
        rows.push(
          [localYmd(w.startedAt, tz), w.startedAt, w.title, ex?.name ?? "", ex?.kind ?? "", i + 1, s.type, s.weightKg, s.reps, s.durationS, s.distanceM].map(cell).join(","),
        );
      });
    }
  }

  const name = `workouts-${profile.displayName.replace(/[^\w-]+/g, "_").slice(0, 30) || "export"}-${localYmd(new Date(), tz)}.csv`;
  return new Response("﻿" + rows.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
