import { describe, expect, it } from "vitest";
import { achievements, workoutPRs } from "./achievements";
import type { Exercise, Workout, WorkoutSet } from "./types";

const ex = (slug: string): Exercise => ({ id: `id-${slug}`, ownerId: null, slug, name: slug, kind: "strength", primaryMuscle: "chest", equipment: "barbell", weightIncrementKg: 2.5, archived: false });
const bench = ex("bench-press");
const squat = ex("squat");
const EXERCISES = new Map([bench, squat].map((e) => [e.id, e]));

let n = 0;
const set = (weightKg: number, reps: number): WorkoutSet => ({ id: `s${n++}`, index: 0, type: "working", weightKg, reps, completed: true });
/** `day`: a date "YYYY-MM-DD" (noon UTC). */
const workout = (day: string, e: Exercise, sets: WorkoutSet[]): Workout => ({
  id: `w-${day}-${n++}`,
  title: "W",
  startedAt: `${day}T12:00:00Z`,
  endedAt: `${day}T13:00:00Z`,
  exercises: [{ id: `we${n++}`, exerciseId: e.id, sets }],
});
const find = (list: ReturnType<typeof achievements>, id: string) => list.find((a) => a.id === id)!;

describe("achievements", () => {
  it("counts workouts and remembers which one unlocked each milestone", () => {
    const ws = Array.from({ length: 10 }, (_, i) => workout(`2026-09-${String(i + 1).padStart(2, "0")}`, bench, [set(60, 5)]));
    const list = achievements(ws, EXERCISES, 3, "UTC", "kg");
    expect(find(list, "count-1").unlockedBy).toBe(ws[0].id);
    expect(find(list, "count-10").unlockedBy).toBe(ws[9].id);
    expect(find(list, "count-25").unlockedAt).toBeUndefined();
    expect(find(list, "count-25").progressLabel).toBe("10 of 25");
    expect(list[0].unlockedAt).toBeDefined(); // unlocked first
  });

  it("streaks need the weekly goal in consecutive weeks", () => {
    // Goal 2/week. Weeks of 2026-09-07 and 2026-09-14 both reach it → 2-week streak.
    const ws = [
      workout("2026-09-07", bench, [set(60, 5)]),
      workout("2026-09-09", bench, [set(60, 5)]),
      workout("2026-09-14", bench, [set(60, 5)]),
      workout("2026-09-16", bench, [set(60, 5)]),
    ];
    expect(find(achievements(ws, EXERCISES, 2, "UTC", "kg"), "streak-2").unlockedBy).toBe(ws[3].id);
    // A missed week in between resets it.
    const gap = [ws[0], ws[1], workout("2026-09-21", bench, [set(60, 5)]), workout("2026-09-23", bench, [set(60, 5)])];
    expect(find(achievements(gap, EXERCISES, 2, "UTC", "kg"), "streak-2").unlockedAt).toBeUndefined();
  });

  it("plate milestones: every one reached plus the next, never junk sets", () => {
    const ws = [workout("2026-09-01", bench, [set(102.5, 3)]), workout("2026-09-03", squat, [set(825, 5)])]; // 825 kg = typo
    const list = achievements(ws, EXERCISES, 3, "UTC", "kg");
    expect(find(list, "plates-bench-press-60").unlockedAt).toBeDefined();
    expect(find(list, "plates-bench-press-100").unlockedAt).toBeDefined();
    expect(find(list, "plates-bench-press-140").unlockedAt).toBeUndefined(); // the next one, shown locked
    expect(list.some((a) => a.id === "plates-bench-press-180")).toBe(false); // further ones hidden
    expect(find(list, "plates-squat-60").unlockedAt).toBeUndefined(); // the impossible set doesn't count
  });

  it("total volume in tonnes", () => {
    const ws = [workout("2026-09-01", squat, [set(100, 10)])]; // 1,000 kg
    const v1 = find(achievements(ws, EXERCISES, 3, "UTC", "kg"), "volume-1");
    expect(v1.unlockedAt).toBeDefined();
    expect(v1.description).toContain("1 tonne in total");
  });
});

describe("plate milestones in pounds", () => {
  it("lb users get 135 / 225 lb targets, and a logged 135 lb counts", () => {
    const ws = [workout("2026-09-01", bench, [set(61.23, 5)])]; // 135 lb as stored (2 decimals)
    const list = achievements(ws, EXERCISES, 3, "UTC", "lb");
    expect(find(list, "plates-bench-press-135lb").unlockedAt).toBeDefined();
    expect(find(list, "plates-bench-press-225lb").title).toBe("bench: 2 plates".replace("bench", "Bench"));
    expect(find(list, "plates-bench-press-225lb").description).toContain("225 lb");
  });
});

describe("personal records in a workout", () => {
  it("labels what improved: more reps at the same weight isn't a 'heaviest set'", () => {
    const old = workout("2026-09-01", bench, [set(100, 3)]);
    const now = workout("2026-09-08", bench, [set(100, 5)]);
    expect(workoutPRs(now, [now, old], EXERCISES)[0].label).toBe("More reps at your best weight");
    const heavier = workout("2026-09-15", bench, [set(102.5, 1)]);
    expect(workoutPRs(heavier, [heavier, now, old], EXERCISES)[0].label).toBe("Heaviest set");
  });

  it("only sets that beat earlier ones; a first-ever exercise isn't a record", () => {
    const old = workout("2026-09-01", bench, [set(80, 5)]);
    const now: Workout = { ...workout("2026-09-08", bench, [set(85, 3), set(80, 5)]), exercises: [{ id: "a", exerciseId: bench.id, sets: [set(85, 3)] }, { id: "b", exerciseId: squat.id, sets: [set(100, 5)] }] };
    const prs = workoutPRs(now, [now, old], EXERCISES);
    expect(prs).toHaveLength(1);
    expect(prs[0].exercise.id).toBe(bench.id);
    expect(prs[0].set.weightKg).toBe(85);
  });
});
