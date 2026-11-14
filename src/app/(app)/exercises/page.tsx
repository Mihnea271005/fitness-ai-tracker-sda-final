import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ExerciseLibrary } from "@/components/exercise-library";
import { IconButton, PageHeader } from "@/components/ui/interactive";
import { getExercises } from "@/lib/data";

export const metadata = { title: "Exercises" };

const NEW = (
  <IconButton href="/exercises/new" label="New custom exercise">
    <Plus className="size-6" strokeWidth={2.5} />
  </IconButton>
);

export default function ExercisesPage() {
  return (
    <Suspense fallback={<PageHeader title="Exercises" actions={NEW} />}>
      <Library />
    </Suspense>
  );
}

async function Library() {
  const exercises = await getExercises();
  const visible = exercises.filter((e) => !e.archived);
  return (
    <>
      <PageHeader title="Exercises" subtitle={`${visible.length} exercises`} actions={NEW} />
      <ExerciseLibrary exercises={visible} />
    </>
  );
}
