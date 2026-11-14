"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button, TextField } from "./ui/primitives";
import { Sheet } from "./ui/interactive";
import { saveMeasurement, type MeasurementState } from "@/app/(app)/body/actions";
import type { Unit } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

/** "Log measurement" button + sheet. `today` is the user's local date (YYYY-MM-DD). */
export function MeasurementForm({ unit, today }: { unit: Unit; today: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<MeasurementState, FormData>(saveMeasurement, {});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the sheet after a successful save
    if (state.saved) setOpen(false);
  }, [state.saved]);

  return (
    <>
      <Button size="large" className="mb-6 w-full" onClick={() => setOpen(true)}>
        <Plus className="size-5" strokeWidth={2.75} aria-hidden /> Log measurement
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Log measurement">
        <form action={action} className="flex flex-col gap-4 pb-2">
          {state.error && (
            <p role="alert" className="rounded-xl bg-red/15 px-4 py-3 text-subhead text-red-text">
              {state.error}
            </p>
          )}
          <TextField label="Date" name="date" type="date" defaultValue={today} max={today} required />
          <div className="grid grid-cols-2 gap-3">
            <TextField label={`Body weight (${unit})`} name="weight" inputMode="decimal" placeholder="–" />
            <TextField label="Body fat (%)" name="bodyFat" inputMode="decimal" placeholder="–" />
          </div>
          <p className="-mb-1 px-1 text-footnote text-label-2">Circumferences in cm. Fill in only what you measured.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <TextField label="Waist" name="waist" inputMode="decimal" placeholder="–" />
            <TextField label="Chest" name="chest" inputMode="decimal" placeholder="–" />
            <TextField label="Hips" name="hips" inputMode="decimal" placeholder="–" />
            <TextField label="Arm" name="arm" inputMode="decimal" placeholder="–" />
            <TextField label="Thigh" name="thigh" inputMode="decimal" placeholder="–" />
          </div>
          <TextField label="Notes" name="notes" maxLength={500} placeholder="Optional" />
          <p className="px-1 text-footnote text-label-2">Saving a date that already has an entry replaces it.</p>
          <Submit />
        </form>
      </Sheet>
    </>
  );
}
