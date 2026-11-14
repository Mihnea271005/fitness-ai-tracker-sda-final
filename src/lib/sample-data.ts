// Generates ~12 weeks of realistic sample training (push / pull / legs + weekend runs),
// ending before `now`. Used by "Add sample workouts" so a new account can explore the
// charts and suggestions. Exercises are referenced by built-in slug.

export interface SampleSet {
  type: "warmup" | "working";
  weight_kg?: number;
  reps?: number;
  duration_s?: number;
  distance_m?: number;
}
export interface SampleWorkout {
  title: string;
  started_at: string;
  ended_at: string;
  exercises: { slug: string; sets: SampleSet[] }[];
}

const DAY = 86_400_000;
const WEEKS = 12;

function strength(weight: number, reps: number[], warmup = true): SampleSet[] {
  const sets: SampleSet[] = [];
  if (warmup) sets.push({ type: "warmup", weight_kg: Math.round((weight * 0.5) / 2.5) * 2.5, reps: 10 });
  for (const r of reps) sets.push({ type: "working", weight_kg: weight, reps: r });
  return sets;
}
const bodyweight = (reps: number[]): SampleSet[] => reps.map((r) => ({ type: "working", reps: r }));
const timed = (secs: number[]): SampleSet[] => secs.map((s) => ({ type: "working", duration_s: s }));

/** Load rises one increment every 2 weeks; reps dip on the first week after a jump. */
function prog(start: number, inc: number, w: number) {
  return { weight: start + inc * Math.floor(w / 2), reps: w % 2 === 0 ? [8, 8, 7] : [8, 8, 8] };
}

export function generateSampleWorkouts(now: Date): SampleWorkout[] {
  // Anchor: Monday 00:00 UTC of the current week, minus 11 weeks.
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY;
  const out: SampleWorkout[] = [];

  const add = (w: number, day: number, hour: number, minutes: number, title: string, exercises: SampleWorkout["exercises"]) => {
    const start = monday - (WEEKS - 1 - w) * 7 * DAY + day * DAY + hour * 3_600_000;
    if (start + minutes * 60_000 > now.getTime()) return; // never in the future
    out.push({ title, started_at: new Date(start).toISOString(), ended_at: new Date(start + minutes * 60_000).toISOString(), exercises });
  };

  for (let w = 0; w < WEEKS; w++) {
    const bench = prog(67.5, 2.5, w);
    const ohp = prog(37.5, 2.5, Math.max(0, w - 2));
    const dips = 8 + Math.floor(w / 3);
    add(w, 0, 17, 62 + (w % 3) * 4, "Push", [
      { slug: "bench-press", sets: strength(bench.weight, bench.reps) },
      { slug: "overhead-press", sets: strength(ohp.weight, ohp.reps) },
      { slug: "dip", sets: bodyweight([dips, dips, dips - 1]) },
      { slug: "plank", sets: timed([45 + w * 5, 45 + w * 5]) },
    ]);

    const dl = prog(100, 5, w);
    const row = prog(55, 2.5, w);
    const pull = Math.min(5 + Math.floor(w / 2), 10);
    add(w, 2, 17, 58 + (w % 2) * 6, "Pull", [
      { slug: "deadlift", sets: strength(dl.weight, [5, 5, 5]) },
      { slug: "barbell-row", sets: strength(row.weight, row.reps) },
      { slug: "pull-up", sets: bodyweight([pull, pull, pull - 1]) },
      { slug: "bicep-curl", sets: strength(12 + Math.floor(w / 4) * 2, [12, 10, 10], false) },
    ]);

    const sq = prog(85, 2.5, w);
    const rdl = prog(70, 2.5, w);
    add(w, 4, 17, 66 + (w % 3) * 3, "Legs", [
      { slug: "squat", sets: strength(sq.weight, sq.reps) },
      { slug: "romanian-deadlift", sets: strength(rdl.weight, rdl.reps) },
      { slug: "calf-raise", sets: strength(60 + Math.floor(w / 3) * 5, [15, 15, 12], false) },
      { slug: "wall-sit", sets: timed([60 + w * 5]) },
    ]);

    if (w % 4 !== 2) {
      const distance = 5000 + Math.floor(w / 3) * 500;
      const dur = Math.round((distance / 1000) * (345 - w * 3));
      add(w, 6, 8, Math.round(dur / 60) + 2, "Easy Run", [{ slug: "running", sets: [{ type: "working", distance_m: distance, duration_s: dur }] }]);
    }
  }
  return out;
}
