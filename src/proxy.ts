import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static files, icons, the manifest and the service worker.
  matcher: ["/((?!_next/static|_next/image|icons/|icon.svg|apple-icon.png|manifest.webmanifest|sw.js|offline|favicon.ico).*)"],
};
