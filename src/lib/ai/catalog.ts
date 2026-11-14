// What the AI knows about each built-in exercise (keyed by slug): the movement
// pattern it trains, the minimum equipment it needs, and how to estimate it from the
// three lifts the population model predicts.
//
// Ratios are typical strength relationships between lifts (estimated one-rep maxes),
// used only until the user has logged the exercise. Dumbbell values are per dumbbell.

export type Pattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "h_push"
  | "v_push"
  | "h_pull"
  | "v_pull"
  | "biceps"
  | "triceps"
  | "delts"
  | "calves"
  | "glutes"
  | "core"
  | "conditioning"
  | "cardio";

export type EquipmentLevel = "gym" | "dumbbells" | "bodyweight";
export type Anchor = "squat" | "bench" | "deadlift";
export type Experience = "new" | "under_1" | "1_to_3" | "over_3";

export interface CatalogEntry {
  pattern: Pattern;
  /** least equipment that allows it: bodyweight ⊂ dumbbells ⊂ gym */
  needs: EquipmentLevel;
  compound: boolean;
  /** strength: estimated 1RM = anchor lift × ratio */
  anchor?: { lift: Anchor; ratio: number };
  /** bodyweight: reps an average person can do in one set, by experience (male reference) */
  reps?: Record<Experience, number>;
  /** timed: seconds an average person can hold, by experience */
  seconds?: Record<Experience, number>;
  /** female reps/seconds relative to the male reference (bodyweight & timed) */
  femaleFactor?: number;
}

const R = (n: number, u: number, m: number, o: number): Record<Experience, number> => ({ new: n, under_1: u, "1_to_3": m, over_3: o });

