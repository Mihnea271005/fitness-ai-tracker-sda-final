// Builds a workout for a person: picks a split from their training days, fills each
// movement slot with an exercise that suits their equipment, focus and history, and
// sets sets / reps / loads from the estimator.

import { CATALOG, FOCUS_PATTERNS, equipmentAllows, type EquipmentLevel, type Experience, type Pattern } from "./catalog";
import { estimateExercise, type CoachProfile, type Estimate } from "./estimator";
import { suggestStart, targetFor, type Goal, type Suggestion, type Target } from "./prescribe";
import type { Exercise, Unit, Workout } from "../types";

export type DayType = "full_a" | "full_b" | "upper" | "lower" | "push" | "pull" | "legs";
export type PlanMode = "session" | "weekly";

export interface TrainingSettings {
  daysPerWeek: number;
  sessionMinutes: number;
  goal: Goal;
  focus: string[];
  equipment: EquipmentLevel;
  avoid: string[]; // exercise ids
  planMode: PlanMode;
  /** exercises with an open personal goal: scheduled whenever they fit the day */
  goalExerciseIds?: string[];
  /** an open body-weight goal: losing adds a cardio finisher */
  bodyWeightGoal?: "lose" | "gain";
}

export interface PlannedExercise {
  exercise: Exercise;
  target: Target;
  estimate: Estimate | null;
  suggestion: Suggestion | null;
  why: string;
}

export interface GeneratedWorkout {
  planDay: DayType;
  title: string;
  exercises: PlannedExercise[];
  estimatedMinutes: number;
}

