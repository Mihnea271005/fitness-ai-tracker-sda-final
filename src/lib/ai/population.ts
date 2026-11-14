// The "no history yet" model: predicts squat / bench / deadlift from sex, age and body
// weight, using coefficients trained offline on OpenPowerlifting data
// (ml/train_strength_model.py → strength-model.json).

import model from "./strength-model.json";
import type { Anchor, Experience } from "./catalog";

export type Sex = "male" | "female" | "unspecified";

interface Coefs {
  intercept: number;
  coef: number[];
  resid_p25: number;
  resid_p75: number;
}

const MODELS = model.models as Record<Anchor, Record<"M" | "F", Coefs>>;

/**
 * The model describes lifters at their first raw competition — already trained.
 * These factors scale it to people with less training. They are deliberately
 * conservative: logged workouts take over after a session or two.
 */
export const EXPERIENCE_FACTOR: Record<Experience, number> = {
  new: 0.4,
  under_1: 0.55,
  "1_to_3": 0.75,
  over_3: 0.9,
};

export const DEFAULT_BODYWEIGHT: Record<Sex, number> = { male: 80, female: 65, unspecified: 72 };
export const DEFAULT_AGE = 30;

function predictOne(c: Coefs, age: number, bodyweightKg: number): number {
  const a = (age - 30) / 10;
  const x = [Math.log(bodyweightKg), a, a * a, a * a * a];
  return Math.exp(c.intercept + c.coef.reduce((t, k, i) => t + k * x[i], 0));
}

/** Typical best lift (kg) for a first-time raw competitor with this profile. */
export function predictCompetitionLift(lift: Anchor, sex: Sex, age = DEFAULT_AGE, bodyweightKg?: number): number {
  const bw = Math.min(Math.max(bodyweightKg ?? DEFAULT_BODYWEIGHT[sex], 40), 180);
  const ag = Math.min(Math.max(age, 16), 75);
  if (sex === "male") return predictOne(MODELS[lift].M, ag, bw);
  if (sex === "female") return predictOne(MODELS[lift].F, ag, bw);
  // "Prefer not to say": geometric mean of both models.
  return Math.sqrt(predictOne(MODELS[lift].M, ag, bw) * predictOne(MODELS[lift].F, ag, bw));
}

/** Estimated one-rep max (kg) for someone with this profile and experience. */
export function predictOneRepMax(lift: Anchor, sex: Sex, experience: Experience, age?: number, bodyweightKg?: number): number {
  return predictCompetitionLift(lift, sex, age, bodyweightKg) * EXPERIENCE_FACTOR[experience];
}

export const MODEL_INFO = { trainedOn: model.trained_on, source: model.source, evaluation: model.evaluation };
