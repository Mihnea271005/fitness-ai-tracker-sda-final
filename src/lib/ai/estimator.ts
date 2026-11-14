// Estimates how strong someone currently is on an exercise, blending the population
// model (profile) with their own logged sets. With no history the profile decides;
// each logged session shifts the estimate towards what they actually did.

import { CATALOG, type Experience } from "./catalog";
import { DEFAULT_BODYWEIGHT, predictOneRepMax, type Sex } from "./population";
import type { Exercise, Workout } from "../types";

export interface CoachProfile {
  sex: Sex;
  age?: number;
  bodyweightKg?: number;
  experience: Experience;
}

/** Metric per kind: strength → est. 1RM (kg); bodyweight → max reps; timed → seconds; cardio → pace (s/km). */
export interface Estimate {
  value: number;
  source: "profile" | "history" | "blend";
  sessions: number;
  daysSinceLast?: number;
  /** last session's working sets, newest first (for progression rules) */
  lastSets?: { weightKg?: number; reps?: number; durationS?: number; distanceM?: number; feel?: number }[];
  /** sessions in a row where reps fell short of the first set's reps */
  missesInARow: number;
}

const DAY = 86_400_000;
/** Tunable settings. Defaults were chosen on the first half of a real training log (see history-eval.test.ts). */
export interface EstimatorSettings {
  /** a profile guess counts as this many sessions of real data */
  priorWeight: number;
  /** recent sessions count more: weight halves every N days */
  halfLifeDays: number;
  /** how many recent sessions to look at */
  maxSessions: number;
  /** never estimate below this fraction of the latest session (0 = off) */
  latestFloor: number;
}

export const ESTIMATOR_DEFAULTS: EstimatorSettings = { priorWeight: 0.5, halfLifeDays: 14, maxSessions: 4, latestFloor: 0 };

