// What the AI suggests right now: the next workout in the rotation (session mode),
// or today's day of the weekly plan (weekly mode).

import { DAY_LABEL, nextDayType, splitFor, weekPlan, type DayType, type TrainingSettings, type WeekPlanDay } from "./generator";
import { localYmd } from "../format";
import { mondayOf } from "../stats";
import type { Workout } from "../types";

export interface WeekDayStatus extends WeekPlanDay {
  done: boolean;
  isToday: boolean;
}

export type TodayPlan =
  | { mode: "session"; dayType: DayType; trainedToday: boolean }
  | { mode: "weekly"; dayType: DayType | null; week: WeekDayStatus[]; status: "due" | "done" | "rest"; next?: WeekDayStatus };

export function todayPlan(settings: TrainingSettings, workouts: Workout[], now: Date, tz: string): TodayPlan {
  const today = localYmd(now, tz);
  const trainedToday = workouts.some((w) => localYmd(w.startedAt, tz) === today);

  if (settings.planMode === "session") return { mode: "session", dayType: nextDayType(settings, workouts), trainedToday };

  const monday = mondayOf(now, tz);
  const plan = weekPlan(monday, settings.daysPerWeek);
  // Mark planned days done, in order, by the generated workouts logged this week.
  const thisWeek = workouts.filter((w) => w.planDay && mondayOf(w.startedAt, tz) === monday);
  const remaining = new Map<string, number>();
  for (const w of thisWeek) remaining.set(w.planDay!, (remaining.get(w.planDay!) ?? 0) + 1);
  const week: WeekDayStatus[] = plan.map((d) => {
    let done = false;
    if (d.dayType && (remaining.get(d.dayType) ?? 0) > 0) {
      remaining.set(d.dayType, remaining.get(d.dayType)! - 1);
      done = true;
    }
    return { ...d, done, isToday: d.date === today };
  });
  const todayEntry = week.find((d) => d.isToday)!;
  const next = week.find((d) => d.dayType && !d.done && d.date >= today);
  if (todayEntry.dayType && !todayEntry.done) return { mode: "weekly", dayType: todayEntry.dayType, week, status: "due", next: todayEntry };
  // Rest day or already done: offer the next open planned day (or the first of the rotation).
  return { mode: "weekly", dayType: next?.dayType ?? splitFor(settings.daysPerWeek)[0], week, status: todayEntry.dayType ? "done" : "rest", next };
}

export const dayLabel = (d: DayType | null) => (d ? DAY_LABEL[d] : "Rest");
