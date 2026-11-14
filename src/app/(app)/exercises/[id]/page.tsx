import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/interactive";
import { Badge, ButtonLink, ListRow, ListSection, StatTile } from "@/components/ui/primitives";
import { ExerciseIcon } from "@/components/exercise-icon";
import { ExerciseChart } from "@/components/exercise-chart";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteExercise } from "../actions";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getTimeZone, getWorkouts } from "@/lib/data";
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

async function Detail({ id }: { id: string }) {
  const [profile, exercises, workouts, tz] = await Promise.all([getCurrentUser(), getExerciseMap(), getWorkouts(), getTimeZone()]);
  const ex = exercises.get(id);
  if (!ex) notFound();
  const unit = profile.unit;
  const own = ex.ownerId === profile.id;

  const history = exerciseHistory(workouts, ex);
  const best = history.length ? history.reduce((a, b) => ((ex.kind === "cardio" ? b.value < a.value && b.value > 0 : b.value > a.value) ? b : a)) : null;
  const suggestion = suggestFirstSet(ex, lastSessionSets(workouts, ex.id), unit);
  const bestLabel = ex.kind === "strength" ? "Best est. 1RM" : ex.kind === "bodyweight" ? "Most reps" : ex.kind === "timed" ? "Longest hold" : "Fastest pace";
  const bestValue = !best
    ? "–"
    : ex.kind === "strength"
      ? formatWeight(best.value, unit)
      : ex.kind === "bodyweight"
        ? String(best.value)
        : ex.kind === "timed"
          ? formatDuration(best.value)
          : best.value
            ? `${formatDuration(best.value)}/km`
            : "–";

  return (
    <>
      <PageHeader
        title={ex.name}
        back={{ href: "/exercises", label: "Exercises" }}
        actions={
          own && !ex.archived ? (
            <ButtonLink href={`/exercises/${ex.id}/edit`} variant="plain" size="small">
              <Pencil className="size-4" aria-hidden /> Edit
            </ButtonLink>
          ) : undefined
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <ExerciseIcon kind={ex.kind} size="sm" />
        <span className="text-subhead text-label-2">{exerciseMeta(ex)}</span>
        {own && <Badge>Custom</Badge>}
        {ex.archived && <Badge>Removed</Badge>}
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
        <ExerciseChart
          kind={ex.kind}
          unit={unit}
          points={history.filter((p) => p.value > 0).map((p) => ({ label: formatDate(p.date, tz, { day: "numeric", month: "short" }), value: p.value }))}
        />
      )}

      <ListSection header="History">
        {[...history].reverse().map((p) => (
          <ListRow
            key={p.workoutId}
            href={`/history/${p.workoutId}`}
            title={formatDate(p.date, tz)}
            subtitle={p.sets
              .filter((s) => s.type !== "warmup")
              .map((s) => formatSet(s, ex.kind, unit))
              .join("  ·  ")}
          />
        ))}
        {!history.length && <li className="py-6 pr-4 text-center text-subhead text-label-2">You haven&apos;t logged this exercise yet.</li>}
      </ListSection>

      {own && !ex.archived && (
        <ConfirmAction
          className="w-full"
          label={
            <>
              <Trash2 className="size-5" aria-hidden /> Remove exercise
            </>
          }
          title={`Remove ${ex.name}?`}
          body={
            history.length
              ? "It disappears from your exercise list. Workouts you already logged keep it in their history."
              : "This permanently deletes the exercise."
          }
          confirmLabel="Remove"
          action={deleteExercise.bind(null, ex.id)}
        />
      )}
    </>
  );
}
