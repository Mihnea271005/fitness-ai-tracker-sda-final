"use client";

// Active-workout state. Kept in this browser (localStorage) so a refresh or a closed tab
// doesn't lose a half-logged session. In Stage 3 "Finish" writes it to Supabase.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SetType } from "@/lib/types";

export interface DraftSet {
  id: string;
  type: SetType;
  weightKg?: number;
  reps?: number;
  durationS?: number;
  distanceM?: number;
  completed: boolean;
}

export interface DraftExercise {
  id: string;
  exerciseId: string;
  sets: DraftSet[];
}

export interface ActiveWorkout {
  title: string;
  startedAt: string;
  lastCompletedAt?: string;
  exercises: DraftExercise[];
}

const KEY = "active-workout-v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptySet(): DraftSet {
  return { id: uid(), type: "working", completed: false };
}

interface Ctx {
  workout: ActiveWorkout | null;
  start: (title: string, exercises?: { exerciseId: string; sets: number }[]) => void;
  addExercise: (exerciseId: string) => void;
  removeExercise: (id: string) => void;
  addSet: (exId: string) => void;
  updateSet: (exId: string, setId: string, patch: Partial<DraftSet>) => void;
  removeSet: (exId: string, setId: string) => void;
  discard: () => void;
}

const WorkoutContext = createContext<Ctx | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
      if (raw) setWorkout(JSON.parse(raw));
    } catch {
      /* storage unavailable — start fresh */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (workout) localStorage.setItem(KEY, JSON.stringify(workout));
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, [workout, loaded]);

  const mutate = useCallback((fn: (w: ActiveWorkout) => ActiveWorkout) => setWorkout((w) => (w ? fn(w) : w)), []);

  const value = useMemo<Ctx>(
    () => ({
      workout,
      start: (title, exercises = []) =>
        setWorkout({
          title,
          startedAt: new Date().toISOString(),
          exercises: exercises.map((e) => ({ id: uid(), exerciseId: e.exerciseId, sets: Array.from({ length: Math.max(e.sets, 1) }, emptySet) })),
        }),
      addExercise: (exerciseId) => mutate((w) => ({ ...w, exercises: [...w.exercises, { id: uid(), exerciseId, sets: [emptySet()] }] })),
      removeExercise: (id) => mutate((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== id) })),
      addSet: (exId) =>
        mutate((w) => ({
          ...w,
          exercises: w.exercises.map((e) => {
            if (e.id !== exId) return e;
            const prev = e.sets[e.sets.length - 1];
            // New sets copy the previous set's numbers — usually what you do next.
            const next: DraftSet = prev
              ? { ...emptySet(), weightKg: prev.weightKg, reps: prev.reps, durationS: prev.durationS, distanceM: prev.distanceM }
              : emptySet();
            return { ...e, sets: [...e.sets, next] };
          }),
        })),
      updateSet: (exId, setId, patch) =>
        mutate((w) => ({
          ...w,
          lastCompletedAt: patch.completed ? new Date().toISOString() : w.lastCompletedAt,
          exercises: w.exercises.map((e) => (e.id !== exId ? e : { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })),
        })),
      removeSet: (exId, setId) =>
        mutate((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id !== exId ? e : { ...e, sets: e.sets.filter((s) => s.id !== setId) })) })),
      discard: () => setWorkout(null),
    }),
    [workout, mutate],
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useActiveWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useActiveWorkout must be used inside <WorkoutProvider>");
  return ctx;
}

/** Seconds since `iso`, ticking every second. 0 until mounted (keeps SSR output stable). */
export function useElapsed(iso: string | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the clock on mount
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso || now === null) return 0;
  return Math.max(0, (now - new Date(iso).getTime()) / 1000);
}
