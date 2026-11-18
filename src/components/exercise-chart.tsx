"use client";

import { ChartTable, LineChart, type Point } from "./charts";
import { formatDuration, toDisplayWeight } from "@/lib/format";
import type { ExerciseKind, Unit } from "@/lib/types";

function meta(kind: ExerciseKind, unit: Unit): { title: string; valueLabel: string; format: (v: number) => string; invert?: boolean } {
  switch (kind) {
    case "strength":
      return { title: "Estimated one-rep max", valueLabel: "Est. 1RM", format: (v) => `${Math.round(v)} ${unit}` };
    case "bodyweight":
      return { title: "Most reps in a set", valueLabel: "Reps", format: (v) => `${Math.round(v)}` };
    case "timed":
      return { title: "Longest hold", valueLabel: "Hold", format: (v) => formatDuration(v) };
    case "cardio":
      return { title: "Pace (lower is faster)", valueLabel: "Pace /km", format: (v) => formatDuration(v), invert: true };
  }
}

export function ExerciseChart({ kind, unit, points }: { kind: ExerciseKind; unit: Unit; points: Point[] }) {
  const m = meta(kind, unit);
  // Strength values arrive in kg; chart them in the user's unit.
  const shown = kind === "strength" ? points.map((p) => ({ ...p, value: toDisplayWeight(p.value, unit) })) : points;
  if (shown.length < 2) return null;
  return (
    <section className="mb-8 rounded-[var(--radius-card)] bg-surface p-4">
      <h2 className="text-headline font-semibold">{m.title}</h2>
      <p className="mb-3 text-footnote text-label-2">Last {shown.length} sessions</p>
      <LineChart points={shown} format={m.format} invert={m.invert} ariaLabel={`${m.title} over the last ${shown.length} sessions. Use arrow keys to read values.`} />
      <ChartTable points={shown} format={m.format} valueLabel={m.valueLabel} />
    </section>
  );
}
