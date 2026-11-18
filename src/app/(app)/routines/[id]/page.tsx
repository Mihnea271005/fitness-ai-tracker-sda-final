import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/interactive";
import { RoutineEditor } from "@/components/routine-editor";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteRoutine } from "../actions";
import { getExercises, getRoutine } from "@/lib/data";

export const metadata = { title: "Edit routine" };

export default function EditRoutinePage({ params }: PageProps<"/routines/[id]">) {
  return (
    <Suspense fallback={<PageHeader title="Routine" back={{ href: "/workout", label: "Workout" }} />}>
      {params.then(({ id }) => (
        <Editor id={id} />
      ))}
    </Suspense>
  );
}

async function Editor({ id }: { id: string }) {
  const [routine, exercises] = await Promise.all([getRoutine(id), getExercises()]);
  if (!routine) notFound();
  return (
    <>
      <PageHeader title={routine.name} back={{ href: "/workout", label: "Workout" }} />
      <div className="flex max-w-2xl flex-col gap-6">
        <RoutineEditor routine={routine} exercises={exercises} />
        <ConfirmAction
          className="w-full"
          buttonVariant="plain"
          label={
            <span className="inline-flex items-center gap-2 text-red-text">
              <Trash2 className="size-5" aria-hidden /> Delete routine
            </span>
          }
          title={`Delete “${routine.name}”?`}
          body="The routine is removed. Workouts you already logged with it stay in your history."
          confirmLabel="Delete"
          action={deleteRoutine.bind(null, routine.id)}
        />
      </div>
    </>
  );
}
