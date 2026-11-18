// Personal goals: where you stand, whether you've made it, and, from the trend of your
// recent sessions, roughly when you will. Pure functions; data comes from ai-server.ts.

import { estimatedOneRepMax, formatDistance, formatDuration, formatWeight } from "../format";
import { checkSet } from "../limits";
import type { BodyMeasurement, Exercise, PersonalGoal, Unit, Workout } from "../types";

const DAY = 86_400_000;
/** Trend window for projections. */
const TREND_DAYS = 56;
/** Don't project further out than this: it's a guess, not a promise. */
const MAX_PROJECTION_DAYS = 730;

export type Projection =
  | { kind: "date"; date: string } // YYYY-MM-DD
  | { kind: "ready" } // the numbers say you can do it now: go and do it for real
  | { kind: "stalled" } // trend flat or going the wrong way
  | { kind: "too_far" } // more than two years at the current rate
  | { kind: "not_enough_data" };

export interface GoalStatus {
  goal: PersonalGoal;
  exercise?: Exercise;
  /** "Bench Press: 100 kg × 1", "Body weight: 75 kg" */
  title: string;
  /** what "current" measures, for the UI: "Est. max", "Best pace" */
  metricLabel: string;
  higherIsBetter: boolean;
  /** in the goal's metric (kg e1RM, reps, seconds, s/km, kg) */
  current?: number;
  target: number;
  /** 0..1 */
  progress: number;
  achievedAt?: string; // ISO
  projection: Projection;
  /** only with a deadline and a projection */
  onTrack?: boolean;
}

interface Point {
  t: number; // ms
  value: number;
}

/** The goal's target expressed in its progress metric. */
export function goalTarget(goal: PersonalGoal, exercise?: Exercise): number {
  if (goal.kind === "body_weight") return goal.targetWeightKg ?? 0;
  switch (exercise?.kind) {
    case "strength":
      return estimatedOneRepMax(goal.targetWeightKg ?? 0, goal.targetReps ?? 1);
    case "bodyweight":
      return goal.targetReps ?? 0;
    case "timed":
      return goal.targetSeconds ?? 0;
    case "cardio":
      return (goal.targetSeconds ?? 0) / ((goal.targetDistanceM ?? 1000) / 1000);
    default:
      return 0;
  }
}

function higherIsBetter(goal: PersonalGoal, exercise: Exercise | undefined, current: number | undefined): boolean {
  if (goal.kind === "body_weight") {
    // Lose or gain: decided by where they started (or stand now).
    const from = goal.baseline ?? current;
    return from === undefined ? true : (goal.targetWeightKg ?? 0) > from;
  }
  return exercise?.kind !== "cardio"; // pace: lower is better
}

/** One value per session (or measurement), oldest first. */
function series(goal: PersonalGoal, exercise: Exercise | undefined, workouts: Workout[], measurements: BodyMeasurement[]): Point[] {
  if (goal.kind === "body_weight") {
    return measurements
      .filter((m) => m.weightKg !== undefined)
      .map((m) => ({ t: Date.parse(`${m.measuredOn}T12:00:00Z`), value: m.weightKg! }))
      .sort((a, b) => a.t - b.t);
  }
  if (!exercise) return [];
  const pts: Point[] = [];
  for (const w of workouts) {
    for (const we of w.exercises) {
      if (we.exerciseId !== exercise.id) continue;
      const sets = we.sets.filter((s) => s.completed && s.type !== "warmup" && checkSet(exercise, s, "kg") === null); // impossible values (typos) never count
      let vals: number[] = [];
      switch (exercise.kind) {
        case "strength":
          vals = sets.filter((s) => (s.weightKg ?? 0) > 0 && (s.reps ?? 0) > 0).map((s) => estimatedOneRepMax(s.weightKg!, s.reps!));
          break;
        case "bodyweight":
          vals = sets.map((s) => s.reps ?? 0).filter((v) => v > 0);
          break;
        case "timed":
          vals = sets.map((s) => s.durationS ?? 0).filter((v) => v > 0);
          break;
        case "cardio": {
          // Pace from runs of at least half the goal distance (a 400 m sprint says little about a 5 km).
          const minM = (goal.targetDistanceM ?? 0) / 2;
          vals = sets.filter((s) => (s.durationS ?? 0) > 0 && (s.distanceM ?? 0) > 0 && s.distanceM! >= minM).map((s) => s.durationS! / (s.distanceM! / 1000));
          break;
        }
      }
      if (vals.length) pts.push({ t: Date.parse(w.startedAt), value: exercise.kind === "cardio" ? Math.min(...vals) : Math.max(...vals) });
    }
  }
  return pts.sort((a, b) => a.t - b.t);
}

