-- Stage 3: exercises, workouts, sets, routines and body measurements.
-- Run once in the Supabase dashboard → SQL Editor, after 0001_profiles.sql.
--
-- Security model (same for every table):
--   * row level security is on; a user can only see and change rows they own
--   * built-in exercises (owner_id is null) are readable by every signed-in user
--   * signed-out visitors (anon) get no access at all
--   * table privileges are granted explicitly, column by column where it matters,
--     because the project does not auto-expose new tables

------------------------------------------------------------------------------
-- Exercises
------------------------------------------------------------------------------
create table public.exercises (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references auth.users (id) on delete cascade default auth.uid(),
  slug                text unique, -- only for built-in exercises
  name                text not null check (char_length(btrim(name)) between 1 and 60),
  kind                text not null check (kind in ('strength', 'bodyweight', 'cardio', 'timed')),
  primary_muscle      text not null check (primary_muscle in ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'full body', 'cardio')),
  equipment           text not null check (equipment in ('barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'bodyweight', 'band', 'cardio machine', 'none')),
  weight_increment_kg numeric(5, 2) not null default 2.5 check (weight_increment_kg between 0 and 50),
  archived            boolean not null default false,
  created_at          timestamptz not null default now(),
  constraint exercises_builtin_has_slug check ((owner_id is null) = (slug is not null))
);
create unique index exercises_owner_name_unique on public.exercises (owner_id, lower(name)) where not archived;

alter table public.exercises enable row level security;
create policy "Read built-in and own exercises" on public.exercises for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "Create own exercises" on public.exercises for insert to authenticated
  with check (owner_id = (select auth.uid()) and slug is null);
create policy "Update own exercises" on public.exercises for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and slug is null);
create policy "Delete own exercises" on public.exercises for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.exercises from anon, authenticated;
grant select, delete on public.exercises to authenticated;
grant insert (name, kind, primary_muscle, equipment, weight_increment_kg) on public.exercises to authenticated;
-- kind can't change after creation: existing sets depend on it
grant update (name, primary_muscle, equipment, weight_increment_kg, archived) on public.exercises to authenticated;

------------------------------------------------------------------------------
-- Workouts → workout_exercises → sets
------------------------------------------------------------------------------
create table public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null default 'Workout' check (char_length(btrim(title)) between 1 and 80),
  started_at timestamptz not null,
  ended_at   timestamptz not null,
  notes      text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  constraint workouts_time_order check (ended_at >= started_at and ended_at - started_at <= interval '24 hours')
);
create index workouts_user_started on public.workouts (user_id, started_at desc);

create table public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position    smallint not null check (position >= 0),
  notes       text check (char_length(notes) <= 1000)
);
create index workout_exercises_workout on public.workout_exercises (workout_id);
create index workout_exercises_user_exercise on public.workout_exercises (user_id, exercise_id);
create index workout_exercises_exercise on public.workout_exercises (exercise_id);

create table public.sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position            smallint not null check (position >= 0),
  type                text not null default 'working' check (type in ('warmup', 'working', 'drop', 'failure')),
  weight_kg           numeric(6, 2) check (weight_kg between 0 and 1000),
  reps                smallint check (reps between 0 and 1000),
  duration_s          integer check (duration_s between 0 and 86400),
  distance_m          integer check (distance_m between 0 and 1000000),
  rpe                 numeric(3, 1) check (rpe between 1 and 10),
  completed           boolean not null default true
);
create index sets_workout_exercise on public.sets (workout_exercise_id);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets enable row level security;

create policy "Own workouts" on public.workouts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Read own workout exercises" on public.workout_exercises for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Add exercises to own workouts" on public.workout_exercises for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.owner_id is null or e.owner_id = (select auth.uid())))
  );
create policy "Delete own workout exercises" on public.workout_exercises for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Read own sets" on public.sets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Add sets to own workouts" on public.sets for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_exercises we where we.id = workout_exercise_id and we.user_id = (select auth.uid()))
  );
create policy "Delete own sets" on public.sets for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.workouts, public.workout_exercises, public.sets from anon, authenticated;
grant select, delete on public.workouts, public.workout_exercises, public.sets to authenticated;
grant insert (title, started_at, ended_at, notes) on public.workouts to authenticated;
grant update (title, notes) on public.workouts to authenticated;
grant insert (workout_id, exercise_id, position, notes) on public.workout_exercises to authenticated;
grant insert (workout_exercise_id, position, type, weight_kg, reps, duration_s, distance_m, rpe, completed) on public.sets to authenticated;

