// Achievements and personal records, computed from logged workouts (like goals: nothing
// is stored, so nothing can get out of sync). Each unlocked achievement remembers the
// workout that earned it, so the workout summary can celebrate exactly what's new.

import { checkSet } from "./limits";
import { formatWeight, workoutVolumeKg } from "./format";
import { mondayOf } from "./stats";
import type { Exercise, Unit, Workout, WorkoutSet } from "./types";

export type AchievementKind = "count" | "streak" | "volume" | "plates";

export interface Achievement {
  id: string; // stable, e.g. "count-10", "plates-bench-press-100"
  kind: AchievementKind;
  title: string;
  description: string;
  unlockedAt?: string; // ISO
  /** the workout that earned it */
  unlockedBy?: string;
  /** for locked ones: how close (0..1) and a short "7 of 10" */
  progress?: number;
  progressLabel?: string;
}

const COUNTS = [1, 10, 25, 50, 100, 250, 500];
const STREAK_WEEKS = [2, 4, 8, 12, 26, 52];
const TONNES = [1, 10, 100, 1000];
/** Bar + one big plate a side, two, …: 20 kg bar with 20 kg plates, or 45 lb bar with 45 lb plates. */
const PLATES_KG = [60, 100, 140, 180, 220];
const PLATES_LB = [135, 225, 315, 405, 495];
const LB = 0.45359237;
const BIG_LIFTS: [slug: string, name: string][] = [
  ["bench-press", "Bench"],
  ["squat", "Squat"],
  ["deadlift", "Deadlift"],
];

const working = (ex: Exercise, s: WorkoutSet) => s.completed && s.type !== "warmup" && checkSet(ex, s, "kg") === null;

