"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, ButtonLink, Card } from "@/components/ui/primitives";

/**
 * Shown when a signed-in page fails to load (Next 16: `retry`, `error: unknown`).
 * In production, server error messages are redacted to a digest, so the text here is generic.
 */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <Card className="mt-6 flex flex-col items-center gap-3 p-6 text-center">
      <AlertTriangle className="size-8 text-orange" aria-hidden />
      <h1 className="text-title3 font-bold">This page couldn&apos;t load</h1>
      <p className="max-w-sm text-subhead text-label-2">
        Your data is safe. This is usually a brief connection problem, so try again. If it keeps happening, the database may be missing a recent update (a file in
        supabase/migrations that hasn&apos;t been run yet).
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={() => retry()}>
          <RotateCcw className="size-4" aria-hidden /> Try again
        </Button>
        <ButtonLink href="/home" variant="gray">
          Go to Home
        </ButtonLink>
      </div>
      {digest && <p className="text-caption1 text-label-3">Error reference: {digest}</p>}
    </Card>
  );
}
