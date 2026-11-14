"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getWorkout } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { RoutineExercise } from "@/lib/types";

export interface RoutineInput {
  id?: string;
  name: string;
  notes?: string;
  exercises: RoutineExercise[];
}

const clampInt = (v: unknown, min: number, max: number, fallback: number | null) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), min), max) : fallback;

export async function saveRoutine(input: RoutineInput): Promise<{ id?: string; error?: string }> {
  await getCurrentUser();
  const name = String(input?.name ?? "").trim().slice(0, 60);
  if (!name) return { error: "Give the routine a name." };
  const visible = await getExerciseMap();
  const exercises = (Array.isArray(input.exercises) ? input.exercises.slice(0, 30) : [])
    .filter((e) => visible.has(e?.exerciseId))
    .map((e) => ({
      exercise_id: e.exerciseId,
      target_sets: clampInt(e.targetSets, 1, 20, 3),
      target_reps: clampInt(e.targetReps, 1, 100, null),
      rest_seconds: clampInt(e.restSeconds, 0, 900, 90),
    }));
  if (!exercises.length) return { error: "Add at least one exercise." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_routine", {
    payload: { id: input.id ?? null, name, notes: String(input.notes ?? "").slice(0, 1000), exercises },
  });
  if (error || !data) return { error: "Couldn't save the routine." };
  revalidatePath("/", "layout");
  return { id: data as string };
}

export async function deleteRoutine(id: string): Promise<{ error?: string }> {
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the routine." };
  revalidatePath("/", "layout");
  redirect("/workout");
}

/** "Save as routine" from a finished workout: same exercises, set counts and rep targets. */
export async function routineFromWorkout(workoutId: string): Promise<{ error?: string }> {
  await getCurrentUser();
  const w = await getWorkout(workoutId);
  if (!w) return { error: "Workout not found." };
  const res = await saveRoutine({
    name: w.title,
    exercises: w.exercises.map((e) => {
      const working = e.sets.filter((s) => s.type !== "warmup");
      return { exerciseId: e.exerciseId, targetSets: Math.max(working.length, 1), targetReps: working[0]?.reps, restSeconds: 90 };
    }),
  });
  if (res.error || !res.id) return { error: res.error ?? "Couldn't create the routine." };
  redirect(`/routines/${res.id}`);
}
