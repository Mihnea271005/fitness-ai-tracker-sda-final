import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, supabaseEnv } from "./env";

const APP_PATHS = ["/home", "/workout", "/history", "/exercises", "/progress", "/settings", "/update-password"];
const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

const matches = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(p + "/"));

/**
 * Runs before every page request: refreshes the Supabase session cookie and
 * sends signed-out users to /login (and signed-in users away from the auth pages).
 */
export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.next({ request }); // pages show a setup error instead

  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Don't put code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string, params?: Record<string, string>) => {
    const target = request.nextUrl.clone();
    target.pathname = pathname;
    target.search = "";
    for (const [k, v] of Object.entries(params ?? {})) target.searchParams.set(k, v);
    const r = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => r.cookies.set(c)); // keep refreshed cookies
    return r;
  };

  if (!signedIn && matches(path, APP_PATHS)) return redirectTo("/login", { next: path + request.nextUrl.search });
  if (signedIn && (path === "/" || matches(path, AUTH_PATHS))) return redirectTo("/home");

  return response;
}
