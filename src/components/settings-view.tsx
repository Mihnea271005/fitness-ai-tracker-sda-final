"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Bell, CalendarPlus, Download, LogOut, Moon, Ruler, Sparkles, Target, Timer, Trash2 } from "lucide-react";
import { Button, ListRow, ListSection, TextField } from "./ui/primitives";
import { SegmentedControl, Sheet, Toggle } from "./ui/interactive";
import { deleteAccount, updateProfile, type ProfilePatch } from "@/app/(app)/settings/actions";
import { signOut } from "@/app/(auth)/actions";
import { deleteAllWorkouts } from "@/app/(app)/workout/actions";
import { REST_TIMER_PREF, useBooleanPref } from "@/lib/prefs";
import type { Profile, Unit } from "@/lib/types";

function RowIcon({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <span className={`inline-flex size-7 items-center justify-center rounded-[7px] text-white ${bg}`}>{children}</span>;
}

export function SettingsView({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.displayName);
  const [unit, setUnit] = useState<Unit>(profile.unit);
  const [goal, setGoal] = useState(profile.weeklyGoal);
  const [restTimer, setRestTimer] = useBooleanPref(REST_TIMER_PREF, true); // per device
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile.displayName);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [reminderTime, setReminderTime] = useState("18:00");
  const [remindBefore, setRemindBefore] = useState("30");
  // The browser's own time zone, for the calendar file (server render: none, added after hydration).
  const browserTz = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    () => "",
  );

  /** Optimistic: update the UI now, save in the background, roll back on failure. */
  function save(patch: ProfilePatch, rollback: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await updateProfile(patch);
      if (res.error) {
        rollback();
        setError(res.error);
      }
    });
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red/15 px-4 py-3 text-subhead text-red-text">
          {error}
        </p>
      )}

      <ListSection>
        <ListRow
          leading={
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-fill text-title2 font-semibold text-label-2" aria-hidden>
              {name[0]?.toUpperCase()}
            </span>
          }
          title={<span className="text-title3 font-semibold">{name}</span>}
          subtitle={profile.email}
          trailing={<span className="text-accent">Edit</span>}
          chevron={false}
          onClick={() => {
            setDraftName(name);
            setEditingName(true);
          }}
        />
      </ListSection>

      <ListSection header="AI coach" footer="Your answers shape the workouts and starting weights the AI suggests.">
        <ListRow
          leading={
            <RowIcon bg="bg-linear-to-br from-indigo to-accent">
              <Sparkles className="size-4" aria-hidden />
            </RowIcon>
          }
          title="Training profile"
          subtitle={profile.onboarded ? "Goal, schedule, equipment, focus" : "Not set up yet"}
          href="/onboarding"
        />
      </ListSection>

      <ListSection header="Training" footer="Suggestions round to your unit's plate steps: 2.5 kg or 5 lb.">
        <ListRow
          leading={
            <RowIcon bg="bg-blue">
              <Ruler className="size-4" aria-hidden />
            </RowIcon>
          }
          title="Units"
          trailing={
            <SegmentedControl<Unit>
              label="Weight unit"
              value={unit}
              onChange={(u) => {
                const prev = unit;
                setUnit(u);
                save({ unit: u }, () => setUnit(prev));
              }}
              className="w-32"
              options={[
                { value: "kg", label: "kg" },
                { value: "lb", label: "lb" },
              ]}
            />
          }
        />
        <ListRow
          leading={
            <RowIcon bg="bg-orange">
              <Target className="size-4" aria-hidden />
            </RowIcon>
          }
          title="Weekly goal"
          trailing={
            <span className="inline-flex items-center gap-1">
              {[-1, 1].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-label={d < 0 ? "Decrease weekly goal" : "Increase weekly goal"}
                  disabled={(d < 0 && goal <= 1) || (d > 0 && goal >= 7)}
                  onClick={() => {
                    const prev = goal;
                    const next = goal + d;
                    setGoal(next);
                    save({ weeklyGoal: next }, () => setGoal(prev));
                  }}
                  className="inline-flex size-11 items-center justify-center rounded-full text-title3 text-accent hover:bg-fill-3 disabled:text-label-3 [&:nth-child(2)]:order-last"
                >
                  {d < 0 ? "−" : "+"}
                </button>
              ))}
              <span className="w-20 text-center text-body text-label tabular" aria-live="polite">
                {goal} / week
              </span>
            </span>
          }
        />
        <ListRow
          leading={
            <RowIcon bg="bg-green">
              <Timer className="size-4" aria-hidden />
            </RowIcon>
          }
          title="Rest timer after each set"
          trailing={<Toggle checked={restTimer} onChange={setRestTimer} label="Rest timer after each set" />}
        />
      </ListSection>

      <ListSection
        header="About the AI"
        footer={
          <>
            Starting weights come from a model trained on data from the OpenPowerlifting project (openpowerlifting.org; data at
            gitlab.com/openpowerlifting/opl-data), then adapt to your own logged sets. Suggestions are a starting point, not medical advice.
          </>
        }
      >
        <ListRow title="How suggestions work" subtitle="Profile estimate → your sets take over after 2–3 sessions" />
      </ListSection>

      <ListSection header="Appearance" footer="The app follows your device's light or dark setting.">
        <ListRow
          leading={
            <RowIcon bg="bg-indigo">
              <Moon className="size-4" aria-hidden />
            </RowIcon>
          }
          title="Light & dark mode"
          trailing="Automatic"
        />
      </ListSection>

      <ListSection
        header="Reminders"
        footer={`Adds your ${profile.daysPerWeek ?? 3} training days a week to your phone's calendar as repeating events, and the calendar reminds you. Changed your plan? Download it again and it updates the same events.`}
      >
        <li>
          <div className="flex min-h-11 items-center gap-3 py-2 pr-4">
          <RowIcon bg="bg-indigo">
            <Bell className="size-4" aria-hidden />
          </RowIcon>
          <label htmlFor="reminder-time" className="flex-1 text-body">
            Workout time
          </label>
          <input
            id="reminder-time"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value || "18:00")}
            className="min-h-11 rounded-lg bg-fill-3 px-3 text-body tabular text-label outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          </div>
        </li>
        <li>
          <div className="flex min-h-11 items-center gap-3 py-2 pr-4">
          <span className="size-7" aria-hidden />
          <label htmlFor="remind-before" className="flex-1 text-body">
            Remind me
          </label>
          <select
            id="remind-before"
            value={remindBefore}
            onChange={(e) => setRemindBefore(e.target.value)}
            className="min-h-11 rounded-lg bg-fill-3 px-3 text-body text-label outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="0">At the start</option>
            <option value="15">15 min before</option>
            <option value="30">30 min before</option>
            <option value="60">1 hour before</option>
            <option value="120">2 hours before</option>
          </select>
          </div>
        </li>
        <li>
          <a
            href={`/export/calendar.ics?time=${encodeURIComponent(reminderTime)}&remind=${remindBefore}${browserTz ? `&tz=${encodeURIComponent(browserTz)}` : ""}`}
            download
            className="-ml-4 flex min-h-11 items-center gap-3 py-2.5 pr-4 pl-4 text-body text-accent transition-colors hover:bg-fill-3 active:bg-fill-2"
          >
            <span className="size-7" aria-hidden />
            <CalendarPlus className="size-5" aria-hidden />
            <span className="flex-1">Add to calendar</span>
          </a>
        </li>
      </ListSection>

      <ListSection header="Your data" footer="The export opens in Excel, Numbers or Google Sheets: one row per set.">
        <li>
          <a
            href="/export/workouts.csv"
            download
            className="-ml-4 flex min-h-11 items-center gap-3 py-2.5 pr-4 pl-4 text-body transition-colors hover:bg-fill-3 active:bg-fill-2"
          >
            <RowIcon bg="bg-teal">
              <Download className="size-4" aria-hidden />
            </RowIcon>
            <span className="flex-1">Export workouts (CSV)</span>
          </a>
        </li>
        <ListRow
          leading={
            <RowIcon bg="bg-red">
              <Trash2 className="size-4" aria-hidden />
            </RowIcon>
          }
          title="Delete all workouts"
          onClick={() => setConfirmWipe(true)}
          chevron={false}
        />
      </ListSection>

      <ListSection>
        <li>
          <form action={signOut}>
            <button type="submit" className="-ml-4 flex min-h-11 w-[calc(100%+1rem)] items-center gap-3 py-2.5 pr-4 pl-4 text-left text-body text-red-text hover:bg-fill-3">
              <LogOut className="size-5" aria-hidden /> Sign out
            </button>
          </form>
        </li>
        <ListRow leading={<Trash2 className="size-5 text-red-text" aria-hidden />} title="Delete account" destructive onClick={() => setConfirmDelete(true)} chevron={false} />
      </ListSection>
      {pending && <p className="sr-only" role="status">Saving…</p>}

      <Sheet
        open={editingName}
        onClose={() => setEditingName(false)}
        title="Your name"
        footer={
          <Button
            className="w-full"
            onClick={() => {
              const prev = name;
              const next = draftName.trim().slice(0, 60);
              if (!next) return setError("Your name can't be empty.");
              setName(next);
              setEditingName(false);
              save({ displayName: next }, () => setName(prev));
            }}
          >
            Save
          </Button>
        }
      >
        <TextField label="Name" value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={60} autoComplete="name" />
      </Sheet>

      <Sheet
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="Delete all workouts?"
        footer={
          <div className="flex gap-2">
            <Button variant="gray" className="flex-1" onClick={() => setConfirmWipe(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteAllWorkouts();
                  if (res?.error) {
                    setConfirmWipe(false);
                    setError(res.error);
                  }
                })
              }
            >
              {pending ? "Deleting…" : "Delete all"}
            </Button>
          </div>
        }
      >
        <p className="text-body">
          Every workout and set in your history is permanently deleted. Your account, exercises, routines and body measurements stay. Export a CSV first if you
          want a copy.
        </p>
      </Sheet>

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete your account?"
        footer={
          <div className="flex gap-2">
            <Button variant="gray" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteAccount();
                  if (res?.error) {
                    setConfirmDelete(false);
                    setError(res.error);
                  }
                })
              }
            >
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        }
      >
        <p className="text-body">This permanently deletes your account and all your workouts. It can&apos;t be undone.</p>
      </Sheet>
    </>
  );
}
