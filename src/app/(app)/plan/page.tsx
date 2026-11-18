import Link from "next/link";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/ui/interactive";
import { ButtonLink, Card, cn } from "@/components/ui/primitives";
import { AiWorkoutCard } from "@/components/ai-workout-card";
import { getCoach } from "@/lib/ai-server";
import { DAY_LABEL, generateWorkout, type DayType } from "@/lib/ai/generator";
import { formatDay } from "@/lib/format";

export const metadata = { title: "This week" };

export default function PlanPage() {
  return (
    <Suspense fallback={<PageHeader title="This week" back={{ href: "/home", label: "Home" }} />}>
      <Plan />
    </Suspense>
  );
}

async function Plan() {
  const { profile, exercises, workouts, coach, settings, today, plan, plans } = await getCoach();

  if (today.mode !== "weekly") {
    return (
      <>
        <PageHeader title="This week" back={{ href: "/home", label: "Home" }} />
        <Card className="flex flex-col items-start gap-3 p-5">
          <p className="text-body">You&apos;re set to <strong>go with the flow</strong>: each workout is picked from what you trained last.</p>
          <p className="text-subhead text-label-2">Prefer a fixed plan for the week? Switch in your training profile.</p>
          <ButtonLink href="/onboarding" variant="tinted">
            Change training profile
          </ButtonLink>
        </Card>
      </>
    );
  }

  // One preview per day type in this week's plan.
  const previews = new Map<DayType, ReturnType<typeof generateWorkout>>();
  for (const d of today.week) {
    if (d.dayType && !previews.has(d.dayType)) previews.set(d.dayType, generateWorkout(d.dayType, settings, coach, exercises, workouts, profile.unit, d.date));
  }
  const doneCount = today.week.filter((d) => d.done).length;
  const planned = today.week.filter((d) => d.dayType).length;

  return (
    <>
      <PageHeader
        title="This week"
        subtitle={`${doneCount} of ${planned} workouts done · ${settings.daysPerWeek} days a week`}
        back={{ href: "/home", label: "Home" }}
        actions={
          <ButtonLink href="/onboarding" variant="plain" size="small">
            Edit
          </ButtonLink>
        }
      />

      {plan && today.status === "due" && <AiWorkoutCard plans={plans} unit={profile.unit} heading="Today" />}

      <ol className="mb-8 flex flex-col gap-2">
        {today.week.map((d) => {
          const p = d.dayType ? previews.get(d.dayType) : undefined;
          return (
            <li
              key={d.date}
              className={cn("rounded-[var(--radius-cell)] bg-surface p-4", d.isToday && "ring-2 ring-accent")}
              aria-current={d.isToday ? "date" : undefined}
            >
              <div className="flex items-center gap-3">
                <div className="w-14 shrink-0">
                  <div className="text-footnote font-semibold text-label-2 uppercase">{formatDay(d.date, { weekday: "short" })}</div>
                  <div className="font-rounded text-title3 font-bold">{formatDay(d.date, { day: "numeric" })}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-headline font-semibold", !d.dayType && "text-label-2")}>{d.dayType ? DAY_LABEL[d.dayType] : "Rest"}</div>
                  {p && <div className="truncate text-footnote text-label-2">{p.exercises.map((e) => e.exercise.name).join(", ")}</div>}
                </div>
                {d.done ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2.5 py-1 text-footnote font-semibold text-green-text">
                    <Check className="size-4" strokeWidth={3} aria-hidden /> Done
                  </span>
                ) : d.isToday && d.dayType ? (
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 text-footnote font-semibold text-accent">Today</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-center text-footnote text-label-2">
        Weights are suggested fresh each day from your latest training. <Link href="/settings" className="text-accent">About the AI</Link>
      </p>
    </>
  );
}
