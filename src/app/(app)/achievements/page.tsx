import { Suspense } from "react";
import { Award, Flame, Lock, Medal, Weight } from "lucide-react";
import { PageHeader } from "@/components/ui/interactive";
import { ProgressBar } from "@/components/goal-row";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getTimeZone, getWorkouts } from "@/lib/data";
import { achievements, type Achievement } from "@/lib/achievements";
import { formatDate } from "@/lib/format";
import { cn } from "@/components/ui/primitives";

export const metadata = { title: "Achievements" };

const ICON = { count: Medal, streak: Flame, volume: Weight, plates: Award } as const;
const SECTIONS: { kind: Achievement["kind"]; title: string }[] = [
  { kind: "count", title: "Workouts" },
  { kind: "streak", title: "Streaks" },
  { kind: "plates", title: "Plate club" },
  { kind: "volume", title: "Total volume" },
];

/** "count-10" < "count-25"; "plates-squat-60" < "plates-squat-100"; lb ids ("…-135lb") too. */
function byThreshold(a: Achievement, b: Achievement) {
  const key = (x: Achievement) => {
    const m = x.id.match(/^(.*?)-(\d+)(lb)?$/);
    return m ? { group: m[1], n: Number(m[2]) } : { group: x.id, n: 0 };
  };
  const ka = key(a);
  const kb = key(b);
  return ka.group.localeCompare(kb.group) || ka.n - kb.n;
}

export default function AchievementsPage() {
  return (
    <Suspense fallback={<PageHeader title="Achievements" back={{ href: "/progress", label: "Progress" }} />}>
      <Achievements />
    </Suspense>
  );
}

async function Achievements() {
  const [profile, workouts, exercises, tz] = await Promise.all([getCurrentUser(), getWorkouts(), getExerciseMap(), getTimeZone()]);
  const list = achievements(workouts, exercises, profile.weeklyGoal, tz, profile.unit);
  const unlocked = list.filter((a) => a.unlockedAt).length;
  // achievements() lists by status; its ids follow definition order when sorted by threshold.
  const definitionOrder = [...list].sort(byThreshold).map((a) => a.id);
  const now = new Date(); // a server render per request: "New" = unlocked in the last 7 days
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  return (
    <>
      <PageHeader title="Achievements" subtitle={`${unlocked} of ${list.length} unlocked`} back={{ href: "/progress", label: "Progress" }} />
      {SECTIONS.map(({ kind, title }) => {
        // Natural order within a section (First workout, 10, 25…), unlocked and locked alike.
        const items = list.filter((a) => a.kind === kind).sort((a, b) => definitionOrder.indexOf(a.id) - definitionOrder.indexOf(b.id));
        if (!items.length) return null;
        return (
          <section key={kind} aria-labelledby={`ach-${kind}`} className="mb-8">
            <h2 id={`ach-${kind}`} className="mb-1.5 px-4 text-footnote uppercase tracking-wide text-label-2">
              {title}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((a) => {
                const Icon = ICON[a.kind];
                const isNew = a.unlockedAt && a.unlockedAt >= weekAgo;
                return (
                  <li key={a.id} className={cn("flex flex-col gap-2 rounded-[var(--radius-cell)] bg-surface p-4", !a.unlockedAt && "opacity-75")}>
                    <div className="flex items-center justify-between">
                      <span className={cn("inline-flex size-10 items-center justify-center rounded-full", a.unlockedAt ? "bg-yellow/20 text-orange" : "bg-fill-3 text-label-3")}>
                        {a.unlockedAt ? <Icon className="size-5" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                      </span>
                      {isNew && <span className="rounded-full bg-accent px-2 py-0.5 text-caption1 font-semibold text-white">New</span>}
                    </div>
                    <div className="text-headline font-semibold">{a.title}</div>
                    <div className="text-footnote text-label-2">{a.description}</div>
                    {a.unlockedAt ? (
                      <div className="mt-auto text-footnote text-green-text">Unlocked {formatDate(a.unlockedAt, tz, { day: "numeric", month: "short", year: "numeric" })}</div>
                    ) : (
                      <div className="mt-auto flex flex-col gap-1">
                        <ProgressBar value={a.progress ?? 0} label={`${a.title}: ${a.progressLabel}`} />
                        <div className="text-caption1 text-label-2 tabular">{a.progressLabel}</div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
