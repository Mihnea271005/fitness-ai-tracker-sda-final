"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ExerciseIcon } from "./exercise-icon";
import { Button, TextField } from "./ui/primitives";
import { SegmentedControl } from "./ui/interactive";
import { KIND_LABEL } from "@/lib/format";
import type { Equipment, ExerciseKind, Muscle } from "@/lib/types";

const MUSCLES: Muscle[] = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core", "full body", "cardio"];
const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "kettlebell", "bodyweight", "band", "cardio machine", "none"];

const KIND_HELP: Record<ExerciseKind, string> = {
  strength: "Log weight × reps for each set.",
  bodyweight: "Log reps, with optional added weight (e.g. a weighted vest).",
  cardio: "Log time and/or distance. Pace is calculated for you.",
  timed: "Log how long you held it, with optional added weight.",
};

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-subhead font-medium text-label-2">{label}</span>
      <select
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

export function NewExerciseForm() {
  const router = useRouter();
  const [kind, setKind] = useState<ExerciseKind>("strength");
  const [muscle, setMuscle] = useState<Muscle>("chest");
  const [equipment, setEquipment] = useState<Equipment>("barbell");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.push("/exercises");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <TextField label="Name" name="name" placeholder="e.g. Landmine Press" required maxLength={60} />

      <div>
        <span className="mb-1.5 block px-1 text-subhead font-medium text-label-2">Type</span>
        <div className="no-scrollbar overflow-x-auto">
          <SegmentedControl<ExerciseKind>
            label="Exercise type"
            value={kind}
            onChange={setKind}
            className="min-w-max"
            options={(["strength", "bodyweight", "cardio", "timed"] as const).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
          />
        </div>
        <p className="mt-2 flex items-center gap-2 px-1 text-footnote text-label-2">
          <ExerciseIcon kind={kind} size="sm" /> {KIND_HELP[kind]}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Main muscle" value={muscle} options={MUSCLES} onChange={setMuscle} />
        <Select label="Equipment" value={equipment} options={EQUIPMENT} onChange={setEquipment} />
      </div>

      {(kind === "strength" || kind === "bodyweight") && (
        <TextField
          label="Weight increment (kg)"
          name="increment"
          inputMode="decimal"
          defaultValue={kind === "strength" ? "2.5" : "2.5"}
          aria-describedby="inc-help"
        />
      )}
      {(kind === "strength" || kind === "bodyweight") && (
        <p id="inc-help" className="-mt-3 px-1 text-footnote text-label-2">
          The smallest jump you can make, used when suggesting a heavier next set.
        </p>
      )}

      <div className="mt-2 flex gap-3">
        <Button variant="gray" className="flex-1" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Save exercise
        </Button>
      </div>
      <p className="rounded-xl bg-fill-3 px-3 py-2 text-center text-footnote text-label-2">Preview: custom exercises are saved in stage 3.</p>
    </form>
  );
}
