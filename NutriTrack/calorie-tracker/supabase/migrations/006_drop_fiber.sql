-- Fiber turned out to have poor OFF coverage — removing it from the app
-- and the database to keep the model tight around what we actually track.

alter table public.foods drop column if exists fiber_per_100g;
alter table public.user_settings drop column if exists fiber_goal;
