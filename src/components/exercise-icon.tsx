import { Dumbbell, Footprints, Hourglass, PersonStanding } from "lucide-react";
import type { ExerciseKind } from "@/lib/types";
import { KIND_LABEL } from "@/lib/format";
import { cn } from "./ui/primitives";

// iOS Settings-style icon tiles: system hue background + white glyph.
// Colour is never the only signal — the kind is also written next to the tile wherever it matters.
const KIND_STYLE: Record<ExerciseKind, { bg: string; Icon: typeof Dumbbell }> = {
  strength: { bg: "bg-blue", Icon: Dumbbell },
  bodyweight: { bg: "bg-green", Icon: PersonStanding },
  cardio: { bg: "bg-pink", Icon: Footprints },
  timed: { bg: "bg-indigo", Icon: Hourglass },
};

export function ExerciseIcon({ kind, size = "md" }: { kind: ExerciseKind; size?: "sm" | "md" | "lg" }) {
  const { bg, Icon } = KIND_STYLE[kind];
  const box = size === "sm" ? "size-7 rounded-[7px]" : size === "lg" ? "size-14 rounded-[14px]" : "size-9 rounded-[9px]";
  const glyph = size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-5";
  return (
    <span className={cn("inline-flex items-center justify-center text-white", bg, box)} role="img" aria-label={KIND_LABEL[kind]}>
      <Icon className={glyph} strokeWidth={2.25} aria-hidden />
    </span>
  );
}
