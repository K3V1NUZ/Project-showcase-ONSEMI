-- Add image_url to foods so recent/logged entries can show the OFF thumbnail.
alter table public.foods
  add column if not exists image_url text;

-- Meals: user-defined combos of foods (e.g. "Morning smoothie" = milk + banana + oats).
-- Logging a meal expands into N meal_entries so past logs aren't affected by later
-- recipe edits.

create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.meal_components (
  id          uuid primary key default gen_random_uuid(),
  meal_id     uuid not null references public.meals(id) on delete cascade,
  food_id     uuid not null references public.foods(id) on delete restrict,
  grams       numeric not null check (grams > 0),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists meals_user_idx
  on public.meals (created_by);
create index if not exists meal_components_meal_idx
  on public.meal_components (meal_id);

alter table public.meals            enable row level security;
alter table public.meal_components  enable row level security;

drop policy if exists "meals self select" on public.meals;
drop policy if exists "meals self insert" on public.meals;
drop policy if exists "meals self update" on public.meals;
drop policy if exists "meals self delete" on public.meals;

create policy "meals self select" on public.meals
  for select using (auth.uid() = created_by);
create policy "meals self insert" on public.meals
  for insert with check (auth.uid() = created_by);
create policy "meals self update" on public.meals
  for update using (auth.uid() = created_by);
create policy "meals self delete" on public.meals
  for delete using (auth.uid() = created_by);

drop policy if exists "meal_components self select" on public.meal_components;
drop policy if exists "meal_components self insert" on public.meal_components;
drop policy if exists "meal_components self delete" on public.meal_components;

create policy "meal_components self select" on public.meal_components
  for select using (
    exists (select 1 from public.meals m
            where m.id = meal_id and m.created_by = auth.uid())
  );
create policy "meal_components self insert" on public.meal_components
  for insert with check (
    exists (select 1 from public.meals m
            where m.id = meal_id and m.created_by = auth.uid())
  );
create policy "meal_components self delete" on public.meal_components
  for delete using (
    exists (select 1 from public.meals m
            where m.id = meal_id and m.created_by = auth.uid())
  );
