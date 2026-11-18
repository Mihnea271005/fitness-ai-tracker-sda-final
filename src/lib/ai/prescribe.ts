// Turns an estimate into a concrete suggestion ("82.5 kg × 8") with a plain-English
// reason, and adapts the next set during a workout.

import { epley, type Estimate } from "./estimator";
import { KG_PER_LB, formatDuration, formatWeight } from "../format";
import type { Exercise, Unit, WorkoutSet } from "../types";

export type Goal = "strength" | "muscle" | "general" | "endurance" | "fat_loss";

export interface Target {
  sets: number;
  /** strength / bodyweight */
  reps?: number;
  /** timed: seconds */
  seconds?: number;
  /** cardio: minutes */
  minutes?: number;
  restSeconds: number;
}

export interface Suggestion {
  values: Pick<WorkoutSet, "weightKg" | "reps" | "durationS" | "distanceM">;
  reason: string;
}

/** Sets / reps / rest by goal; compound lifts get lower reps than isolation work. */
export function targetFor(goal: Goal, ex: Exercise, compound: boolean, experience: "new" | "under_1" | "1_to_3" | "over_3", sessionMinutes = 60): Target {
  const fewer = experience === "new" ? 1 : 0;
  if (ex.kind === "cardio") {
    const minutes = goal === "endurance" ? Math.min(40, Math.round(sessionMinutes * 0.6)) : goal === "fat_loss" ? 20 : 15;
    return { sets: 1, minutes, restSeconds: 0 };
  }
  if (ex.kind === "timed") return { sets: 3 - fewer, seconds: undefined, restSeconds: 60 };
  if (ex.kind === "bodyweight") return { sets: 3 - fewer, reps: undefined, restSeconds: goal === "endurance" || goal === "fat_loss" ? 45 : 75 };
  const table: Record<Goal, { reps: [number, number]; sets: [number, number]; rest: [number, number] }> = {
    strength: { reps: [5, 8], sets: [4, 3], rest: [180, 90] },
    muscle: { reps: [8, 12], sets: [4, 3], rest: [120, 75] },
    general: { reps: [10, 12], sets: [3, 3], rest: [90, 60] },
    endurance: { reps: [15, 15], sets: [3, 2], rest: [60, 45] },
    fat_loss: { reps: [12, 15], sets: [3, 3], rest: [60, 45] },
  };
  const t = table[goal];
  const i = compound ? 0 : 1;
  return { sets: Math.max(2, t.sets[i] - fewer), reps: t.reps[i], restSeconds: t.rest[i] };
}

/**
 * Round a load down to what you can actually put on the bar / pick up, in the user's unit.
 * The small tolerance absorbs the 2-decimal kg storage: 145 lb is stored as 65.77 kg
 * (144.998 lb) and must still round to 145, not drop a whole plate.
 */
export function roundLoad(kg: number, incrementKg: number, unit: Unit): number {
  if (kg <= 0) return 0;
  const TOLERANCE = 0.01; // of one step
  if (unit === "lb") {
    const step = incrementKg >= 2.5 ? 5 : 2.5;
    const lb = Math.max(step, Math.floor(kg / KG_PER_LB / step + TOLERANCE) * step);
    return Math.round(lb * KG_PER_LB * 100) / 100;
  }
  const step = incrementKg > 0 ? incrementKg : 2.5;
  return Math.max(step, Math.floor(kg / step + TOLERANCE) * step);
}

/** Load (kg) for `reps` reps leaving `rir` reps in reserve, given an estimated 1RM. */
export function loadFor(e1rm: number, reps: number, rir = 2) {
  return e1rm / (1 + (reps + rir) / 30);
}

