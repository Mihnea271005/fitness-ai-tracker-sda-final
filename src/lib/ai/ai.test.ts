import { describe, expect, it } from "vitest";
import { CATALOG, equipmentAllows } from "./catalog";
import { estimateExercise, priorEstimate, type CoachProfile } from "./estimator";
import { generateWorkout, nextDayType, splitFor, weekPlan, type TrainingSettings } from "./generator";
import { predictCompetitionLift, predictOneRepMax } from "./population";
import { adjustNext, roundLoad, suggestStart, targetFor } from "./prescribe";
import type { Exercise, Workout, WorkoutSet } from "../types";

/* ------------------------------------------------------------------ fixtures */

const ex = (slug: string, kind: Exercise["kind"], name = slug, inc = 2.5): Exercise => ({
  id: `id-${slug}`,
  ownerId: null,
  slug,
  name,
  kind,
  primaryMuscle: "chest",
  equipment: "barbell",
  weightIncrementKg: inc,
  archived: false,
});

const LIBRARY: Exercise[] = Object.entries(CATALOG).map(([slug, c]) =>
  ex(slug, c.reps ? "bodyweight" : c.seconds ? "timed" : c.pattern === "cardio" ? "cardio" : "strength", slug, c.needs === "dumbbells" ? 2 : 2.5),
);
const byslug = (s: string) => LIBRARY.find((e) => e.slug === s)!;

let n = 0;
const set = (weightKg: number | undefined, reps: number | undefined, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: `s${n++}`,
  index: 0,
  type: "working",
  weightKg,
  reps,
  completed: true,
  ...extra,
});
const workout = (daysAgo: number, exerciseId: string, sets: WorkoutSet[], planDay?: string): Workout => {
  const t = Date.parse("2026-11-14T12:00:00Z") - daysAgo * 86_400_000;
  return {
    id: `w${n++}`,
    title: "W",
    planDay,
    startedAt: new Date(t).toISOString(),
    endedAt: new Date(t + 3_600_000).toISOString(),
    exercises: [{ id: `we${n++}`, exerciseId, sets }],
  };
};

const NOW = new Date("2026-11-14T12:00:00Z");
const MAN: CoachProfile = { sex: "male", age: 28, bodyweightKg: 80, experience: "1_to_3" };
const SETTINGS: TrainingSettings = { daysPerWeek: 3, sessionMinutes: 60, goal: "muscle", focus: [], equipment: "gym", avoid: [], planMode: "session" };

/* ------------------------------------------------------------------ population model */

describe("population model", () => {
  it("predicts sensible first-meet lifts", () => {
    const bench = predictCompetitionLift("bench", "male", 28, 80);
    expect(bench).toBeGreaterThan(90);
    expect(bench).toBeLessThan(160);
    expect(predictCompetitionLift("bench", "female", 28, 62)).toBeLessThan(bench);
  });
  it("heavier lifters are predicted stronger", () => {
    expect(predictCompetitionLift("squat", "male", 30, 100)).toBeGreaterThan(predictCompetitionLift("squat", "male", 30, 70));
  });
  it("'prefer not to say' sits between the two models", () => {
    const m = predictCompetitionLift("deadlift", "male", 30, 70);
    const f = predictCompetitionLift("deadlift", "female", 30, 70);
    const u = predictCompetitionLift("deadlift", "unspecified", 30, 70);
    expect(u).toBeGreaterThan(f);
    expect(u).toBeLessThan(m);
  });
  it("scales down for less experience", () => {
    expect(predictOneRepMax("bench", "male", "new", 28, 80)).toBeLessThan(predictOneRepMax("bench", "male", "over_3", 28, 80));
  });
});

/* ------------------------------------------------------------------ estimator */

