// Stage 1 preview data. Deterministic (no Math.random / Date.now) so server and client
// renders match. Replaced by Supabase queries in Stage 3.

import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from "./types";

/** "Today" for the preview data set. */
export const MOCK_TODAY = "2026-11-14T12:00:00.000Z";


export const exercises: Exercise[] = [
  // Strength
  { id: "bench-press", ownerId: null, name: "Bench Press", kind: "strength", primaryMuscle: "chest", equipment: "barbell", weightIncrementKg: 2.5 },
  { id: "incline-db-press", ownerId: null, name: "Incline Dumbbell Press", kind: "strength", primaryMuscle: "chest", equipment: "dumbbell", weightIncrementKg: 2 },
  { id: "overhead-press", ownerId: null, name: "Overhead Press", kind: "strength", primaryMuscle: "shoulders", equipment: "barbell", weightIncrementKg: 2.5 },
  { id: "lateral-raise", ownerId: null, name: "Lateral Raise", kind: "strength", primaryMuscle: "shoulders", equipment: "dumbbell", weightIncrementKg: 1 },
  { id: "deadlift", ownerId: null, name: "Deadlift", kind: "strength", primaryMuscle: "back", equipment: "barbell", weightIncrementKg: 5 },
  { id: "barbell-row", ownerId: null, name: "Barbell Row", kind: "strength", primaryMuscle: "back", equipment: "barbell", weightIncrementKg: 2.5 },
  { id: "lat-pulldown", ownerId: null, name: "Lat Pulldown", kind: "strength", primaryMuscle: "back", equipment: "cable", weightIncrementKg: 2.5 },
  { id: "bicep-curl", ownerId: null, name: "Dumbbell Curl", kind: "strength", primaryMuscle: "biceps", equipment: "dumbbell", weightIncrementKg: 1 },
  { id: "triceps-pushdown", ownerId: null, name: "Triceps Pushdown", kind: "strength", primaryMuscle: "triceps", equipment: "cable", weightIncrementKg: 2.5 },
  { id: "squat", ownerId: null, name: "Back Squat", kind: "strength", primaryMuscle: "quads", equipment: "barbell", weightIncrementKg: 2.5 },
  { id: "romanian-deadlift", ownerId: null, name: "Romanian Deadlift", kind: "strength", primaryMuscle: "hamstrings", equipment: "barbell", weightIncrementKg: 2.5 },
  { id: "leg-press", ownerId: null, name: "Leg Press", kind: "strength", primaryMuscle: "quads", equipment: "machine", weightIncrementKg: 5 },
  { id: "hip-thrust", ownerId: null, name: "Hip Thrust", kind: "strength", primaryMuscle: "glutes", equipment: "barbell", weightIncrementKg: 5 },
  { id: "calf-raise", ownerId: null, name: "Standing Calf Raise", kind: "strength", primaryMuscle: "calves", equipment: "machine", weightIncrementKg: 5 },
  // Bodyweight
  { id: "pull-up", ownerId: null, name: "Pull-up", kind: "bodyweight", primaryMuscle: "back", equipment: "bodyweight", weightIncrementKg: 2.5 },
  { id: "chin-up", ownerId: null, name: "Chin-up", kind: "bodyweight", primaryMuscle: "biceps", equipment: "bodyweight", weightIncrementKg: 2.5 },
  { id: "dip", ownerId: null, name: "Dip", kind: "bodyweight", primaryMuscle: "triceps", equipment: "bodyweight", weightIncrementKg: 2.5 },
  { id: "push-up", ownerId: null, name: "Push-up", kind: "bodyweight", primaryMuscle: "chest", equipment: "bodyweight", weightIncrementKg: 2.5 },
  { id: "hanging-leg-raise", ownerId: null, name: "Hanging Leg Raise", kind: "bodyweight", primaryMuscle: "core", equipment: "bodyweight", weightIncrementKg: 2.5 },
  // Timed holds
  { id: "plank", ownerId: null, name: "Plank", kind: "timed", primaryMuscle: "core", equipment: "none", weightIncrementKg: 2.5 },
  { id: "side-plank", ownerId: null, name: "Side Plank", kind: "timed", primaryMuscle: "core", equipment: "none", weightIncrementKg: 2.5 },
  { id: "dead-hang", ownerId: null, name: "Dead Hang", kind: "timed", primaryMuscle: "back", equipment: "bodyweight", weightIncrementKg: 2.5 },
  { id: "wall-sit", ownerId: null, name: "Wall Sit", kind: "timed", primaryMuscle: "quads", equipment: "none", weightIncrementKg: 2.5 },
  // Cardio
  { id: "running", ownerId: null, name: "Running", kind: "cardio", primaryMuscle: "cardio", equipment: "none", weightIncrementKg: 0 },
  { id: "cycling", ownerId: null, name: "Cycling", kind: "cardio", primaryMuscle: "cardio", equipment: "none", weightIncrementKg: 0 },
  { id: "rowing", ownerId: null, name: "Rowing Machine", kind: "cardio", primaryMuscle: "cardio", equipment: "cardio machine", weightIncrementKg: 0 },
  { id: "jump-rope", ownerId: null, name: "Jump Rope", kind: "cardio", primaryMuscle: "cardio", equipment: "none", weightIncrementKg: 0 },
  // A custom exercise owned by the demo user
  { id: "landmine-press", ownerId: "demo-user", name: "Landmine Press", kind: "strength", primaryMuscle: "shoulders", equipment: "barbell", weightIncrementKg: 2.5 },
];

