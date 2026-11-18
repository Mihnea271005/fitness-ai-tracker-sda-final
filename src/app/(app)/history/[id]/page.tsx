import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListPlus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/interactive";
import { Badge, StatTile } from "@/components/ui/primitives";
import { ExerciseIcon } from "@/components/exercise-icon";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteWorkout } from "@/app/(app)/workout/actions";
import { routineFromWorkout } from "@/app/(app)/routines/actions";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getMeasurements, getTimeZone, getWorkout, getWorkouts } from "@/lib/data";
import { coachProfile } from "@/lib/ai/coach";
import { estimateExercise } from "@/lib/ai/estimator";
import { Sparkles } from "lucide-react";
import { Celebration, type CelebrationItem } from "@/components/celebration";
import { ShareWorkout } from "@/components/share-workout";
import { achievements, workoutPRs } from "@/lib/achievements";
import { localYmd } from "@/lib/format";
import type { Metadata } from "next";
import {
  KIND_LABEL,
  formatDuration,
  formatWeight,
  formatCompact,
  formatDate,
  formatSet,
  formatTime,
  toDisplayWeight,
  workoutDurationS,
  workoutVolumeKg,
} from "@/lib/format";

// Page title = the workout's title. The page already renders per request (Suspense + user
// data), so this metadata streams with it (Next 16 + Cache Components).
export async function generateMetadata({ params }: PageProps<"/history/[id]">): Promise<Metadata> {
  const w = await getWorkout((await params).id);
  return { title: w?.title ?? "Workout" };
}

export default function WorkoutDetailPage({ params, searchParams }: PageProps<"/history/[id]">) {
  return (
    <Suspense fallback={<PageHeader title="Workout" back={{ href: "/history", label: "History" }} />}>
      {Promise.all([params, searchParams]).then(([{ id }, sp]) => (
        <Detail id={id} justSaved={sp.saved === "1"} />
      ))}
    </Suspense>
  );
}