/** Where the user stands now, in the goal's metric. Body weight: latest entry. Exercises: best of the last 3 sessions. */
export function goalCurrent(goal: PersonalGoal, exercise: Exercise | undefined, workouts: Workout[], measurements: BodyMeasurement[]): number | undefined {
  const pts = series(goal, exercise, workouts, measurements);
  if (!pts.length) return undefined;
  if (goal.kind === "body_weight") return pts[pts.length - 1].value;
  const recent = pts.slice(-3).map((p) => p.value);
  return exercise?.kind === "cardio" ? Math.min(...recent) : Math.max(...recent);
}

/** The first workout / measurement on or after `sinceMs` that meets the goal outright. */
export function firstAchieved(goal: PersonalGoal, exercise: Exercise | undefined, workouts: Workout[], measurements: BodyMeasurement[], sinceMs: number): string | undefined {
  if (goal.kind === "body_weight") {
    const target = goal.targetWeightKg ?? 0;
    const up = higherIsBetter(goal, exercise, undefined);
    const hits = measurements
      .filter((m) => m.weightKg !== undefined && Date.parse(`${m.measuredOn}T23:59:59Z`) >= sinceMs && (up ? m.weightKg! >= target : m.weightKg! <= target))
      .map((m) => `${m.measuredOn}T12:00:00Z`)
      .sort();
    return hits[0];
  }
  if (!exercise) return undefined;
  const meets = (s: Workout["exercises"][number]["sets"][number]) => {
    if (!s.completed || s.type === "warmup" || checkSet(exercise, s, "kg") !== null) return false;
    switch (exercise.kind) {
      case "strength":
        return (s.weightKg ?? 0) >= (goal.targetWeightKg ?? 0) - 0.01 && (s.reps ?? 0) >= (goal.targetReps ?? 1);
      case "bodyweight":
        return (s.reps ?? 0) >= (goal.targetReps ?? Infinity);
      case "timed":
        return (s.durationS ?? 0) >= (goal.targetSeconds ?? Infinity);
      case "cardio": {
        const d = s.distanceM ?? 0;
        const target = goal.targetDistanceM ?? Infinity;
        // The full distance, at (or faster than) the goal pace.
        return d >= target && (s.durationS ?? Infinity) / d <= (goal.targetSeconds ?? 0) / target;
      }
    }
  };
  const hits = workouts.filter((w) => Date.parse(w.startedAt) >= sinceMs && w.exercises.some((we) => we.exerciseId === exercise.id && we.sets.some(meets))).map((w) => w.startedAt);
  return hits.sort()[0];
}

/** Least-squares slope (metric per day) and the fitted value at `now`. */
function trend(pts: Point[], now: number): { slope: number; fitted: number } | null {
  const recent = pts.filter((p) => p.t >= now - TREND_DAYS * DAY);
  if (recent.length < 3 || recent[recent.length - 1].t - recent[0].t < 7 * DAY) return null;
  const xs = recent.map((p) => (p.t - now) / DAY);
  const ys = recent.map((p) => p.value);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, fitted: my - slope * mx }; // x = 0 is now
}

