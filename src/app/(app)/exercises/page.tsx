import { Plus } from "lucide-react";
import { ExerciseLibrary } from "@/components/exercise-library";
import { IconButton, PageHeader } from "@/components/ui/interactive";
import { exercises } from "@/lib/mock-data";

export const metadata = { title: "Exercises" };

export default function ExercisesPage() {
  return (
    <>
      <PageHeader
        title="Exercises"
        subtitle={`${exercises.length} exercises`}
        actions={
          <IconButton href="/exercises/new" label="New custom exercise">
            <Plus className="size-6" strokeWidth={2.5} />
          </IconButton>
        }
      />
      <ExerciseLibrary />
    </>
  );
}