/** First-set suggestion for today. `est` null → nothing to go on (custom exercise, no history). */
export function suggestStart(ex: Exercise, est: Estimate | null, target: Target, unit: Unit): Suggestion | null {
  if (!est) return null;
  const calibrating = est.source === "profile";
  const calibrateNote = calibrating ? " This first one is deliberately light: log how it felt and the next suggestions adjust." : "";

  switch (ex.kind) {
    case "strength": {
      const reps = target.reps ?? 8;
      // Calibration (profile only): leave ~5 reps in reserve — the guess can be ±20%.
      let kg = loadFor(est.value, reps, calibrating ? 5 : 2);
      const last = est.lastSets?.[0];
      const lighterWeek = est.missesInARow >= 2 && !!last?.weightKg;
      const timeOff = !!est.daysSinceLast && est.daysSinceLast > 14;
      // Never below what was just lifted: if last time's first set hit at least today's
      // reps, that weight is the floor. The estimate averages recent sessions (that's what
      // predicts best), so after a jump in weight it can trail the latest session. The
      // floor applies AFTER rounding, so an off-step weight (66 kg, 25 kg dumbbells) or a
      // kg/lb mismatch is never rounded down below it. Only a lighter week or time off
      // (> 2 weeks) may go lower.
      const floorKg = !lighterWeek && !timeOff && last?.weightKg && last.reps && reps <= last.reps ? last.weightKg : 0;
      const load = (k: number) => Math.max(roundLoad(k, ex.weightIncrementKg, unit), floorKg);
      let reason: string;
      if (lighterWeek) {
        kg = last!.weightKg! * 0.9;
        reason = `You missed reps two sessions in a row at ${formatWeight(last!.weightKg!, unit)}, so take a lighter week: ${formatWeight(load(kg), unit)} × ${reps}, then build back up.`;
      } else if (last?.weightKg && est.lastSets!.every((s) => (s.reps ?? 0) >= (last.reps ?? 0)) && est.lastSets!.every((s) => s.feel !== -1) && (last.reps ?? 0) >= reps) {
        // Double progression: everything was hit and nothing felt too hard → at least one step up.
        kg = Math.max(kg, last.weightKg + ex.weightIncrementKg);
        reason = `You did ${formatWeight(last.weightKg, unit)} × ${last.reps} on all ${est.lastSets!.length} sets last time, so try ${formatWeight(load(kg), unit)} × ${reps}.`;
      } else if (floorKg && load(kg) <= floorKg) {
        reason = `You did ${formatWeight(floorKg, unit)} × ${last!.reps} last time, so stay at ${formatWeight(floorKg, unit)} and aim for ${reps} on every set.`;
      } else if (est.source === "profile") {
        reason = `Starting estimate for your profile: about ${formatWeight(est.value, unit)} max, so ${formatWeight(load(kg), unit)} × ${reps} should feel comfortable.`;
      } else if (last?.weightKg && last.reps && Math.abs(last.reps - reps) >= 2) {
        reason = `Your plan uses ${reps} reps here, so ${formatWeight(load(kg), unit)} × ${reps}: about the same effort as your ${formatWeight(last.weightKg, unit)} × ${last.reps} last time (estimated max ${formatWeight(est.value, unit)}).`;
      } else {
        reason = `Your recent sets put your max around ${formatWeight(est.value, unit)}, so ${formatWeight(load(kg), unit)} × ${reps} leaves about 2 reps in reserve.`;
      }
      if (timeOff) reason += ` It's been ${Math.round(est.daysSinceLast! / 7)} weeks, so this is eased off a little.`;
      return { values: { weightKg: load(kg), reps }, reason: reason + calibrateNote };
    }
    case "bodyweight": {
      const max = est.value;
      const reps = Math.max(1, Math.round(max * (calibrating ? 0.6 : 0.8)));
      const last = est.lastSets?.[0];
      const reason =
        last?.reps && !calibrating
          ? `Last time your best set was ${Math.round(max)} reps, so aim for ${reps} per set and add one when it feels easy.`
          : `Aim for ${reps} controlled reps per set; stop with a couple left in the tank.`;
      return { values: { reps, weightKg: last?.weightKg }, reason: reason + calibrateNote };
    }
    case "timed": {
      const seconds = Math.max(10, Math.round((est.value * (calibrating ? 0.7 : 1) + (calibrating ? 0 : 5)) / 5) * 5);
      const reason = calibrating ? `Hold ${formatDuration(seconds)} with good form.` : `Your best hold is ${formatDuration(est.value)}, so try ${formatDuration(seconds)}.`;
      return { values: { durationS: seconds }, reason: reason + calibrateNote };
    }
    case "cardio": {
      const minutes = target.minutes ?? 20;
      const pace = est.value * (calibrating ? 1.08 : 0.99);
      const distanceM = Math.round(((minutes * 60) / pace) * 1000 / 100) * 100;
      return {
        values: { durationS: minutes * 60, distanceM },
        reason: `${minutes} minutes at about ${formatDuration(pace)}/km${calibrating ? ", an easy conversational pace" : ", a touch quicker than last time"}.`,
      };
    }
  }
}

/** Adapt the next set from the one just done (and how it felt). */
export function adjustNext(ex: Exercise, done: Partial<WorkoutSet>, target: Target, unit: Unit): Suggestion | null {
  const feel = done.feel;
  switch (ex.kind) {
    case "strength": {
      if (!done.weightKg || !done.reps) return null;
      const goalReps = target.reps ?? done.reps;
      if (done.reps >= goalReps + 2 || feel === 1) {
        const kg = done.weightKg + ex.weightIncrementKg;
        return { values: { weightKg: kg, reps: goalReps }, reason: `That looked easy, so go up to ${formatWeight(kg, unit)}.` };
      }
      if (done.reps <= goalReps - 2 || feel === -1) {
        const kg = roundLoad(Math.min(done.weightKg - ex.weightIncrementKg, loadFor(epley(done.weightKg, done.reps), goalReps, 1)), ex.weightIncrementKg, unit);
        return { values: { weightKg: kg, reps: goalReps }, reason: `That was tough, so drop to ${formatWeight(kg, unit)} to keep good reps.` };
      }
      return { values: { weightKg: done.weightKg, reps: goalReps }, reason: `Good set. Same again.` };
    }
    case "bodyweight": {
      if (!done.reps) return null;
      const reps = Math.max(1, done.reps + (feel === 1 ? 1 : feel === -1 ? -2 : 0));
      return { values: { reps, weightKg: done.weightKg }, reason: feel === -1 ? `Take a couple off: ${reps} reps.` : `Aim for ${reps} reps.` };
    }
    case "timed": {
      if (!done.durationS) return null;
      const s = Math.max(10, done.durationS + (feel === 1 ? 10 : feel === -1 ? -10 : 0));
      return { values: { durationS: s, weightKg: done.weightKg }, reason: `Hold for ${formatDuration(s)}.` };
    }
    case "cardio":
      return null;
  }
}
