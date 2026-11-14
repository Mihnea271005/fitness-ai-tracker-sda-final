// Domain types, mapped from the Postgres schema in supabase/migrations.

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

export const MUSCLES: Muscle[] = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core", "full body", "cardio"];
export const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "kettlebell", "bodyweight", "band", "cardio machine", "none"];
export const KINDS: ExerciseKind[] = ["strength", "bodyweight", "cardio", "timed"];

export interface Exercise {
  id: string;
  /** null = built-in exercise; otherwise the id of the user who created it */
  ownerId: string | null;
  /** stable key for built-in exercises */
  slug: string | null;
  name: string;
  kind: ExerciseKind;
  primaryMuscle: Muscle;
  equipment: Equipment;
  /** smallest load jump used by suggestions, in kg */
  weightIncrementKg: number;
  archived: boolean;
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

export interface RoutineExercise {
  exerciseId: string;
  targetSets: number;
  targetReps?: number;
  restSeconds: number;
}

export interface Routine {
  id: string;
  name: string;
  notes?: string;
  exercises: RoutineExercise[];
}

export interface BodyMeasurement {
  id: string;
  measuredOn: string; // YYYY-MM-DD
  weightKg?: number;
  bodyFatPct?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  armCm?: number;
  thighCm?: number;
  notes?: string;
}

export type Unit = "kg" | "lb";

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  unit: Unit;
  weeklyGoal: number;
}
