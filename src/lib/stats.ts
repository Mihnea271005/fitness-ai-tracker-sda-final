import { estimatedOneRepMax, localYmd, workoutDurationS, workoutVolumeKg } from "./format";
import type { Exercise, Workout, WorkoutSet } from "./types";

const DAY = 86_400_000;

/** Monday ("YYYY-MM-DD") of the local week containing `iso`, in time zone `tz`. */
export function mondayOf(iso: string | Date, tz: string): string {
  const [y, m, d] = localYmd(iso, tz).split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const dow = (new Date(utc).getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(utc - dow * DAY).toISOString().slice(0, 10);
}

export interface WeekSummary {
  weekStart: string; // Monday, YYYY-MM-DD
  workouts: number;
  volumeKg: number;
  durationS: number;
}

/** Weekly totals for the `count` weeks ending with the current week, oldest first. */
export function weeklySummaries(workouts: Workout[], exercises: Map<string, Exercise>, now: Date, tz: string, count = 12): WeekSummary[] {
  const thisMonday = Date.parse(`${mondayOf(now, tz)}T00:00:00Z`);
  const weeks: WeekSummary[] = [];
  for (let i = count - 1; i >= 0; i--) {
    weeks.push({ weekStart: new Date(thisMonday - i * 7 * DAY).toISOString().slice(0, 10), workouts: 0, volumeKg: 0, durationS: 0 });
  }
  const index = new Map(weeks.map((w, i) => [w.weekStart, i]));
  for (const w of workouts) {
    const i = index.get(mondayOf(w.startedAt, tz));
    if (i === undefined) continue;
    weeks[i].workouts += 1;
    weeks[i].volumeKg += workoutVolumeKg(w, exercises);
    weeks[i].durationS += workoutDurationS(w);
  }
  return weeks;
}

/** Consecutive weeks (ending this week or last) with at least one workout. */
export function weekStreak(weeks: WeekSummary[]): number {
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].workouts > 0) streak++;
    else if (i === weeks.length - 1) continue; // current week may be empty so far
    else break;
  }
  return streak;
}

export interface SessionPoint {
  workoutId: string;
  date: string;
  sets: WorkoutSet[];
  /** headline metric for charting, by kind */
  value: number;
}

/**
 * Per-session history of one exercise, oldest first.
 * Metric: strength → best estimated 1RM (kg); bodyweight → max reps;
 * timed → longest hold (s); cardio → pace (s/km, lower is better).
 */
export function exerciseHistory(workouts: Workout[], exercise: Exercise): SessionPoint[] {
  const pts: SessionPoint[] = [];
  for (const w of workouts) {
    for (const we of w.exercises) {
      if (we.exerciseId !== exercise.id) continue;
      const working = we.sets.filter((s) => s.completed && s.type !== "warmup");
      if (!working.length) continue;
      let value = 0;
      switch (exercise.kind) {
        case "strength":
          value = Math.max(...working.map((s) => estimatedOneRepMax(s.weightKg ?? 0, s.reps ?? 0)));
          break;
        case "bodyweight":
          value = Math.max(...working.map((s) => s.reps ?? 0));
          break;
        case "timed":
          value = Math.max(...working.map((s) => s.durationS ?? 0));
          break;
        case "cardio": {
          const s = working.find((x) => x.distanceM && x.durationS);
          value = s ? (s.durationS ?? 0) / ((s.distanceM ?? 1) / 1000) : 0;
          break;
        }
      }
      pts.push({ workoutId: w.id, date: w.startedAt, sets: we.sets, value });
    }
  }
  return pts.sort((a, b) => a.date.localeCompare(b.date));
}

export interface PersonalRecord {
  exercise: Exercise;
  label: string; // e.g. "Heaviest set"
  set: WorkoutSet;
  date: string;
}

/** The best set ever per exercise (heaviest weight; most reps; longest hold; longest distance). */
export function personalRecords(workouts: Workout[], exercises: Map<string, Exercise>): PersonalRecord[] {
  const best = new Map<string, PersonalRecord & { score: number }>();
  for (const w of workouts) {
    for (const we of w.exercises) {
      const ex = exercises.get(we.exerciseId);
      if (!ex) continue;
      for (const s of we.sets) {
        if (!s.completed || s.type === "warmup") continue;
        let score = 0;
        let label = "";
        switch (ex.kind) {
          case "strength":
            score = (s.weightKg ?? 0) * 1000 + (s.reps ?? 0);
            label = "Heaviest set";
            break;
          case "bodyweight":
            score = (s.weightKg ?? 0) * 1000 + (s.reps ?? 0);
            label = "Most reps";
            break;
          case "timed":
            score = s.durationS ?? 0;
            label = "Longest hold";
            break;
          case "cardio":
            score = s.distanceM ?? 0;
            label = "Longest distance";
            break;
        }
        if (score <= 0) continue;
        const prev = best.get(ex.id);
        if (!prev || score > prev.score) best.set(ex.id, { exercise: ex, label, set: s, date: w.startedAt, score });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.date.localeCompare(a.date)).map(({ exercise, label, set, date }) => ({ exercise, label, set, date }));
}
