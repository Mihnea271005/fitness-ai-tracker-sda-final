"use client";

import { ChartTable, LineChart, type Point } from "./charts";
import { formatDuration } from "@/lib/format";
import type { ExerciseKind } from "@/lib/types";

const META: Record<ExerciseKind, { title: string; valueLabel: string; format: (v: number) => string; invert?: boolean }> = {
  strength: { title: "Estimated one-rep max", valueLabel: "Est. 1RM", format: (v) => `${Math.round(v)} kg` },
  bodyweight: { title: "Most reps in a set", valueLabel: "Reps", format: (v) => `${Math.round(v)}` },
  timed: { title: "Longest hold", valueLabel: "Hold", format: (v) => formatDuration(v) },
  cardio: { title: "Pace (lower is faster)", valueLabel: "Pace /km", format: (v) => formatDuration(v), invert: true },
};

export function ExerciseChart({ kind, points }: { kind: ExerciseKind; points: Point[] }) {
  const m = META[kind];
  return (
    <section className="mb-8 rounded-[var(--radius-card)] bg-surface p-4">
      <h2 className="text-headline font-semibold">{m.title}</h2>
      <p className="mb-3 text-footnote text-label-2">Last {points.length} sessions</p>
      <LineChart points={points} format={m.format} invert={m.invert} ariaLabel={`${m.title} over the last ${points.length} sessions. Use arrow keys to read values.`} />
      <ChartTable points={points} format={m.format} valueLabel={m.valueLabel} />
    </section>
  );
}
