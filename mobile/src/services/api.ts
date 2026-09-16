import { API_BASE_URL } from "@/config/env";
import type {
  DashboardMetrics,
  FeatureImportance,
  ModelComparisonEntry,
  MuscleVolumePoint,
  NewWorkoutSet,
  PersonalRecord,
  PredictionResult,
  StagnationResult,
  TrainResult,
  WeeklyVolumePoint,
  WorkoutSet,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  exercises: () => request<string[]>("/exercises"),

  getSets: (exercise?: string) =>
    request<WorkoutSet[]>(`/sets${exercise ? `?exercise=${encodeURIComponent(exercise)}` : ""}`),
  createSet: (set: NewWorkoutSet) =>
    request<{ status: string }>("/sets", { method: "POST", body: JSON.stringify(set) }),
  clearSets: () => request<{ status: string }>("/sets?confirm=true", { method: "DELETE" }),
  loadSeedData: () => request<{ status: string }>("/seed/load", { method: "POST" }),

  dashboard: () => request<DashboardMetrics>("/analytics/dashboard"),
  personalRecords: () => request<PersonalRecord[]>("/analytics/personal-records"),
  weeklyVolume: (exercise: string) =>
    request<WeeklyVolumePoint[]>(`/analytics/weekly-volume?exercise=${encodeURIComponent(exercise)}`),
  muscleVolume: () => request<MuscleVolumePoint[]>("/analytics/muscle-volume"),
  stagnation: (exercise: string) =>
    request<StagnationResult>(`/analytics/stagnation?exercise=${encodeURIComponent(exercise)}`),

  trainModel: () => request<TrainResult>("/ai/train", { method: "POST" }),
  predict: (exercise: string) =>
    request<PredictionResult>(`/ai/predict?exercise=${encodeURIComponent(exercise)}`),
  featureImportance: () => request<FeatureImportance[]>("/ai/feature-importance"),
  compareModels: () => request<ModelComparisonEntry[]>("/ai/compare", { method: "POST" }),
};
