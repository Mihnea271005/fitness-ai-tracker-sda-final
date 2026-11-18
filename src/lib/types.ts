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
  /** how the set felt: -1 too hard, 0 just right, 1 too easy */
  feel?: -1 | 0 | 1;
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
  /** split day of a generated workout, e.g. "upper" */
  planDay?: string;
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

/**
 * A personal goal. Targets depend on what's measured:
 * strength → weightKg × reps; bodyweight → reps; timed → seconds;
 * cardio → distanceM within seconds; body weight → weightKg.
 */
export interface PersonalGoal {
  id: string;
  kind: "exercise" | "body_weight";
  exerciseId?: string;
  targetWeightKg?: number;
  targetReps?: number;
  targetSeconds?: number;
  targetDistanceM?: number;
  /** the progress metric when the goal was set */
  baseline?: number;
  deadline?: string; // YYYY-MM-DD
  createdAt: string; // ISO
}

export type Unit = "kg" | "lb";

export type Sex = "male" | "female" | "unspecified";
export type Experience = "new" | "under_1" | "1_to_3" | "over_3";
export type Goal = "strength" | "muscle" | "general" | "endurance" | "fat_loss";
export type EquipmentAccess = "gym" | "dumbbells" | "bodyweight";
export type FocusArea = "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "core";
export type PlanMode = "session" | "weekly";

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  unit: Unit;
  weeklyGoal: number;
  // Training profile (onboarding questionnaire) — all optional
  sex: Sex;
  birthYear?: number;
  heightCm?: number;
  experience?: Experience;
  daysPerWeek?: number;
  sessionMinutes?: number;
  goal?: Goal;
  focus: FocusArea[];
  /** where they train; more than one allowed (e.g. gym and home) */
  locations: EquipmentAccess[];
  avoidExercises: string[];
  planMode: PlanMode;
  onboarded: boolean;
}
