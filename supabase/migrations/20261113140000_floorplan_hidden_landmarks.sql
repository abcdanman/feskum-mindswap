-- Extends the floor-plan hide feature beyond empty booth slots to the
-- non-booth landmarks too (stage, seating, judges, backstage, etc.) — an
-- admin may want to hide one of those from the public map as well.
-- Additive migration. Run in Supabase SQL Editor.

alter table public.floorplan_settings
  add column if not exists hidden_landmarks text[] not null default '{}';

NOTIFY pgrst, 'reload schema';
