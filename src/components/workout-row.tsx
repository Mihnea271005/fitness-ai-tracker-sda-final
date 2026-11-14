import { ListRow } from "./ui/primitives";
import { exerciseMap } from "@/lib/mock-data";
import { formatCompact, formatDate, formatLongDuration, workoutDurationS, workoutVolumeKg } from "@/lib/format";
import type { Workout } from "@/lib/types";

export function WorkoutRow({ workout }: { workout: Workout }) {
  const volume = workoutVolumeKg(workout, exerciseMap);
  const names = workout.exercises.map((e) => exerciseMap.get(e.exerciseId)?.name).filter(Boolean);
  return (
    <ListRow
      href={`/history/${workout.id}`}
      title={
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{workout.title}</span>
          <span className="text-subhead font-normal text-label-2">{formatDate(workout.startedAt)}</span>
        </span>
      }
      subtitle={
        <>
          {formatLongDuration(workoutDurationS(workout))}
          {volume > 0 && ` · ${formatCompact(volume)} kg`} · {names.join(", ")}
        </>
      }
    />
  );
}
