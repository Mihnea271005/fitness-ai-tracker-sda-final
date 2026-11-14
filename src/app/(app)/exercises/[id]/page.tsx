import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/interactive";
import { Badge, ListRow, ListSection, StatTile } from "@/components/ui/primitives";
import { ExerciseIcon } from "@/components/exercise-icon";
import { ExerciseChart } from "@/components/exercise-chart";
import { getExercise, workouts } from "@/lib/mock-data";
import { exerciseMeta, formatDate, formatDuration, formatSet, formatWeight } from "@/lib/format";
import { exerciseHistory } from "@/lib/stats";
import { lastSessionSets, suggestFirstSet } from "@/lib/suggest";

export default function ExerciseDetailPage({ params }: PageProps<"/exercises/[id]">) {
  return (
    <Suspense fallback={<PageHeader title="Exercise" back={{ href: "/exercises", label: "Exercises" }} />}>
      {params.then(({ id }) => (
        <Detail id={id} />
      ))}
    </Suspense>
  );
}

function Detail({ id }: { id: string }) {
  const ex = getExercise(id);
  if (!ex) notFound();

  const history = exerciseHistory(workouts, ex);
  const best = history.length ? history.reduce((a, b) => ((ex.kind === "cardio" ? b.value < a.value : b.value > a.value) ? b : a)) : null;
  const suggestion = suggestFirstSet(ex, lastSessionSets(workouts, ex.id));
  const bestLabel =
    ex.kind === "strength" ? "Best est. 1RM" : ex.kind === "bodyweight" ? "Most reps" : ex.kind === "timed" ? "Longest hold" : "Fastest pace";
  const bestValue = !best
    ? "–"
    : ex.kind === "strength"
      ? formatWeight(best.value)
      : ex.kind === "bodyweight"
        ? String(best.value)
        : ex.kind === "timed"
          ? formatDuration(best.value)
          : `${formatDuration(best.value)}/km`;

  return (
    <>
      <PageHeader title={ex.name} back={{ href: "/exercises", label: "Exercises" }} />
      <div className="mb-6 -mt-3 flex flex-wrap items-center gap-2">
        <ExerciseIcon kind={ex.kind} size="sm" />
        <span className="text-subhead text-label-2">
          {exerciseMeta(ex)}
        </span>
        {ex.ownerId && <Badge>Custom</Badge>}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatTile label={bestLabel} value={bestValue} />
        <StatTile label="Sessions" value={String(history.length)} />
      </div>

      {suggestion && (
        <div className="mb-6 rounded-[var(--radius-cell)] bg-accent/10 p-4">
          <div className="text-subhead font-semibold text-accent">Next time</div>
          <p className="text-body">{suggestion.reason}</p>
        </div>
      )}

      {history.length > 1 && (
        <ExerciseChart kind={ex.kind} points={history.map((p) => ({ label: formatDate(p.date, { day: "numeric", month: "short" }), value: p.value }))} />
      )}

      <ListSection header="History">
        {[...history].reverse().map((p) => (
          <ListRow
            key={p.workoutId}
            href={`/history/${p.workoutId}`}
            title={formatDate(p.date)}
            subtitle={p.sets
              .filter((s) => s.type !== "warmup")
              .map((s) => formatSet(s, ex.kind))
              .join("  ·  ")}
          />
        ))}
        {!history.length && <li className="py-6 pr-4 text-center text-subhead text-label-2">You haven&apos;t logged this exercise yet.</li>}
      </ListSection>
    </>
  );
}
