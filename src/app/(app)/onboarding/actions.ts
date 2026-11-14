"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getTimeZone } from "@/lib/data";
import { fromDisplayWeight, localYmd } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export interface OnboardingState {
  error?: string;
}

const pick = <T extends string>(v: FormDataEntryValue | null, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);
const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim());
  return String(v ?? "").trim() !== "" && Number.isFinite(n) ? Math.round(n) : null;
};

export async function saveTrainingProfile(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const user = await getCurrentUser();

  const birthYear = int(form.get("birthYear"));
  const thisYear = new Date().getUTCFullYear();
  if (birthYear !== null && (birthYear < thisYear - 100 || birthYear > thisYear - 13)) return { error: "Check your year of birth (you need to be at least 13)." };
  const height = int(form.get("height"));
  if (height !== null && (height < 100 || height > 250)) return { error: "Height should be in centimetres, between 100 and 250." };
  const weightRaw = String(form.get("weight") ?? "").trim().replace(",", ".");
  const weightKg = weightRaw ? fromDisplayWeight(Number(weightRaw), user.unit) : null;
  if (weightKg !== null && !(weightKg >= 20 && weightKg <= 400)) return { error: "That body weight looks off. Check the number and unit." };
  const days = int(form.get("days"));
  const minutes = int(form.get("minutes"));

  const visible = await getExerciseMap();
  const avoid = form
    .getAll("avoid")
    .map(String)
    .filter((id) => visible.has(id))
    .slice(0, 100);
  const focus = form
    .getAll("focus")
    .map(String)
    .filter((f) => ["chest", "back", "shoulders", "arms", "legs", "glutes", "core"].includes(f));

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      sex: pick(form.get("sex"), ["male", "female", "unspecified"] as const) ?? "unspecified",
      birth_year: birthYear,
      height_cm: height,
      experience: pick(form.get("experience"), ["new", "under_1", "1_to_3", "over_3"] as const),
      days_per_week: days !== null ? Math.min(Math.max(days, 1), 7) : null,
      session_minutes: minutes !== null ? Math.min(Math.max(minutes, 15), 180) : null,
      goal: pick(form.get("goal"), ["strength", "muscle", "general", "endurance", "fat_loss"] as const),
      focus,
      equipment: pick(form.get("equipment"), ["gym", "dumbbells", "bodyweight"] as const),
      avoid_exercises: avoid,
      plan_mode: pick(form.get("planMode"), ["session", "weekly"] as const) ?? "session",
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { error: "Couldn't save your training profile. Please try again." };

  if (weightKg !== null) {
    const today = localYmd(new Date(), await getTimeZone());
    await supabase.from("body_measurements").upsert({ measured_on: today, weight_kg: weightKg }, { onConflict: "user_id,measured_on" });
  }

  revalidatePath("/", "layout");
  redirect("/home");
}
