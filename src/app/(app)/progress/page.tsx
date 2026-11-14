import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/ui/interactive";
import { ListRow, ListSection, StatTile } from "@/components/ui/primitives";
import { ExerciseIcon } from "@/components/exercise-icon";
import { VolumeChart } from "@/components/volume-chart";
import { MOCK_TODAY, exerciseMap, workouts } from "@/lib/mock-data";
import { formatCompact, formatDate, formatSet } from "@/lib/format";
import { personalRecords, weekStreak, weeklySummaries } from "@/lib/stats";

export const metadata = { title: "Progress" };

export default function ProgressPage() {
  const weeks = weeklySummaries(workouts, exerciseMap, MOCK_TODAY, 12);
  const total = weeks.reduce((a, w) => a + w.workouts, 0);
  const volume = weeks.reduce((a, w) => a + w.volumeKg, 0);
  const prs = personalRecords(workouts, exerciseMap);

  return (
    <>
      <PageHeader title="Progress" subtitle="Last 12 weeks" />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatTile label="Workouts" value={String(total)} />
        <StatTile label="Volume" value={formatCompact(volume)} unit="kg" />
        <StatTile label="Streak" value={String(weekStreak(weeks))} unit="wk" />
      </div>

      <VolumeChart points={weeks.map((w) => ({ label: formatDate(w.weekStart, { day: "numeric", month: "short" }), value: Math.round(w.volumeKg) }))} />

      <ListSection header="Personal records" footer="Your best set for each exercise. Tap one to see its full history.">
        {prs.map((pr) => (
          <ListRow
            key={pr.exercise.id}
            href={`/exercises/${pr.exercise.id}`}
            leading={<ExerciseIcon kind={pr.exercise.kind} />}
            title={pr.exercise.name}
            subtitle={`${pr.label} · ${formatDate(pr.date, { day: "numeric", month: "short", year: "numeric" })}`}
            trailing={
              <span className="inline-flex items-center gap-1.5 font-rounded font-semibold text-label">
                <Trophy className="size-4 text-yellow" aria-hidden />
                {formatSet(pr.set, pr.exercise.kind)}
              </span>
            }
          />
        ))}
      </ListSection>
    </>
  );
}
