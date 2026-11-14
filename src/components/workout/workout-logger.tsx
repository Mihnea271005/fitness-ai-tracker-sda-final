"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Check, Ellipsis, Pencil, Plus, Sparkles, Timer, Trash2 } from "lucide-react";
import { ExerciseIcon } from "../exercise-icon";
import { ExercisePicker } from "../exercise-picker";
import { Button, ListRow, ListSection, TextField, cn } from "../ui/primitives";
import { PageHeader, Sheet } from "../ui/interactive";
import { useActiveWorkout, useElapsed, type DraftExercise, type DraftSet, type StartExercise } from "./workout-context";
import { saveWorkout } from "@/app/(app)/workout/actions";
import { KIND_LABEL, formatDuration, formatSet, fromDisplayWeight, toDisplayWeight } from "@/lib/format";
import { CATALOG } from "@/lib/ai/catalog";
import { estimateExercise, type CoachProfile } from "@/lib/ai/estimator";
import type { TrainingSettings } from "@/lib/ai/generator";
import { adjustNext, suggestStart, targetFor, type Suggestion, type Target } from "@/lib/ai/prescribe";
import type { Exercise, ExerciseKind, Routine, Unit, Workout, WorkoutSet } from "@/lib/types";

/** Working sets from the most recent session with this exercise (for the "Previous" column). */
function lastSessionSets(workouts: Workout[], exerciseId: string): WorkoutSet[] {
  for (const w of workouts) {
    const we = w.exercises.find((e) => e.exerciseId === exerciseId);
    const working = we?.sets.filter((s) => s.completed && s.type !== "warmup");
    if (working?.length) return working;
  }
  return [];
}

export interface CoachContext {
  profile: CoachProfile;
  settings: TrainingSettings;
}

/* ------------------------------------------------------------------ field config per kind */

type ValueKey = "weightKg" | "reps" | "durationS" | "distanceM";

interface FieldDef {
  key: ValueKey;
  label: string;
  /** stored value → text in the input */
  toInput: (v: number | undefined) => string;
  /** text in the input → stored value */
  fromInput: (s: string) => number | undefined;
  decimal: boolean;
}

const num = (s: string) => {
  const t = s.trim().replace(",", ".");
  return t === "" || Number.isNaN(Number(t)) ? undefined : Number(t);
};
const plain = (v: number | undefined) => (v === undefined ? "" : String(v));

function weightField(unit: Unit, added: boolean): FieldDef {
  return {
    key: "weightKg",
    label: added ? `+${unit}` : unit,
    toInput: (v) => (v === undefined ? "" : String(toDisplayWeight(v, unit))),
    fromInput: (s) => (num(s) === undefined ? undefined : fromDisplayWeight(num(s)!, unit)),
    decimal: true,
  };
}
const REPS: FieldDef = { key: "reps", label: "Reps", toInput: plain, fromInput: (s) => (num(s) === undefined ? undefined : Math.round(num(s)!)), decimal: false };
const SECONDS: FieldDef = { key: "durationS", label: "Sec", toInput: plain, fromInput: (s) => (num(s) === undefined ? undefined : Math.round(num(s)!)), decimal: false };
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

function fieldsFor(kind: ExerciseKind, unit: Unit): [FieldDef, FieldDef] {
  switch (kind) {
    case "strength":
      return [weightField(unit, false), REPS];
    case "bodyweight":
      return [weightField(unit, true), REPS];
    case "timed":
      return [weightField(unit, true), SECONDS];
    case "cardio":
      return [KM, MINUTES];
  }
}

/** The numbers actually typed into a set (so the next row can suggest repeating them). */
function enteredValues(s: DraftSet): Partial<WorkoutSet> {
  const out: Partial<WorkoutSet> = {};
  for (const k of ["weightKg", "reps", "durationS", "distanceM"] as const) if (s[k] !== undefined) out[k] = s[k];
  return out;
}

const GRID = "grid grid-cols-[2.25rem_minmax(0,1fr)_4.25rem_4.25rem_2.75rem] items-center gap-1.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_5.5rem_5.5rem_2.75rem] sm:gap-2";

/* ------------------------------------------------------------------ set row */

