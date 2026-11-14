// Next-set suggestions — PLACEHOLDER until stage 4, which replaces `suggestFirstSet`
// with the full progressive-overload rules (misses, deloads, layoffs, in-session
// adjustments, bodyweight / timed / cardio rules) plus unit tests.

import { formatDuration, formatSet, formatWeight } from "./format";
import type { Exercise, Unit, Workout, WorkoutSet } from "./types";

export interface Suggestion {
  values: Pick<WorkoutSet, "weightKg" | "reps" | "durationS" | "distanceM">;
  reason: string;
}

/** Working sets from the most recent session that included this exercise. `workouts` is newest-first. */
export function lastSessionSets(workouts: Workout[], exerciseId: string): WorkoutSet[] {
  for (const w of workouts) {
    const we = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (we) {
      const working = we.sets.filter((s) => s.completed && s.type !== "warmup");
      if (working.length) return working;
    }
  }
  return [];
}

export function suggestFirstSet(exercise: Exercise, last: WorkoutSet[], unit: Unit = "kg"): Suggestion | null {
  if (!last.length) return null;
  const top = last[0];
  switch (exercise.kind) {
    case "strength": {
      const w = top.weightKg ?? 0;
      const allHit = last.every((s) => (s.reps ?? 0) >= (top.reps ?? 0));
      if (allHit && exercise.weightIncrementKg > 0) {
        const next = w + exercise.weightIncrementKg;
        return {
          values: { weightKg: next, reps: top.reps },
          reason: `You did ${formatWeight(w, unit)} × ${top.reps} on all ${last.length} sets last time, so try ${formatWeight(next, unit)} × ${top.reps}.`,
        };
      }
      return { values: { weightKg: w, reps: top.reps }, reason: `Repeat ${formatSet(top, "strength", unit)} until every set hits ${top.reps} reps.` };
    }
    case "bodyweight":
      return { values: { reps: (top.reps ?? 0) + 1, weightKg: top.weightKg }, reason: `Last time: ${top.reps} reps. Aim for one more.` };
    case "timed":
      return { values: { durationS: (top.durationS ?? 0) + 5 }, reason: `Last time: ${formatDuration(top.durationS ?? 0)}. Hold 5 seconds longer.` };
    case "cardio":
      return {
        values: { distanceM: top.distanceM, durationS: top.durationS ? Math.round(top.durationS * 0.98) : undefined },
        reason: `Same distance as last time, about 2% faster.`,
      };
  }
}
