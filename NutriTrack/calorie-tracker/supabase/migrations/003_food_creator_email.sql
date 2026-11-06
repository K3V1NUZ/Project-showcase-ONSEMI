-- Log the email of whoever added each food. Not shown in the app UI — used
-- for future attribution / cleanup if a bad entry ever needs tracing.
-- Backfilled to NULL for existing rows.

alter table public.foods
  add column if not exists created_by_email text;
