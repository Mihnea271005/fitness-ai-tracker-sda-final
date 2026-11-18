// Sanity limits for everything a user types: one place, used by the forms (instant
// feedback), the server actions (the real check) and the AI (ignores anything outside,
// so a typo that slipped into old data can't skew estimates).
//
// Hard limits are set just above human records, so they only catch impossible values.
// Typos that are possible but unlikely (825 kg instead of 82.5) are caught by
// `unusualSet`, which compares against the user's own history and only warns.

import { formatWeight } from "./format";
import type { Exercise, Unit, WorkoutSet } from "./types";

/* ------------------------------------------------------------------ body */

export const BODY_LIMITS = {
  weightKg: { min: 30, max: 300 },
  // Shortest adult ever measured: Chandra Bahadur Dangi, 54.6 cm (Guinness, 2012).
  // Tallest person ever: Robert Wadlow, 272 cm (1940).
  heightCm: { min: 54, max: 272 },
  /** body-mass index; outside this the weight/height pair is almost certainly a typo */
  bmi: { min: 12, max: 70 },
} as const;

/** null if plausible, otherwise a plain-English problem. Either value may be missing. */
export function checkBody(weightKg: number | null | undefined, heightCm: number | null | undefined, unit: Unit): string | null {
  const w = BODY_LIMITS.weightKg;
  const h = BODY_LIMITS.heightCm;
  if (weightKg != null && (!Number.isFinite(weightKg) || weightKg < w.min || weightKg > w.max))
    return `Body weight should be between ${formatWeight(w.min, unit)} and ${formatWeight(w.max, unit)}. Check the number and unit.`;
  if (heightCm != null && (!Number.isFinite(heightCm) || heightCm < h.min || heightCm > h.max)) return `Height should be in centimetres, between ${h.min} and ${h.max}.`;
  if (weightKg != null && heightCm != null) {
    const bmi = weightKg / (heightCm / 100) ** 2;
    if (bmi < BODY_LIMITS.bmi.min || bmi > BODY_LIMITS.bmi.max) return "That height and weight don't look right together. Check both numbers and the unit.";
  }
  return null;
}

/* ------------------------------------------------------------------ sets */

export interface SetLimits {
  weightKg: number;
  reps: number;
  durationS: number;
  distanceM: number;
  /** fastest believable pace, seconds per km (cardio) */
  minPaceS: number;
}

/** Per-set maximums. Strength loads depend on equipment (dumbbells are per hand). */
export function setLimits(ex: Pick<Exercise, "kind" | "equipment">): SetLimits {
  const base = { durationS: 24 * 3600, distanceM: 300_000, minPaceS: 36 }; // 36 s/km = 100 km/h
  switch (ex.kind) {
    case "strength": {
      const weightKg = ex.equipment === "dumbbell" || ex.equipment === "kettlebell" ? 100 : ex.equipment === "machine" || ex.equipment === "cable" ? 600 : 500;
      return { ...base, weightKg, reps: 100 };
    }
    case "bodyweight":
      return { ...base, weightKg: 150, reps: 500 }; // weight = added weight (vest, belt)
    case "timed":
      return { ...base, weightKg: 150, reps: 0, durationS: 3 * 3600 };
    case "cardio":
      return { ...base, weightKg: 0, reps: 0 };
  }
}

type SetValues = Pick<WorkoutSet, "weightKg" | "reps" | "durationS" | "distanceM">;

/** null if the set is possible, otherwise why not (for the logger and the save action). */
export function checkSet(ex: Pick<Exercise, "kind" | "equipment">, s: SetValues, unit: Unit): string | null {
  const l = setLimits(ex);
  if ((s.weightKg ?? 0) < 0 || (s.reps ?? 0) < 0 || (s.durationS ?? 0) < 0 || (s.distanceM ?? 0) < 0) return "Values can't be negative.";
  if (l.weightKg && (s.weightKg ?? 0) > l.weightKg)
    return `${formatWeight(s.weightKg!, unit)} is more than anyone lifts here (limit ${formatWeight(l.weightKg, unit)}${ex.equipment === "dumbbell" || ex.equipment === "kettlebell" ? " per hand" : ""}).`;
  if (l.reps && (s.reps ?? 0) > l.reps) return `${s.reps} reps in one set is more than the ${l.reps} limit.`;
  if ((s.durationS ?? 0) > l.durationS) return ex.kind === "timed" ? "A hold can be at most 3 hours." : "A set can be at most 24 hours.";
  if ((s.distanceM ?? 0) > l.distanceM) return `${Math.round(s.distanceM! / 1000)} km in one go is more than the ${l.distanceM / 1000} km limit.`;
  if (ex.kind === "cardio" && s.distanceM && s.durationS && s.durationS / (s.distanceM / 1000) < l.minPaceS)
    return "That's faster than 100 km/h. Check the distance (km) and time (minutes).";
  return null;
}

/* ------------------------------------------------------------------ typos */

/**
 * A possible-but-suspicious set compared with the user's own best: well above it, by
 * enough to matter. Returns a short question for the logger to show, or null.
 * `history`: earlier working sets of the same exercise.
 */
export function unusualSet(ex: Pick<Exercise, "kind">, s: SetValues, history: SetValues[], unit: Unit): string | null {
  if (!history.length) return null;
  const best = (k: keyof SetValues) => Math.max(0, ...history.map((h) => h[k] ?? 0));
  const w = s.weightKg ?? 0;
  const bw = best("weightKg");
  // 1.5× and at least 20 kg more: real progress is rarely that big a jump.
  if ((ex.kind === "strength" || ex.kind === "bodyweight") && bw > 0 && w > bw * 1.5 && w - bw >= 20)
    return `That's a lot more than your best (${formatWeight(bw, unit)}). Typo?`;
  const r = s.reps ?? 0;
  const br = best("reps");
  if ((ex.kind === "strength" || ex.kind === "bodyweight") && br > 0 && r > br * 2 && r - br >= 10) return `That's far more reps than your best (${br}). Typo?`;
  const d = s.durationS ?? 0;
  const bd = best("durationS");
  if (ex.kind === "timed" && bd > 0 && d > bd * 2.5 && d - bd >= 60) return "That's much longer than your best hold. Typo?";
  return null;
}
