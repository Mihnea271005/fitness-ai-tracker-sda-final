"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getMeasurements, getTimeZone, getWorkouts } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { firstAchieved, goalCurrent, goalTarget } from "@/lib/ai/goals";
import { fromDisplayWeight, localYmd } from "@/lib/format";
import { checkBody, checkSet, setLimits } from "@/lib/limits";
import type { PersonalGoal } from "@/lib/types";

export interface GoalFormState {
  error?: string;
  saved?: number; // bumps on success so the client can close the sheet
}

function num(form: FormData, key: string): number | null | "invalid" {
  const raw = String(form.get(key) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : "invalid";
}

/** "25:00", "1:05:30", "90" (seconds) → seconds. */
function duration(form: FormData, key: string): number | null | "invalid" {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  if (!/^\d+(:\d{1,2}){0,2}$/.test(raw)) return "invalid";
  const parts = raw.split(":").map(Number);
  if (parts.slice(1).some((p) => p >= 60)) return "invalid";
  return parts.reduce((total, p) => total * 60 + p, 0);
}

export async function saveGoal(_prev: GoalFormState, form: FormData): Promise<GoalFormState> {
  const user = await getCurrentUser();
  const [exercises, workouts, measurements, tz] = await Promise.all([getExerciseMap(), getWorkouts(), getMeasurements(), getTimeZone()]);
  const kind = form.get("kind") === "body_weight" ? "body_weight" : "exercise";

  const row: Record<string, string | number | null> = { kind, exercise_id: null, target_weight_kg: null, target_reps: null, target_seconds: null, target_distance_m: null };
  const draft: PersonalGoal = { id: "new", kind, createdAt: new Date(0).toISOString() };
  const exercise = kind === "exercise" ? exercises.get(String(form.get("exerciseId") ?? "")) : undefined;

  if (kind === "exercise") {
    if (!exercise || exercise.archived) return { error: "Choose an exercise." };
    row.exercise_id = draft.exerciseId = exercise.id;
    switch (exercise.kind) {
      case "strength": {
        const w = num(form, "weight");
        const reps = num(form, "reps") ?? 1;
        if (w === null || w === "invalid" || w <= 0) return { error: "Enter the weight you're aiming for." };
        if (reps === "invalid" || !Number.isInteger(reps) || reps < 1 || reps > 100) return { error: "Reps must be a whole number from 1 to 100." };
        const kg = fromDisplayWeight(w, user.unit);
        if (kg < 1 || kg > setLimits(exercise).weightKg) return { error: "That weight is beyond what's possible for this exercise. Check the number and unit." };
        row.target_weight_kg = draft.targetWeightKg = kg;
        row.target_reps = draft.targetReps = reps;
        break;
      }
      case "bodyweight": {
        const reps = num(form, "reps");
        if (reps === null || reps === "invalid" || !Number.isInteger(reps) || reps < 1 || reps > 1000) return { error: "Enter how many reps in one set you're aiming for." };
        row.target_reps = draft.targetReps = reps;
        break;
      }
      case "timed": {
        const s = duration(form, "time");
        if (s === null || s === "invalid" || s < 1 || s > 86_400) return { error: "Enter the hold time as m:ss, e.g. 2:00." };
        row.target_seconds = draft.targetSeconds = s;
        break;
      }
      case "cardio": {
        const km = num(form, "distance");
        const s = duration(form, "time");
        if (km === null || km === "invalid" || km < 0.1 || km > 1000) return { error: "Enter a distance between 0.1 and 1000 km." };
        if (s === null || s === "invalid" || s < 1 || s > 86_400) return { error: "Enter the time as mm:ss or h:mm:ss, e.g. 25:00." };
        row.target_distance_m = draft.targetDistanceM = Math.round(km * 1000);
        row.target_seconds = draft.targetSeconds = s;
        break;
      }
    }
    // A goal is one set you'll do, so it has to be a possible one (no 5 km in 10 seconds).
    const impossible = checkSet(exercise, { weightKg: draft.targetWeightKg, reps: draft.targetReps, durationS: draft.targetSeconds, distanceM: draft.targetDistanceM }, user.unit);
    if (impossible) return { error: impossible };
    if (firstAchieved(draft, exercise, workouts, measurements, 0)) return { error: "You've already done this. Set a bigger target." };
  } else {
    const w = num(form, "weight");
    if (w === null || w === "invalid") return { error: "Enter your target body weight." };
    const kg = fromDisplayWeight(w, user.unit);
    const bodyProblem = checkBody(kg, user.heightCm, user.unit);
    if (bodyProblem) return { error: bodyProblem };
    const now = goalCurrent(draft, undefined, workouts, measurements);
    if (now === undefined) return { error: "Log your current body weight first (Progress → Body), so there's a starting point." };
    if (Math.abs(now - kg) < 0.1) return { error: "That's your current weight. Pick a target above or below it." };
    row.target_weight_kg = draft.targetWeightKg = kg;
  }

  // Where they stand today: the start of the progress bar. Only useful if it's short of the
  // target: 90 kg × 5 (est. max 105) against "100 kg × 1" already passes the metric.
  const baseline = goalCurrent(draft, exercise, workouts, measurements);
  const target = goalTarget(draft, exercise);
  const lowerIsBetter = kind === "exercise" ? exercise!.kind === "cardio" : target < (baseline ?? 0);
  const short = baseline !== undefined && (lowerIsBetter ? baseline > target : baseline < target);
  row.baseline = short ? Math.round(baseline * 1000) / 1000 : null;

  const deadline = String(form.get("deadline") ?? "").trim();
  if (deadline) {
    const today = localYmd(new Date(), tz);
    // Round-trip check: Date.parse accepts "2026-02-30", Postgres doesn't.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline)) || new Date(`${deadline}T00:00:00Z`).toISOString().slice(0, 10) !== deadline)
      return { error: "Choose a valid date." };
    if (deadline <= today) return { error: "The deadline has to be in the future." };
    if (Date.parse(deadline) - Date.parse(today) > 5 * 365 * 86_400_000) return { error: "Pick a deadline within the next 5 years." };
    row.deadline = deadline;
  } else row.deadline = null;

  const supabase = await createClient();
  // One goal per exercise / one body-weight goal: a new one replaces the old. Insert first,
  // then remove the old one, so a failed save never loses the existing goal.
  const { data: created, error } = await supabase.from("goals").insert(row).select("id").single();
  if (error || !created) return { error: "Couldn't save the goal." };
  const old = supabase.from("goals").delete().eq("user_id", user.id).neq("id", created.id);
  // If this fails, both goals simply show until the next save; nothing is lost.
  await (kind === "exercise" ? old.eq("exercise_id", exercise!.id) : old.eq("kind", "body_weight"));
  revalidatePath("/", "layout");
  return { saved: Date.now() };
}

export async function deleteGoal(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Couldn't delete the goal." };
  revalidatePath("/", "layout");
  return {};
}
