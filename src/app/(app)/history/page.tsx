import { PageHeader } from "@/components/ui/interactive";
import { ListSection } from "@/components/ui/primitives";
import { WorkoutRow } from "@/components/workout-row";
import { workouts } from "@/lib/mock-data";
import { formatMonth } from "@/lib/format";
import type { Workout } from "@/lib/types";

export const metadata = { title: "History" };

export default function HistoryPage() {
  const byMonth = new Map<string, Workout[]>();
  for (const w of workouts) {
    const k = formatMonth(w.startedAt);
    byMonth.set(k, [...(byMonth.get(k) ?? []), w]);
  }

  return (
    <>
      <PageHeader title="History" subtitle={`${workouts.length} workouts`} />
      {[...byMonth.entries()].map(([month, list]) => (
        <ListSection key={month} header={month}>
          {list.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </ListSection>
      ))}
    </>
  );
}