/** Every achievement, unlocked first (newest first), then locked (closest first). */
export function achievements(workouts: Workout[], exercises: Map<string, Exercise>, weeklyGoal: number, tz: string, unit: Unit): Achievement[] {
  const chrono = [...workouts].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const out: Achievement[] = [];

  // Workout count
  for (const n of COUNTS) {
    const w = chrono[n - 1];
    out.push({
      id: `count-${n}`,
      kind: "count",
      title: n === 1 ? "First workout" : `${n} workouts`,
      description: n === 1 ? "Logged your first workout." : `Logged ${n} workouts.`,
      unlockedAt: w?.startedAt,
      unlockedBy: w?.id,
      progress: Math.min(chrono.length / n, 1),
      progressLabel: `${Math.min(chrono.length, n)} of ${n}`,
    });
  }

  // Total volume
  let total = 0;
  const volumeHit = new Map<number, Workout>();
  for (const w of chrono) {
    total += workoutVolumeKg(w, exercises);
    for (const t of TONNES) if (!volumeHit.has(t) && total >= t * 1000) volumeHit.set(t, w);
  }
  for (const t of TONNES) {
    const w = volumeHit.get(t);
    out.push({
      id: `volume-${t}`,
      kind: "volume",
      title: `${t.toLocaleString("en")} t lifted`,
      description: `Moved ${t.toLocaleString("en")} ${t === 1 ? "tonne" : "tonnes"} in total (weight × reps across every set).`,
      unlockedAt: w?.startedAt,
      unlockedBy: w?.id,
      progress: Math.min(total / (t * 1000), 1),
      progressLabel: `${(Math.min(total, t * 1000) / 1000).toLocaleString("en", { maximumFractionDigits: 1 })} of ${t.toLocaleString("en")} t`,
    });
  }

  // Weekly-goal streaks: consecutive weeks that reached the goal. The workout that
  // completes a week's goal is the one that extends the streak.
  const goal = Math.max(1, weeklyGoal);
  const perWeek = new Map<string, number>();
  let streak = 0;
  let lastWeek: string | null = null;
  let best = 0;
  const streakHit = new Map<number, Workout>();
  for (const w of chrono) {
    const week = mondayOf(w.startedAt, tz);
    const count = (perWeek.get(week) ?? 0) + 1;
    perWeek.set(week, count);
    if (count !== goal) continue; // only the workout that reaches the goal counts
    const prevMonday = new Date(Date.parse(`${week}T12:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
    streak = lastWeek === prevMonday ? streak + 1 : 1;
    lastWeek = week;
    best = Math.max(best, streak);
    for (const n of STREAK_WEEKS) if (!streakHit.has(n) && streak >= n) streakHit.set(n, w);
  }
  for (const n of STREAK_WEEKS) {
    const w = streakHit.get(n);
    out.push({
      id: `streak-${n}`,
      kind: "streak",
      title: `${n}-week goal streak`,
      description: `Hit your weekly goal ${n} weeks in a row.`,
      unlockedAt: w?.startedAt,
      unlockedBy: w?.id,
      progress: Math.min(best / n, 1),
      progressLabel: `Best: ${best} of ${n} weeks`,
    });
  }

  // Plate milestones on the big three: show every one reached plus the next one.
  // Milestones in the user's unit, so lb users see 135 / 225 lb rather than 132.3 / 220.5.
  const plates = unit === "lb" ? PLATES_LB.map((lb) => ({ kg: lb * LB, tag: `${lb}lb` })) : PLATES_KG.map((kg) => ({ kg, tag: String(kg) }));
  for (const [slug, name] of BIG_LIFTS) {
    const ex = [...exercises.values()].find((e) => e.slug === slug);
    if (!ex) continue;
    let heaviest = 0;
    const hit = new Map<number, Workout>();
    for (const w of chrono) {
      for (const we of w.exercises) {
        if (we.exerciseId !== ex.id) continue;
        for (const s of we.sets) {
          if (!working(ex, s) || (s.reps ?? 0) < 1) continue;
          heaviest = Math.max(heaviest, s.weightKg ?? 0);
          // Small tolerance: weights are stored in kg to 2 decimals (135 lb → 61.23 kg).
          for (const { kg } of plates) if (!hit.has(kg) && (s.weightKg ?? 0) >= kg - 0.01) hit.set(kg, w);
        }
      }
    }
    const next = plates.find(({ kg }) => !hit.has(kg))?.kg;
    for (const [i, { kg, tag }] of plates.entries()) {
      if (!hit.has(kg) && kg !== next) continue;
      const count = i + 1;
      const w = hit.get(kg);
      out.push({
        id: `plates-${slug}-${tag}`,
        kind: "plates",
        title: `${name}: ${count} plate${count > 1 ? "s" : ""}`,
        description: `${name} ${formatWeight(kg, unit)} for at least one rep: a bar with ${count} big plate${count > 1 ? "s" : ""} a side.`,
        unlockedAt: w?.startedAt,
        unlockedBy: w?.id,
        progress: Math.min(heaviest / kg, 1),
        progressLabel: `Best: ${formatWeight(heaviest, unit)} of ${formatWeight(kg, unit)}`,
      });
    }
  }

  const unlocked = out.filter((a) => a.unlockedAt).sort((a, b) => b.unlockedAt!.localeCompare(a.unlockedAt!));
  const locked = out.filter((a) => !a.unlockedAt).sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
  return [...unlocked, ...locked];
}

export interface WorkoutPR {
  exercise: Exercise;
  set: WorkoutSet;
  label: string; // "Heaviest set", "More reps at the same weight", …
}

/**
 * Sets in this workout that beat everything before it on the same exercise. The first
 * time you do an exercise isn't a record (there's nothing to beat), so it's not listed.
 */
export function workoutPRs(workout: Workout, workouts: Workout[], exercises: Map<string, Exercise>): WorkoutPR[] {
  const before = workouts.filter((w) => w.startedAt < workout.startedAt);
  const score = (ex: Exercise, s: WorkoutSet) => {
    switch (ex.kind) {
      case "strength":
      case "bodyweight":
        return (s.weightKg ?? 0) * 1000 + (s.reps ?? 0);
      case "timed":
        return s.durationS ?? 0;
      case "cardio":
        return s.distanceM ?? 0;
    }
  };
  const prs: WorkoutPR[] = [];
  for (const we of workout.exercises) {
    const ex = exercises.get(we.exerciseId);
    if (!ex) continue;
    const prev = before.flatMap((w) => w.exercises.filter((e) => e.exerciseId === ex.id).flatMap((e) => e.sets.filter((s) => working(ex, s))));
    if (!prev.length) continue;
    const bestBefore = Math.max(...prev.map((s) => score(ex, s)));
    const mine = we.sets.filter((s) => working(ex, s));
    if (!mine.length) continue;
    const top = mine.reduce((a, b) => (score(ex, b) > score(ex, a) ? b : a));
    if (score(ex, top) <= bestBefore) continue;
    // Say what actually improved: a heavier weight, or more reps at the best weight so far.
    const heavier = (top.weightKg ?? 0) > Math.max(0, ...prev.map((s) => s.weightKg ?? 0));
    const label =
      ex.kind === "strength"
        ? heavier
          ? "Heaviest set"
          : "More reps at your best weight"
        : ex.kind === "bodyweight"
          ? heavier
            ? "Most added weight"
            : "Most reps"
          : ex.kind === "timed"
            ? "Longest hold"
            : "Longest distance";
    prs.push({ exercise: ex, set: top, label });
  }
  return prs;
}
