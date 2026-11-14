"use client";

import { BarChart, ChartTable, type Point } from "./charts";
import { formatCompact, formatNumber } from "@/lib/format";

export function VolumeChart({ points }: { points: Point[] }) {
  return (
    <section className="mb-8 rounded-[var(--radius-card)] bg-surface p-4">
      <h2 className="text-headline font-semibold">Weekly strength volume</h2>
      <p className="mb-3 text-footnote text-label-2">Weight × reps on working sets, last {points.length} weeks (kg)</p>
      <BarChart points={points} format={(v) => formatCompact(v)} ariaLabel={`Weekly strength volume for the last ${points.length} weeks. Use arrow keys to read values.`} />
      <ChartTable points={points} format={(v) => `${formatNumber(v)} kg`} valueLabel="Volume" />
    </section>
  );
}
