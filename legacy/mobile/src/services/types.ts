// Mirrors backend/app/schemas.py — keep in sync when the API changes.

export interface WorkoutSet {
  id: number;
  workout_date: string;
  exercise: string;
  set_number: number;
  reps: number;
  weight: number;
  notes: string | null;
}

export interface NewWorkoutSet {
  workout_date: string; // YYYY-MM-DD
  exercise: string;
  set_number: number;
  reps: number;
  weight: number;
  notes?: string;
}

export interface DashboardMetrics {
  total_sets: number;
  total_sessions: number;
  total_exercises: number;
  streak_days: number;
  total_volume_tonnes: number;
}

export interface PersonalRecord {
  exercise: string;
  max_weight: number;
  achieved_on: string;
  muscle_group: string | null;
}

export interface WeeklyVolumePoint {
  week: string;
  total_volume: number;
}

export interface MuscleVolumePoint {
  muscle_group: string;
  total_volume: number;
}

export interface StagnationResult {
  exercise: string;
  is_stagnating: boolean;
  is_declining: boolean;
  trend: number;
  sessions_checked: number;
  last_weight: number | null;
}

export interface TrainResult {
  message: string;
  trained: boolean;
  weight_mae: number | null;
  reps_mae: number | null;
  samples: number | null;
}

export interface PredictionResult {
  exercise: string;
  suggested_weight: number;
  suggested_reps: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ModelComparisonEntry {
  model: string;
  weight_mae: number;
  reps_mae: number;
}
