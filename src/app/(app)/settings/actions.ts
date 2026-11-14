"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ProfilePatch {
  displayName?: string;
  unit?: "kg" | "lb";
  weeklyGoal?: number;
}

/** Updates the signed-in user's profile. Row level security also limits this to their own row. */
export async function updateProfile(patch: ProfilePatch): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  const update: Record<string, unknown> = {};

  if (patch.displayName !== undefined) {
    const name = String(patch.displayName).trim().slice(0, 60);
    if (!name) return { error: "Your name can't be empty." };
    update.display_name = name;
  }
  if (patch.unit !== undefined) {
    if (patch.unit !== "kg" && patch.unit !== "lb") return { error: "Unknown unit." };
    update.unit = patch.unit;
  }
  if (patch.weeklyGoal !== undefined) {
    const g = Math.round(Number(patch.weeklyGoal));
    if (!(g >= 1 && g <= 7)) return { error: "Weekly goal must be between 1 and 7." };
    update.weekly_goal = g;
  }
  if (!Object.keys(update).length) return {};

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: "Couldn't save your settings. Please try again." };
  revalidatePath("/", "layout");
  return {};
}

export async function deleteAccount(): Promise<{ error?: string }> {
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "Couldn't delete your account. Please try again." };
  await supabase.auth.signOut();
  redirect("/");
}
