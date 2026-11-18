import { describe, expect, it } from "vitest";
import { checkBody, checkSet, unusualSet } from "./limits";
import { estimateExercise } from "./ai/estimator";
import { goalStatus } from "./ai/goals";
import type { Exercise, Workout, WorkoutSet } from "./types";

const ex = (kind: Exercise["kind"], equipment: Exercise["equipment"] = "barbell"): Exercise => ({
  id: `id-${kind}-${equipment}`,
  ownerId: null,
  slug: null, // no profile prior: history only
  name: "Test",
  kind,
  primaryMuscle: "quads",
  equipment,
  weightIncrementKg: 2.5,
  archived: false,
});
const squat = ex("strength");
const NOW = new Date("2026-11-18T12:00:00Z");
let n = 0;
const set = (weightKg: number, reps: number): WorkoutSet => ({ id: `s${n++}`, index: 0, type: "working", weightKg, reps, completed: true });
const workout = (daysAgo: number, sets: WorkoutSet[]): Workout => {
  const t = new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();
  return { id: `w${n++}`, title: "W", startedAt: t, endedAt: t, exercises: [{ id: `we${n++}`, exerciseId: squat.id, sets }] };
};

describe("body limits", () => {
  it("accepts normal people and rejects impossible values", () => {
    expect(checkBody(80, 180, "kg")).toBeNull();
    expect(checkBody(null, null, "kg")).toBeNull();
    expect(checkBody(1000, null, "kg")).toMatch(/Body weight/);
    expect(checkBody(null, 999, "kg")).toMatch(/Height/);
  });

  it("height covers the shortest and tallest people ever measured", () => {
    expect(checkBody(null, 55, "kg")).toBeNull(); // Chandra Bahadur Dangi, 54.6 cm
    expect(checkBody(null, 272, "kg")).toBeNull(); // Robert Wadlow, 272 cm
    expect(checkBody(null, 53, "kg")).toMatch(/between 54 and 272/);
    expect(checkBody(null, 273, "kg")).toMatch(/between 54 and 272/);
  });

  it("catches a height and weight that don't fit together", () => {
    expect(checkBody(35, 225, "kg")).toMatch(/don't look right together/); // BMI ≈ 7
    expect(checkBody(290, 125, "kg")).toMatch(/don't look right together/); // BMI ≈ 186
  });
});

describe("set limits", () => {
  it("blocks impossible sets, with limits by equipment", () => {
    expect(checkSet(squat, { weightKg: 140, reps: 5 }, "kg")).toBeNull();
    expect(checkSet(squat, { weightKg: 825, reps: 8 }, "kg")).toMatch(/limit 500 kg/);
    expect(checkSet(squat, { weightKg: 100, reps: 200 }, "kg")).toMatch(/200 reps/);
    expect(checkSet(ex("strength", "dumbbell"), { weightKg: 150, reps: 5 }, "kg")).toMatch(/per hand/);
    expect(checkSet(ex("strength", "machine"), { weightKg: 550, reps: 10 }, "kg")).toBeNull(); // leg press
    expect(checkSet(squat, { weightKg: -5, reps: 5 }, "kg")).toMatch(/negative/);
  });

  it("cardio: rejects superhuman speeds and distances", () => {
    const run = ex("cardio", "none");
    expect(checkSet(run, { distanceM: 5000, durationS: 25 * 60 }, "kg")).toBeNull();
    expect(checkSet(run, { distanceM: 5000, durationS: 60 }, "kg")).toMatch(/100 km\/h/);
    expect(checkSet(run, { distanceM: 900_000, durationS: 20 * 3600 }, "kg")).toMatch(/km limit/);
  });

  it("warns about likely typos against the user's own best, without blocking", () => {
    const history = [{ weightKg: 97.5, reps: 8 }];
    // 825 kg trips both; the logger shows checkSet's hard error first and blocks the tick.
    expect(checkSet(squat, { weightKg: 825, reps: 8 }, "kg")).not.toBeNull();
    expect(unusualSet(squat, { weightKg: 180, reps: 8 }, history, "kg")).toMatch(/Typo\?/); // possible, but 1.8× the best
    expect(unusualSet(squat, { weightKg: 102.5, reps: 8 }, history, "kg")).toBeNull(); // normal progress
    expect(unusualSet(squat, { weightKg: 97.5, reps: 80 }, history, "kg")).toMatch(/reps/);
    expect(unusualSet(squat, { weightKg: 40, reps: 8 }, [], "kg")).toBeNull(); // nothing to compare with
  });
});

describe("the AI ignores impossible sets already in the data", () => {
  it("a stray 825 kg × 8 doesn't drive the estimate up", () => {
    const clean = [workout(7, [set(97.5, 8), set(97.5, 8)])];
    const typo = [workout(2, [set(825, 8)]), ...clean];
    const base = estimateExercise(squat, clean, { sex: "male", experience: "1_to_3" }, NOW)!.value;
    const withTypo = estimateExercise(squat, typo, { sex: "male", experience: "1_to_3" }, NOW)!.value;
    expect(withTypo).toBeCloseTo(base, 5);
    expect(withTypo).toBeLessThan(150);
  });

  it("an impossible set doesn't mark a goal achieved", () => {
    const g = { id: "g", kind: "exercise" as const, exerciseId: squat.id, targetWeightKg: 200, targetReps: 1, createdAt: new Date(NOW.getTime() - 30 * 86_400_000).toISOString() };
    expect(goalStatus(g, squat, [workout(2, [set(825, 3)])], [], "kg", NOW).achievedAt).toBeUndefined();
  });
});
