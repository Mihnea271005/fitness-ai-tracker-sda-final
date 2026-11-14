import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { EquipmentAccess, Experience, FocusArea, Goal, PlanMode, Profile, Sex, Unit } from "./types";

/**
 * Data Access Layer: the one place that reads the signed-in user.
 * Verifies the session JWT (getClaims) and loads the profile row; redirects to
 * /login when there is no valid session. Deduplicated per request via React cache().
 * Must be called inside a <Suspense> boundary (it reads cookies).
 */
export const getCurrentUser = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/login");

  const { data: row } = await supabase
    .from("profiles")
    .select("display_name, unit, weekly_goal, sex, birth_year, height_cm, experience, days_per_week, session_minutes, goal, focus, equipment, avoid_exercises, plan_mode, onboarded_at")
    .eq("id", claims.sub)
    .maybeSingle();

  const email = typeof claims.email === "string" ? claims.email : "";
  return {
    id: claims.sub,
    email,
    displayName: row?.display_name || email.split("@")[0] || "there",
    unit: (row?.unit as Unit) ?? "kg",
    weeklyGoal: row?.weekly_goal ?? 3,
    sex: (row?.sex as Sex) ?? "unspecified",
    birthYear: row?.birth_year ?? undefined,
    heightCm: row?.height_cm === null || row?.height_cm === undefined ? undefined : Number(row.height_cm),
    experience: (row?.experience as Experience) ?? undefined,
    daysPerWeek: row?.days_per_week ?? undefined,
    sessionMinutes: row?.session_minutes ?? undefined,
    goal: (row?.goal as Goal) ?? undefined,
    focus: (row?.focus as FocusArea[]) ?? [],
    equipment: (row?.equipment as EquipmentAccess) ?? undefined,
    avoidExercises: (row?.avoid_exercises as string[]) ?? [],
    planMode: (row?.plan_mode as PlanMode) ?? "session",
    onboarded: Boolean(row?.onboarded_at),
  };
});
