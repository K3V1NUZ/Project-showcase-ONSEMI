-- Profile fields used to compute a recommended calorie intake
-- (Mifflin-St Jeor BMR × activity multiplier × goal adjustment).
-- All nullable so existing user_settings rows keep working; validation
-- is enforced app-side.

alter table public.user_settings
  add column if not exists weight_kg numeric,
  add column if not exists height_cm int,
  add column if not exists age int,
  add column if not exists sex text,
  add column if not exists activity_level text,
  add column if not exists weight_goal text;
