import "server-only";
import { cache } from "react";
import { getCurrentUser } from "./auth";
import { getExercises, getMeasurements, getTimeZone, getWorkouts } from "./data";
import { coachProfile, trainingSettings } from "./ai/coach";
import { generateWorkout, type GeneratedWorkout } from "./ai/generator";
import { todayPlan, type TodayPlan } from "./ai/today";
import { localYmd } from "./format";

/** Everything the pages need from the AI for the signed-in user, computed once per request. */
export const getCoach = cache(async () => {
  const [profile, exercises, workouts, measurements, tz] = await Promise.all([getCurrentUser(), getExercises(), getWorkouts(), getMeasurements(), getTimeZone()]);
  const now = new Date();
  const coach = coachProfile(profile, measurements, now);
  const settings = trainingSettings(profile);
  const today: TodayPlan = todayPlan(settings, workouts, now, tz);
  const plan: GeneratedWorkout | null = today.dayType
    ? generateWorkout(today.dayType, settings, coach, exercises, workouts, profile.unit, localYmd(now, tz))
    : null;
  return { profile, exercises, workouts, coach, settings, today, plan, tz, now };
});
