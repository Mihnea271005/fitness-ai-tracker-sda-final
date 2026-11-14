import { Suspense } from "react";
import { PageHeader } from "@/components/ui/interactive";
import { WorkoutLogger } from "@/components/workout/workout-logger";
import { AiWorkoutCard } from "@/components/ai-workout-card";
import { getCoach } from "@/lib/ai-server";
import { getRoutines } from "@/lib/data";

export const metadata = { title: "Workout" };

export default function WorkoutPage() {
  return (
    <Suspense fallback={<PageHeader title="Workout" />}>
      <Logger />
    </Suspense>
  );
}

async function Logger() {
  const [{ profile, exercises, workouts, coach, settings, plan, today }, routines] = await Promise.all([getCoach(), getRoutines()]);
  const aiCard =
    plan && profile.onboarded ? (
      <AiWorkoutCard
        plan={plan}
        unit={profile.unit}
        heading={today.mode === "weekly" ? (today.status === "due" ? "Today's plan" : "Next in your plan") : "Suggested next"}
        showWeekLink={today.mode === "weekly"}
      />
    ) : null;
  // Recent sessions are enough for "previous" values and suggestions.
  return <WorkoutLogger exercises={exercises} history={workouts.slice(0, 200)} routines={routines} unit={profile.unit} coach={{ profile: coach, settings }} aiCard={aiCard} />;
}
