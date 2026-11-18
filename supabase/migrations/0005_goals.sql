-- Stage 4: personal goals ("Bench 100 kg", "5 km under 25 min", "Reach 75 kg body weight").
-- Run once in the Supabase dashboard → SQL Editor, after 0004_training_locations.sql.
-- Additive only: a new table, nothing existing is changed.
--
-- Progress, projections and "achieved" are computed in the app from logged workouts and
-- measurements (src/lib/ai/goals.ts), so nothing here needs to be kept in sync.

create table public.goals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind              text not null check (kind in ('exercise', 'body_weight')),
  exercise_id       uuid references public.exercises (id) on delete cascade,
  -- Targets, by what the exercise measures:
  --   strength      → weight_kg × reps        bodyweight → reps (in one set)
  --   timed         → seconds                 cardio     → distance_m within seconds
  --   body_weight   → weight_kg
  target_weight_kg  numeric(6, 2) check (target_weight_kg between 1 and 1000),
  target_reps       smallint check (target_reps between 1 and 1000),
  target_seconds    integer check (target_seconds between 1 and 86400),
  target_distance_m integer check (target_distance_m between 100 and 1000000),
  -- Where the user stood when the goal was set (same metric as progress), for the progress bar.
  baseline          numeric(10, 3) check (baseline >= 0),
  deadline          date,
  created_at        timestamptz not null default now(),
  constraint goals_exercise_matches_kind check ((kind = 'exercise') = (exercise_id is not null)),
  constraint goals_has_target check (num_nonnulls(target_weight_kg, target_reps, target_seconds, target_distance_m) > 0)
);

-- One goal per exercise and one body-weight goal: the app inserts the new goal first, then
-- deletes the old one (so a failed save never loses a goal). No unique index for that reason.
create index goals_user on public.goals (user_id);

alter table public.goals enable row level security;
create policy "Read own goals" on public.goals for select to authenticated
  using (user_id = (select auth.uid()));
-- The exercise must be one the user can see (built-in or their own).
create policy "Create own goals" on public.goals for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (exercise_id is null or exists (
      select 1 from public.exercises e
      where e.id = exercise_id and (e.owner_id is null or e.owner_id = (select auth.uid()))
    ))
  );
create policy "Delete own goals" on public.goals for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.goals from anon, authenticated;
grant select, delete on public.goals to authenticated;
grant insert (kind, exercise_id, target_weight_kg, target_reps, target_seconds, target_distance_m, baseline, deadline)
  on public.goals to authenticated;
