// Evaluates the history part of the estimator on a real training log
// (Kaggle "joep89/weightlifting": 721 workouts by one person, weights in lb).
//
// For every session, predict that session's best estimated 1RM from the sessions
// before it only. The estimator's settings are tuned on the FIRST half of the log
// (by date) and the result is reported on the SECOND half, which tuning never saw.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ESTIMATOR_DEFAULTS, epley, estimateExercise, type CoachProfile, type EstimatorSettings } from "./estimator";
import type { Exercise, Workout } from "../types";

const LB = 0.45359237;
const CSV = join(process.cwd(), "legacy", "data", "weightlifting_721_workouts.csv");

function parseCsv(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const cells = line.match(/("([^"]*)"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, ""));
      return { date: cells[0].slice(0, 10), exercise: cells[2].replace(/\s+/g, " ").trim(), weightLb: Number(cells[4]), reps: Number(cells[5]) };
    })
    .filter((r) => r.weightLb > 0 && r.reps >= 1 && r.reps <= 15);
}

type Sets = { weightKg: number; reps: number }[];
interface Case {
  date: string;
  actual: number;
  prev: number[];
  ex: Exercise;
  history: Workout[];
}

function buildCases(): Case[] {
  const byEx = new Map<string, Map<string, Sets>>();
  for (const r of parseCsv(readFileSync(CSV, "utf8"))) {
    const m = byEx.get(r.exercise) ?? new Map<string, Sets>();
    m.set(r.date, [...(m.get(r.date) ?? []), { weightKg: r.weightLb * LB, reps: r.reps }]);
    byEx.set(r.exercise, m);
  }
  // Same per-session value the estimator uses (Epley with ~1 rep in reserve).
  const value = (sets: Sets) => Math.max(...sets.map((s) => epley(s.weightKg, s.reps + 1)));
  const cases: Case[] = [];
  for (const [name, sessions] of byEx) {
    const dates = [...sessions.keys()].sort();
    if (dates.length < 8) continue;
    const ex: Exercise = { id: name, ownerId: "u", slug: null, name, kind: "strength", primaryMuscle: "chest", equipment: "barbell", weightIncrementKg: 2.5, archived: false };
    const workouts: Workout[] = dates.map((d, i) => ({
      id: `${name}-${i}`,
      title: name,
      startedAt: `${d}T12:00:00Z`,
      endedAt: `${d}T13:00:00Z`,
      exercises: [
        { id: `we-${i}`, exerciseId: name, sets: sessions.get(d)!.map((s, k) => ({ id: `${i}-${k}`, index: k, type: "working" as const, weightKg: s.weightKg, reps: s.reps, completed: true })) },
      ],
    }));
    for (let i = 3; i < dates.length; i++) {
      cases.push({
        date: dates[i],
        actual: value(sessions.get(dates[i])!),
        prev: dates.slice(0, i).map((d) => value(sessions.get(d)!)),
        ex,
        history: workouts.slice(0, i).reverse(), // newest first, strictly before session i
      });
    }
  }
  return cases.sort((a, b) => a.date.localeCompare(b.date));
}

const profile: CoachProfile = { sex: "unspecified", experience: "1_to_3" }; // no catalogue slug → history only
const pctErr = (pred: number, actual: number) => Math.abs(pred - actual) / actual;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function score(cases: Case[], opts: EstimatorSettings) {
  return mean(cases.map((c) => pctErr(estimateExercise(c.ex, c.history, profile, new Date(`${c.date}T12:00:00Z`), opts)!.value, c.actual)));
}

describe("history estimator on a real training log", () => {
  const cases = buildCases();
  const half = Math.floor(cases.length / 2);
  const tune = cases.slice(0, half);
  const test = cases.slice(half);

  it("shipped defaults are the best settings on the tuning half", () => {
    let best = { opts: ESTIMATOR_DEFAULTS, err: Infinity };
    for (const halfLifeDays of [7, 14, 21, 30, 45, 60])
      for (const maxSessions of [2, 3, 4, 6, 8])
        for (const latestFloor of [0, 0.9, 0.95, 0.97]) {
          const opts = { ...ESTIMATOR_DEFAULTS, halfLifeDays, maxSessions, latestFloor };
          const err = score(tune, opts);
          if (err < best.err) best = { opts, err };
        }
    console.log(`\nBest on the tuning half (${tune.length} sessions):`, best.opts, `${(best.err * 100).toFixed(2)}%`);
    // Keep this test honest: if the data says other settings are better, update ESTIMATOR_DEFAULTS.
    expect(score(tune, ESTIMATOR_DEFAULTS)).toBeLessThanOrEqual(best.err + 0.0005);
  });

  it("beats simple baselines on the held-out half", () => {
    const err = {
      "same as last session": mean(test.map((c) => pctErr(c.prev.at(-1)!, c.actual))),
      "average of last 3": mean(test.map((c) => pctErr((c.prev.at(-1)! + c.prev.at(-2)! + c.prev.at(-3)!) / 3, c.actual))),
      "AI estimator": score(test, ESTIMATOR_DEFAULTS),
    };
    console.log(`\nHeld-out half: ${test.length} sessions, ${new Set(test.map((c) => c.ex.id)).size} exercises, ${test[0].date} → ${test.at(-1)!.date}`);
    console.table(Object.entries(err).map(([predictor, e]) => ({ predictor, "mean error (%)": +(e * 100).toFixed(2) })));
    expect(test.length).toBeGreaterThan(400);
    expect(err["AI estimator"]).toBeLessThan(err["same as last session"]);
    expect(err["AI estimator"]).toBeLessThanOrEqual(err["average of last 3"]);
  });
});
