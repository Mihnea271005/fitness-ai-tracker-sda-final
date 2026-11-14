import { NewExerciseForm } from "@/components/new-exercise-form";
import { PageHeader } from "@/components/ui/interactive";

export const metadata = { title: "New exercise" };

export default function NewExercisePage() {
  return (
    <>
      <PageHeader title="New exercise" back={{ href: "/exercises", label: "Exercises" }} />
      <div className="max-w-xl">
        <NewExerciseForm />
      </div>
    </>
  );
}
