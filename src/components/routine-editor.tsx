"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { ExerciseIcon } from "./exercise-icon";
import { ExercisePicker } from "./exercise-picker";
import { Button, TextField } from "./ui/primitives";
import { saveRoutine } from "@/app/(app)/routines/actions";
import { KIND_LABEL } from "@/lib/format";
import type { Exercise, Routine, RoutineExercise } from "@/lib/types";

function NumberField({ label, value, onChange, min, max, suffix }: { label: string; value?: number; onChange: (v?: number) => void; min: number; max: number; suffix?: string }) {
  // While typing, keep the raw text (it may be empty or out of range for a moment); clamp on
  // blur. Clamping on every keystroke turned "clear, type 5" into "15".
  const [text, setText] = useState<string | null>(null);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption1 font-semibold tracking-wide text-label-2 uppercase">{label}</span>
      <span className="flex items-center gap-1">
        <input
          inputMode="numeric"
          value={text ?? (value === undefined ? "" : String(value))}
          placeholder="–"
          onFocus={() => setText(value === undefined ? "" : String(value))}
          onChange={(e) => {
            setText(e.target.value);
            const t = e.target.value.trim();
            if (t === "") return onChange(undefined);
            const n = Math.round(Number(t));
            if (Number.isFinite(n)) onChange(Math.min(Math.max(n, min), max));
          }}
          onBlur={() => setText(null)}
          className="h-11 w-full min-w-0 rounded-[10px] bg-fill-3 text-center font-rounded text-body font-semibold tabular outline-none placeholder:text-label-3 focus-visible:ring-2 focus-visible:ring-accent"
        />
        {suffix && <span className="text-subhead text-label-2">{suffix}</span>}
      </span>
    </label>
  );
}

export function RoutineEditor({ routine, exercises }: { routine?: Routine; exercises: Exercise[] }) {
  const router = useRouter();
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
  const [name, setName] = useState(routine?.name ?? "");
  const [items, setItems] = useState<RoutineExercise[]>(routine?.exercises ?? []);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const update = (i: number, patch: Partial<RoutineExercise>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setItems((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  function save() {
    setError(null);
    start(async () => {
      const res = await saveRoutine({ id: routine?.id, name, exercises: items });
      if (res.error) return setError(res.error);
      router.push("/workout");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="rounded-xl bg-red/15 px-4 py-3 text-subhead text-red-text">
          {error}
        </p>
      )}
      <TextField label="Routine name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day" maxLength={60} />

      <div className="flex flex-col gap-3">
        {items.map((item, i) => {
          const ex = exerciseMap.get(item.exerciseId);
          if (!ex) return null;
          return (
            <section key={`${item.exerciseId}-${i}`} aria-label={ex.name} className="rounded-[var(--radius-card)] bg-surface p-3 sm:p-4">
              <header className="mb-3 flex items-center gap-3">
                <ExerciseIcon kind={ex.kind} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-headline font-semibold">{ex.name}</div>
                  <div className="text-footnote text-label-2">{KIND_LABEL[ex.kind]}</div>
                </div>
                <button type="button" aria-label={`Move ${ex.name} up`} disabled={i === 0} onClick={() => move(i, -1)} className="inline-flex size-11 items-center justify-center rounded-full text-accent hover:bg-fill-3 disabled:text-label-3">
                  <ChevronUp className="size-5" aria-hidden />
                </button>
                <button type="button" aria-label={`Move ${ex.name} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)} className="inline-flex size-11 items-center justify-center rounded-full text-accent hover:bg-fill-3 disabled:text-label-3">
                  <ChevronDown className="size-5" aria-hidden />
                </button>
                <button type="button" aria-label={`Remove ${ex.name}`} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} className="inline-flex size-11 items-center justify-center rounded-full text-red-text hover:bg-red/15">
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </header>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="Sets" value={item.targetSets} min={1} max={20} onChange={(v) => update(i, { targetSets: v ?? 1 })} />
                {ex.kind === "strength" || ex.kind === "bodyweight" ? (
                  <NumberField label="Reps" value={item.targetReps} min={1} max={100} onChange={(v) => update(i, { targetReps: v })} />
                ) : (
                  <span />
                )}
                <NumberField label="Rest" value={item.restSeconds} min={0} max={900} suffix="s" onChange={(v) => update(i, { restSeconds: v ?? 0 })} />
              </div>
            </section>
          );
        })}
        {!items.length && <p className="rounded-[var(--radius-card)] bg-surface px-4 py-8 text-center text-subhead text-label-2">Add the exercises for this routine.</p>}
      </div>

      <Button variant="tinted" size="large" className="w-full" onClick={() => setPicking(true)}>
        <Plus className="size-5" strokeWidth={2.75} aria-hidden /> Add exercise
      </Button>

      <div className="flex gap-3">
        <Button variant="gray" className="flex-1" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={save} disabled={saving} aria-busy={saving}>
          {saving ? "Saving…" : "Save routine"}
        </Button>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        exercises={exercises}
        onPick={(e) => setItems((xs) => [...xs, { exerciseId: e.id, targetSets: 3, targetReps: e.kind === "strength" ? 8 : e.kind === "bodyweight" ? 10 : undefined, restSeconds: e.kind === "cardio" ? 0 : 90 }])}
      />
    </div>
  );
}
