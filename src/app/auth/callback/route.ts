import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for links that come back from Supabase: Google sign-in, the
 * sign-up confirmation email and the password-reset email. Exchanges the one-time
 * code for a session cookie, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/home";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const message = searchParams.get("error_description") ?? "That link is invalid or has expired. Please try again.";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
}
