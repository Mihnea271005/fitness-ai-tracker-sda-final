"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone } from "@/lib/data";
import { fromDisplayWeight, localYmd } from "@/lib/format";
import { checkBody } from "@/lib/limits";

export interface MeasurementState {
  error?: string;
  saved?: number; // bumps on success so the client can close the sheet
}

const FIELDS = [
  ["body_fat_pct", "bodyFat", 2, 70],
  ["waist_cm", "waist", 20, 300],
  ["chest_cm", "chest", 20, 300],
  ["hips_cm", "hips", 20, 300],
  ["arm_cm", "arm", 10, 100],
  ["thigh_cm", "thigh", 10, 150],
] as const;

function num(form: FormData, key: string): number | null | "invalid" {
  const raw = String(form.get(key) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : "invalid";
}

/** Creates or replaces the entry for a day (one entry per day). */
export async function saveMeasurement(_prev: MeasurementState, form: FormData): Promise<MeasurementState> {
  const user = await getCurrentUser();
  const day = String(form.get("date") ?? "");
  // Round-trip check: Date.parse accepts "2026-02-30", Postgres doesn't.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day)
    return { error: "Choose a valid date." };
  // Compare with the user's own calendar day, not the server's clock.
  const today = localYmd(new Date(), await getTimeZone());
  if (day > today) return { error: "The date can't be in the future." };
  const thisYear = Number(today.slice(0, 4));
  const earliest = Math.max(thisYear - 100, user.birthYear ?? 0);
  if (Number(day.slice(0, 4)) < earliest) return { error: user.birthYear ? "That date is before you were born. Check the year." : "That date is too far in the past. Check the year." };

  const row: Record<string, number | string | null> = { measured_on: day, notes: String(form.get("notes") ?? "").trim().slice(0, 500) || null };

  const w = num(form, "weight");
  if (w === "invalid") return { error: "Weight must be a number." };
  row.weight_kg = w === null ? null : fromDisplayWeight(w, user.unit);
  const bodyProblem = checkBody(row.weight_kg as number | null, user.heightCm, user.unit);
  if (bodyProblem) return { error: bodyProblem };

  for (const [col, key, min, max] of FIELDS) {
    const v = num(form, key);
    if (v === "invalid") return { error: "Measurements must be numbers." };
    if (v !== null && (v < min || v > max)) return { error: `Check the ${key === "bodyFat" ? "body fat" : key} value (${min}–${max}).` };
    row[col] = v;
  }
  if (FIELDS.every(([col]) => row[col] === null) && row.weight_kg === null) return { error: "Enter at least one value." };

  const supabase = await createClient();
  const { error } = await supabase.from("body_measurements").upsert(row, { onConflict: "user_id,measured_on" });
  if (error) return { error: "Couldn't save the measurement." };
  revalidatePath("/", "layout");
  return { saved: Date.now() };
}

export async function deleteMeasurement(id: string): Promise<{ error?: string }> {
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("body_measurements").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the entry." };
  revalidatePath("/", "layout");
  return {};
}
