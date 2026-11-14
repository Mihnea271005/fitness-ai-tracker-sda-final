"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
  /** echo back what the user typed so the form keeps it after an error */
  values?: { name?: string; email?: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** Only allow same-site relative paths, so ?next= can't redirect off-site. */
function safeNext(next: FormDataEntryValue | null) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/home";
}

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Check them and try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. We sent you a link when you signed up.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Try logging in instead.";
  if (m.includes("password should be") || m.includes("weak password")) return "Choose a stronger password: at least 8 characters, mixing letters and numbers.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("provider is not enabled")) return "Google sign-in isn't switched on for this project yet.";
  return "Something went wrong. Please try again.";
}

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = str(form, "email");
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  if (!EMAIL_RE.test(email) || !password) return { error: "Enter your email and password.", values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message), values: { email } };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const name = str(form, "name").slice(0, 60);
  const email = str(form, "email");
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const values = { name, email };
  if (!name) return { error: "Enter your name.", values };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address.", values };
  if (password.length < 8) return { error: "Your password needs at least 8 characters.", values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name }, emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: friendly(error.message), values };
  if (data.session) redirect("/onboarding"); // email confirmation is turned off in Supabase
  return { message: `We sent a confirmation link to ${email}. Open it on this device to finish signing up.` };
}

export async function signInWithGoogle(form: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}` },
  });
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent(friendly(error?.message ?? ""))}`);
  redirect(data.url);
}

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = str(form, "email");
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address.", values: { email } };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/update-password`,
  });
  // Same message whether or not the account exists, so the form can't be used to probe emails.
  if (error && /rate limit|too many/i.test(error.message)) return { error: friendly(error.message), values: { email } };
  return { message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const confirm = typeof form.get("confirm") === "string" ? (form.get("confirm") as string) : "";
  if (password.length < 8) return { error: "Your password needs at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendly(error.message) };
  redirect("/home");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
