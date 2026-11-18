import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Dumbbell, Flame, Play, Sparkles, Target, Timer, Trophy, Weight } from "lucide-react";
import { ProgressBar, goalOutlook, goalPercentLabel } from "@/components/goal-row";
import { PageHeader } from "@/components/ui/interactive";
import { ButtonLink, Card, ListSection, SectionTitle, StatTile } from "@/components/ui/primitives";
import { GoalRing } from "@/components/goal-ring";
import { WorkoutRow } from "@/components/workout-row";
import { ExerciseIcon } from "@/components/exercise-icon";
import { SampleDataButton } from "@/components/sample-data-button";
import { AiWorkoutCard } from "@/components/ai-workout-card";
import { getCoach } from "@/lib/ai-server";
import { dayLabel } from "@/lib/ai/today";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getTimeZone, getWorkouts } from "@/lib/data";
import { formatCompact, formatDate, formatLongDuration, formatSet, toDisplayWeight } from "@/lib/format";
import { personalRecords, weekStreak, weeklySummaries } from "@/lib/stats";

export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <Suspense fallback={<PageHeader title="Home" />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const [profile, workouts, exercises, tz, { plan, plans, today, goals }] = await Promise.all([getCurrentUser(), getWorkouts(), getExerciseMap(), getTimeZone(), getCoach()]);
  const topGoal = goals.find((g) => !g.achievedAt);
  const now = new Date();
  const weeks = weeklySummaries(workouts, exercises, now, tz, 12);
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];
  const streak = weekStreak(weeks);
  const recentPRs = personalRecords(workouts, exercises).slice(0, 3);
  const volDelta = lastWeek.volumeKg ? Math.round(((thisWeek.volumeKg - lastWeek.volumeKg) / lastWeek.volumeKg) * 100) : 0;
  const unit = profile.unit;

  return (
    <>
      <PageHeader title={`Hi, ${profile.displayName}`} subtitle={formatDate(now.toISOString(), tz, { weekday: "long", day: "numeric", month: "long" })} />

      {!profile.onboarded ? (
        <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo to-accent text-white">
            <Sparkles className="size-6" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="text-headline font-semibold">Set up your AI coach</h2>
            <p className="text-subhead text-label-2">Answer a few questions and get workouts built for you, with suggested weights from your first session.</p>
          </div>
          <ButtonLink href="/onboarding">Get started</ButtonLink>
        </Card>
      ) : (
        plan && (
          <AiWorkoutCard
            plans={plans}
            unit={profile.unit}
            showWeekLink={today.mode === "weekly"}
            heading={
              today.mode === "weekly"
                ? today.status === "due"
                  ? "Today's workout"
                  : today.status === "done"
                    ? "Done for today · next up"
                    : "Rest day · next up"
                : today.trainedToday
                  ? "You trained today · next time"
                  : "Your next workout"
            }
            note={
              today.mode === "weekly" && today.status !== "due" && today.next
                ? `Planned for ${formatDate(`${today.next.date}T12:00:00Z`, "UTC", { weekday: "long" })} (${dayLabel(today.next.dayType)}). You can also do it today.`
                : undefined
            }
          />
        )
      )}

      <Card className="mb-6 flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-center">
        <GoalRing done={thisWeek.workouts} goal={profile.weeklyGoal} />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-title3 font-bold">
            {thisWeek.workouts >= profile.weeklyGoal
              ? "Weekly goal reached"
              : `${profile.weeklyGoal - thisWeek.workouts} more to hit your weekly goal`}
          </h2>
          <p className="mt-1 mb-4 text-subhead text-label-2">
            <Flame className="mr-1 inline size-4 align-[-2px] text-orange" aria-hidden />
            {streak === 1 ? "1-week training streak" : `${streak}-week training streak`}
          </p>
          <ButtonLink href="/workout" size="large" className="w-full sm:w-auto">
            <Play className="size-5 fill-current" aria-hidden /> Start workout
          </ButtonLink>
        </div>
      </Card>

      {topGoal && (
        <Link href="/progress#goals" className="mb-6 block rounded-[var(--radius-cell)] bg-surface p-4 transition-colors hover:bg-fill-3">
          <div className="mb-2 flex items-center gap-2">
            <Target className="size-4 text-accent" aria-hidden />
            <span className="text-footnote font-semibold uppercase tracking-wide text-label-2">Closest goal</span>
            <ChevronRight className="ml-auto size-4 text-label-3" strokeWidth={2.5} aria-hidden />
          </div>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-headline font-semibold">{topGoal.title}</span>
            <span className="font-rounded text-title3 font-bold tabular">{goalPercentLabel(topGoal)}</span>
          </div>
          <ProgressBar value={topGoal.progress} label={`${topGoal.title}: ${Math.round(topGoal.progress * 100)}% there`} />
          <p className="mt-2 text-footnote text-label-2">{goalOutlook(topGoal, tz)}</p>
        </Link>
      )}

      {workouts.length === 0 ? (
        <Card className="mb-8 flex flex-col items-center gap-3 p-6 text-center">
          <Dumbbell className="size-8 text-accent" aria-hidden />
          <h2 className="text-headline font-semibold">No workouts yet</h2>
          <p className="max-w-sm text-subhead text-label-2">Log your first workout and your progress, records and suggestions show up here.</p>
          <p className="max-w-sm text-footnote text-label-2">Just exploring? Add sample training to see how charts and suggestions work. You can delete it from History later.</p>
          <div className="w-full max-w-xs">
            <SampleDataButton />
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3">
            <StatTile
              label="Volume this week"
              icon={<Weight className="size-4" aria-hidden />}
              value={formatCompact(toDisplayWeight(thisWeek.volumeKg, unit))}
              unit={unit}
              delta={lastWeek.volumeKg ? `${volDelta >= 0 ? "+" : ""}${volDelta}% vs last week` : undefined}
            />
            <StatTile
              label="Time this week"
              icon={<Timer className="size-4" aria-hidden />}
              value={(thisWeek.durationS / 3600).toFixed(1)}
              unit="h"
              delta={`${formatLongDuration(lastWeek.durationS)} last week`}
            />
          </div>

          <SectionTitle
            action={
              <Link href="/history" className="inline-flex min-h-11 items-center text-body text-accent">
                See all
              </Link>
            }
          >
            Recent workouts
          </SectionTitle>
          <ListSection>
            {workouts.slice(0, 4).map((w) => (
              <WorkoutRow key={w.id} workout={w} exercises={exercises} tz={tz} unit={unit} />
            ))}
          </ListSection>

          {recentPRs.length > 0 && (
            <>
              <SectionTitle
                action={
                  <Link href="/progress" className="inline-flex min-h-11 items-center text-body text-accent">
                    Progress
                  </Link>
                }
              >
                Latest records
              </SectionTitle>
              <div className="grid gap-3 sm:grid-cols-3">
                {recentPRs.map((pr) => (
                  <Link
                    key={pr.exercise.id}
                    href={`/exercises/${pr.exercise.id}`}
                    className="rounded-[var(--radius-cell)] bg-surface p-4 transition-colors hover:bg-fill-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <ExerciseIcon kind={pr.exercise.kind} size="sm" />
                      <Trophy className="size-4 text-yellow" aria-hidden />
                    </div>
                    <div className="truncate text-subhead font-semibold">{pr.exercise.name}</div>
                    <div className="font-rounded text-title3 font-bold tabular">{formatSet(pr.set, pr.exercise.kind, unit)}</div>
                    <div className="text-footnote text-label-2">
                      {pr.label} · {formatDate(pr.date, tz, { day: "numeric", month: "short" })}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
