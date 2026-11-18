"use client";

// Single-series charts. Specs follow the dataviz rules: 2px line, ≥8px end marker with a
// 2px surface ring, 10% area wash, bars ≤24px with 4px rounded data-end and square
// baseline, hairline recessive grid, crosshair/per-bar tooltips, keyboard access and a
// table view. A single series needs no legend — the card title names it.

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export interface Point {
  label: string; // x label (date)
  value: number;
}

const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

function Tooltip({ x, y, width, title, value }: { x: number; y: number; width: number; title: string; value: string }) {
  const w = 132;
  const left = Math.min(Math.max(x - w / 2, 0), width - w);
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-xl bg-elevated px-3 py-2 shadow-[0_4px_16px_rgb(0_0_0/0.16)] ring-1 ring-separator"
      style={{ left, top: Math.max(y - 64, 0), width: w }}
    >
      <div className="font-rounded text-headline font-semibold tabular">{value}</div>
      <div className="text-caption1 text-label-2">{title}</div>
    </div>
  );
}

export function LineChart({
  points,
  format,
  height = 220,
  invert = false,
  ariaLabel,
}: {
  points: Point[];
  format: (v: number) => string;
  height?: number;
  /** lower is better (e.g. pace) — flips the y axis so "up" still means "better" */
  invert?: boolean;
  ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => {
    const t = (v - yMin) / (yMax - yMin || 1);
    return PAD.top + (invert ? t : 1 - t) * innerH;
  };

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const baseY = PAD.top + innerH; // wash always sits under the line
  const area = `${line}L${x(points.length - 1).toFixed(1)},${baseY}L${x(0).toFixed(1)},${baseY}Z`;
  const last = points.length - 1;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px) / rect.width) * (points.length - 1));
    setActive(Math.min(Math.max(i, 0), last));
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") setActive((a) => Math.min((a ?? -1) + 1, last));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max((a ?? last + 1) - 1, 0));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  const xLabelIdx = points.length > 2 ? [0, Math.floor(last / 2), last] : points.map((_, i) => i);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          className="overflow-visible rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-label-2 text-caption2 tabular">
                {format(t)}
              </text>
            </g>
          ))}
          {xLabelIdx.map((i) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} className="fill-label-2 text-caption2">
              {points[i].label}
            </text>
          ))}
          <path d={area} fill="var(--accent)" opacity={0.1} />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--label-3)" strokeWidth={1} />
          )}
          {/* end marker: r=4 (8px) + 2px surface ring */}
          <circle cx={x(active ?? last)} cy={y(points[active ?? last].value)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          {active === null && (
            <text x={x(last)} y={y(points[last].value) - 12} textAnchor="end" className="fill-label text-caption1 font-semibold tabular">
              {format(points[last].value)}
            </text>
          )}
          <rect
            x={PAD.left}
            y={0}
            width={innerW}
            height={height}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}
      {active !== null && width > 0 && (
        <Tooltip x={x(active)} y={y(points[active].value)} width={width} title={points[active].label} value={format(points[active].value)} />
      )}
    </div>
  );
}

export function BarChart({
  points,
  format,
  height = 200,
  ariaLabel,
}: {
  points: Point[];
  format: (v: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const ticks = niceTicks(0, Math.max(...points.map((p) => p.value), 1));
  const yMax = ticks[ticks.length - 1];
  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = height - PAD.top - PAD.bottom;
  const band = innerW / points.length;
  const barW = Math.min(24, band - 2); // ≤24px, at least the 2px surface gap between bars
  const y = (v: number) => PAD.top + (1 - v / yMax) * innerH;
  const base = PAD.top + innerH;

  function barPath(i: number, v: number) {
    const x0 = PAD.left + i * band + (band - barW) / 2;
    const top = y(v);
    const h = base - top;
    if (h <= 0) return "";
    const r = Math.min(4, h, barW / 2);
    return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + barW - r}Q${x0 + barW},${top} ${x0 + barW},${top + r}V${base}Z`;
  }

  function onKey(e: KeyboardEvent) {
    const last = points.length - 1;
    if (e.key === "ArrowRight") setActive((a) => Math.min((a ?? -1) + 1, last));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max((a ?? last + 1) - 1, 0));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  const labelEvery = Math.ceil(points.length / Math.max(Math.floor(innerW / 56), 1));

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          className="overflow-visible rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-label-2 text-caption2 tabular">
                {format(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => (
            <g key={i}>
              <path d={barPath(i, p.value)} fill="var(--accent)" opacity={active === null || active === i ? 1 : 0.55} />
              {(i % labelEvery === 0 || i === points.length - 1) && (
                <text x={PAD.left + i * band + band / 2} y={height - 8} textAnchor="middle" className="fill-label-2 text-caption2">
                  {p.label}
                </text>
              )}
              {/* hit target: the full band, taller than the bar */}
              <rect
                x={PAD.left + i * band}
                y={PAD.top}
                width={band}
                height={innerH}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
              />
            </g>
          ))}
        </svg>
      )}
      {active !== null && width > 0 && (
        <Tooltip
          x={PAD.left + active * band + band / 2}
          y={y(points[active].value)}
          width={width}
          title={points[active].label}
          value={format(points[active].value)}
        />
      )}
    </div>
  );
}

/** Accessible table view of a chart's data (tooltips enhance, never gate). */
export function ChartTable({ points, format, valueLabel }: { points: Point[]; format: (v: number) => string; valueLabel: string }) {
  return (
    <details className="mt-3 text-subhead">
      <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full text-accent">Show as table</summary>
      <table className="mt-1 w-full text-left">
        <thead className="text-footnote text-label-2">
          <tr>
            <th className="py-1 font-medium">Date</th>
            <th className="py-1 text-right font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {points.map((p, i) => (
            <tr key={i} className="border-t border-separator">
              <td className="py-1.5">{p.label}</td>
              <td className="py-1.5 text-right">{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
