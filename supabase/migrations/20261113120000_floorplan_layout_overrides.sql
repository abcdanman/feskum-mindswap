-- Lets admin drag booth slots and landmarks to new positions on the floor
-- plan editor, persisted so the public map reflects the same layout.
-- Keyed overrides on top of the hand-tuned default layout in floorplan.ts,
-- not a full replacement — see src/lib/floorplan.ts applyLayoutOverrides.
-- Additive migration. Run in Supabase SQL Editor.

alter table public.floorplan_settings
  add column if not exists layout_overrides jsonb not null default '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