describe("estimator", () => {
  const bench = byslug("bench-press");

  it("uses the profile when there is no history", () => {
    const e = estimateExercise(bench, [], MAN, NOW)!;
    expect(e.source).toBe("profile");
    expect(e.value).toBeCloseTo(priorEstimate(bench, MAN)!, 5);
  });

  it("moves towards real performance once sets are logged", () => {
    const prior = priorEstimate(bench, MAN)!;
    // Much weaker than the profile predicts: 50 kg × 8 → ~65 kg e1RM
    const e = estimateExercise(bench, [workout(2, bench.id, [set(50, 8), set(50, 8)])], MAN, NOW)!;
    expect(e.source).toBe("blend");
    expect(e.value).toBeLessThan(prior);
    expect(e.value).toBeLessThan(prior * 0.85);
  });

  it("after 3+ sessions it is driven by history", () => {
    const ws = [3, 6, 9].map((d) => workout(d, bench.id, [set(60, 8), set(60, 8)]));
    expect(estimateExercise(bench, ws, MAN, NOW)!.source).toBe("history");
  });

  it("'too easy' raises the estimate, 'too hard' lowers it", () => {
    const base = estimateExercise(bench, [workout(1, bench.id, [set(60, 8)])], { ...MAN, experience: "new" }, NOW)!.value;
    const easy = estimateExercise(bench, [workout(1, bench.id, [set(60, 8, { feel: 1 })])], { ...MAN, experience: "new" }, NOW)!.value;
    const hard = estimateExercise(bench, [workout(1, bench.id, [set(60, 8, { feel: -1 })])], { ...MAN, experience: "new" }, NOW)!.value;
    expect(easy).toBeGreaterThan(base);
    expect(hard).toBeLessThan(base);
  });

  it("eases off after a long break", () => {
    const recent = estimateExercise(bench, [workout(3, bench.id, [set(80, 5)])], MAN, NOW)!;
    const old = estimateExercise(bench, [workout(60, bench.id, [set(80, 5)])], MAN, NOW)!;
    expect(old.value).toBeLessThan(recent.value);
  });

  it("returns null for a custom exercise with no history", () => {
    expect(estimateExercise({ ...bench, id: "custom", slug: null }, [], MAN, NOW)).toBeNull();
  });
});

/* ------------------------------------------------------------------ prescriptions */

describe("prescriptions", () => {
  const bench = byslug("bench-press");
  const t = targetFor("muscle", bench, true, "1_to_3");

  it("rounds loads to real plates, in kg and lb", () => {
    expect(roundLoad(83.7, 2.5, "kg")).toBe(82.5);
    expect(roundLoad(61.3, 2.5, "lb") / 0.45359237).toBeCloseTo(135, 1); // 135.1 lb → 135 lb
    expect(roundLoad(61.2, 2.5, "lb") / 0.45359237).toBeCloseTo(130, 1); // 134.9 lb → never rounds up: 130 lb
    expect(roundLoad(9.5, 2, "lb") / 0.45359237).toBeCloseTo(20, 1); // dumbbells: 2.5 lb steps
  });

  it("double progression: all sets hit → one step up", () => {
    const est = estimateExercise(bench, [workout(3, bench.id, [set(80, 8), set(80, 8), set(80, 8)])], MAN, NOW)!;
    const s = suggestStart(bench, est, { ...t, reps: 8 }, "kg")!;
    expect(s.values.weightKg).toBe(82.5);
    expect(s.reason).toContain("so try 82.5 kg × 8");
  });

  it("two sessions of missed reps → lighter week", () => {
    const ws = [workout(3, bench.id, [set(90, 8), set(90, 5)]), workout(6, bench.id, [set(90, 8), set(90, 5)])];
    const est = estimateExercise(bench, ws, MAN, NOW)!;
    expect(est.missesInARow).toBe(2);
    const s = suggestStart(bench, est, { ...t, reps: 8 }, "kg")!;
    expect(s.values.weightKg).toBe(80); // 90 × 0.9 = 81 → 80
    expect(s.reason).toContain("lighter week");
  });

  it("first session from the profile is deliberately light", () => {
    const est = estimateExercise(bench, [], MAN, NOW)!;
    const s = suggestStart(bench, est, { ...t, reps: 8 }, "kg")!;
    expect(s.values.weightKg!).toBeLessThan(est.value * 0.7);
    expect(s.reason).toContain("deliberately light");
  });

  it("adapts the next set to how the last one went", () => {
    expect(adjustNext(bench, { weightKg: 80, reps: 11 }, { ...t, reps: 8 }, "kg")!.values.weightKg).toBe(82.5);
    expect(adjustNext(bench, { weightKg: 80, reps: 8, feel: -1 }, { ...t, reps: 8 }, "kg")!.values.weightKg!).toBeLessThan(80);
    expect(adjustNext(bench, { weightKg: 80, reps: 8 }, { ...t, reps: 8 }, "kg")!.values.weightKg).toBe(80);
  });
});

