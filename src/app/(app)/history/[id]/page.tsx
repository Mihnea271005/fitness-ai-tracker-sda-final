import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/interactive";
import { Badge, StatTile } from "@/components/ui/primitives";
import { ExerciseIcon } from "@/components/exercise-icon";
import { exerciseMap, getWorkout } from "@/lib/mock-data";
import { KIND_LABEL, formatCompact, formatDate, formatLongDuration, formatSet, formatTime, workoutDurationS, workoutVolumeKg } from "@/lib/format";

export default function WorkoutDetailPage({ params }: PageProps<"/history/[id]">) {
  return (
    <Suspense fallback={<PageHeader title="Workout" back={{ href: "/history", label: "History" }} />}>
      {params.then(({ id }) => (
        <Detail id={id} />
      ))}
    </Suspense>
  );
}

function Detail({ id }: { id: string }) {
  const w = getWorkout(id);
  if (!w) notFound();
  const sets = w.exercises.flatMap((e) => e.sets).filter((s) => s.completed && s.type !== "warmup").length;

  return (
    <>
      <PageHeader
        title={w.title}
        subtitle={`${formatDate(w.startedAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${formatTime(w.startedAt)}`}
        back={{ href: "/history", label: "History" }}
      />
      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatTile label="Duration" value={formatLongDuration(workoutDurationS(w))} />
        <StatTile label="Volume" value={formatCompact(workoutVolumeKg(w, exerciseMap))} unit="kg" />
        <StatTile label="Sets" value={String(sets)} />
      </div>

      {w.exercises.map((we) => {
        const ex = exerciseMap.get(we.exerciseId);
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
                  <span className="flex-1 font-rounded text-body font-semibold">{formatSet(s, ex.kind)}</span>
                  {s.type === "warmup" && <Badge>Warm-up</Badge>}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}