------------------------------------------------------------------------------
-- Routines (saved plans)
------------------------------------------------------------------------------
create table public.routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  notes      text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routines_user on public.routines (user_id);

create table public.routine_exercises (
  id           uuid primary key default gen_random_uuid(),
  routine_id   uuid not null references public.routines (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete restrict,
  position     smallint not null check (position >= 0),
  target_sets  smallint not null default 3 check (target_sets between 1 and 20),
  target_reps  smallint check (target_reps between 1 and 100),
  rest_seconds smallint not null default 90 check (rest_seconds between 0 and 900)
);
create index routine_exercises_routine on public.routine_exercises (routine_id);
create index routine_exercises_exercise on public.routine_exercises (exercise_id);

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;

create policy "Own routines" on public.routines for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Read own routine exercises" on public.routine_exercises for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Add exercises to own routines" on public.routine_exercises for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r where r.id = routine_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.owner_id is null or e.owner_id = (select auth.uid())))
  );
create policy "Delete own routine exercises" on public.routine_exercises for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.routines, public.routine_exercises from anon, authenticated;
grant select, delete on public.routines, public.routine_exercises to authenticated;
grant insert (name, notes) on public.routines to authenticated;
grant update (name, notes, updated_at) on public.routines to authenticated;
grant insert (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds) on public.routine_exercises to authenticated;

------------------------------------------------------------------------------
-- Body measurements (one entry per day)
------------------------------------------------------------------------------
create table public.body_measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on  date not null,
  weight_kg    numeric(5, 2) check (weight_kg between 20 and 400),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  waist_cm     numeric(5, 1) check (waist_cm between 20 and 300),
  chest_cm     numeric(5, 1) check (chest_cm between 20 and 300),
  hips_cm      numeric(5, 1) check (hips_cm between 20 and 300),
  arm_cm       numeric(5, 1) check (arm_cm between 10 and 100),
  thigh_cm     numeric(5, 1) check (thigh_cm between 10 and 150),
  notes        text check (char_length(notes) <= 500),
  created_at   timestamptz not null default now(),
  constraint body_measurements_one_per_day unique (user_id, measured_on),
  constraint body_measurements_has_value check (num_nonnulls(weight_kg, body_fat_pct, waist_cm, chest_cm, hips_cm, arm_cm, thigh_cm) > 0)
);

alter table public.body_measurements enable row level security;
create policy "Own measurements" on public.body_measurements for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.body_measurements from anon, authenticated;
grant select, delete on public.body_measurements to authenticated;
grant insert (measured_on, weight_kg, body_fat_pct, waist_cm, chest_cm, hips_cm, arm_cm, thigh_cm, notes) on public.body_measurements to authenticated;
-- measured_on is included so "save today's entry again" can upsert (insert … on conflict do update)
grant update (measured_on, weight_kg, body_fat_pct, waist_cm, chest_cm, hips_cm, arm_cm, thigh_cm, notes) on public.body_measurements to authenticated;

------------------------------------------------------------------------------
-- Functions. "security invoker": they run as the calling user, so every insert
-- above is still checked by row level security. They exist so a whole workout
-- (or routine) is saved in one transaction: all of it or nothing.
------------------------------------------------------------------------------

