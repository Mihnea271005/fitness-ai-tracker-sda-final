// Domain types. These mirror the planned Postgres schema so Stage 3 can swap the
// mock data for Supabase queries without touching the UI.

export type ExerciseKind = "strength" | "bodyweight" | "cardio" | "timed";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "kettlebell"
  | "bodyweight"
  | "band"
  | "cardio machine"
  | "none";

export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "full body"
  | "cardio";

export interface Exercise {
  id: string;
  /** null = built-in exercise; otherwise the id of the user who created it */
  ownerId: string | null;
  name: string;
  kind: ExerciseKind;
  primaryMuscle: Muscle;
  equipment: Equipment;
  /** smallest load jump used by suggestions, in kg */
  weightIncrementKg: number;
}

export type SetType = "warmup" | "working" | "drop" | "failure";

/** All weights are stored in kg; distance in metres; duration in seconds. */
export interface WorkoutSet {
  id: string;
  index: number;
  type: SetType;
  weightKg?: number; // strength, or added weight for bodyweight / timed
  reps?: number; // strength, bodyweight
  durationS?: number; // cardio, timed
  distanceM?: number; // cardio
  rpe?: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  notes?: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  title: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
  notes?: string;
  exercises: WorkoutExercise[];
}

export type Unit = "kg" | "lb";

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  unit: Unit;
  weeklyGoal: number;
}
