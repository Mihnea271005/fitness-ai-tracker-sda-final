import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExerciseForm } from "@/components/exercise-form";
import { PageHeader } from "@/components/ui/interactive";
import { updateExercise } from "../../actions";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap } from "@/lib/data";

export const metadata = { title: "Edit exercise" };

export default function EditExercisePage({ params }: PageProps<"/exercises/[id]/edit">) {
  return (
    <Suspense fallback={<PageHeader title="Edit exercise" />}>
      {params.then(({ id }) => (
        <Edit id={id} />
      ))}
    </Suspense>
  );
}

async function Edit({ id }: { id: string }) {
  const [profile, exercises] = await Promise.all([getCurrentUser(), getExerciseMap()]);
  const ex = exercises.get(id);
  if (!ex || ex.ownerId !== profile.id || ex.archived) notFound();
  return (
    <>
      <PageHeader title="Edit exercise" back={{ href: `/exercises/${ex.id}`, label: ex.name }} />
      <div className="max-w-xl">
        <ExerciseForm action={updateExercise.bind(null, ex.id)} exercise={ex} />
      </div>
    </>
  );
}
