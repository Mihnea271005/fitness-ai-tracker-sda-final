"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Button, TextField, cn } from "./ui/primitives";
import { saveTrainingProfile, type OnboardingState } from "@/app/(app)/onboarding/actions";
import type { EquipmentAccess, Exercise, Experience, FocusArea, Goal, PlanMode, Profile, Sex } from "@/lib/types";

/* ------------------------------------------------------------------ choice controls */

function Choice<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  columns = 1,
}: {
  name: string;
  label: string;
  options: { value: T; title: string; detail?: string }[];
  value?: T;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <fieldset>
      <legend className="mb-2 px-1 text-subhead font-semibold">{label}</legend>
      <div className={cn("grid gap-2", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3")}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                selected ? "bg-accent/12 ring-accent" : "bg-surface ring-transparent hover:bg-fill-3",
              )}
            >
              <input type="radio" name={name} value={o.value} checked={selected} onChange={() => onChange(o.value)} className="sr-only" />
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium">{o.title}</span>
                {o.detail && <span className="block text-footnote text-label-2">{o.detail}</span>}
              </span>
              {selected && <Check className="size-5 shrink-0 text-accent" strokeWidth={3} aria-hidden />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Chips<T extends string>({ name, label, hint, options, values, onChange }: { name: string; label: string; hint?: string; options: { value: T; title: string }[]; values: T[]; onChange: (v: T[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 px-1 text-subhead font-semibold">{label}</legend>
      {hint && <p className="mb-2 px-1 text-footnote text-label-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <label
              key={o.value}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-subhead font-medium ring-1 transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                on ? "bg-accent text-white ring-accent" : "bg-surface text-label ring-separator hover:bg-fill-3",
              )}
            >
              <input type="checkbox" name={name} value={o.value} checked={on} onChange={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])} className="sr-only" />
              {on && <Check className="size-4" strokeWidth={3} aria-hidden />}
              {o.title}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Step({ show, children }: { show: boolean; children: ReactNode }) {
  // Steps stay mounted (hidden) so every field is submitted with the form.
  return <div className={cn("flex flex-col gap-6", !show && "hidden")}>{children}</div>;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="flex-1" disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : "Build my plan"}
    </Button>
  );
}

/* ------------------------------------------------------------------ form */

const EQUIPMENT_NEEDS: Record<EquipmentAccess, string[]> = {
  gym: ["barbell", "dumbbell", "machine", "cable", "kettlebell", "bodyweight", "band", "cardio machine", "none"],
  dumbbells: ["dumbbell", "kettlebell", "bodyweight", "band", "none"],
  bodyweight: ["bodyweight", "none"],
};

export function OnboardingForm({ profile, exercises, bodyweight, editing }: { profile: Profile; exercises: Exercise[]; bodyweight?: number; editing: boolean }) {
  const [state, action] = useActionState<OnboardingState, FormData>(saveTrainingProfile, {});
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [experience, setExperience] = useState<Experience | undefined>(profile.experience);
  const [goal, setGoal] = useState<Goal | undefined>(profile.goal);
  const [days, setDays] = useState(String(profile.daysPerWeek ?? 3));
  const [minutes, setMinutes] = useState(String(profile.sessionMinutes ?? 60));
  const [focus, setFocus] = useState<FocusArea[]>(profile.focus ?? []);
  const [locations, setLocations] = useState<EquipmentAccess[]>(profile.locations ?? []);
  const [planMode, setPlanMode] = useState<PlanMode>(profile.planMode);
  const [avoid, setAvoid] = useState<string[]>(profile.avoidExercises ?? []);

  const best: EquipmentAccess = locations.includes("gym") || !locations.length ? "gym" : locations.includes("dumbbells") ? "dumbbells" : "bodyweight";
  const avoidable = exercises.filter((e) => !e.archived && e.kind !== "cardio" && EQUIPMENT_NEEDS[best].includes(e.equipment));
  const steps = ["About you", "Your training", "Your plan"];

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <ol className="flex gap-2" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className="flex-1" aria-current={i === step ? "step" : undefined}>
            <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-accent" : "bg-fill")} />
            <span className={cn("mt-1.5 block text-caption1 font-semibold", i === step ? "text-label" : "text-label-2")}>{s}</span>
          </li>
        ))}
      </ol>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red/15 px-4 py-3 text-subhead text-red-text">
          {state.error}
        </p>
      )}

      <Step show={step === 0}>
        <p className="text-subhead text-label-2">
          These help the AI estimate sensible starting weights before you&apos;ve logged anything. Skip anything you&apos;d rather not share. Only you can see it.
        </p>
        <Choice<Sex>
          name="sex"
          label="Sex"
          value={sex}
          onChange={setSex}
          columns={3}
          options={[
            { value: "male", title: "Male" },
            { value: "female", title: "Female" },
            { value: "unspecified", title: "Prefer not to say" },
          ]}
        />
        <div className="grid grid-cols-3 gap-3">
          <TextField label="Year of birth" name="birthYear" inputMode="numeric" placeholder="e.g. 1998" defaultValue={profile.birthYear} maxLength={4} />
          <TextField label="Height (cm)" name="height" inputMode="numeric" placeholder="–" defaultValue={profile.heightCm} />
          <TextField label={`Weight (${profile.unit})`} name="weight" inputMode="decimal" placeholder="–" defaultValue={bodyweight} />
        </div>
      </Step>

      <Step show={step === 1}>
        <Choice<Experience>
          name="experience"
          label="How long have you been training?"
          value={experience}
          onChange={setExperience}
          columns={2}
          options={[
            { value: "new", title: "New to it", detail: "Haven't trained regularly" },
            { value: "under_1", title: "Under a year" },
            { value: "1_to_3", title: "1–3 years" },
            { value: "over_3", title: "3+ years" },
          ]}
        />
        <Choice<Goal>
          name="goal"
          label="Main goal"
          value={goal}
          onChange={setGoal}
          options={[
            { value: "strength", title: "Get stronger", detail: "Heavier weights, fewer reps" },
            { value: "muscle", title: "Build muscle", detail: "Moderate weights, 8–12 reps" },
            { value: "general", title: "General fitness", detail: "A bit of everything" },
            { value: "endurance", title: "Endurance", detail: "More reps, plus cardio" },
            { value: "fat_loss", title: "Lose fat", detail: "Circuits and conditioning" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block px-1 text-subhead font-semibold">Days per week</span>
            <select name="days" value={days} onChange={(e) => setDays(e.target.value)} className="min-h-11 w-full rounded-xl bg-surface px-4 py-3 text-body outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "day" : "days"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block px-1 text-subhead font-semibold">Time per session</span>
            <select name="minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="min-h-11 w-full rounded-xl bg-surface px-4 py-3 text-body outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {[30, 45, 60, 75, 90].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
        </div>
      </Step>

      <Step show={step === 2}>
        <Chips<EquipmentAccess>
          name="locations"
          label="Where do you train?"
          hint="Pick all that apply. You can switch between them for each workout."
          values={locations}
          onChange={setLocations}
          options={[
            { value: "gym", title: "Gym" },
            { value: "dumbbells", title: "Home with weights" },
            { value: "bodyweight", title: "Home, no equipment" },
          ]}
        />
        <Chips<FocusArea>
          name="focus"
          label="Focus areas"
          hint="Optional. These get a little extra work."
          values={focus}
          onChange={setFocus}
          options={[
            { value: "chest", title: "Chest" },
            { value: "back", title: "Back" },
            { value: "shoulders", title: "Shoulders" },
            { value: "arms", title: "Arms" },
            { value: "legs", title: "Legs" },
            { value: "glutes", title: "Glutes" },
            { value: "core", title: "Core" },
          ]}
        />
        <Choice<PlanMode>
          name="planMode"
          label="How do you like to plan?"
          value={planMode}
          onChange={setPlanMode}
          options={[
            { value: "weekly", title: "A plan for the whole week", detail: "Fixed training days, so you know what's coming" },
            { value: "session", title: "Go with the flow", detail: "Each workout is picked based on what you trained last" },
          ]}
        />
        <Chips<string>
          name="avoid"
          label="Exercises to avoid"
          hint="Optional, e.g. because of an injury. The AI will never pick these."
          values={avoid}
          onChange={setAvoid}
          options={avoidable.map((e) => ({ value: e.id, title: e.name }))}
        />
        {/* keep avoided exercises that the current equipment filter hides */}
        {avoid.filter((id) => !avoidable.some((e) => e.id === id)).map((id) => (
          <input key={id} type="hidden" name="avoid" value={id} />
        ))}
        <p className="px-1 text-footnote text-label-2">Suggestions are a starting point, not medical advice. Stop if something hurts.</p>
      </Step>

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="gray" className="flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button className="flex-1" onClick={() => setStep((s) => s + 1)}>
            Continue
          </Button>
        ) : (
          <Submit />
        )}
      </div>
      {!editing && step === 0 && <p className="text-center text-footnote text-label-2">Takes about a minute.</p>}
    </form>
  );
}
