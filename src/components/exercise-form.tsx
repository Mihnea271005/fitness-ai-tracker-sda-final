"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ExerciseIcon } from "./exercise-icon";
import { Button, TextField } from "./ui/primitives";
import { SegmentedControl } from "./ui/interactive";
import type { ExerciseFormState } from "@/app/(app)/exercises/actions";
import { KIND_LABEL } from "@/lib/format";
import { EQUIPMENT, KINDS, MUSCLES, type Equipment, type Exercise, type ExerciseKind, type Muscle } from "@/lib/types";

const KIND_HELP: Record<ExerciseKind, string> = {
  strength: "Log weight × reps for each set.",
  bodyweight: "Log reps, with optional added weight (e.g. a weighted vest).",
  cardio: "Log time and/or distance. Pace is calculated for you.",
  timed: "Log how long you held it, with optional added weight.",
};

function Select<T extends string>({ label, name, value, options, onChange }: { label: string; name: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-subhead font-medium text-label-2">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-h-11 w-full appearance-none rounded-xl bg-surface px-4 py-3 text-body capitalize text-label outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="flex-1" disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

/** Create (no `exercise`) or edit (with `exercise`) a custom exercise. */
export function ExerciseForm({
  action,
  exercise,
}: {
  action: (state: ExerciseFormState, form: FormData) => Promise<ExerciseFormState>;
  exercise?: Exercise;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});
  const [kind, setKind] = useState<ExerciseKind>(exercise?.kind ?? "strength");
  const [muscle, setMuscle] = useState<Muscle>(exercise?.primaryMuscle ?? "chest");
  const [equipment, setEquipment] = useState<Equipment>(exercise?.equipment ?? "barbell");
  const editing = Boolean(exercise);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="rounded-xl bg-red/15 px-4 py-3 text-subhead text-red-text">
          {state.error}
        </p>
      )}
      <TextField label="Name" name="name" placeholder="e.g. Landmine Press" required maxLength={60} defaultValue={exercise?.name} />

      <div>
        <span className="mb-1.5 block px-1 text-subhead font-medium text-label-2">Type</span>
        <input type="hidden" name="kind" value={kind} />
        {editing ? (
          <p className="flex items-center gap-2 px-1 text-body">
            <ExerciseIcon kind={kind} size="sm" /> {KIND_LABEL[kind]}
            <span className="text-footnote text-label-2">(can&apos;t be changed after creating it)</span>
          </p>
        ) : (
          <div className="no-scrollbar overflow-x-auto">
            <SegmentedControl<ExerciseKind>
              label="Exercise type"
              value={kind}
              onChange={(k) => {
                setKind(k);
                if (k === "cardio") {
                  setMuscle("cardio");
                  setEquipment("cardio machine");
                } else if (muscle === "cardio") setMuscle("chest");
                if (k === "bodyweight" || k === "timed") setEquipment(k === "bodyweight" ? "bodyweight" : "none");
                else if (k === "strength" && equipment === "cardio machine") setEquipment("barbell");
              }}
              className="min-w-max"
              options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
            />
          </div>
        )}
        <p className="mt-2 flex items-center gap-2 px-1 text-footnote text-label-2">
          {!editing && <ExerciseIcon kind={kind} size="sm" />} {KIND_HELP[kind]}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Main muscle" name="muscle" value={muscle} options={MUSCLES} onChange={setMuscle} />
        <Select label="Equipment" name="equipment" value={equipment} options={EQUIPMENT} onChange={setEquipment} />
      </div>

      {kind !== "cardio" && (
        <div>
          <TextField
            label="Weight increment (kg)"
            name="increment"
            inputMode="decimal"
            defaultValue={String(exercise?.weightIncrementKg || 2.5)}
            aria-describedby="inc-help"
          />
          <p id="inc-help" className="mt-1.5 px-1 text-footnote text-label-2">
            The smallest jump you can make, used when suggesting a heavier next set.
          </p>
        </div>
      )}

      <div className="mt-2 flex gap-3">
        <Button variant="gray" className="flex-1" onClick={() => router.back()}>
          Cancel
        </Button>
        <Submit label={editing ? "Save changes" : "Save exercise"} />
      </div>
    </form>
  );
}
