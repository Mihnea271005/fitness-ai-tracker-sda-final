import type { Exercise, ExerciseKind, Unit, Workout, WorkoutSet } from "./types";

// Fixed locale + UTC so server and client render identical strings (no hydration mismatch).
const LOCALE = "en-GB";
const TZ = "UTC";

export const KG_PER_LB = 0.45359237;

export function toDisplayWeight(kg: number, unit: Unit): number {
  const v = unit === "kg" ? kg : kg / KG_PER_LB;
  return Math.round(v * 10) / 10;
}

export function formatWeight(kg: number, unit: Unit = "kg"): string {
  const v = toDisplayWeight(kg, unit);
  return `${Number.isInteger(v) ? v : v.toFixed(1)} ${unit}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(LOCALE).format(Math.round(n));
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** "1 h 12 min" style, for workout lengths */
export function formatLongDuration(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} h ${rem} min` : `${h} h`;
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

/** pace in min/km */
export function formatPace(durationS: number, distanceM: number): string {
  if (!distanceM) return "–";
  const secPerKm = durationS / (distanceM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat(LOCALE, { ...opts, timeZone: TZ }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

export function formatMonth(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

export const KIND_LABEL: Record<ExerciseKind, string> = {
  strength: "Strength",
  bodyweight: "Bodyweight",
  cardio: "Cardio",
  timed: "Timed hold",
};

/** One-line human summary of a set, by exercise kind. */
export function formatSet(set: WorkoutSet, kind: ExerciseKind, unit: Unit = "kg"): string {
  switch (kind) {
    case "strength":
      return `${formatWeight(set.weightKg ?? 0, unit)} × ${set.reps ?? 0}`;
    case "bodyweight":
      return set.weightKg ? `+${formatWeight(set.weightKg, unit)} × ${set.reps ?? 0}` : `${set.reps ?? 0} reps`;
    case "timed":
      return set.weightKg ? `${formatDuration(set.durationS ?? 0)} · +${formatWeight(set.weightKg, unit)}` : formatDuration(set.durationS ?? 0);
    case "cardio": {
      const parts = [];
      if (set.distanceM) parts.push(formatDistance(set.distanceM));
      if (set.durationS) parts.push(formatDuration(set.durationS));
      if (set.distanceM && set.durationS) parts.push(formatPace(set.durationS, set.distanceM));
      return parts.join(" · ");
    }
  }
}

export function workoutDurationS(w: Workout): number {
  return (new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime()) / 1000;
}

/** Strength volume (kg lifted) — weight × reps over completed working sets. */
export function workoutVolumeKg(w: Workout, exercises: Map<string, Exercise>): number {
  let v = 0;
  for (const we of w.exercises) {
    const ex = exercises.get(we.exerciseId);
    if (!ex || ex.kind !== "strength") continue;
    for (const s of we.sets) if (s.completed && s.type !== "warmup") v += (s.weightKg ?? 0) * (s.reps ?? 0);
  }
  return v;
}

/** Epley estimated one-rep max. */
export function estimatedOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** "Strength · chest · barbell" without redundant parts (no "cardio · none"). */
export function exerciseMeta(e: Exercise): string {
  const parts: string[] = [KIND_LABEL[e.kind]];
  if (e.primaryMuscle !== "cardio") parts.push(e.primaryMuscle);
  if (e.equipment !== "none" && e.equipment !== "bodyweight") parts.push(e.equipment);
  return parts.join(" · ");
}
