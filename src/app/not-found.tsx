import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Page not found" };

/** Any unknown URL (outside the signed-in app shell). */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg-grouped px-6 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <Compass className="size-7" aria-hidden />
      </span>
      <h1 className="text-title2 font-bold">Page not found</h1>
      <p className="max-w-sm text-subhead text-label-2">This page doesn&apos;t exist, or the link is out of date.</p>
      <ButtonLink href="/home" className="mt-2">
        Go to Home
      </ButtonLink>
    </main>
  );
}