export const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

// ---------------------------------------------------------------------------
// Generated history: 12 weeks, push / pull / legs + weekend cardio.
// Current week (week 11) has Mon/Wed/Fri done; today is Saturday.
// ---------------------------------------------------------------------------

const DAY = 86_400_000;
const CURRENT_MONDAY = Date.UTC(2026, 10, 9); // Mon 9 Nov 2026
const WEEKS = 12;

let setCounter = 0;
function sid() {
  setCounter += 1;
  return `s${setCounter}`;
}

function strength(weightKg: number, reps: number[], warmup = true): WorkoutSet[] {
  const sets: WorkoutSet[] = [];
  if (warmup) sets.push({ id: sid(), index: 0, type: "warmup", weightKg: Math.round((weightKg * 0.5) / 2.5) * 2.5, reps: 10, completed: true });
  reps.forEach((r) => sets.push({ id: sid(), index: sets.length, type: "working", weightKg, reps: r, completed: true }));
  return sets;
}

function bodyweight(reps: number[], addedKg = 0): WorkoutSet[] {
  return reps.map((r, i) => ({ id: sid(), index: i, type: "working" as const, reps: r, weightKg: addedKg || undefined, completed: true }));
}

function timed(seconds: number[]): WorkoutSet[] {
  return seconds.map((s, i) => ({ id: sid(), index: i, type: "working" as const, durationS: s, completed: true }));
}

function cardio(distanceM: number, durationS: number): WorkoutSet[] {
  return [{ id: sid(), index: 0, type: "working", distanceM, durationS, completed: true }];
}

function we(workoutId: string, exerciseId: string, sets: WorkoutSet[]): WorkoutExercise {
  return { id: `${workoutId}-${exerciseId}`, exerciseId, sets };
}

/** Load that rises one increment every 2 weeks; reps dip on the first week after a jump. */
function prog(start: number, inc: number, w: number) {
  const weight = start + inc * Math.floor(w / 2);
  const reps = w % 2 === 0 ? [8, 8, 7] : [8, 8, 8];
  return { weight, reps };
}

function at(w: number, dayOffset: number, hourUTC: number, minutes: number) {
  const start = CURRENT_MONDAY - (WEEKS - 1 - w) * 7 * DAY + dayOffset * DAY + hourUTC * 3_600_000;
  return { startedAt: new Date(start).toISOString(), endedAt: new Date(start + minutes * 60_000).toISOString() };
}

function buildHistory(): Workout[] {
  const out: Workout[] = [];
  for (let w = 0; w < WEEKS; w++) {
    // Monday — Push
    {
      const id = `w${w}-push`;
      const bench = prog(67.5, 2.5, w);
      const ohp = prog(37.5, 2.5, Math.max(0, w - 2));
      out.push({
        id,
        title: "Push",
        ...at(w, 0, 17, 62 + (w % 3) * 4),
        exercises: [
          we(id, "bench-press", strength(bench.weight, bench.reps)),
          we(id, "overhead-press", strength(ohp.weight, ohp.reps)),
          we(id, "dip", bodyweight([8 + Math.floor(w / 3), 8 + Math.floor(w / 3), 7 + Math.floor(w / 3)])),
          we(id, "plank", timed([45 + w * 5, 45 + w * 5])),
        ],
      });
    }
    // Wednesday — Pull
    {
      const id = `w${w}-pull`;
      const dl = prog(100, 5, w);
      const row = prog(55, 2.5, w);
      const pullReps = Math.min(5 + Math.floor(w / 2), 10);
      out.push({
        id,
        title: "Pull",
        ...at(w, 2, 17, 58 + (w % 2) * 6),
        exercises: [
          we(id, "deadlift", strength(dl.weight, [5, 5, 5])),
          we(id, "barbell-row", strength(row.weight, row.reps)),
          we(id, "pull-up", bodyweight([pullReps, pullReps, pullReps - 1])),
          we(id, "bicep-curl", strength(12 + Math.floor(w / 4) * 2, [12, 10, 10], false)),
        ],
      });
    }
    // Friday — Legs
    {
      const id = `w${w}-legs`;
      const sq = prog(85, 2.5, w);
      const rdl = prog(70, 2.5, w);
      out.push({
        id,
        title: "Legs",
        ...at(w, 4, 17, 66 + (w % 3) * 3),
        exercises: [
          we(id, "squat", strength(sq.weight, sq.reps)),
          we(id, "romanian-deadlift", strength(rdl.weight, rdl.reps)),
          we(id, "calf-raise", strength(60 + Math.floor(w / 3) * 5, [15, 15, 12], false)),
          we(id, "wall-sit", timed([60 + w * 5])),
        ],
      });
    }
    // Sunday — easy run (skipped some weeks; current week's Sunday hasn't happened yet)
    if (w < WEEKS - 1 && w % 4 !== 2) {
      const id = `w${w}-run`;
      const distance = 5000 + Math.floor(w / 3) * 500;
      const pace = 345 - w * 3; // s/km, getting faster
      const dur = Math.round((distance / 1000) * pace);
      out.push({
        id,
        title: "Easy Run",
        ...at(w, 6, 8, Math.round(dur / 60) + 2),
        exercises: [we(id, "running", cardio(distance, dur))],
      });
    }
  }
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** Newest first */
export const workouts: Workout[] = buildHistory();

export function getWorkout(id: string): Workout | undefined {
  return workouts.find((w) => w.id === id);
}

export function getExercise(id: string): Exercise | undefined {
  return exerciseMap.get(id);
}