export function goalStatus(
  goal: PersonalGoal,
  exercise: Exercise | undefined,
  workouts: Workout[],
  measurements: BodyMeasurement[],
  unit: Unit,
  now = new Date(),
): GoalStatus {
  const nowMs = now.getTime();
  const target = goalTarget(goal, exercise);
  const pts = series(goal, exercise, workouts, measurements);
  const current = goalCurrent(goal, exercise, workouts, measurements);
  const up = higherIsBetter(goal, exercise, current);
  const achievedAt = firstAchieved(goal, exercise, workouts, measurements, Date.parse(goal.createdAt));

  // The metric can pass the target before the goal itself is met: 90 kg × 5 is an estimated
  // max of 105 kg, but "100 kg × 1" hasn't been lifted. Same for a fast pace on a shorter run.
  const reached = current !== undefined && (up ? current >= target : current <= target);

  let progress = 0;
  if (achievedAt) progress = 1;
  else if (reached) progress = 0.99;
  else if (current !== undefined && target > 0) {
    const base = goal.baseline;
    // A baseline only helps if it started short of the target.
    const usable = base !== undefined && (up ? base < target : base > target);
    progress = usable
      ? (current - base!) / (target - base!) // share of the distance covered since the goal was set
      : up
        ? current / target
        : target / current;
    progress = Math.min(Math.max(progress, 0), 0.99); // 100% only when actually achieved
  }

  let projection: Projection = { kind: "not_enough_data" };
  let onTrack: boolean | undefined;
  if (!achievedAt && reached) {
    projection = { kind: "ready" };
    if (goal.deadline) onTrack = true;
  } else if (!achievedAt && current !== undefined) {
    const tr = trend(pts, nowMs);
    if (tr) {
      const gap = target - current;
      if (tr.slope === 0 || Math.sign(tr.slope) !== Math.sign(gap)) projection = { kind: "stalled" };
      else {
        const days = gap / tr.slope;
        projection = days > MAX_PROJECTION_DAYS ? { kind: "too_far" } : { kind: "date", date: new Date(nowMs + Math.max(days, 1) * DAY).toISOString().slice(0, 10) };
      }
    }
    if (goal.deadline) {
      if (projection.kind === "date") onTrack = projection.date <= goal.deadline;
      else if (projection.kind === "stalled" || projection.kind === "too_far") onTrack = false;
    }
  }

  return { goal, exercise, title: describeGoal(goal, exercise, unit), metricLabel: metricLabel(goal, exercise), higherIsBetter: up, current, target, progress, achievedAt, projection, onTrack };
}

/** Sorted for display: open goals closest to done first, then achieved ones. */
export function goalStatuses(goals: PersonalGoal[], exercises: Map<string, Exercise>, workouts: Workout[], measurements: BodyMeasurement[], unit: Unit, now = new Date()): GoalStatus[] {
  return goals
    .map((g) => goalStatus(g, g.exerciseId ? exercises.get(g.exerciseId) : undefined, workouts, measurements, unit, now))
    .filter((s) => s.goal.kind === "body_weight" || s.exercise)
    .sort((a, b) => Number(!!a.achievedAt) - Number(!!b.achievedAt) || b.progress - a.progress);
}

export function describeGoal(goal: PersonalGoal, exercise: Exercise | undefined, unit: Unit): string {
  if (goal.kind === "body_weight") return `Body weight: ${formatWeight(goal.targetWeightKg ?? 0, unit)}`;
  const name = exercise?.name ?? "Exercise";
  switch (exercise?.kind) {
    case "strength":
      return `${name}: ${formatWeight(goal.targetWeightKg ?? 0, unit)} × ${goal.targetReps ?? 1}`;
    case "bodyweight":
      return `${name}: ${goal.targetReps} reps`;
    case "timed":
      return `${name}: ${formatDuration(goal.targetSeconds ?? 0)} hold`;
    case "cardio":
      return `${name}: ${goalDistance(goal.targetDistanceM ?? 0)} in ${formatDuration(goal.targetSeconds ?? 0)}`;
    default:
      return name;
  }
}

/** "5 km", "1.5 km", "800 m": goal distances are round numbers, so no trailing zeros. */
const goalDistance = (m: number) => (m >= 1000 ? `${+(m / 1000).toFixed(2)} km` : formatDistance(m));

function metricLabel(goal: PersonalGoal, exercise?: Exercise): string {
  if (goal.kind === "body_weight") return "Now"; // the title already says "Body weight"
  switch (exercise?.kind) {
    case "strength":
      return "Est. max";
    case "bodyweight":
      return "Best set";
    case "timed":
      return "Best hold";
    case "cardio":
      return "Best pace";
    default:
      return "";
  }
}

/** A metric value for display. */
export function formatGoalValue(status: Pick<GoalStatus, "goal" | "exercise">, value: number, unit: Unit): string {
  if (status.goal.kind === "body_weight") return formatWeight(value, unit);
  switch (status.exercise?.kind) {
    case "strength":
      return formatWeight(value, unit);
    case "bodyweight":
      return `${Math.round(value)} reps`;
    case "timed":
      return formatDuration(value);
    case "cardio":
      return `${formatDuration(value)}/km`;
    default:
      return String(value);
  }
}