export const DAY_LABEL: Record<DayType, string> = {
  full_a: "Full Body A",
  full_b: "Full Body B",
  upper: "Upper Body",
  lower: "Lower Body",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

/** The rotation of day types for a number of training days per week. */
export function splitFor(daysPerWeek: number): DayType[] {
  if (daysPerWeek <= 3) return daysPerWeek === 1 ? ["full_a"] : ["full_a", "full_b"];
  if (daysPerWeek === 4) return ["upper", "lower"];
  if (daysPerWeek === 5) return ["push", "pull", "legs", "upper", "lower"];
  return ["push", "pull", "legs"];
}

const SLOTS: Record<DayType, Pattern[]> = {
  full_a: ["squat", "h_push", "h_pull", "glutes", "core", "triceps"],
  full_b: ["hinge", "v_push", "v_pull", "lunge", "core", "biceps"],
  upper: ["h_push", "h_pull", "v_push", "v_pull", "biceps", "triceps", "delts"],
  lower: ["squat", "hinge", "lunge", "glutes", "calves", "core"],
  push: ["h_push", "v_push", "h_push", "delts", "triceps", "core"],
  // No hinge on pull days: legs/lower already have it, and on 5–6 day splits pull and legs are back to back.
  pull: ["v_pull", "h_pull", "h_pull", "biceps", "core"],
  legs: ["squat", "hinge", "lunge", "glutes", "calves", "core"],
};

/** If nothing fits a slot (e.g. no pull-up bar at home), try these instead. */
const FALLBACK: Partial<Record<Pattern, Pattern[]>> = {
  v_pull: ["h_pull"],
  hinge: ["glutes"],
  delts: ["v_push"],
  glutes: ["hinge", "lunge"],
  lunge: ["squat"],
  triceps: ["h_push"],
};

const ISOLATION: Pattern[] = ["biceps", "triceps", "delts", "calves", "core"];

function exercisesPerSession(minutes: number, experience: Experience) {
  const n = minutes <= 30 ? 3 : minutes <= 45 ? 4 : minutes <= 60 ? 5 : minutes <= 75 ? 6 : 7;
  return Math.max(3, experience === "new" ? n - 1 : n);
}

/** Small deterministic hash, so the same day gives the same workout but different days vary. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 2 ** 32;
}

/** At most this many slots are added per session for goal exercises the split never trains. */
const MAX_GOAL_EXTRAS = 2;

function buildSlots(day: DayType, settings: TrainingSettings, experience: Experience, goalPatterns: Pattern[] = []): Pattern[] {
  const base = [...SLOTS[day]];
  const focusPatterns = new Set(settings.focus.flatMap((f) => FOCUS_PATTERNS[f] ?? []));
  const goals = new Set(goalPatterns);
  // One extra slot for a focus area that fits this day.
  const extra = base.find((p) => focusPatterns.has(p) && p !== "core");
  if (extra) base.splice(Math.min(base.indexOf(extra) + 1, base.length), 0, extra);
  const cap = exercisesPerSession(settings.sessionMinutes, experience);
  // Trim: drop isolation work that isn't a focus or a goal first, then from the end (goal slots stay).
  while (base.length > cap) {
    const i = base.findLastIndex((p) => ISOLATION.includes(p) && !focusPatterns.has(p) && !goals.has(p));
    const j = i >= 0 ? i : base.findLastIndex((p) => !goals.has(p));
    if (j < 0) break;
    base.splice(j, 1);
  }
  // Goal additions stay within the session length: at the cap, each one takes the place of the
  // last isolation slot that isn't a goal or focus (else the last such slot after the main lift).
  const makeRoom = () => {
    if (base.length < cap) return true;
    let i = base.findLastIndex((p, k) => k > 0 && ISOLATION.includes(p) && !focusPatterns.has(p) && !goals.has(p));
    if (i < 0) i = base.findLastIndex((p, k) => k > 0 && !focusPatterns.has(p) && !goals.has(p));
    if (i < 0) return false;
    base.splice(i, 1);
    return true;
  };
  // A goal exercise whose pattern no day of the split trains (e.g. calves or delts on full-body
  // days, or a running goal) gets its own slot, so it still comes up every session.
  const cycle = new Set(splitFor(settings.daysPerWeek).flatMap((d) => SLOTS[d]));
  for (const p of goalPatterns.filter((p) => !cycle.has(p) && p !== "cardio" && !base.includes(p)).slice(0, MAX_GOAL_EXTRAS)) if (makeRoom()) base.push(p);
  // Endurance / fat-loss profiles always finish with cardio (part of the plan's time budget);
  // cardio added only because of a goal has to make room like the other goal slots.
  if (settings.goal === "endurance" || settings.goal === "fat_loss") base.push("cardio");
  else if ((settings.bodyWeightGoal === "lose" || goals.has("cardio")) && makeRoom()) base.push("cardio");
  return base;
}

/** Which day of the rotation comes next, given what was trained recently. */
export function nextDayType(settings: TrainingSettings, workouts: Workout[]): DayType {
  const cycle = splitFor(settings.daysPerWeek);
  const last = workouts.find((w) => w.planDay && (cycle as string[]).includes(w.planDay));
  if (!last) return cycle[0];
  return cycle[(cycle.indexOf(last.planDay as DayType) + 1) % cycle.length];
}

export function generateWorkout(
  day: DayType,
  settings: TrainingSettings,
  profile: CoachProfile,
  exercises: Exercise[],
  workouts: Workout[],
  unit: Unit,
  date: string,
): GeneratedWorkout {
  const used = new Set<string>();
  const done = new Set(workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)));
  const lastSameDay = workouts.find((w) => w.planDay === day);
  const lastSameDayIds = new Set(lastSameDay?.exercises.map((e) => e.exerciseId) ?? []);
  const focusPatterns = new Set(settings.focus.flatMap((f) => FOCUS_PATTERNS[f] ?? []));
  const avoid = new Set(settings.avoid);
  // Goal exercises the AI can schedule here: built-in (it knows their pattern), doable with
  // this location's equipment, and not on the avoid list.
  const goalIds = new Set(
    (settings.goalExerciseIds ?? []).filter((id) => {
      const e = exercises.find((x) => x.id === id);
      const c = e?.slug ? CATALOG[e.slug] : undefined;
      return e && c && !e.archived && !avoid.has(id) && equipmentAllows(settings.equipment, c.needs);
    }),
  );
  const goalPatterns = [...new Set([...goalIds].map((id) => CATALOG[exercises.find((x) => x.id === id)!.slug!].pattern))];

  const pick = (pattern: Pattern, slotIndex: number): Exercise | undefined => {
    const candidates = exercises.filter((e) => {
      const c = e.slug ? CATALOG[e.slug] : undefined;
      return c && !e.archived && c.pattern === pattern && equipmentAllows(settings.equipment, c.needs) && !avoid.has(e.id) && !used.has(e.id);
    });
    let best: Exercise | undefined;
    let bestScore = -Infinity;
    for (const e of candidates) {
      const c = CATALOG[e.slug!];
      let score = 0;
      if (goalIds.has(e.id)) score += 10; // you're working towards it: always pick it when it fits
      if (done.has(e.id)) score += 3; // familiar: the AI has real data for it
      if (slotIndex < 2 && c.compound) score += 2; // main lifts first
      if (c.needs === settings.equipment) score += 1.5; // use the equipment you have (barbell at the gym, dumbbells at home)
      if (slotIndex >= 2 && lastSameDayIds.has(e.id)) score -= 2.5; // rotate accessories between sessions
      score += hash(`${date}:${pattern}:${e.id}`) * 1.5; // variety between days
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  };

  const planned: PlannedExercise[] = [];
  const slots = buildSlots(day, settings, profile.experience, goalPatterns);
  slots.forEach((pattern, i) => {
    const chosen = pick(pattern, i) ?? (FALLBACK[pattern] ?? []).map((p) => pick(p, i)).find(Boolean);
    if (!chosen) return;
    used.add(chosen.id);
    const c = CATALOG[chosen.slug!];
    const target = targetFor(settings.goal, chosen, c.compound, profile.experience, settings.sessionMinutes);
    const estimate = estimateExercise(chosen, workouts, profile);
    // Continuity: if you've been doing a rep count close to the goal's (±2), keep it.
    const lastReps = estimate?.lastSets?.[0]?.reps;
    if (target.reps && lastReps && Math.abs(lastReps - target.reps) <= 2 && chosen.kind === "strength") target.reps = lastReps;
    const why = goalIds.has(chosen.id)
      ? "Working towards your goal"
      : i === 0
        ? "Main lift of the day"
        : focusPatterns.has(pattern)
          ? `Your focus: ${settings.focus.find((f) => FOCUS_PATTERNS[f]?.includes(pattern))}`
          : pattern === "cardio"
            ? settings.goal === "endurance"
              ? "Builds endurance"
              : "Conditioning finisher"
            : done.has(chosen.id)
              ? "From your training history"
              : "Balances the session";
    planned.push({ exercise: chosen, target, estimate, suggestion: suggestStart(chosen, estimate, target, unit), why });
  });

  // Rough time: per set ≈ 45 s of work + rest; cardio counts its minutes.
  const seconds = planned.reduce((t, p) => t + (p.target.minutes ? p.target.minutes * 60 : p.target.sets * (45 + p.target.restSeconds)), 0) + 5 * 60;
  return { planDay: day, title: DAY_LABEL[day], exercises: planned, estimatedMinutes: Math.round(seconds / 60) };
}

/** Training weekdays (0 = Monday) for a number of days per week. */
export function weekdaysFor(daysPerWeek: number): number[] {
  const table: Record<number, number[]> = {
    1: [2],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return table[Math.min(Math.max(daysPerWeek, 1), 7)];
}

export interface WeekPlanDay {
  date: string; // YYYY-MM-DD
  weekday: number; // 0 = Monday
  dayType: DayType | null; // null = rest day
}

/** The week's schedule (Monday-first), assigning the rotation to training weekdays. */
export function weekPlan(mondayYmd: string, daysPerWeek: number): WeekPlanDay[] {
  const cycle = splitFor(daysPerWeek);
  const training = weekdaysFor(daysPerWeek);
  const monday = Date.parse(`${mondayYmd}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday + i * 86_400_000).toISOString().slice(0, 10);
    const k = training.indexOf(i);
    return { date, weekday: i, dayType: k === -1 ? null : cycle[k % cycle.length] };
  });
}
