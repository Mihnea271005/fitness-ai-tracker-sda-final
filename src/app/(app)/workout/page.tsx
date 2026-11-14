import { Suspense } from "react";
import { PageHeader } from "@/components/ui/interactive";
import { WorkoutLogger } from "@/components/workout/workout-logger";
import { getCurrentUser } from "@/lib/auth";
import { getExercises, getRoutines, getWorkouts } from "@/lib/data";

export const metadata = { title: "Workout" };

export default function WorkoutPage() {
  return (
    <Suspense fallback={<PageHeader title="Workout" />}>
      <Logger />
    </Suspense>
  );
}

async function Logger() {
  const [profile, exercises, workouts, routines] = await Promise.all([getCurrentUser(), getExercises(), getWorkouts(), getRoutines()]);
  // Recent sessions are enough for "previous" values and suggestions.
  return <WorkoutLogger exercises={exercises} history={workouts.slice(0, 200)} routines={routines} unit={profile.unit} />;
}
