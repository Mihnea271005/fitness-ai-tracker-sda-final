"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Ellipsis, Plus, Search, Sparkles, Timer, Trash2 } from "lucide-react";
import { ExerciseIcon } from "../exercise-icon";
import { Button, ListRow, ListSection, cn } from "../ui/primitives";
import { PageHeader, SegmentedControl, Sheet } from "../ui/interactive";
import { useActiveWorkout, useElapsed, type DraftExercise, type DraftSet } from "./workout-context";
import { exerciseMap, exercises as allExercises, workouts } from "@/lib/mock-data";
import { KIND_LABEL, formatDuration, formatSet } from "@/lib/format";
import { lastSessionSets, suggestFirstSet } from "@/lib/suggest";
import type { Exercise, ExerciseKind, WorkoutSet } from "@/lib/types";

/* ------------------------------------------------------------------ field config per kind */

interface FieldDef {
  key: "weightKg" | "reps" | "durationS" | "distanceM";
  label: string;
  /** state value → input value */
  toInput: (v: number | undefined) => string;
  /** input value → state value */
  fromInput: (s: string) => number | undefined;
  decimal: boolean;
}

const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? undefined : Number(s));
const plain = (v: number | undefined) => (v === undefined ? "" : String(v));

const KG: FieldDef = { key: "weightKg", label: "kg", toInput: plain, fromInput: num, decimal: true };
const ADDED_KG: FieldDef = { ...KG, label: "+kg" };
const REPS: FieldDef = { key: "reps", label: "Reps", toInput: plain, fromInput: (s) => (num(s) === undefined ? undefined : Math.round(num(s)!)), decimal: false };
const SECONDS: FieldDef = { key: "durationS", label: "Sec", toInput: plain, fromInput: num, decimal: false };
const KM: FieldDef = {
  key: "distanceM",
  label: "km",
  toInput: (v) => (v === undefined ? "" : String(Math.round(v) / 1000)),
  fromInput: (s) => (num(s) === undefined ? undefined : Math.round(num(s)! * 1000)),
  decimal: true,
};
const MINUTES: FieldDef = {
  key: "durationS",
  label: "Min",
  toInput: (v) => (v === undefined ? "" : String(Math.round((v / 60) * 10) / 10)),
  fromInput: (s) => (num(s) === undefined ? undefined : Math.round(num(s)! * 60)),
  decimal: true,
};

const FIELDS: Record<ExerciseKind, [FieldDef, FieldDef]> = {
  strength: [KG, REPS],
  bodyweight: [ADDED_KG, REPS],
  timed: [ADDED_KG, SECONDS],
  cardio: [KM, MINUTES],
};

/** The numbers actually typed into a set (so the next row can suggest repeating them). */
function enteredValues(s: DraftSet): Partial<WorkoutSet> {
  const out: Partial<WorkoutSet> = {};
  for (const k of ["weightKg", "reps", "durationS", "distanceM"] as const) if (s[k] !== undefined) out[k] = s[k];
  return out;
}

const GRID ="grid grid-cols-[2.25rem_minmax(0,1fr)_4.25rem_4.25rem_2.75rem] items-center gap-1.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_5.5rem_5.5rem_2.75rem] sm:gap-2";

/* ------------------------------------------------------------------ set row */

