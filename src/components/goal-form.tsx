"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Target } from "lucide-react";
import { Button, TextField } from "./ui/primitives";
import { SegmentedControl, Sheet } from "./ui/interactive";
import { saveGoal, type GoalFormState } from "@/app/(app)/goals/actions";
import { KIND_LABEL } from "@/lib/format";
import { KINDS, type Exercise, type Unit } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : "Save goal"}
    </Button>
  );
}

const HINT: Record<Exercise["kind"], string> = {
  strength: "For a one-rep max, leave reps at 1.",
  bodyweight: "Reps in a single set.",
  timed: "How long to hold it, as m:ss.",
  cardio: "Cover the distance in this time or less.",
};

/** "Add goal" button + sheet. `exercises`: the ones the user can pick (not archived). `today`: local YYYY-MM-DD. */
export function GoalForm({ exercises, unit, today }: { exercises: Exercise[]; unit: Unit; today: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"exercise" | "body_weight">("exercise");
  const [exerciseId, setExerciseId] = useState("");
  const [state, action] = useActionState<GoalFormState, FormData>(saveGoal, {});
  const exercise = exercises.find((e) => e.id === exerciseId);
  const grouped = useMemo(() => KINDS.map((k) => ({ kind: k, items: exercises.filter((e) => e.kind === k).sort((a, b) => a.name.localeCompare(b.name)) })), [exercises]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the sheet after a successful save
    if (state.saved) setOpen(false);
  }, [state.saved]);

  return (
    <>
      <Button variant="tinted" className="mb-3 w-full" onClick={() => setOpen(true)}>
        <Target className="size-5" aria-hidden /> Add goal
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="New goal">
        <form action={action} className="flex flex-col gap-4 pb-2">
          {state.error && (
            <p role="alert" className="rounded-xl bg-red/15 px-4 py-3 text-subhead text-red-text">
              {state.error}
            </p>
          )}
          <input type="hidden" name="kind" value={kind} />
          <SegmentedControl
            label="Goal type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "exercise", label: "Exercise" },
              { value: "body_weight", label: "Body weight" },
            ]}
          />

          {kind === "exercise" ? (
            <>
              <label className="block">
                <span className="mb-1.5 block px-1 text-subhead font-medium text-label-2">Exercise</span>
                <select
                  name="exerciseId"
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                  required
                  className="min-h-11 w-full appearance-none rounded-xl bg-fill-3 px-4 py-3 text-body text-label outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {grouped
                    .filter((g) => g.items.length)
                    .map((g) => (
                      <optgroup key={g.kind} label={KIND_LABEL[g.kind]}>
                        {g.items.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                </select>
              </label>

              {exercise?.kind === "strength" && (
                <div className="grid grid-cols-2 gap-3">
                  <TextField label={`Weight (${unit})`} name="weight" inputMode="decimal" required />
                  <TextField label="Reps" name="reps" inputMode="numeric" defaultValue="1" required />
                </div>
              )}
              {exercise?.kind === "bodyweight" && <TextField label="Reps in one set" name="reps" inputMode="numeric" required />}
              {exercise?.kind === "timed" && <TextField label="Hold time" name="time" placeholder="2:00" required />}
              {exercise?.kind === "cardio" && (
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Distance (km)" name="distance" inputMode="decimal" placeholder="5" required />
                  <TextField label="Time" name="time" placeholder="25:00" required />
                </div>
              )}
              {exercise && (
                <p className="-mt-2 px-1 text-footnote text-label-2">
                  {HINT[exercise.kind]} A new goal for this exercise replaces the current one.
                  {!exercise.slug && " Custom exercises are tracked, but the AI can't add them to generated workouts."}
                </p>
              )}
            </>
          ) : (
            <>
              <TextField label={`Target body weight (${unit})`} name="weight" inputMode="decimal" required />
              <p className="-mt-2 px-1 text-footnote text-label-2">Progress is measured from your latest logged weight. Losing weight adds a short cardio finisher to your AI workouts.</p>
            </>
          )}

          <TextField label="Deadline (optional)" name="deadline" type="date" min={today} />
          <Submit />
        </form>
      </Sheet>
    </>
  );
}
