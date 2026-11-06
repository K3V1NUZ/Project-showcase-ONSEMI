-- Split the single `name` column into slovak_name + english_name so we
-- can match either language when searching, while only ever displaying
-- the Slovak one.

alter table public.foods rename column name to slovak_name;

alter table public.foods
  add column if not exists english_name text;

notify pgrst, 'reload schema';
