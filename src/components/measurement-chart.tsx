"use client";

import { ChartTable, LineChart, type Point } from "./charts";

export function MeasurementChart({ points, unit }: { points: Point[]; unit: string }) {
  const format = (v: number) => `${Math.round(v * 10) / 10} ${unit}`;
  return (
    <section className="mb-8 rounded-[var(--radius-card)] bg-surface p-4">
      <h2 className="text-headline font-semibold">Body weight</h2>
      <p className="mb-3 text-footnote text-label-2">Last {points.length} entries</p>
      <LineChart points={points} format={format} ariaLabel={`Body weight over the last ${points.length} entries. Use arrow keys to read values.`} />
      <ChartTable points={points} format={format} valueLabel="Weight" />
    </section>
  );
}
