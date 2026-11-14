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
import { getExerciseMap, getTimeZone, getWorkout } from "@/lib/data";
import {
  KIND_LABEL,
  formatCompact,
  formatDate,
  formatLongDuration,
  formatSet,
  formatTime,
  toDisplayWeight,
  workoutDurationS,
  workoutVolumeKg,
} from "@/lib/format";

export default function WorkoutDetailPage({ params }: PageProps<"/history/[id]">) {
  return (
    <Suspense fallback={<PageHeader title="Workout" back={{ href: "/history", label: "History" }} />}>
      {params.then(({ id }) => (
        <Detail id={id} />
      ))}
    </Suspense>
  );
}

async function Detail({ id }: { id: string }) {
  const [profile, w, exercises, tz] = await Promise.all([getCurrentUser(), getWorkout(id), getExerciseMap(), getTimeZone()]);
  if (!w) notFound();
  const unit = profile.unit;
  const sets = w.exercises.flatMap((e) => e.sets).filter((s) => s.completed && s.type !== "warmup").length;
  const volume = workoutVolumeKg(w, exercises);

  return (
    <>
      <PageHeader
        title={w.title}
        subtitle={`${formatDate(w.startedAt, tz, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${formatTime(w.startedAt, tz)}`}
        back={{ href: "/history", label: "History" }}
      />
      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatTile label="Duration" value={formatLongDuration(workoutDurationS(w))} />
        <StatTile label="Volume" value={volume ? formatCompact(toDisplayWeight(volume, unit)) : "–"} unit={volume ? unit : undefined} />
        <StatTile label="Sets" value={String(sets)} />
      </div>

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

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
