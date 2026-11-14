"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getExercises, getWorkouts } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { generateSampleWorkouts } from "@/lib/sample-data";
import type { ExerciseKind, SetType } from "@/lib/types";

export interface DraftSetInput {
  type: SetType;
  weightKg?: number;
  reps?: number;
  durationS?: number;
  distanceM?: number;
  completed: boolean;
}
export interface DraftWorkoutInput {
  title: string;
  startedAt: string;
  notes?: string;
  exercises: { exerciseId: string; sets: DraftSetInput[] }[];
}

const SET_TYPES: SetType[] = ["warmup", "working", "drop", "failure"];
const finite = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);

/** Keep only the numbers that make sense for the exercise kind. Returns null if the set has nothing to save. */
function cleanSet(s: DraftSetInput, kind: ExerciseKind) {
  if (!s || s.completed !== true) return null;
  const type = SET_TYPES.includes(s.type) ? s.type : "working";
  const weight_kg = finite(s.weightKg, 0, 1000);
  const reps = finite(s.reps, 0, 1000);
  const duration_s = finite(s.durationS, 0, 86_400);
  const distance_m = finite(s.distanceM, 0, 1_000_000);
  switch (kind) {
    case "strength":
      return reps ? { type, weight_kg: weight_kg ?? 0, reps: Math.round(reps) } : null;
    case "bodyweight":
      return reps ? { type, weight_kg: weight_kg || null, reps: Math.round(reps) } : null;
    case "timed":
      return duration_s ? { type, weight_kg: weight_kg || null, duration_s: Math.round(duration_s) } : null;
    case "cardio":
      return duration_s || distance_m ? { type, duration_s: duration_s ? Math.round(duration_s) : null, distance_m: distance_m ? Math.round(distance_m) : null } : null;
  }
}

/** Saves a finished workout (completed sets only) in one transaction. */
export async function saveWorkout(draft: DraftWorkoutInput): Promise<{ id?: string; error?: string }> {
  await getCurrentUser();
  const exercises = await getExerciseMap();

  const now = Date.now();
  const started = Date.parse(draft?.startedAt);
  // Clamp to a sane window: not in the future, at most 24 h long.
  const startedAt = new Date(Number.isFinite(started) ? Math.min(Math.max(started, now - 86_400_000), now) : now).toISOString();

  const payloadExercises = [];
  for (const e of Array.isArray(draft?.exercises) ? draft.exercises.slice(0, 50) : []) {
    const ex = exercises.get(e?.exerciseId);
    if (!ex) continue; // unknown or not visible to this user
    const sets = (Array.isArray(e.sets) ? e.sets.slice(0, 50) : []).map((s) => cleanSet(s, ex.kind)).filter(Boolean);
    if (sets.length) payloadExercises.push({ exercise_id: ex.id, sets });
  }
  if (!payloadExercises.length) return { error: "Complete at least one set (tap ✓) before finishing." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_workouts", {
    payload: [
      {
        title: String(draft.title ?? "").trim().slice(0, 80) || "Workout",
        started_at: startedAt,
        ended_at: new Date(now).toISOString(),
        notes: String(draft.notes ?? "").slice(0, 2000),
        exercises: payloadExercises,
      },
    ],
  });
  if (error || !data?.[0]) return { error: "Couldn't save your workout. Your sets are still here, so try again." };
  revalidatePath("/", "layout");
  return { id: data[0] as string };
}

export async function deleteWorkout(id: string): Promise<{ error?: string }> {
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) return { error: "Couldn't delete this workout." };
  revalidatePath("/", "layout");
  redirect("/history");
}

/** Adds ~12 weeks of sample workouts — only offered while the account has none. */
export async function addSampleWorkouts(): Promise<{ error?: string }> {
  await getCurrentUser();
  if ((await getWorkouts()).length) return { error: "Sample workouts can only be added to an empty account." };
  const bySlug = new Map((await getExercises()).filter((e) => e.slug).map((e) => [e.slug!, e.id]));
  const payload = generateSampleWorkouts(new Date()).map((w) => ({
    title: w.title,
    started_at: w.started_at,
    ended_at: w.ended_at,
    exercises: w.exercises.filter((e) => bySlug.has(e.slug)).map((e) => ({ exercise_id: bySlug.get(e.slug), sets: e.sets })),
  }));
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_workouts", { payload });
  if (error) return { error: "Couldn't add the sample workouts." };
  revalidatePath("/", "layout");
  return {};
}

/** Deletes every workout the user has logged (e.g. to clear sample data). */
export async function deleteAllWorkouts(): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("user_id", user.id);
  if (error) return { error: "Couldn't delete your workouts." };
  revalidatePath("/", "layout");
  redirect("/home");
}