async function Detail({ id, justSaved }: { id: string; justSaved: boolean }) {
  const [profile, w, exercises, tz, all, measurements] = await Promise.all([getCurrentUser(), getWorkout(id), getExerciseMap(), getTimeZone(), getWorkouts(), getMeasurements()]);
  if (!w) notFound();

  // How this workout moved the AI's estimates (before = everything older than it).
  const coach = coachProfile(profile, measurements, new Date(w.startedAt));
  const idx = all.findIndex((x) => x.id === w.id);
  const updates = w.exercises.flatMap((we) => {
    const ex = exercises.get(we.exerciseId);
    if (!ex || idx < 0) return [];
    const at = new Date(w.endedAt);
    const before = estimateExercise(ex, all.slice(idx + 1), coach, at);
    const after = estimateExercise(ex, all.slice(idx), coach, at);
    if (!before || !after || before.value <= 0) return [];
    const change = (after.value - before.value) / before.value;
    if (Math.abs(change) < 0.005) return [];
    const better = ex.kind === "cardio" ? change < 0 : change > 0;
    const fmt = (v: number) =>
      ex.kind === "strength" ? formatWeight(v, profile.unit) : ex.kind === "bodyweight" ? `${Math.round(v)} reps` : ex.kind === "timed" ? formatDuration(v) : `${formatDuration(v)}/km`;
    if (fmt(before.value) === fmt(after.value)) return []; // "11 reps → 11 reps" says nothing
    const what = ex.kind === "strength" ? "est. max" : ex.kind === "bodyweight" ? "rep capacity" : ex.kind === "timed" ? "hold" : "pace";
    return [{ ex, text: `${what} ${fmt(before.value)} → ${fmt(after.value)}`, better, first: before.source === "profile" }];
  });
  const unit = profile.unit;
  const sets = w.exercises.flatMap((e) => e.sets).filter((s) => s.completed && s.type !== "warmup").length;
  const volume = workoutVolumeKg(w, exercises);
  // Compact so the tile never wraps on a phone: "45 min" or "1:10 h".
  const minutes = Math.round(workoutDurationS(w) / 60);
  const durationValue = minutes < 60 ? String(minutes) : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  const durationUnit = minutes < 60 ? "min" : "h";

  // Right after saving: celebrate records and achievements this workout earned.
  const celebrate: CelebrationItem[] = justSaved
    ? [
        ...workoutPRs(w, all, exercises).map((pr) => ({ key: `pr-${pr.exercise.id}`, kind: "pr" as const, title: `${pr.exercise.name}: new record`, detail: `${pr.label}: ${formatSet(pr.set, pr.exercise.kind, unit)}` })),
        ...achievements(all, exercises, profile.weeklyGoal, tz, unit)
          .filter((a) => a.unlockedBy === w.id)
          .map((a) => ({ key: a.id, kind: a.kind, title: a.title, detail: a.description })),
      ]
    : [];

  return (
    <>
      <PageHeader
        title={w.title}
        subtitle={`${formatDate(w.startedAt, tz, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${formatTime(w.startedAt, tz)}`}
        back={{ href: "/history", label: "History" }}
      />
      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatTile label="Duration" value={durationValue} unit={durationUnit} />
        <StatTile label="Volume" value={volume ? formatCompact(toDisplayWeight(volume, unit)) : "–"} unit={volume ? unit : undefined} />
        <StatTile label="Sets" value={String(sets)} />
      </div>

      {updates.length > 0 && (
        <section aria-labelledby="ai-update" className="mb-6 rounded-[var(--radius-card)] bg-accent/10 p-4">
          <h2 id="ai-update" className="mb-2 flex items-center gap-2 text-headline font-semibold">
            <Sparkles className="size-4 text-accent" aria-hidden /> AI update
          </h2>
          <ul className="flex flex-col gap-1.5 text-subhead">
            {updates.map((u) => (
              <li key={u.ex.id}>
                <span className="font-semibold">{u.ex.name}</span>: {u.text}{" "}
                <span className={u.better ? "text-green-text" : "text-label-2"}>{u.first ? "(first real data, replaces the profile guess)" : u.better ? "↑" : "↓"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-footnote text-label-2">Your next suggested workout uses these numbers.</p>
        </section>
      )}

      {w.exercises.map((we) => {
        const ex = exercises.get(we.exerciseId);
        if (!ex) return null;
        let n = 0;
        return (
          <section key={we.id} className="mb-4 rounded-[var(--radius-card)] bg-surface p-4">
            <Link href={`/exercises/${ex.id}`} className="mb-3 flex items-center gap-3">
              <ExerciseIcon kind={ex.kind} />
              <div>
                <div className="text-headline font-semibold">{ex.name}</div>
                <div className="text-footnote text-label-2">{KIND_LABEL[ex.kind]}</div>
              </div>
            </Link>
            <ol className="divide-y divide-separator">
              {we.sets.map((s) => (
                <li key={s.id} className="flex min-h-11 items-center gap-3 py-2 tabular">
                  <span className="w-8 text-center text-subhead font-semibold text-label-2">{s.type === "warmup" ? "W" : ++n}</span>
                  <span className="flex-1 font-rounded text-body font-semibold">{formatSet(s, ex.kind, unit)}</span>
                  {s.type === "warmup" && <Badge>Warm-up</Badge>}
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <Celebration items={celebrate} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ShareWorkout workoutId={w.id} fileName={`workout-${localYmd(w.startedAt, tz)}`} />
        <ConfirmAction
          className="flex-1"
          buttonVariant="tinted"
          variant="filled"
          label={
            <>
              <ListPlus className="size-5" aria-hidden /> Save as routine
            </>
          }
          title="Save as a routine?"
          body={`Creates a routine called “${w.title}” with these exercises and set counts, so you can start it again in one tap.`}
          confirmLabel="Save routine"
          action={routineFromWorkout.bind(null, w.id)}
        />
        <ConfirmAction
          className="flex-1"
          label={
            <>
              <Trash2 className="size-5" aria-hidden /> Delete workout
            </>
          }
          title="Delete this workout?"
          body="This permanently removes the workout and all its sets from your history."
          confirmLabel="Delete"
          action={deleteWorkout.bind(null, w.id)}
        />
      </div>
    </>
  );
}
