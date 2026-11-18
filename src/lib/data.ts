import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getCurrentUser } from "./auth";
import { createClient } from "./supabase/server";
import type { BodyMeasurement, Exercise, PersonalGoal, Routine, SetType, Workout } from "./types";

// Data Access Layer for training data. Every function first resolves the signed-in
// user (redirecting to /login if there is none); row level security in Postgres is
// the real guard, so even a bug here can't expose another user's rows.

/* ------------------------------------------------------------------ time zone */

export const getTimeZone = cache(async (): Promise<string> => {
  await connection();
  const tz = (await cookies()).get("tz")?.value;
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
});

/* ------------------------------------------------------------------ mappers */

type Num = number | string | null;
const n = (v: Num) => (v === null || v === undefined ? undefined : Number(v));

interface ExerciseRow {
  id: string;
  owner_id: string | null;
  slug: string | null;
  name: string;
  kind: Exercise["kind"];
  primary_muscle: Exercise["primaryMuscle"];
  equipment: Exercise["equipment"];
  weight_increment_kg: Num;
  archived: boolean;
}

const EXERCISE_COLS = "id, owner_id, slug, name, kind, primary_muscle, equipment, weight_increment_kg, archived";

function toExercise(r: ExerciseRow): Exercise {
  return {
    id: r.id,
    ownerId: r.owner_id,
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    primaryMuscle: r.primary_muscle,
    equipment: r.equipment,
    weightIncrementKg: n(r.weight_increment_kg) ?? 0,
    archived: r.archived,
  };
}

interface SetRow {
  id: string;
  position: number;
  type: SetType;
  weight_kg: Num;
  reps: number | null;
  duration_s: number | null;
  distance_m: number | null;
  rpe: Num;
  completed: boolean;
  feel: -1 | 0 | 1 | null;
}
interface WorkoutRow {
  id: string;
  title: string;
  plan_day: string | null;
  started_at: string;
  ended_at: string;
  notes: string | null;
  workout_exercises: { id: string; exercise_id: string; position: number; notes: string | null; sets: SetRow[] }[];
}

const WORKOUT_COLS =
  "id, title, plan_day, started_at, ended_at, notes, workout_exercises(id, exercise_id, position, notes, sets(id, position, type, weight_kg, reps, duration_s, distance_m, rpe, completed, feel))";

function toWorkout(r: WorkoutRow): Workout {
  return {
    id: r.id,
    title: r.title,
    planDay: r.plan_day ?? undefined,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    notes: r.notes ?? undefined,
    exercises: [...r.workout_exercises]
      .sort((a, b) => a.position - b.position)
      .map((we) => ({
        id: we.id,
        exerciseId: we.exercise_id,
        notes: we.notes ?? undefined,
        sets: [...we.sets]
          .sort((a, b) => a.position - b.position)
          .map((s) => ({
            id: s.id,
            index: s.position,
            type: s.type,
            weightKg: n(s.weight_kg),
            reps: s.reps ?? undefined,
            durationS: s.duration_s ?? undefined,
            distanceM: s.distance_m ?? undefined,
            rpe: n(s.rpe),
            feel: s.feel ?? undefined,
            completed: s.completed,
          })),
      })),
  };
}

/* ------------------------------------------------------------------ queries */

/** Built-in + own exercises, including archived ones (history still needs their names). */
export const getExercises = cache(async (): Promise<Exercise[]> => {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").select(EXERCISE_COLS).order("name");
  if (error) throw new Error(`Couldn't load exercises: ${error.message}`);
  return (data as ExerciseRow[]).map(toExercise);
});

export const getExerciseMap = cache(async () => new Map((await getExercises()).map((e) => [e.id, e])));

/** All of the user's workouts, newest first. (Fine for personal use; paginate if it grows large.) */
export const getWorkouts = cache(async (): Promise<Workout[]> => {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("workouts").select(WORKOUT_COLS).order("started_at", { ascending: false }).limit(2000);
  if (error) throw new Error(`Couldn't load workouts: ${error.message}`);
  return (data as unknown as WorkoutRow[]).map(toWorkout);
});

export const getWorkout = cache(async (id: string): Promise<Workout | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("workouts").select(WORKOUT_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load workout: ${error.message}`);
  return data ? toWorkout(data as unknown as WorkoutRow) : null;
});

interface RoutineRow {
  id: string;
  name: string;
  notes: string | null;
  routine_exercises: { exercise_id: string; position: number; target_sets: number; target_reps: number | null; rest_seconds: number }[];
}

function toRoutine(r: RoutineRow): Routine {
  return {
    id: r.id,
    name: r.name,
    notes: r.notes ?? undefined,
    exercises: [...r.routine_exercises]
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ exerciseId: e.exercise_id, targetSets: e.target_sets, targetReps: e.target_reps ?? undefined, restSeconds: e.rest_seconds })),
  };
}

const ROUTINE_COLS = "id, name, notes, routine_exercises(exercise_id, position, target_sets, target_reps, rest_seconds)";

export const getRoutines = cache(async (): Promise<Routine[]> => {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("routines").select(ROUTINE_COLS).order("name");
  if (error) throw new Error(`Couldn't load routines: ${error.message}`);
  return (data as RoutineRow[]).map(toRoutine);
});

export const getRoutine = cache(async (id: string): Promise<Routine | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("routines").select(ROUTINE_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load routine: ${error.message}`);
  return data ? toRoutine(data as RoutineRow) : null;
});

interface MeasurementRow {
  id: string;
  measured_on: string;
  weight_kg: Num;
  body_fat_pct: Num;
  waist_cm: Num;
  chest_cm: Num;
  hips_cm: Num;
  arm_cm: Num;
  thigh_cm: Num;
  notes: string | null;
}

/** Newest first. */
export const getMeasurements = cache(async (): Promise<BodyMeasurement[]> => {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_measurements")
    .select("id, measured_on, weight_kg, body_fat_pct, waist_cm, chest_cm, hips_cm, arm_cm, thigh_cm, notes")
    .order("measured_on", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`Couldn't load measurements: ${error.message}`);
  return (data as MeasurementRow[]).map((r) => ({
    id: r.id,
    measuredOn: r.measured_on,
    weightKg: n(r.weight_kg),
    bodyFatPct: n(r.body_fat_pct),
    waistCm: n(r.waist_cm),
    chestCm: n(r.chest_cm),
    hipsCm: n(r.hips_cm),
    armCm: n(r.arm_cm),
    thighCm: n(r.thigh_cm),
    notes: r.notes ?? undefined,
  }));
});

/* ------------------------------------------------------------------ goals */

interface GoalRow {
  id: string;
  kind: PersonalGoal["kind"];
  exercise_id: string | null;
  target_weight_kg: Num;
  target_reps: number | null;
  target_seconds: number | null;
  target_distance_m: number | null;
  baseline: Num;
  deadline: string | null;
  created_at: string;
}

/** Oldest first. */
export const getGoals = cache(async (): Promise<PersonalGoal[]> => {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("id, kind, exercise_id, target_weight_kg, target_reps, target_seconds, target_distance_m, baseline, deadline, created_at")
    .order("created_at");
  if (error) throw new Error(`Couldn't load goals: ${error.message}`);
  return (data as GoalRow[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    exerciseId: r.exercise_id ?? undefined,
    targetWeightKg: n(r.target_weight_kg),
    targetReps: r.target_reps ?? undefined,
    targetSeconds: r.target_seconds ?? undefined,
    targetDistanceM: r.target_distance_m ?? undefined,
    baseline: n(r.baseline),
    deadline: r.deadline ?? undefined,
    createdAt: r.created_at,
  }));
});
