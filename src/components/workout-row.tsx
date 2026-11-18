import { ListRow } from "./ui/primitives";
import { formatCompact, formatDate, formatLongDuration, toDisplayWeight, workoutDurationS, workoutVolumeKg } from "@/lib/format";
import type { Exercise, Unit, Workout } from "@/lib/types";

export function WorkoutRow({ workout, exercises, tz, unit }: { workout: Workout; exercises: Map<string, Exercise>; tz: string; unit: Unit }) {
  const volume = workoutVolumeKg(workout, exercises);
  const names = workout.exercises.map((e) => exercises.get(e.exerciseId)?.name).filter(Boolean);
  return (
    <ListRow
      href={`/history/${workout.id}`}
      title={
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{workout.title}</span>
          <span className="shrink-0 text-subhead font-normal text-label-2">{formatDate(workout.startedAt, tz)}</span>
        </span>
      }
      subtitle={
        <>
          {formatLongDuration(workoutDurationS(workout))}
          {volume > 0 && ` · ${formatCompact(toDisplayWeight(volume, unit))} ${unit}`} · {names.join(", ")}
        </>
      }
    />
  );
}