function SetRow({
  number,
  set,
  kind,
  unit,
  previous,
  placeholder,
  onChange,
  onRemove,
  showFeel,
}: {
  number: number;
  set: DraftSet;
  kind: ExerciseKind;
  unit: Unit;
  previous?: WorkoutSet;
  placeholder?: Partial<WorkoutSet>;
  onChange: (patch: Partial<DraftSet>) => void;
  onRemove: () => void;
  showFeel?: boolean;
}) {
  const fields = fieldsFor(kind, unit);

  function toggleComplete() {
    if (set.completed) return onChange({ completed: false });
    // Completing an empty row accepts the suggested (greyed) values — one tap.
    const patch: Partial<DraftSet> = { completed: true };
    for (const f of fields) if (set[f.key] === undefined && placeholder?.[f.key] !== undefined) patch[f.key] = placeholder[f.key];
    onChange(patch);
  }

  return (
    <>
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
      <div className="truncate text-subhead text-label-2 tabular">{previous ? formatSet(previous, kind, unit) : "–"}</div>
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
    {showFeel && set.completed && kind !== "cardio" && (
      <div role="group" aria-label={`How did set ${number} feel?`} className="mb-1 flex items-center gap-1.5 pl-10 sm:pl-12">
        <span className="mr-1 text-footnote text-label-2">Felt</span>
        {([
          [1, "Too easy"],
          [0, "Just right"],
          [-1, "Too hard"],
        ] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={set.feel === v}
            onClick={() => onChange({ feel: set.feel === v ? undefined : v })}
            className={cn(
              "min-h-9 rounded-full px-3 text-footnote font-semibold transition-colors",
              set.feel === v ? "bg-accent text-white" : "bg-fill-3 text-label-2 hover:bg-fill-2",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    )}
    </>
  );
}

/* ------------------------------------------------------------------ exercise card */

function ExerciseCard({ entry, exercise, history, unit, coach }: { entry: DraftExercise; exercise: Exercise; history: Workout[]; unit: Unit; coach: CoachContext }) {
  const { addSet, updateSet, removeSet, removeExercise } = useActiveWorkout();
  const [menu, setMenu] = useState(false);
  const last = useMemo(() => lastSessionSets(history, exercise.id), [history, exercise.id]);
  const target: Target = useMemo(() => {
    const t = targetFor(coach.settings.goal, exercise, CATALOG[exercise.slug ?? ""]?.compound ?? true, coach.profile.experience, coach.settings.sessionMinutes);
    return { ...t, reps: entry.targetReps ?? t.reps, seconds: entry.targetSeconds ?? t.seconds, minutes: entry.targetMinutes ?? t.minutes };
  }, [coach, exercise, entry.targetReps, entry.targetSeconds, entry.targetMinutes]);
  const suggestion = useMemo(
    () => suggestStart(exercise, estimateExercise(exercise, history, coach.profile), target, unit),
    [exercise, history, coach.profile, target, unit],
  );
  const fields = fieldsFor(exercise.kind, unit);
  const firstPlaceholder = suggestion?.values ?? (entry.targetReps ? { reps: entry.targetReps } : undefined);
  // Live coaching: after a set is ticked, the next one adapts to it.
  const lastDoneIndex = entry.sets.findLastIndex((s) => s.completed);
  const live: Suggestion | null = lastDoneIndex >= 0 && lastDoneIndex < entry.sets.length - 1 ? adjustNext(exercise, entry.sets[lastDoneIndex], target, unit) : null;
  const placeholderFor = (i: number): Partial<WorkoutSet> | undefined => {
    if (i === 0) return firstPlaceholder;
    const prev = entry.sets[i - 1];
    if (prev.completed) return { ...firstPlaceholder, ...(adjustNext(exercise, prev, target, unit)?.values ?? enteredValues(prev)) };
    return { ...firstPlaceholder, ...enteredValues(prev) };
  };

  return (
    <section aria-label={exercise.name} className="mb-4 rounded-[var(--radius-card)] bg-surface p-3 sm:p-4">
      <header className="mb-3 flex items-center gap-3">
        <ExerciseIcon kind={exercise.kind} />
        <div className="min-w-0 flex-1">
          <Link href={`/exercises/${exercise.id}`} className="block truncate text-headline font-semibold hover:underline">
            {exercise.name}
          </Link>
          <div className="text-footnote text-label-2">
            {KIND_LABEL[exercise.kind]}
            {entry.restSeconds ? ` · rest ${formatDuration(entry.restSeconds)}` : ""}
          </div>
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

      {(live ?? suggestion) && (
        <div className="mb-3 flex gap-2 rounded-xl bg-accent/10 px-3 py-2.5 text-subhead" aria-live="polite">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <p>
            <span className="font-semibold text-accent">{live ? `Set ${lastDoneIndex + 2}: ` : "Suggested: "}</span>
            {(live ?? suggestion)!.reason}
            {!live && entry.why && <span className="block text-footnote text-label-2">{entry.why}</span>}
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
            unit={unit}
            previous={last[i]}
            placeholder={placeholderFor(i)}
            onChange={(patch) => updateSet(entry.id, s.id, patch)}
            onRemove={() => removeSet(entry.id, s.id)}
            showFeel={i === lastDoneIndex}
          />
        ))}
      </div>

      <Button variant="gray" size="small" className="mt-2 w-full" onClick={() => addSet(entry.id)}>
        <Plus className="size-4" strokeWidth={2.75} aria-hidden /> Add set
      </Button>
    </section>
  );
}

/* ------------------------------------------------------------------ empty state */

function EmptyState({ routines, history, exercises, aiCard }: { routines: Routine[]; history: Workout[]; exercises: Map<string, Exercise>; aiCard?: ReactNode }) {
  const { start } = useActiveWorkout();
  const names = (ids: string[]) => ids.map((id) => exercises.get(id)?.name).filter(Boolean).join(", ");

  // The three most recent distinct workout titles, to repeat in one tap.
  const recent: Workout[] = [];
  for (const w of history) {
    if (recent.length === 3) break;
    if (!recent.some((r) => r.title === w.title)) recent.push(w);
  }
  const fromWorkout = (w: Workout): StartExercise[] =>
    w.exercises.filter((e) => exercises.has(e.exerciseId)).map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.type !== "warmup").length }));

  return (
    <>
      <PageHeader title="Workout" subtitle="Start from scratch, a routine, or a recent session." />
      {aiCard}
      <Button size="large" variant={aiCard ? "gray" : "filled"} className="mb-8 w-full" onClick={() => start("Workout")}>
        <Plus className="size-5" strokeWidth={2.75} aria-hidden /> Start empty workout
      </Button>

      <ListSection
        header="My routines"
        footer={
          <Link href="/routines/new" className="inline-flex min-h-11 items-center text-subhead text-accent">
            <Plus className="mr-1 size-4" aria-hidden /> New routine
          </Link>
        }
      >
        {routines.map((r) => (
          <li key={r.id} className="flex items-center pr-2">
            <button
              type="button"
              onClick={() =>
                start(
                  r.name,
                  r.exercises
                    .filter((e) => exercises.has(e.exerciseId))
                    .map((e) => ({ exerciseId: e.exerciseId, sets: e.targetSets, restSeconds: e.restSeconds, targetReps: e.targetReps })),
                )
              }
              className="-ml-4 min-h-11 min-w-0 flex-1 py-2.5 pr-2 pl-4 text-left transition-colors hover:bg-fill-3 active:bg-fill-2"
            >
              <span className="block truncate text-body">{r.name}</span>
              <span className="block truncate text-subhead text-label-2">{names(r.exercises.map((e) => e.exerciseId)) || "No exercises"}</span>
            </button>
            <Link
              href={`/routines/${r.id}`}
              aria-label={`Edit ${r.name}`}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-accent hover:bg-fill-3"
            >
              <Pencil className="size-4" aria-hidden />
            </Link>
          </li>
        ))}
        {!routines.length && <li className="py-4 pr-4 text-subhead text-label-2">No routines yet. Save one from a workout, or create one.</li>}
      </ListSection>

      {recent.length > 0 && (
        <ListSection header="Repeat a recent workout" footer="Sets start empty. The suggested numbers come from your last session.">
          {recent.map((w) => (
            <ListRow key={w.id} title={w.title} subtitle={names(w.exercises.map((e) => e.exerciseId))} onClick={() => start(w.title, fromWorkout(w))} chevron />
          ))}
        </ListSection>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ page body */

export function WorkoutLogger({
  exercises,
  history,
  routines,
  unit,
  coach,
  aiCard,
}: {
  exercises: Exercise[];
  history: Workout[];
  routines: Routine[];
  unit: Unit;
  coach: CoachContext;
  aiCard?: ReactNode;
}) {
  const { workout, loaded, discard, addExercise, rename } = useActiveWorkout();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const elapsed = useElapsed(workout?.startedAt);
  const rest = useElapsed(workout?.lastCompletedAt);
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  if (!loaded) return <PageHeader title="Workout" />;
  if (!workout) return <EmptyState routines={routines} history={history} exercises={exerciseMap} aiCard={aiCard} />;

  const allSets = workout.exercises.flatMap((e) => e.sets);
  const done = allSets.filter((s) => s.completed).length;

  function finish() {
    if (!workout) return;
    setError(null);
    startSaving(async () => {
      const res = await saveWorkout({
        title: workout.title,
        planDay: workout.planDay,
        startedAt: workout.startedAt,
        exercises: workout.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets })),
      });
      if (res.error || !res.id) {
        setError(res.error ?? "Couldn't save your workout.");
        return;
      }
      discard();
      setFinishing(false);
      router.push(`/history/${res.id}`);
    });
  }

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
              {done} of {allSets.length} sets done
            </span>
            {workout.lastCompletedAt && <span className="tabular">Rest {formatDuration(rest)}</span>}
            <button
              type="button"
              onClick={() => {
                setDraftTitle(workout.title);
                setRenaming(true);
              }}
              className="inline-flex min-h-11 items-center gap-1 text-accent"
            >
              <Pencil className="size-3.5" aria-hidden /> Rename
            </button>
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
        return ex ? <ExerciseCard key={entry.id} entry={entry} exercise={ex} history={history} unit={unit} coach={coach} /> : null;
      })}

      {!workout.exercises.length && (
        <p className="mb-6 rounded-[var(--radius-card)] bg-surface px-4 py-10 text-center text-subhead text-label-2">Add your first exercise to start logging sets.</p>
      )}

      <Button variant="tinted" size="large" className="mb-3 w-full" onClick={() => setAdding(true)}>
        <Plus className="size-5" strokeWidth={2.75} aria-hidden /> Add exercise
      </Button>
      <Button variant="plain" className="w-full !text-red-text" onClick={() => setConfirmDiscard(true)}>
        Discard workout
      </Button>

      <ExercisePicker open={adding} onClose={() => setAdding(false)} onPick={(e) => addExercise(e.id)} exercises={exercises} />

      <Sheet
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Workout name"
        footer={
          <Button
            className="w-full"
            onClick={() => {
              rename(draftTitle.trim().slice(0, 80) || "Workout");
              setRenaming(false);
            }}
          >
            Save
          </Button>
        }
      >
        <TextField label="Name" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} maxLength={80} />
      </Sheet>

      <Sheet
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this workout?"
        footer={
          <div className="flex gap-2">
            <Button variant="gray" className="flex-1" onClick={() => setConfirmDiscard(false)}>
              Keep going
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                discard();
                setConfirmDiscard(false);
              }}
            >
              Discard
            </Button>
          </div>
        }
      >
        <p className="text-body">The sets you logged in this session won&apos;t be saved.</p>
      </Sheet>

      <Sheet
        open={finishing}
        onClose={() => setFinishing(false)}
        title="Finish workout?"
        footer={
          <div className="flex gap-2">
            <Button variant="gray" className="flex-1" onClick={() => setFinishing(false)} disabled={saving}>
              Keep going
            </Button>
            <Button className="flex-1" onClick={finish} disabled={saving || done === 0} aria-busy={saving}>
              {saving ? "Saving…" : "Save workout"}
            </Button>
          </div>
        }
      >
        <p className="text-body">
          {done} {done === 1 ? "set" : "sets"} completed in {formatDuration(elapsed)}.
        </p>
        {done === 0 && <p className="mt-2 text-subhead text-label-2">Tap ✓ on at least one set to save this workout.</p>}
        {done > 0 && done < allSets.length && <p className="mt-2 text-subhead text-label-2">Sets you didn&apos;t tick won&apos;t be saved.</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red/15 px-3 py-2 text-subhead text-red-text">
            {error}
          </p>
        )}
      </Sheet>
    </>
  );
}
