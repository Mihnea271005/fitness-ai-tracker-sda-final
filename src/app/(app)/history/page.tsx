import { Suspense } from "react";
import { History } from "lucide-react";
import { PageHeader } from "@/components/ui/interactive";
import { ButtonLink, Card, ListSection } from "@/components/ui/primitives";
import { WorkoutRow } from "@/components/workout-row";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getTimeZone, getWorkouts } from "@/lib/data";
import { formatMonth } from "@/lib/format";
import type { Workout } from "@/lib/types";

export const metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <Suspense fallback={<PageHeader title="History" />}>
      <HistoryList />
    </Suspense>
  );
}

async function HistoryList() {
  const [profile, workouts, exercises, tz] = await Promise.all([getCurrentUser(), getWorkouts(), getExerciseMap(), getTimeZone()]);
  const byMonth = new Map<string, Workout[]>();
  for (const w of workouts) {
    const k = formatMonth(w.startedAt, tz);
    byMonth.set(k, [...(byMonth.get(k) ?? []), w]);
  }

  return (
    <>
      <PageHeader title="History" subtitle={`${workouts.length} ${workouts.length === 1 ? "workout" : "workouts"}`} />
      {!workouts.length && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <History className="size-8 text-label-2" aria-hidden />
          <p className="text-body text-label-2">Finished workouts appear here.</p>
          <ButtonLink href="/workout">Start a workout</ButtonLink>
        </Card>
      )}
      {[...byMonth.entries()].map(([month, list]) => (
        <ListSection key={month} header={month}>
          {list.map((w) => (
            <WorkoutRow key={w.id} workout={w} exercises={exercises} tz={tz} unit={profile.unit} />
          ))}
        </ListSection>
      ))}
    </>
  );
}
