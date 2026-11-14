import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Scale, Trophy } from "lucide-react";
import { PageHeader } from "@/components/ui/interactive";
import { ListRow, ListSection, StatTile } from "@/components/ui/primitives";
import { ExerciseIcon } from "@/components/exercise-icon";
import { VolumeChart } from "@/components/volume-chart";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getMeasurements, getTimeZone, getWorkouts } from "@/lib/data";
import { formatCompact, formatDate, formatDay, formatSet, formatWeight, toDisplayWeight } from "@/lib/format";
import { personalRecords, weekStreak, weeklySummaries } from "@/lib/stats";

export const metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <Suspense fallback={<PageHeader title="Progress" subtitle="Last 12 weeks" />}>
      <Progress />
    </Suspense>
  );
}

async function Progress() {
  const [profile, workouts, exercises, measurements, tz] = await Promise.all([getCurrentUser(), getWorkouts(), getExerciseMap(), getMeasurements(), getTimeZone()]);
  const unit = profile.unit;
  const weeks = weeklySummaries(workouts, exercises, new Date(), tz, 12);
  const total = weeks.reduce((a, w) => a + w.workouts, 0);
  const volume = weeks.reduce((a, w) => a + w.volumeKg, 0);
  const prs = personalRecords(workouts, exercises);
  const latestWeight = measurements.find((m) => m.weightKg !== undefined);

  return (
    <>
      <PageHeader title="Progress" subtitle="Last 12 weeks" />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatTile label="Workouts" value={String(total)} />
        <StatTile label="Volume" value={formatCompact(toDisplayWeight(volume, unit))} unit={unit} />
        <StatTile label="Streak" value={String(weekStreak(weeks))} unit="wk" />
      </div>

      <Link href="/body" className="mb-6 flex min-h-11 items-center gap-3 rounded-[var(--radius-cell)] bg-surface p-4 transition-colors hover:bg-fill-3">
        <span className="inline-flex size-9 items-center justify-center rounded-[9px] bg-teal text-white">
          <Scale className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-headline font-semibold">Body</span>
          <span className="block text-subhead text-label-2">
            {latestWeight ? `${formatWeight(latestWeight.weightKg!, unit)} on ${formatDay(latestWeight.measuredOn)}` : "Log your body weight and measurements"}
          </span>
        </span>
        <ChevronRight className="size-4 text-label-3" strokeWidth={2.5} aria-hidden />
      </Link>

      {total > 0 && (
        <VolumeChart
          unit={unit}
          points={weeks.map((w) => ({ label: formatDay(w.weekStart), value: Math.round(toDisplayWeight(w.volumeKg, unit)) }))}
        />
      )}

      <ListSection header="Personal records" footer={prs.length ? "Your best set for each exercise. Tap one to see its full history." : undefined}>
        {prs.map((pr) => (
          <ListRow
            key={pr.exercise.id}
            href={`/exercises/${pr.exercise.id}`}
            leading={<ExerciseIcon kind={pr.exercise.kind} />}
            title={pr.exercise.name}
            subtitle={`${pr.label} · ${formatDate(pr.date, tz, { day: "numeric", month: "short", year: "numeric" })}`}
            trailing={
              <span className="inline-flex items-center gap-1.5 font-rounded font-semibold text-label">
                <Trophy className="size-4 text-yellow" aria-hidden />
                {formatSet(pr.set, pr.exercise.kind, unit)}
              </span>
            }
          />
        ))}
        {!prs.length && <li className="py-6 pr-4 text-center text-subhead text-label-2">Your records appear here after your first workout.</li>}
      </ListSection>
    </>
  );
}