export function epley(weightKg: number, reps: number) {
  return reps <= 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** Reps you probably had left: "too easy" ≈ 3, "just right" ≈ 1, "too hard" ≈ 0. */
function repsInReserve(feel?: number) {
  return feel === 1 ? 3 : feel === -1 ? 0 : 1;
}

/** Profile-only estimate. `undefined` when the exercise isn't in the catalogue (e.g. custom ones). */
export function priorEstimate(ex: Exercise, p: CoachProfile): number | undefined {
  const c = ex.slug ? CATALOG[ex.slug] : undefined;
  if (!c) return undefined;
  const bw = p.bodyweightKg ?? DEFAULT_BODYWEIGHT[p.sex];
  const sexFactor = (f = 1) => (p.sex === "female" ? f : p.sex === "unspecified" ? (1 + f) / 2 : 1);
  switch (ex.kind) {
    case "strength":
      return c.anchor ? predictOneRepMax(c.anchor.lift, p.sex, p.experience, p.age, p.bodyweightKg) * c.anchor.ratio : undefined;
    case "bodyweight": {
      if (!c.reps) return undefined;
      const ref = DEFAULT_BODYWEIGHT[p.sex];
      return Math.max(1, c.reps[p.experience] * sexFactor(c.femaleFactor) * Math.sqrt(ref / bw));
    }
    case "timed":
      return c.seconds ? c.seconds[p.experience] * sexFactor(c.femaleFactor) : undefined;
    case "cardio": {
      const base = { new: 420, under_1: 390, "1_to_3": 345, over_3: 315 }[p.experience];
      const sexAdj = p.sex === "female" ? 25 : p.sex === "unspecified" ? 12 : 0;
      const ageAdj = p.age && p.age > 35 ? 1 + (p.age - 35) * 0.005 : 1;
      return (base + sexAdj) * ageAdj;
    }
  }
}

/** One session's value for the exercise, from its completed working sets. */
function sessionValue(ex: Exercise, sets: Workout["exercises"][number]["sets"], bodyweightKg: number): number | undefined {
  const working = sets.filter((s) => s.completed && s.type !== "warmup");
  if (!working.length) return undefined;
  const feelOf = (s: (typeof working)[number]) => s.feel;
  switch (ex.kind) {
    case "strength": {
      const vals = working.filter((s) => (s.reps ?? 0) >= 1 && (s.reps ?? 0) <= 15 && (s.weightKg ?? 0) > 0).map((s) => epley(s.weightKg!, s.reps! + repsInReserve(feelOf(s))));
      return vals.length ? Math.max(...vals) : undefined;
    }
    case "bodyweight": {
      // Added weight counts as extra reps (roughly: 10% of body weight ≈ 3 reps).
      const vals = working.filter((s) => (s.reps ?? 0) > 0).map((s) => (s.reps! + (feelOf(s) === 1 ? 2 : 0)) * (1 + ((s.weightKg ?? 0) / bodyweightKg) * 1));
      return vals.length ? Math.max(...vals) : undefined;
    }
    case "timed": {
      const vals = working.filter((s) => (s.durationS ?? 0) > 0).map((s) => s.durationS! * (feelOf(s) === 1 ? 1.1 : 1));
      return vals.length ? Math.max(...vals) : undefined;
    }
    case "cardio": {
      const vals = working
        .filter((s) => (s.durationS ?? 0) > 0 && (s.distanceM ?? 0) >= 200)
        .map((s) => (s.durationS! / (s.distanceM! / 1000)) * (feelOf(s) === 1 ? 0.97 : feelOf(s) === -1 ? 1.03 : 1));
      return vals.length ? Math.min(...vals) : undefined;
    }
  }
}

/** `workouts` newest first. */
export function estimateExercise(ex: Exercise, workouts: Workout[], p: CoachProfile, now = new Date(), opts: EstimatorSettings = ESTIMATOR_DEFAULTS): Estimate | null {
  const bw = p.bodyweightKg ?? DEFAULT_BODYWEIGHT[p.sex];
  const sessions: { at: number; value: number; sets: Workout["exercises"][number]["sets"] }[] = [];
  for (const w of workouts) {
    if (sessions.length >= opts.maxSessions) break;
    for (const we of w.exercises) {
      if (we.exerciseId !== ex.id) continue;
      const v = sessionValue(ex, we.sets, bw);
      if (v !== undefined && v > 0) sessions.push({ at: Date.parse(w.startedAt), value: v, sets: we.sets });
    }
  }
  const prior = priorEstimate(ex, p);
  if (!sessions.length && prior === undefined) return null;

  let value: number;
  let source: Estimate["source"];
  let daysSinceLast: number | undefined;
  let missesInARow = 0;

  if (!sessions.length) {
    value = prior!;
    source = "profile";
  } else {
    const latest = sessions[0].at;
    let num = 0;
    let den = 0;
    for (const s of sessions) {
      const w = 0.5 ** ((latest - s.at) / DAY / opts.halfLifeDays);
      num += w * s.value;
      den += w;
    }
    if (prior !== undefined) {
      num += opts.priorWeight * prior;
      den += opts.priorWeight;
    }
    value = num / den;
    // The latest session is the best evidence of today's level: never estimate far below it.
    if (opts.latestFloor > 0) value = ex.kind === "cardio" ? Math.min(value, sessions[0].value * (2 - opts.latestFloor)) : Math.max(value, sessions[0].value * opts.latestFloor);
    source = prior !== undefined && sessions.length < 3 ? "blend" : "history";

    // Time off: lose ~1% per week after two weeks away (capped at 15%).
    daysSinceLast = Math.floor((now.getTime() - latest) / DAY);
    if (daysSinceLast > 14) {
      const loss = Math.min(0.15, ((daysSinceLast - 14) / 7) * 0.01);
      value = ex.kind === "cardio" ? value * (1 + loss) : value * (1 - loss);
    }

    // Consecutive sessions where a later set fell 2+ reps short of the first one.
    for (const s of sessions) {
      const working = s.sets.filter((x) => x.completed && x.type !== "warmup" && x.reps);
      const target = working[0]?.reps ?? 0;
      if (working.length > 1 && working.some((x) => (x.reps ?? 0) <= target - 2)) missesInARow++;
      else break;
    }
  }

  const lastSets = sessions[0]?.sets
    .filter((s) => s.completed && s.type !== "warmup")
    .map((s) => ({ weightKg: s.weightKg, reps: s.reps, durationS: s.durationS, distanceM: s.distanceM, feel: s.feel }));

  return { value, source, sessions: sessions.length, daysSinceLast, lastSets, missesInARow };
}
