-- Add fiber to foods so it can be tracked per portion, and add carbs/fiber
-- goals to user_settings so the recommendation covers all four macros.

alter table public.foods
  add column if not exists fiber_per_100g numeric not null default 0
    check (fiber_per_100g >= 0);

alter table public.user_settings
  add column if not exists carbs_goal int not null default 250,
  add column if not exists fiber_goal int not null default 30;
