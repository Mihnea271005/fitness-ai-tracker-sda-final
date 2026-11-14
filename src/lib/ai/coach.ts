// Glue between the stored profile and the AI: fills in sensible defaults for
// anything the user skipped in the questionnaire.

import type { CoachProfile } from "./estimator";
import type { TrainingSettings } from "./generator";
import type { BodyMeasurement, EquipmentAccess, Profile } from "../types";

/** Locations in the order they're offered: the best-equipped first. */
export function locationsOf(p: Profile): EquipmentAccess[] {
  const order: EquipmentAccess[] = ["gym", "dumbbells", "bodyweight"];
  const chosen = order.filter((l) => p.locations.includes(l));
  return chosen.length ? chosen : ["gym"];
}

export function coachProfile(p: Profile, measurements: BodyMeasurement[], now = new Date()): CoachProfile {
  const latestWeight = measurements.find((m) => m.weightKg !== undefined)?.weightKg;
  return {
    sex: p.sex,
    age: p.birthYear ? now.getUTCFullYear() - p.birthYear : undefined,
    bodyweightKg: latestWeight,
    experience: p.experience ?? "under_1",
  };
}

export function trainingSettings(p: Profile, location?: EquipmentAccess): TrainingSettings {
  return {
    daysPerWeek: p.daysPerWeek ?? 3,
    sessionMinutes: p.sessionMinutes ?? 60,
    goal: p.goal ?? "general",
    focus: p.focus,
    equipment: location ?? locationsOf(p)[0],
    avoid: p.avoidExercises,
    planMode: p.planMode,
  };
}
