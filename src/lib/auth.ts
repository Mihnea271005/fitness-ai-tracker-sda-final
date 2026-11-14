import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile, Unit } from "./types";

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

  const { data: row } = await supabase.from("profiles").select("display_name, unit, weekly_goal").eq("id", claims.sub).maybeSingle();

  const email = typeof claims.email === "string" ? claims.email : "";
  return {
    id: claims.sub,
    email,
    displayName: row?.display_name || email.split("@")[0] || "there",
    unit: (row?.unit as Unit) ?? "kg",
    weeklyGoal: row?.weekly_goal ?? 3,
  };
});