-- payload: [{ title, started_at, ended_at, notes, exercises: [{ exercise_id, notes, sets: [{ type, weight_kg, reps, duration_s, distance_m, rpe, completed }] }] }]
create function public.save_workouts(payload jsonb)
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
    insert into public.workouts (title, started_at, ended_at, notes)
    values (
      coalesce(nullif(btrim(w ->> 'title'), ''), 'Workout'),
      (w ->> 'started_at')::timestamptz,
      (w ->> 'ended_at')::timestamptz,
      nullif(w ->> 'notes', '')
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
        insert into public.sets (workout_exercise_id, position, type, weight_kg, reps, duration_s, distance_m, rpe, completed)
        values (
          weid, spos, coalesce(s ->> 'type', 'working'),
          (s ->> 'weight_kg')::numeric, (s ->> 'reps')::smallint, (s ->> 'duration_s')::integer,
          (s ->> 'distance_m')::integer, (s ->> 'rpe')::numeric, coalesce((s ->> 'completed')::boolean, true)
        );
        spos := spos + 1;
      end loop;
    end loop;
  end loop;
  return ids;
end;
$$;

-- payload: { id?, name, notes, exercises: [{ exercise_id, target_sets, target_reps, rest_seconds }] }
create function public.save_routine(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  rid uuid := nullif(payload ->> 'id', '')::uuid;
  e jsonb;
  pos int := 0;
begin
  if rid is null then
    insert into public.routines (name, notes)
    values (btrim(payload ->> 'name'), nullif(payload ->> 'notes', ''))
    returning id into rid;
  else
    update public.routines
       set name = btrim(payload ->> 'name'), notes = nullif(payload ->> 'notes', ''), updated_at = now()
     where id = rid;
    if not found then
      raise exception 'routine not found';
    end if;
    delete from public.routine_exercises where routine_id = rid;
  end if;
  for e in select value from jsonb_array_elements(coalesce(payload -> 'exercises', '[]'::jsonb)) loop
    insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds)
    values (
      rid, (e ->> 'exercise_id')::uuid, pos,
      coalesce((e ->> 'target_sets')::smallint, 3), (e ->> 'target_reps')::smallint, coalesce((e ->> 'rest_seconds')::smallint, 90)
    );
    pos := pos + 1;
  end loop;
  return rid;
end;
$$;

revoke execute on function public.save_workouts(jsonb), public.save_routine(jsonb) from public, anon;
grant execute on function public.save_workouts(jsonb), public.save_routine(jsonb) to authenticated;

------------------------------------------------------------------------------
-- Built-in exercise library
------------------------------------------------------------------------------
insert into public.exercises (owner_id, slug, name, kind, primary_muscle, equipment, weight_increment_kg) values
  (null, 'bench-press',        'Bench Press',            'strength',   'chest',      'barbell',        2.5),
  (null, 'incline-db-press',   'Incline Dumbbell Press', 'strength',   'chest',      'dumbbell',       2),
  (null, 'overhead-press',     'Overhead Press',         'strength',   'shoulders',  'barbell',        2.5),
  (null, 'lateral-raise',      'Lateral Raise',          'strength',   'shoulders',  'dumbbell',       1),
  (null, 'deadlift',           'Deadlift',               'strength',   'back',       'barbell',        5),
  (null, 'barbell-row',        'Barbell Row',            'strength',   'back',       'barbell',        2.5),
  (null, 'lat-pulldown',       'Lat Pulldown',           'strength',   'back',       'cable',          2.5),
  (null, 'bicep-curl',         'Dumbbell Curl',          'strength',   'biceps',     'dumbbell',       1),
  (null, 'triceps-pushdown',   'Triceps Pushdown',       'strength',   'triceps',    'cable',          2.5),
  (null, 'squat',              'Back Squat',             'strength',   'quads',      'barbell',        2.5),
  (null, 'romanian-deadlift',  'Romanian Deadlift',      'strength',   'hamstrings', 'barbell',        2.5),
  (null, 'leg-press',          'Leg Press',              'strength',   'quads',      'machine',        5),
  (null, 'hip-thrust',         'Hip Thrust',             'strength',   'glutes',     'barbell',        5),
  (null, 'calf-raise',         'Standing Calf Raise',    'strength',   'calves',     'machine',        5),
  (null, 'pull-up',            'Pull-up',                'bodyweight', 'back',       'bodyweight',     2.5),
  (null, 'chin-up',            'Chin-up',                'bodyweight', 'biceps',     'bodyweight',     2.5),
  (null, 'dip',                'Dip',                    'bodyweight', 'triceps',    'bodyweight',     2.5),
  (null, 'push-up',            'Push-up',                'bodyweight', 'chest',      'bodyweight',     2.5),
  (null, 'hanging-leg-raise',  'Hanging Leg Raise',      'bodyweight', 'core',       'bodyweight',     2.5),
  (null, 'plank',              'Plank',                  'timed',      'core',       'none',           2.5),
  (null, 'side-plank',         'Side Plank',             'timed',      'core',       'none',           2.5),
  (null, 'dead-hang',          'Dead Hang',              'timed',      'back',       'bodyweight',     2.5),
  (null, 'wall-sit',           'Wall Sit',               'timed',      'quads',      'none',           2.5),
  (null, 'running',            'Running',                'cardio',     'cardio',     'none',           0),
  (null, 'cycling',            'Cycling',                'cardio',     'cardio',     'none',           0),
  (null, 'rowing',             'Rowing Machine',         'cardio',     'cardio',     'cardio machine', 0),
  (null, 'jump-rope',          'Jump Rope',              'cardio',     'cardio',     'none',           0);
