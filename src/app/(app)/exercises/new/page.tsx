import { ExerciseForm } from "@/components/exercise-form";
import { PageHeader } from "@/components/ui/interactive";
import { createExercise } from "../actions";

export const metadata = { title: "New exercise" };

export default function NewExercisePage() {
  return (
    <>
      <PageHeader title="New exercise" back={{ href: "/exercises", label: "Exercises" }} />
      <div className="max-w-xl">
        <ExerciseForm action={createExercise} />
      </div>
    </>
  );
}
