import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { generateWorkout, type TrainingSettings } from "./generator";
import { describeGoal, firstAchieved, goalStatus, goalTarget } from "./goals";
import type { CoachProfile } from "./estimator";
import type { BodyMeasurement, Exercise, PersonalGoal, Workout, WorkoutSet } from "../types";

/* ------------------------------------------------------------------ fixtures */

const NOW = new Date("2026-11-18T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

const ex = (slug: string, kind: Exercise["kind"], name = slug): Exercise => ({
  id: `id-${slug}`,
  ownerId: null,
  slug,
  name,
  kind,
  primaryMuscle: "chest",
  equipment: "barbell",
  weightIncrementKg: 2.5,
  archived: false,
});
const LIBRARY: Exercise[] = Object.entries(CATALOG).map(([slug, c]) => ex(slug, c.reps ? "bodyweight" : c.seconds ? "timed" : c.pattern === "cardio" ? "cardio" : "strength"));
const byslug = (s: string) => LIBRARY.find((e) => e.slug === s)!;
const bench = byslug("bench-press");
const running = { ...byslug("running"), name: "Running" };

let n = 0;
const set = (v: Partial<WorkoutSet>): WorkoutSet => ({ id: `s${n++}`, index: 0, type: "working", completed: true, ...v });
const workout = (daysAgo: number, exerciseId: string, sets: WorkoutSet[]): Workout => ({
  id: `w${n++}`,
  title: "W",
  startedAt: ago(daysAgo),
  endedAt: ago(daysAgo),
  exercises: [{ id: `we${n++}`, exerciseId, sets }],
});
const goal = (g: Partial<PersonalGoal>): PersonalGoal => ({ id: "g", kind: "exercise", createdAt: ago(60), ...g });
const weighIn = (daysAgo: number, kg: number): BodyMeasurement => ({ id: `m${n++}`, measuredOn: ago(daysAgo).slice(0, 10), weightKg: kg });

/** Bench sessions, newest first, rising 2.5 kg a week from 70 kg × 5. */
const rising = (weeks: number) => Array.from({ length: weeks }, (_, i) => workout(i * 7 + 1, bench.id, [set({ weightKg: 70 + (weeks - 1 - i) * 2.5, reps: 5 })]));

/* ------------------------------------------------------------------ tests */

describe("goal progress", () => {
  it("expresses strength targets as an estimated max", () => {
    expect(goalTarget(goal({ exerciseId: bench.id, targetWeightKg: 100, targetReps: 1 }), bench)).toBe(100);
    expect(goalTarget(goal({ exerciseId: bench.id, targetWeightKg: 80, targetReps: 5 }), bench)).toBeCloseTo(93.33, 1);
  });

  it("counts a goal as achieved only by a set done after it was set", () => {
    const g = goal({ exerciseId: bench.id, targetWeightKg: 100, targetReps: 1, createdAt: ago(10) });
    expect(firstAchieved(g, bench, [workout(20, bench.id, [set({ weightKg: 100, reps: 1 })])], [], Date.parse(g.createdAt))).toBeUndefined();
    const s = goalStatus(g, bench, [workout(3, bench.id, [set({ weightKg: 100, reps: 2 })])], [], "kg", NOW);
    expect(s.achievedAt).toBe(ago(3));
    expect(s.progress).toBe(1);
  });

  it("measures progress from where the user started, and never shows 100% until achieved", () => {
    const g = goal({ exerciseId: bench.id, targetWeightKg: 100, targetReps: 1, baseline: 80 });
    const s = goalStatus(g, bench, [workout(2, bench.id, [set({ weightKg: 90, reps: 1 })])], [], "kg", NOW);
    expect(s.current).toBe(90);
    expect(s.progress).toBeCloseTo(0.5, 5);
    const close = goalStatus(g, bench, [workout(2, bench.id, [set({ weightKg: 97.5, reps: 2 })])], [], "kg", NOW); // e1RM 104 but not 100 × 1
    expect(close.achievedAt).toBeUndefined();
    expect(close.progress).toBe(0.99);
  });

  it("projects a date from the recent trend and checks it against the deadline", () => {
    // e1RM rises ~2.9 kg/week: 70 × 5 (81.7) → 82.5 × 5 (96.3) over 6 sessions; goal 100 kg.
    const g = goal({ exerciseId: bench.id, targetWeightKg: 100, targetReps: 1, deadline: ago(-60).slice(0, 10) });
    const s = goalStatus(g, bench, rising(6), [], "kg", NOW);
    expect(s.projection.kind).toBe("date");
    const days = (Date.parse((s.projection as { date: string }).date) - NOW.getTime()) / DAY;
    expect(days).toBeGreaterThan(3);
    expect(days).toBeLessThan(30);
    expect(s.onTrack).toBe(true);
    const tight = goalStatus({ ...g, deadline: ago(-1).slice(0, 10) }, bench, rising(6), [], "kg", NOW);
    expect(tight.onTrack).toBe(false);
  });

  it("calls a flat or falling trend stalled", () => {
    const flat = [1, 8, 15, 22].map((d) => workout(d, bench.id, [set({ weightKg: 80, reps: 5 })]));
    const s = goalStatus(goal({ exerciseId: bench.id, targetWeightKg: 100, targetReps: 1, deadline: ago(-30).slice(0, 10) }), bench, flat, [], "kg", NOW);
    expect(s.projection.kind).toBe("stalled");
    expect(s.onTrack).toBe(false);
  });

  it("says 'ready' when the estimate passes the target before the goal itself is met", () => {
    // 90 kg × 5 ≈ 105 kg estimated max, but 100 kg × 1 hasn't been lifted yet. The
    // baseline from goal creation (105) is past the target and must be ignored, not used.
    const g = goal({ exerciseId: bench.id, targetWeightKg: 100, targetReps: 1, baseline: 105, deadline: ago(-30).slice(0, 10) });
    const s = goalStatus(g, bench, rising(4).map(() => workout(2, bench.id, [set({ weightKg: 90, reps: 5 })])), [], "kg", NOW);
    expect(s.achievedAt).toBeUndefined();
    expect(s.progress).toBe(0.99);
    expect(s.projection.kind).toBe("ready");
    expect(s.onTrack).toBe(true);
  });

  it("a baseline already past the target falls back to a plain ratio", () => {
    const g = goal({ exerciseId: bench.id, targetWeightKg: 100, targetReps: 1, baseline: 105 });
    const s = goalStatus(g, bench, [workout(2, bench.id, [set({ weightKg: 80, reps: 1 })])], [], "kg", NOW);
    expect(s.progress).toBeCloseTo(0.8, 5);
  });

  it("cardio: a fast pace on a shorter run is 'ready', not achieved", () => {
    const g = goal({ exerciseId: running.id, targetDistanceM: 5000, targetSeconds: 25 * 60 });
    const s = goalStatus(g, running, [workout(2, running.id, [set({ distanceM: 2500, durationS: 11 * 60 })])], [], "kg", NOW); // 4:24 /km
    expect(s.achievedAt).toBeUndefined();
    expect(s.projection.kind).toBe("ready");
  });

  it("needs a few sessions before projecting", () => {
    const s = goalStatus(goal({ exerciseId: bench.id, targetWeightKg: 100, targetReps: 1 }), bench, rising(2), [], "kg", NOW);
    expect(s.projection.kind).toBe("not_enough_data");
  });

  it("cardio: the full distance at goal pace counts; a shorter fast run doesn't", () => {
    const g = goal({ exerciseId: running.id, targetDistanceM: 5000, targetSeconds: 25 * 60 });
    expect(describeGoal(g, running, "kg")).toBe("Running: 5 km in 25:00");
    const short = goalStatus(g, running, [workout(2, running.id, [set({ distanceM: 3000, durationS: 14 * 60 })])], [], "kg", NOW);
    expect(short.achievedAt).toBeUndefined();
    expect(short.higherIsBetter).toBe(false);
    expect(short.current).toBeCloseTo(280, 0); // 4:40 /km
    const done = goalStatus(g, running, [workout(1, running.id, [set({ distanceM: 5000, durationS: 24 * 60 + 30 })])], [], "kg", NOW);
    expect(done.achievedAt).toBeDefined();
  });

  it("body weight: works for losing, from the starting weight", () => {
    const g = goal({ kind: "body_weight", targetWeightKg: 80, baseline: 85 });
    const s = goalStatus(g, undefined, [], [weighIn(1, 82.5), weighIn(20, 85)], "kg", NOW);
    expect(s.higherIsBetter).toBe(false);
    expect(s.progress).toBeCloseTo(0.5, 5);
    expect(goalStatus(g, undefined, [], [weighIn(1, 79.8), weighIn(20, 85)], "kg", NOW).achievedAt).toBeDefined();
  });
});

describe("goals in generated workouts", () => {
  const MAN: CoachProfile = { sex: "male", age: 28, bodyweightKg: 80, experience: "1_to_3" };
  const SETTINGS: TrainingSettings = { daysPerWeek: 3, sessionMinutes: 30, goal: "muscle", focus: [], equipment: "gym", avoid: [], planMode: "session" };
  const gen = (s: Partial<TrainingSettings>, day: "full_a" | "full_b" = "full_b") => generateWorkout(day, { ...SETTINGS, ...s }, MAN, LIBRARY, [], "kg", "2026-11-18");
  const ids = (w: ReturnType<typeof gen>) => w.exercises.map((p) => p.exercise.slug);

  it("keeps a goal exercise even in a short session that would otherwise trim it", () => {
    expect(ids(gen({}))).not.toContain("bicep-curl"); // 30 min: isolation work is trimmed
    const w = gen({ goalExerciseIds: [byslug("bicep-curl").id] });
    expect(ids(w)).toContain("bicep-curl");
    expect(w.exercises.find((p) => p.exercise.slug === "bicep-curl")!.why).toBe("Working towards your goal");
  });

  it("picks the goal exercise for its movement slot", () => {
    // At the gym the barbell bench would normally win the push slot; the goal takes it instead.
    expect(ids(gen({}, "full_a"))).toContain("bench-press");
    const w = gen({ goalExerciseIds: [byslug("db-bench-press").id] }, "full_a");
    expect(ids(w)).toContain("db-bench-press");
    expect(ids(w)).not.toContain("bench-press");
  });

  it("adds a slot for a goal the split never trains, like calves on full-body days", () => {
    expect(ids(gen({ goalExerciseIds: [byslug("calf-raise").id] }))).toContain("calf-raise");
  });

  it("a running goal or a weight-loss goal adds cardio", () => {
    expect(ids(gen({ goalExerciseIds: [running.id] }))).toContain("running");
    expect(gen({ bodyWeightGoal: "lose" }).exercises.some((p) => CATALOG[p.exercise.slug!].pattern === "cardio")).toBe(true);
    expect(gen({}).exercises.some((p) => CATALOG[p.exercise.slug!].pattern === "cardio")).toBe(false);
  });

  it("never forces a goal exercise the location can't do", () => {
    expect(ids(gen({ equipment: "bodyweight", goalExerciseIds: [bench.id] }))).not.toContain("bench-press");
  });
});
