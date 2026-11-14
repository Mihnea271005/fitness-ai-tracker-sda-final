"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Play, Sparkles } from "lucide-react";
import { ExerciseIcon } from "./exercise-icon";
import { Button, ButtonLink } from "./ui/primitives";
import { useActiveWorkout } from "./workout/workout-context";
import { formatDuration, formatSet } from "@/lib/format";
import type { GeneratedWorkout } from "@/lib/ai/generator";
import type { Unit } from "@/lib/types";

function targetText(p: GeneratedWorkout["exercises"][number], unit: Unit) {
  const t = p.target;
  const v = p.suggestion?.values;
  if (p.exercise.kind === "cardio") return `${t.minutes ?? 20} min`;
  if (p.exercise.kind === "timed") return `${t.sets} × ${v?.durationS ? formatDuration(v.durationS) : "hold"}`;
  if (p.exercise.kind === "bodyweight") return `${t.sets} × ${v?.reps ?? t.reps ?? "–"} reps`;
  return v?.weightKg ? `${t.sets} × ${formatSet(v, "strength", unit)}` : `${t.sets} × ${t.reps}`;
}

/** Today's AI-built workout, with a one-tap start. */
export function AiWorkoutCard({ plan, unit, heading, note, showWeekLink }: { plan: GeneratedWorkout; unit: Unit; heading: string; note?: string; showWeekLink?: boolean }) {
  const { workout, start } = useActiveWorkout();
  const router = useRouter();

  function begin() {
    start(
      plan.title,
      plan.exercises.map((p) => ({
        exerciseId: p.exercise.id,
        sets: p.target.sets,
        restSeconds: p.target.restSeconds || undefined,
        targetReps: p.target.reps ?? p.suggestion?.values.reps,
        targetSeconds: p.suggestion?.values.durationS,
        targetMinutes: p.target.minutes,
        why: p.why,
      })),
      plan.planDay,
    );
    router.push("/workout");
  }

  return (
    <section aria-labelledby="ai-workout" className="mb-6 overflow-hidden rounded-[var(--radius-card)] bg-surface">
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo to-accent text-white">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-footnote font-semibold tracking-wide text-accent uppercase">{heading}</p>
          <h2 id="ai-workout" className="text-title3 font-bold">
            {plan.title}
          </h2>
          <p className="flex flex-wrap items-center gap-x-3 text-subhead text-label-2">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4" aria-hidden /> about {plan.estimatedMinutes} min
            </span>
            <span>{plan.exercises.length} exercises</span>
          </p>
          {note && <p className="mt-1 text-footnote text-label-2">{note}</p>}
        </div>
      </div>
      <ul className="divide-y divide-separator border-t border-separator">
        {plan.exercises.map((p) => (
          <li key={p.exercise.id} className="flex items-center gap-3 px-4 py-2.5">
            <ExerciseIcon kind={p.exercise.kind} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-body">{p.exercise.name}</div>
              <div className="truncate text-footnote text-label-2">{p.why}</div>
            </div>
            <div className="shrink-0 text-right font-rounded text-subhead font-semibold tabular">{targetText(p, unit)}</div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 p-4 pt-3 sm:flex-row">
        {workout ? (
          <ButtonLink href="/workout" variant="tinted" className="flex-1">
            Resume {workout.title}
          </ButtonLink>
        ) : (
          <Button className="flex-1" onClick={begin}>
            <Play className="size-4 fill-current" aria-hidden /> Start this workout
          </Button>
        )}
        {showWeekLink && (
          <Link href="/plan" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-body font-semibold text-accent hover:bg-fill-3">
            <CalendarDays className="size-4" aria-hidden /> This week
          </Link>
        )}
      </div>
    </section>
  );
}
