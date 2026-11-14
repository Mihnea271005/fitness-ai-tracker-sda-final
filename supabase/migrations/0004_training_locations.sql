-- Training locations: people can train in more than one place (e.g. gym + home).
-- Replaces the single `equipment` choice with a list; existing answers are kept.
-- Run once in the Supabase dashboard → SQL Editor, after 0003_ai_coach.sql.

alter table public.profiles
  add column locations text[] not null default '{}'
    check (locations <@ array['gym', 'dumbbells', 'bodyweight']::text[]);

update public.profiles set locations = array[equipment] where equipment is not null;

alter table public.profiles drop column equipment;

grant update (locations) on public.profiles to authenticated;
