import { Suspense } from "react";
import { PageHeader } from "@/components/ui/interactive";
import { RoutineEditor } from "@/components/routine-editor";
import { getExercises } from "@/lib/data";

export const metadata = { title: "New routine" };

export default function NewRoutinePage() {
  return (
    <>
      <PageHeader title="New routine" back={{ href: "/workout", label: "Workout" }} />
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </>
  );
}

async function Editor() {
  const exercises = await getExercises();
  return (
    <div className="max-w-2xl">
      <RoutineEditor exercises={exercises} />
    </div>
  );
}
