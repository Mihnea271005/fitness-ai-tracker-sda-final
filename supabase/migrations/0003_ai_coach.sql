-- Stage 4: AI coach — training profile, set feedback, plan days, home exercises.
-- Run once in the Supabase dashboard → SQL Editor, after 0002_training_data.sql.

------------------------------------------------------------------------------
-- Training profile (the onboarding questionnaire). All optional; private like
-- the rest of the profile row (existing row level security applies).
------------------------------------------------------------------------------
alter table public.profiles
  add column sex             text not null default 'unspecified' check (sex in ('male', 'female', 'unspecified')),
  add column birth_year      smallint check (birth_year between 1900 and 2020),
  add column height_cm       numeric(5, 1) check (height_cm between 100 and 250),
  add column experience      text check (experience in ('new', 'under_1', '1_to_3', 'over_3')),
  add column days_per_week   smallint check (days_per_week between 1 and 7),
  add column session_minutes smallint check (session_minutes between 15 and 180),
  add column goal            text check (goal in ('strength', 'muscle', 'general', 'endurance', 'fat_loss')),
  add column focus           text[] not null default '{}'
                               check (focus <@ array['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core']::text[]),
  add column equipment       text check (equipment in ('gym', 'dumbbells', 'bodyweight')),
  add column avoid_exercises uuid[] not null default '{}' check (cardinality(avoid_exercises) <= 100),
  add column plan_mode       text not null default 'session' check (plan_mode in ('session', 'weekly')),
  add column onboarded_at    timestamptz;

grant update (sex, birth_year, height_cm, experience, days_per_week, session_minutes, goal, focus, equipment, avoid_exercises, plan_mode, onboarded_at)
  on public.profiles to authenticated;

------------------------------------------------------------------------------
-- "How did that set feel?" (-1 too hard, 0 just right, 1 too easy) and the
-- split day a generated workout belongs to (used to rotate days).
------------------------------------------------------------------------------
alter table public.sets add column feel smallint check (feel in (-1, 0, 1));
grant insert (feel) on public.sets to authenticated;

alter table public.workouts add column plan_day text check (plan_day ~ '^[a-z_]{1,20}$');
grant insert (plan_day) on public.workouts to authenticated;

create or replace function public.save_workouts(payload jsonb)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  w jsonb; e jsonb; s jsonb;
  wid uuid; weid uuid;
  ids uuid[] := '{}';
  epos int; spos int;
begin
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) not between 1 and 500 then
    raise exception 'payload must be an array of 1–500 workouts';
  end if;
  for w in select value from jsonb_array_elements(payload) loop
    insert into public.workouts (title, started_at, ended_at, notes, plan_day)
    values (
      coalesce(nullif(btrim(w ->> 'title'), ''), 'Workout'),
      (w ->> 'started_at')::timestamptz,
      (w ->> 'ended_at')::timestamptz,
      nullif(w ->> 'notes', ''),
      nullif(w ->> 'plan_day', '')
    )
    returning id into wid;
    ids := ids || wid;
    epos := 0;
    for e in select value from jsonb_array_elements(coalesce(w -> 'exercises', '[]'::jsonb)) loop
      insert into public.workout_exercises (workout_id, exercise_id, position, notes)
      values (wid, (e ->> 'exercise_id')::uuid, epos, nullif(e ->> 'notes', ''))
      returning id into weid;
      epos := epos + 1;
      spos := 0;
      for s in select value from jsonb_array_elements(coalesce(e -> 'sets', '[]'::jsonb)) loop
        insert into public.sets (workout_exercise_id, position, type, weight_kg, reps, duration_s, distance_m, rpe, completed, feel)
        values (
          weid, spos, coalesce(s ->> 'type', 'working'),
          (s ->> 'weight_kg')::numeric, (s ->> 'reps')::smallint, (s ->> 'duration_s')::integer,
          (s ->> 'distance_m')::integer, (s ->> 'rpe')::numeric, coalesce((s ->> 'completed')::boolean, true),
          (s ->> 'feel')::smallint
        );
        spos := spos + 1;
      end loop;
    end loop;
  end loop;
  return ids;
end;
$$;

------------------------------------------------------------------------------
-- More built-in exercises, so home workouts (dumbbells / bodyweight) work.
-- Dumbbell weights are logged per dumbbell.
------------------------------------------------------------------------------
insert into public.exercises (owner_id, slug, name, kind, primary_muscle, equipment, weight_increment_kg) values
  (null, 'db-bench-press',       'Dumbbell Bench Press',    'strength',   'chest',      'dumbbell',   2),
  (null, 'db-shoulder-press',    'Dumbbell Shoulder Press', 'strength',   'shoulders',  'dumbbell',   2),
  (null, 'db-row',               'One-Arm Dumbbell Row',    'strength',   'back',       'dumbbell',   2),
  (null, 'goblet-squat',         'Goblet Squat',            'strength',   'quads',      'dumbbell',   2),
  (null, 'db-romanian-deadlift', 'Dumbbell Romanian Deadlift', 'strength', 'hamstrings', 'dumbbell',  2),
  (null, 'db-lunge',             'Dumbbell Lunge',          'strength',   'quads',      'dumbbell',   2),
  (null, 'bulgarian-split-squat','Bulgarian Split Squat',   'strength',   'quads',      'dumbbell',   2),
  (null, 'db-triceps-extension', 'Overhead Triceps Extension', 'strength', 'triceps',   'dumbbell',   2),
  (null, 'kettlebell-swing',     'Kettlebell Swing',        'strength',   'glutes',     'kettlebell', 4),
  (null, 'bodyweight-squat',     'Bodyweight Squat',        'bodyweight', 'quads',      'bodyweight', 2.5),
  (null, 'walking-lunge',        'Walking Lunge',           'bodyweight', 'quads',      'bodyweight', 2.5),
  (null, 'glute-bridge',         'Glute Bridge',            'bodyweight', 'glutes',     'bodyweight', 2.5),
  (null, 'inverted-row',         'Inverted Row',            'bodyweight', 'back',       'bodyweight', 2.5),
  (null, 'pike-push-up',         'Pike Push-up',            'bodyweight', 'shoulders',  'bodyweight', 2.5),
  (null, 'bench-dip',            'Bench Dip',               'bodyweight', 'triceps',    'bodyweight', 2.5),
  (null, 'burpee',               'Burpee',                  'bodyweight', 'full body',  'bodyweight', 2.5),
  (null, 'hollow-hold',          'Hollow Hold',             'timed',      'core',       'none',       2.5);
