"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "./ui/primitives";
import { Sheet } from "./ui/interactive";

/**
 * A button that asks for confirmation in a sheet, then runs a server action.
 * Actions that redirect on success never return; ones that fail return { error }.
 */
export function ConfirmAction({
  label,
  title,
  body,
  confirmLabel,
  action,
  variant = "destructive",
  buttonVariant = "destructive",
  className,
}: {
  label: ReactNode;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  action: () => Promise<{ error?: string } | void>;
  variant?: "destructive" | "filled";
  buttonVariant?: "destructive" | "gray" | "tinted" | "plain";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant={buttonVariant} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <div className="flex gap-2">
            <Button variant="gray" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant={variant}
              className="flex-1"
              disabled={pending}
              aria-busy={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await action();
                  if (res?.error) setError(res.error);
                })
              }
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        }
      >
        <div className="text-body">{body}</div>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red/15 px-3 py-2 text-subhead text-red-text">
            {error}
          </p>
        )}
      </Sheet>
    </>
  );
}
