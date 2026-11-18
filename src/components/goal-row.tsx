import { CheckCircle2, Trash2 } from "lucide-react";
import { ConfirmAction } from "./confirm-action";
import { deleteGoal } from "@/app/(app)/goals/actions";
import { formatGoalValue, type GoalStatus } from "@/lib/ai/goals";
import { formatDate } from "@/lib/format";
import type { Unit } from "@/lib/types";

const day = (ymd: string, year = false) => formatDate(`${ymd}T12:00:00Z`, "UTC", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });

/** One plain-English line about where a goal is heading. */
export function goalOutlook(s: GoalStatus, tz = "UTC"): string {
  if (s.achievedAt) return `Achieved ${formatDate(s.achievedAt, tz, { day: "numeric", month: "short", year: "numeric" })}`;
  const deadline = s.goal.deadline ? ` · deadline ${day(s.goal.deadline)}${s.onTrack === true ? ", on track" : s.onTrack === false ? ", behind" : ""}` : "";
  switch (s.projection.kind) {
    case "date":
      return `At your current rate: around ${day(s.projection.date, true)}${deadline}`;
    case "ready":
      return s.exercise?.kind === "cardio"
        ? `Your pace is there. Now run the full distance${deadline}`
        : s.exercise?.kind === "strength"
          ? `Your recent sets say you're strong enough. Go for it${deadline}`
          : `You're right at it. Go for it${deadline}`;
    case "stalled":
      return `No progress in the last 8 weeks${deadline}`;
    case "too_far":
      return `Over 2 years away at the current rate${deadline}`;
    case "not_enough_data":
      return s.current === undefined ? `Log it to start tracking${deadline}` : `Log a few more sessions for a projection${deadline}`;
  }
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-fill-3">
      <div className={value >= 1 ? "h-full rounded-full bg-green" : "h-full rounded-full bg-accent"} style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}

/** A goal in a ListSection: title, progress bar, where it stands and where it's heading. */
export function GoalRow({ status: s, unit, tz, removable = true }: { status: GoalStatus; unit: Unit; tz: string; removable?: boolean }) {
  const now = s.current !== undefined ? `${s.metricLabel} ${formatGoalValue(s, s.current, unit)} · goal ${formatGoalValue(s, s.target, unit)}` : null;
  return (
    <li className="flex items-center gap-2 py-3 pr-2">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-1.5 text-body">
          {s.achievedAt && <CheckCircle2 className="size-4 shrink-0 text-green-text" aria-hidden />}
          <span className="truncate">{s.title}</span>
          <span className="ml-auto shrink-0 pl-2 text-subhead font-semibold tabular text-label-2">{Math.round(s.progress * 100)}%</span>
        </div>
        <ProgressBar value={s.progress} label={`${s.title}: ${Math.round(s.progress * 100)}% there`} />
        {now && !s.achievedAt && <div className="mt-1.5 text-subhead text-label-2">{now}</div>}
        <div className="text-footnote text-label-2">{goalOutlook(s, tz)}</div>
      </div>
      {removable && (
        <ConfirmAction
          buttonVariant="plain"
          className="!min-h-11 !px-3"
          label={
            <>
              <Trash2 className="size-4 text-red-text" aria-hidden />
              <span className="sr-only">Delete goal</span>
            </>
          }
          title="Delete this goal?"
          body={`“${s.title}” will be removed. Your workouts aren't affected.`}
          confirmLabel="Delete"
          action={deleteGoal.bind(null, s.goal.id)}
        />
      )}
    </li>
  );
}
