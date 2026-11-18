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
  if (!name) return { error: "Give the exercise a name." };
  if (!KINDS.includes(kind)) return { error: "Choose a type." };
  // The smallest load step the AI adds when it suggests going heavier: 0 would mean "never heavier".
  const rawInc = String(form.get("increment") ?? "").trim().replace(",", ".");
  const inc = rawInc === "" ? 2.5 : Number(rawInc);
  if (kind !== "cardio" && !(Number.isFinite(inc) && inc >= 0.25 && inc <= 50)) return { error: "Weight increment must be a number between 0.25 and 50 kg." };
  const weight_increment_kg = kind === "cardio" ? 0 : Math.round(inc * 100) / 100;
  if (!MUSCLES.includes(primary_muscle)) return { error: "Choose the main muscle." };
  if (!EQUIPMENT.includes(equipment)) return { error: "Choose the equipment." };
  return { values: { name, kind, primary_muscle, equipment, weight_increment_kg } };
}

const duplicate = (code?: string) => code === "23505";

/** A custom exercise can't share a built-in's name (two "Bench Press" rows would be confusing). */
async function clashesWithBuiltIn(supabase: Awaited<ReturnType<typeof createClient>>, name: string) {
  // Escape LIKE wildcards (PostgREST also reads * as %): exact, case-insensitive match.
  const pattern = name.replace(/[\\%_*]/g, (c) => `\\${c}`);
  const { data } = await supabase.from("exercises").select("id").is("owner_id", null).ilike("name", pattern).limit(1);
  return !!data?.length;
}
const BUILT_IN_CLASH = "There's already a built-in exercise with that name. Use it, or pick a different name.";

export async function createExercise(_prev: ExerciseFormState, form: FormData): Promise<ExerciseFormState> {
  await getCurrentUser();
  const parsed = readForm(form);
  if (!parsed.values) return { error: parsed.error };
  const supabase = await createClient();
  if (await clashesWithBuiltIn(supabase, parsed.values.name)) return { error: BUILT_IN_CLASH };
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
  if (await clashesWithBuiltIn(supabase, changes.name)) return { error: BUILT_IN_CLASH };
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
