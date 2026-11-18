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

/**
 * Decorative by default: the type is written next to it everywhere, so screen readers
 * would otherwise hear it twice (and before the exercise name). Pass `labelled` where
 * the icon stands alone and has to carry the type itself.
 */
export function ExerciseIcon({ kind, size = "md", labelled = false }: { kind: ExerciseKind; size?: "sm" | "md" | "lg"; labelled?: boolean }) {
  const { bg, Icon } = KIND_STYLE[kind];
  const box = size === "sm" ? "size-7 rounded-[7px]" : size === "lg" ? "size-14 rounded-[14px]" : "size-9 rounded-[9px]";
  const glyph = size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-5";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center text-white", bg, box)}
      {...(labelled ? { role: "img", "aria-label": KIND_LABEL[kind] } : { "aria-hidden": true })}
    >
      <Icon className={glyph} strokeWidth={2.25} aria-hidden />
    </span>
  );
}