export const CATALOG: Record<string, CatalogEntry> = {
  // ---- barbell / machine (gym)
  "bench-press": { pattern: "h_push", needs: "gym", compound: true, anchor: { lift: "bench", ratio: 1 } },
  "overhead-press": { pattern: "v_push", needs: "gym", compound: true, anchor: { lift: "bench", ratio: 0.62 } },
  "incline-db-press": { pattern: "h_push", needs: "dumbbells", compound: true, anchor: { lift: "bench", ratio: 0.33 } },
  "lateral-raise": { pattern: "delts", needs: "dumbbells", compound: false, anchor: { lift: "bench", ratio: 0.1 } },
  deadlift: { pattern: "hinge", needs: "gym", compound: true, anchor: { lift: "deadlift", ratio: 1 } },
  "barbell-row": { pattern: "h_pull", needs: "gym", compound: true, anchor: { lift: "bench", ratio: 0.75 } },
  "lat-pulldown": { pattern: "v_pull", needs: "gym", compound: true, anchor: { lift: "bench", ratio: 0.75 } },
  "bicep-curl": { pattern: "biceps", needs: "dumbbells", compound: false, anchor: { lift: "bench", ratio: 0.17 } },
  "triceps-pushdown": { pattern: "triceps", needs: "gym", compound: false, anchor: { lift: "bench", ratio: 0.35 } },
  squat: { pattern: "squat", needs: "gym", compound: true, anchor: { lift: "squat", ratio: 1 } },
  "romanian-deadlift": { pattern: "hinge", needs: "gym", compound: true, anchor: { lift: "deadlift", ratio: 0.6 } },
  "leg-press": { pattern: "squat", needs: "gym", compound: true, anchor: { lift: "squat", ratio: 1.8 } },
  "hip-thrust": { pattern: "glutes", needs: "gym", compound: true, anchor: { lift: "deadlift", ratio: 0.8 } },
  "calf-raise": { pattern: "calves", needs: "gym", compound: false, anchor: { lift: "squat", ratio: 0.8 } },

  // ---- dumbbells / kettlebell (home with weights)
  "db-bench-press": { pattern: "h_push", needs: "dumbbells", compound: true, anchor: { lift: "bench", ratio: 0.37 } },
  "db-shoulder-press": { pattern: "v_push", needs: "dumbbells", compound: true, anchor: { lift: "bench", ratio: 0.25 } },
  "db-row": { pattern: "h_pull", needs: "dumbbells", compound: true, anchor: { lift: "bench", ratio: 0.38 } },
  "goblet-squat": { pattern: "squat", needs: "dumbbells", compound: true, anchor: { lift: "squat", ratio: 0.35 } },
  "db-romanian-deadlift": { pattern: "hinge", needs: "dumbbells", compound: true, anchor: { lift: "deadlift", ratio: 0.25 } },
  "db-lunge": { pattern: "lunge", needs: "dumbbells", compound: true, anchor: { lift: "squat", ratio: 0.17 } },
  "bulgarian-split-squat": { pattern: "lunge", needs: "dumbbells", compound: true, anchor: { lift: "squat", ratio: 0.15 } },
  "db-triceps-extension": { pattern: "triceps", needs: "dumbbells", compound: false, anchor: { lift: "bench", ratio: 0.2 } },
  "kettlebell-swing": { pattern: "glutes", needs: "dumbbells", compound: true, anchor: { lift: "deadlift", ratio: 0.25 } },

  // ---- bodyweight (reps)
  "push-up": { pattern: "h_push", needs: "bodyweight", compound: true, reps: R(8, 15, 25, 35), femaleFactor: 0.5 },
  "pike-push-up": { pattern: "v_push", needs: "bodyweight", compound: true, reps: R(3, 6, 10, 14), femaleFactor: 0.5 },
  "inverted-row": { pattern: "h_pull", needs: "bodyweight", compound: true, reps: R(5, 8, 12, 15), femaleFactor: 0.6 },
  "pull-up": { pattern: "v_pull", needs: "gym", compound: true, reps: R(1, 4, 8, 12), femaleFactor: 0.35 },
  "chin-up": { pattern: "v_pull", needs: "gym", compound: true, reps: R(1, 5, 9, 13), femaleFactor: 0.4 },
  dip: { pattern: "triceps", needs: "gym", compound: true, reps: R(3, 8, 14, 20), femaleFactor: 0.4 },
  "bench-dip": { pattern: "triceps", needs: "bodyweight", compound: false, reps: R(8, 12, 18, 25), femaleFactor: 0.7 },
  "hanging-leg-raise": { pattern: "core", needs: "gym", compound: false, reps: R(5, 8, 12, 15), femaleFactor: 0.7 },
  "bodyweight-squat": { pattern: "squat", needs: "bodyweight", compound: true, reps: R(15, 20, 30, 40), femaleFactor: 0.9 },
  "walking-lunge": { pattern: "lunge", needs: "bodyweight", compound: true, reps: R(8, 10, 15, 20), femaleFactor: 0.9 },
  "glute-bridge": { pattern: "glutes", needs: "bodyweight", compound: false, reps: R(15, 20, 25, 30), femaleFactor: 1 },
  burpee: { pattern: "conditioning", needs: "bodyweight", compound: true, reps: R(8, 10, 15, 20), femaleFactor: 0.8 },

  // ---- timed holds
  plank: { pattern: "core", needs: "bodyweight", compound: false, seconds: R(30, 45, 75, 105), femaleFactor: 0.9 },
  "side-plank": { pattern: "core", needs: "bodyweight", compound: false, seconds: R(20, 30, 45, 60), femaleFactor: 0.9 },
  "hollow-hold": { pattern: "core", needs: "bodyweight", compound: false, seconds: R(15, 20, 30, 45), femaleFactor: 0.9 },
  "dead-hang": { pattern: "v_pull", needs: "gym", compound: false, seconds: R(15, 25, 40, 60), femaleFactor: 0.7 },
  "wall-sit": { pattern: "squat", needs: "bodyweight", compound: false, seconds: R(30, 45, 60, 90), femaleFactor: 0.9 },

  // ---- cardio
  running: { pattern: "cardio", needs: "bodyweight", compound: true },
  cycling: { pattern: "cardio", needs: "gym", compound: true },
  rowing: { pattern: "cardio", needs: "gym", compound: true },
  "jump-rope": { pattern: "cardio", needs: "bodyweight", compound: true },
};

const LEVEL_RANK: Record<EquipmentLevel, number> = { bodyweight: 0, dumbbells: 1, gym: 2 };

/** Can someone with `available` equipment do an exercise that needs `needs`? */
export function equipmentAllows(available: EquipmentLevel, needs: EquipmentLevel) {
  return LEVEL_RANK[needs] <= LEVEL_RANK[available];
}

/** Body areas the questionnaire offers as "focus", mapped to movement patterns. */
export const FOCUS_PATTERNS: Record<string, Pattern[]> = {
  chest: ["h_push"],
  back: ["h_pull", "v_pull"],
  shoulders: ["v_push", "delts"],
  arms: ["biceps", "triceps"],
  legs: ["squat", "hinge", "lunge", "calves"],
  glutes: ["glutes", "hinge", "lunge"],
  core: ["core"],
};