function SetRow({
  number,
  set,
  kind,
  previous,
  placeholder,
  onChange,
  onRemove,
}: {
  number: number;
  set: DraftSet;
  kind: ExerciseKind;
  previous?: WorkoutSet;
  placeholder?: Partial<WorkoutSet>;
  onChange: (patch: Partial<DraftSet>) => void;
  onRemove: () => void;
}) {
  const fields = FIELDS[kind];

  function toggleComplete() {
    if (set.completed) return onChange({ completed: false });
    // Completing an empty row accepts the suggested (greyed) values — one tap.
    const patch: Partial<DraftSet> = { completed: true };
    for (const f of fields) if (set[f.key] === undefined && placeholder?.[f.key] !== undefined) patch[f.key] = placeholder[f.key];
    onChange(patch);
  }

  return (
    <div className={cn(GRID, "group -mx-2 rounded-xl px-2 py-1 transition-colors", set.completed && "bg-green/15")}>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove set ${number}`}
        title="Remove set"
        className="inline-flex size-9 items-center justify-center rounded-lg text-subhead font-semibold text-label-2 tabular hover:bg-red/15 hover:text-red-text"
      >
        <span className="group-hover:hidden">{number}</span>
        <Trash2 className="hidden size-4 group-hover:block" aria-hidden />
      </button>
      <div className="truncate text-subhead text-label-2 tabular">{previous ? formatSet(previous, kind) : "–"}</div>
      {fields.map((f) => (
        <input
          key={f.key + f.label}
          aria-label={`Set ${number} ${f.label}`}
          inputMode={f.decimal ? "decimal" : "numeric"}
          type="text"
          value={f.toInput(set[f.key])}
          placeholder={f.toInput(placeholder?.[f.key]) || "–"}
          onChange={(e) => onChange({ [f.key]: f.fromInput(e.target.value) })}
          className={cn(
            "h-11 w-full min-w-0 rounded-[10px] bg-fill-3 text-center font-rounded text-body font-semibold tabular outline-none",
            "placeholder:font-medium placeholder:text-label-3 focus-visible:ring-2 focus-visible:ring-accent",
            set.completed && "bg-transparent",
          )}
        />
      ))}
      <button
        type="button"
        onClick={toggleComplete}
        aria-label={set.completed ? `Mark set ${number} not done` : `Complete set ${number}`}
        aria-pressed={set.completed}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-[10px] transition-colors",
          set.completed ? "bg-green text-white" : "bg-fill-3 text-label-2 hover:bg-fill-2",
        )}
      >
        <Check className="size-5" strokeWidth={3} aria-hidden />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ exercise card */

function ExerciseCard({ entry, exercise }: { entry: DraftExercise; exercise: Exercise }) {
  const { addSet, updateSet, removeSet, removeExercise } = useActiveWorkout();
  const [menu, setMenu] = useState(false);
  const last = useMemo(() => lastSessionSets(workouts, exercise.id), [exercise.id]);
  const suggestion = useMemo(() => suggestFirstSet(exercise, last), [exercise, last]);
  const fields = FIELDS[exercise.kind];

  return (
    <section aria-label={exercise.name} className="mb-4 rounded-[var(--radius-card)] bg-surface p-3 sm:p-4">
      <header className="mb-3 flex items-center gap-3">
        <ExerciseIcon kind={exercise.kind} />
        <div className="min-w-0 flex-1">
          <Link href={`/exercises/${exercise.id}`} className="block truncate text-headline font-semibold hover:underline">
            {exercise.name}
          </Link>
          <div className="text-footnote text-label-2">{KIND_LABEL[exercise.kind]}</div>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label={`More options for ${exercise.name}`}
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
            className="inline-flex size-11 items-center justify-center rounded-full text-accent hover:bg-fill-3"
          >
            <Ellipsis className="size-5" aria-hidden />
          </button>
          {menu && (
            <div className="absolute top-11 right-0 z-20 w-52 overflow-hidden rounded-xl bg-elevated shadow-[0_8px_32px_rgb(0_0_0/0.2)] ring-1 ring-separator">
              <button
                type="button"
                onClick={() => removeExercise(entry.id)}
                className="flex min-h-11 w-full items-center justify-between px-4 text-body text-red-text hover:bg-fill-3"
              >
                Remove exercise <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </header>

      {suggestion && (
        <div className="mb-3 flex gap-2 rounded-xl bg-accent/10 px-3 py-2.5 text-subhead">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <p>
            <span className="font-semibold text-accent">Suggested: </span>
            {suggestion.reason}
          </p>
        </div>
      )}

      <div className={cn(GRID, "mb-1 px-0 text-caption1 font-semibold tracking-wide text-label-2 uppercase")}>
        <span className="text-center">Set</span>
        <span>Previous</span>
        {fields.map((f) => (
          <span key={f.label} className="text-center">
            {f.label}
          </span>
        ))}
        <span className="sr-only">Done</span>
      </div>

      <div className="flex flex-col gap-1">
        {entry.sets.map((s, i) => (
          <SetRow
            key={s.id}
            number={i + 1}
            set={s}
            kind={exercise.kind}
            previous={last[i]}
            placeholder={i === 0 ? suggestion?.values : { ...suggestion?.values, ...enteredValues(entry.sets[i - 1]) }}
            onChange={(patch) => updateSet(entry.id, s.id, patch)}
            onRemove={() => removeSet(entry.id, s.id)}
          />
        ))}
      </div>

      <Button variant="gray" size="small" className="mt-2 w-full" onClick={() => addSet(entry.id)}>
        <Plus className="size-4" strokeWidth={2.75} aria-hidden /> Add set
      </Button>
    </section>
  );
}

/* ------------------------------------------------------------------ add-exercise sheet */

function AddExerciseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addExercise } = useActiveWorkout();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | ExerciseKind>("all");
  const list = allExercises.filter((e) => (kind === "all" || e.kind === kind) && e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      <label className="mb-3 flex min-h-11 items-center gap-2 rounded-xl bg-fill-3 px-3">
        <Search className="size-4 text-label-2" aria-hidden />
        <span className="sr-only">Search exercises</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-11 flex-1 bg-transparent text-body outline-none placeholder:text-label-2" />
      </label>
      <div className="no-scrollbar mb-3 overflow-x-auto">
        <SegmentedControl
          label="Exercise type"
          value={kind}
          onChange={setKind}
          className="min-w-max"
          options={[
            { value: "all", label: "All" },
            { value: "strength", label: "Strength" },
            { value: "bodyweight", label: "Bodyweight" },
            { value: "cardio", label: "Cardio" },
            { value: "timed", label: "Timed" },
          ]}
        />
      </div>
      <ListSection className="mb-2">
        {list.map((e) => (
          <ListRow
            key={e.id}
            leading={<ExerciseIcon kind={e.kind} size="sm" />}
            title={e.name}
            subtitle={`${KIND_LABEL[e.kind]} · ${e.primaryMuscle}`}
            chevron={false}
            trailing={<Plus className="size-5 text-accent" aria-hidden />}
            onClick={() => {
              addExercise(e.id);
              onClose();
            }}
          />
        ))}
        {!list.length && <li className="py-6 text-center text-subhead text-label-2">No exercises match “{q}”.</li>}
      </ListSection>
      <Link href="/exercises/new" className="inline-flex min-h-11 items-center text-subhead text-accent">
        Create a custom exercise
      </Link>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ page body */

const TEMPLATES = ["Push", "Pull", "Legs"].map((title) => {
  const w = workouts.find((x) => x.title === title)!;
  return { title, exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.type !== "warmup").length })) };
});

function EmptyState() {
  const { start } = useActiveWorkout();
  return (
    <>
      <PageHeader title="Workout" subtitle="Start from scratch or repeat a recent session." />
      <Button size="large" className="mb-8 w-full" onClick={() => start("Workout")}>
        <Plus className="size-5" strokeWidth={2.75} aria-hidden /> Start empty workout
      </Button>
      <ListSection header="Repeat a recent workout" footer="Sets start empty. The suggested numbers come from your last session.">
        {TEMPLATES.map((t) => (
          <ListRow
            key={t.title}
            title={t.title}
            subtitle={t.exercises.map((e) => exerciseMap.get(e.exerciseId)?.name).join(", ")}
            onClick={() => start(t.title, t.exercises)}
            chevron
          />
        ))}
      </ListSection>
    </>
  );
}

export function WorkoutLogger() {
  const { workout, discard } = useActiveWorkout();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const elapsed = useElapsed(workout?.startedAt);
  const rest = useElapsed(workout?.lastCompletedAt);

  if (!workout) return <EmptyState />;

  const done = workout.exercises.flatMap((e) => e.sets).filter((s) => s.completed).length;
  const total = workout.exercises.flatMap((e) => e.sets).length;

  return (
    <>
      <PageHeader
        title={workout.title}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 font-rounded font-semibold text-label tabular">
              <Timer className="size-4 text-accent" aria-hidden /> {formatDuration(elapsed)}
            </span>
            <span>
              {done} of {total} sets done
            </span>
            {workout.lastCompletedAt && <span className="tabular">Rest {formatDuration(rest)}</span>}
          </span>
        }
        actions={
          <Button size="small" onClick={() => setFinishing(true)}>
            Finish
          </Button>
        }
      />

      {workout.exercises.map((entry) => {
        const ex = exerciseMap.get(entry.exerciseId);
        return ex ? <ExerciseCard key={entry.id} entry={entry} exercise={ex} /> : null;
      })}

      {!workout.exercises.length && (
        <p className="mb-6 rounded-[var(--radius-card)] bg-surface px-4 py-10 text-center text-subhead text-label-2">Add your first exercise to start logging sets.</p>
      )}

      <Button variant="tinted" size="large" className="mb-3 w-full" onClick={() => setAdding(true)}>
        <Plus className="size-5" strokeWidth={2.75} aria-hidden /> Add exercise
      </Button>
      <Button variant="plain" className="w-full !text-red-text" onClick={() => discard()}>
        Discard workout
      </Button>

      <AddExerciseSheet open={adding} onClose={() => setAdding(false)} />

      <Sheet
        open={finishing}
        onClose={() => setFinishing(false)}
        title="Finish workout?"
        footer={
          <div className="flex gap-2">
            <Button variant="gray" className="flex-1" onClick={() => setFinishing(false)}>
              Keep going
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                discard();
                setFinishing(false);
                router.push("/history");
              }}
            >
              Finish
            </Button>
          </div>
        }
      >
        <p className="text-body">
          {done} sets completed in {formatDuration(elapsed)}.
        </p>
        <p className="mt-2 text-subhead text-label-2">This preview doesn&apos;t save workouts yet. Saving to your history arrives with accounts and logging (stages 2 and 3).</p>
      </Sheet>
    </>
  );
}
