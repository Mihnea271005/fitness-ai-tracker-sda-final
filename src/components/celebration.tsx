"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Flame, Medal, Trophy, Weight } from "lucide-react";
import { Button } from "./ui/primitives";
import { Sheet } from "./ui/interactive";
import type { AchievementKind } from "@/lib/achievements";

export interface CelebrationItem {
  key: string;
  kind: AchievementKind | "pr";
  title: string;
  detail: string;
}

const ICON = { pr: Trophy, count: Medal, streak: Flame, volume: Weight, plates: Award } as const;
const COLORS = ["var(--accent)", "var(--green)", "var(--orange)", "var(--yellow)", "var(--red)", "var(--teal)"];

/** A one-off confetti burst. Hidden entirely with reduced motion (see globals.css). */
function Confetti() {
  // Deterministic per mount: no Math.random during render (keeps React's purity rules happy).
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => {
        const r = (k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
        return {
          left: `${r(1) * 100}%`,
          color: COLORS[i % COLORS.length],
          size: 6 + r(2) * 6,
          style: {
            "--drift": `${(r(3) - 0.5) * 30}vw`,
            "--spin": `${(r(4) - 0.5) * 1440}deg`,
            "--dur": `${1.8 + r(5) * 1.4}s`,
            "--delay": `${r(6) * 0.4}s`,
          } as React.CSSProperties,
        };
      }),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block rounded-[2px] opacity-0"
          style={{ ...p.style, left: p.left, width: p.size, height: p.size * 0.45, background: p.color }}
        />
      ))}
    </div>
  );
}

/** Shown on the workout summary right after saving, when the workout set records or unlocked achievements. */
export function Celebration({ items }: { items: CelebrationItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(items.length > 0);
  if (!items.length) return null;

  function close() {
    setOpen(false);
    // Drop ?saved=1 so a refresh or the back button doesn't celebrate again.
    router.replace(window.location.pathname, { scroll: false });
  }

  const prs = items.filter((i) => i.kind === "pr").length;
  const title = prs && prs === items.length ? (prs === 1 ? "New personal record!" : `${prs} new personal records!`) : "Nice work!";

  return (
    <>
      {open && <Confetti />}
      <Sheet open={open} onClose={close} title={title} footer={<Button className="w-full" onClick={close}>Done</Button>}>
        <ul className="flex flex-col gap-2" aria-label="What you earned">
          {items.map((it) => {
            const Icon = ICON[it.kind];
            return (
              <li key={it.key} className="flex items-center gap-3 rounded-xl bg-fill-3 p-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow/20 text-orange">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-headline font-semibold">{it.title}</span>
                  <span className="block text-subhead text-label-2">{it.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
