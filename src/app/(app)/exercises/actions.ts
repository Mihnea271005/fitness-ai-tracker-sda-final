"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EQUIPMENT, KINDS, MUSCLES, type Equipment, type ExerciseKind, type Muscle } from "@/lib/types";

export interface ExerciseFormState {
  error?: string;
}

function readForm(form: FormData) {
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const kind = String(form.get("kind") ?? "") as ExerciseKind;
  const primary_muscle = String(form.get("muscle") ?? "") as Muscle;
  const equipment = String(form.get("equipment") ?? "") as Equipment;
  const inc = Number(String(form.get("increment") ?? "2.5").replace(",", "."));
  const weight_increment_kg = kind === "cardio" ? 0 : Number.isFinite(inc) ? Math.min(Math.max(inc, 0), 50) : 2.5;
  if (!name) return { error: "Give the exercise a name." };
  if (!KINDS.includes(kind)) return { error: "Choose a type." };
  if (!MUSCLES.includes(primary_muscle)) return { error: "Choose the main muscle." };
  if (!EQUIPMENT.includes(equipment)) return { error: "Choose the equipment." };
  return { values: { name, kind, primary_muscle, equipment, weight_increment_kg } };
}

const duplicate = (code?: string) => code === "23505";

export async function createExercise(_prev: ExerciseFormState, form: FormData): Promise<ExerciseFormState> {
  await getCurrentUser();
  const parsed = readForm(form);
  if (!parsed.values) return { error: parsed.error };
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").insert(parsed.values).select("id").single();
  if (error) return { error: duplicate(error.code) ? "You already have an exercise with that name." : "Couldn't save the exercise." };
  revalidatePath("/", "layout");
  redirect(`/exercises/${data.id}`);
}

export async function updateExercise(id: string, _prev: ExerciseFormState, form: FormData): Promise<ExerciseFormState> {
  await getCurrentUser();
  const parsed = readForm(form);
  if (!parsed.values) return { error: parsed.error };
  const { kind: _kind, ...changes } = parsed.values; // the type can't change once created
  void _kind;
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").update(changes).eq("id", id).select("id");
  if (error) return { error: duplicate(error.code) ? "You already have an exercise with that name." : "Couldn't save the exercise." };
  if (!data?.length) return { error: "You can only edit your own exercises." };
  revalidatePath("/", "layout");
  redirect(`/exercises/${id}`);
}

/** Deletes a custom exercise; if it's used in workouts or routines, archives it instead so history keeps its name. */
export async function deleteExercise(id: string): Promise<{ error?: string }> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").delete().eq("id", id).select("id");
  if (error?.code === "23503") {
    const { error: archiveError } = await supabase.from("exercises").update({ archived: true }).eq("id", id);
    if (archiveError) return { error: "Couldn't remove the exercise." };
  } else if (error) {
    return { error: "Couldn't remove the exercise." };
  } else if (!data?.length) {
    return { error: "You can only remove your own exercises." };
  }
  revalidatePath("/", "layout");
  redirect("/exercises");
}