/* ------------------------------------------------------------------ generator */

describe("workout generator", () => {
  const gen = (s: Partial<TrainingSettings>, p: Partial<CoachProfile> = {}, history: Workout[] = []) =>
    generateWorkout("full_a", { ...SETTINGS, ...s }, { ...MAN, ...p }, LIBRARY, history, "kg", "2026-11-14");

  it("bodyweight-only users never get equipment exercises", () => {
    for (const day of ["full_a", "full_b", "upper", "lower", "push", "pull", "legs"] as const) {
      const w = generateWorkout(day, { ...SETTINGS, equipment: "bodyweight" }, MAN, LIBRARY, [], "kg", "2026-11-14");
      expect(w.exercises.length).toBeGreaterThan(0);
      for (const p of w.exercises) expect(equipmentAllows("bodyweight", CATALOG[p.exercise.slug!].needs)).toBe(true);
    }
  });

  it("dumbbell users get dumbbell/bodyweight exercises only", () => {
    const w = gen({ equipment: "dumbbells" });
    for (const p of w.exercises) expect(CATALOG[p.exercise.slug!].needs).not.toBe("gym");
  });

  it("respects the avoid list", () => {
    const w = gen({ avoid: [byslug("squat").id, byslug("leg-press").id] });
    expect(w.exercises.map((p) => p.exercise.slug)).not.toContain("squat");
  });

  it("shorter sessions get fewer exercises", () => {
    expect(gen({ sessionMinutes: 30 }).exercises.length).toBeLessThan(gen({ sessionMinutes: 75 }).exercises.length);
  });

  it("adds cardio for endurance / fat-loss goals", () => {
    expect(gen({ goal: "endurance" }).exercises.some((p) => p.exercise.kind === "cardio")).toBe(true);
    expect(gen({ goal: "muscle" }).exercises.some((p) => p.exercise.kind === "cardio")).toBe(false);
  });

  it("a focus area gets an extra exercise", () => {
    const count = (w: ReturnType<typeof gen>) => w.exercises.filter((p) => CATALOG[p.exercise.slug!].pattern === "h_push").length;
    expect(count(gen({ focus: ["chest"], sessionMinutes: 90 }))).toBeGreaterThan(count(gen({ focus: [], sessionMinutes: 90 })));
  });

  it("every exercise has a target and (with a catalogue entry) a suggestion with a reason", () => {
    for (const p of gen({}).exercises) {
      expect(p.target.sets).toBeGreaterThan(0);
      expect(p.suggestion?.reason.length).toBeGreaterThan(10);
    }
  });

  it("prefers exercises the user already knows", () => {
    const history = [workout(5, byslug("goblet-squat").id, [set(20, 10)])];
    const w = gen({ equipment: "dumbbells" }, {}, history);
    expect(w.exercises.map((p) => p.exercise.slug)).toContain("goblet-squat");
  });

  it("rotates through the split", () => {
    expect(splitFor(4)).toEqual(["upper", "lower"]);
    expect(nextDayType({ ...SETTINGS, daysPerWeek: 4 }, [])).toBe("upper");
    expect(nextDayType({ ...SETTINGS, daysPerWeek: 4 }, [workout(1, "x", [], "upper")])).toBe("lower");
    expect(nextDayType({ ...SETTINGS, daysPerWeek: 4 }, [workout(1, "x", [], "lower")])).toBe("upper");
  });

  it("weekly plan has the right number of training days", () => {
    for (let d = 1; d <= 7; d++) expect(weekPlan("2026-11-09", d).filter((x) => x.dayType).length).toBe(d);
    expect(weekPlan("2026-11-09", 3).map((x) => x.dayType)).toEqual(["full_a", null, "full_b", null, "full_a", null, null]);
  });
});
