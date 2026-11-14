// Glue between the stored profile and the AI: fills in sensible defaults for
// anything the user skipped in the questionnaire.

import type { CoachProfile } from "./estimator";
import type { TrainingSettings } from "./generator";
import type { BodyMeasurement, Profile } from "../types";

export function coachProfile(p: Profile, measurements: BodyMeasurement[], now = new Date()): CoachProfile {
  const latestWeight = measurements.find((m) => m.weightKg !== undefined)?.weightKg;
  return {
    sex: p.sex,
    age: p.birthYear ? now.getUTCFullYear() - p.birthYear : undefined,
    bodyweightKg: latestWeight,
    experience: p.experience ?? "under_1",
  };
}

export function trainingSettings(p: Profile): TrainingSettings {
  return {
    daysPerWeek: p.daysPerWeek ?? 3,
    sessionMinutes: p.sessionMinutes ?? 60,
    goal: p.goal ?? "general",
    focus: p.focus,
    equipment: p.equipment ?? "gym",
    avoid: p.avoidExercises,
    planMode: p.planMode,
  };
}
