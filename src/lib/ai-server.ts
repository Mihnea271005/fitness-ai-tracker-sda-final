import "server-only";
import { cache } from "react";
import { getCurrentUser } from "./auth";
import { getGoals, getExercises, getMeasurements, getTimeZone, getWorkouts } from "./data";
import { coachProfile, locationsOf, trainingSettings } from "./ai/coach";
import { generateWorkout, type GeneratedWorkout } from "./ai/generator";
import { goalStatuses } from "./ai/goals";
import { todayPlan, type TodayPlan } from "./ai/today";
import { localYmd } from "./format";

/** Everything the pages need from the AI for the signed-in user, computed once per request. */
export const getCoach = cache(async () => {
  const [profile, exercises, workouts, measurements, goals, tz] = await Promise.all([getCurrentUser(), getExercises(), getWorkouts(), getMeasurements(), getGoals(), getTimeZone()]);
  const now = new Date();
  const coach = coachProfile(profile, measurements, now);
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
  const goalList = goalStatuses(goals, exerciseMap, workouts, measurements, profile.unit, now);
  const settings = trainingSettings(profile, undefined, goalList);
  const today: TodayPlan = todayPlan(settings, workouts, now, tz);
  // One version of today's workout per place they train (gym / home with weights / bodyweight).
  const plans = today.dayType
    ? locationsOf(profile).map((location) => ({
        location,
        plan: generateWorkout(today.dayType!, trainingSettings(profile, location, goalList), coach, exercises, workouts, profile.unit, localYmd(now, tz)),
      }))
    : [];
  const plan: GeneratedWorkout | null = plans[0]?.plan ?? null;
  return { profile, exercises, workouts, measurements, coach, settings, today, plan, plans, goals: goalList, tz, now };
});
