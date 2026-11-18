-- Height range = human records: 54.6 cm (Chandra Bahadur Dangi, shortest adult ever measured)
-- to 272 cm (Robert Wadlow, tallest person ever). Was 100–250 cm.
-- Run once in the Supabase dashboard → SQL Editor, after 0005_goals.sql.
-- Only widens the allowed range, so it's safe to run before or after the code update.

alter table public.profiles drop constraint if exists profiles_height_cm_check;
alter table public.profiles add constraint profiles_height_cm_check check (height_cm between 54 and 272);

-- Goals: an early draft of 0005 had one-goal-per-exercise unique indexes. The app now saves a
-- new goal before deleting the old one, which those indexes would block. Safe to run either way.
drop index if exists public.goals_one_per_exercise;
drop index if exists public.goals_one_body_weight;
create index if not exists goals_user on public.goals (user_id);
