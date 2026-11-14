"use client";

import { useState } from "react";
import { Download, LogOut, Moon, Ruler, Target, Timer, Trash2 } from "lucide-react";
import { ListRow, ListSection } from "./ui/primitives";
import { SegmentedControl, Toggle } from "./ui/interactive";
import { profile } from "@/lib/mock-data";
import type { Unit } from "@/lib/types";

function RowIcon({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <span className={`inline-flex size-7 items-center justify-center rounded-[7px] text-white ${bg}`}>{children}</span>;
}

export function SettingsView() {
  const [unit, setUnit] = useState<Unit>(profile.unit);
  const [goal, setGoal] = useState(profile.weeklyGoal);
  const [restTimer, setRestTimer] = useState(true);

  return (
    <>
      <ListSection>
        <ListRow
          leading={
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-fill text-title2 font-semibold text-label-2">
              {profile.displayName[0]}
            </span>
          }
          title={<span className="text-title3 font-semibold">{profile.displayName}</span>}
          subtitle={profile.email}
          href="/settings"
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
              onChange={setUnit}
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
              <button
                type="button"
                aria-label="Decrease weekly goal"
                onClick={() => setGoal((g) => Math.max(1, g - 1))}
                className="inline-flex size-11 items-center justify-center rounded-full text-title3 text-accent hover:bg-fill-3"
              >
                −
              </button>
              <span className="w-20 text-center text-body text-label tabular" aria-live="polite">
                {goal} / week
              </span>
              <button
                type="button"
                aria-label="Increase weekly goal"
                onClick={() => setGoal((g) => Math.min(7, g + 1))}
                className="inline-flex size-11 items-center justify-center rounded-full text-title3 text-accent hover:bg-fill-3"
              >
                +
              </button>
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

      <ListSection header="Your data">
        <ListRow
          leading={
            <RowIcon bg="bg-teal">
              <Download className="size-4" aria-hidden />
            </RowIcon>
          }
          title="Export workouts (CSV)"
          onClick={() => {}}
          chevron
        />
      </ListSection>

      <ListSection>
        <ListRow leading={<LogOut className="size-5 text-red-text" aria-hidden />} title="Sign out" destructive onClick={() => {}} chevron={false} />
        <ListRow leading={<Trash2 className="size-5 text-red-text" aria-hidden />} title="Delete account" destructive onClick={() => {}} chevron={false} />
      </ListSection>
      <p className="text-center text-footnote text-label-2">Preview: settings are saved once accounts are connected (stage 2).</p>
    </>
  );
}
