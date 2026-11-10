-- Lets admin tag each booth with a color on the floor plan editor, for
-- visual grouping (zones, categories, status) beyond the plain position
-- assignment. Stores a short palette token (e.g. 'brand', 'gold'), not a
-- raw hex, so the editor and public map can share one color mapping.
-- Additive migration. Run in Supabase SQL Editor.

ALTER TABLE public.checkpoints ADD COLUMN IF NOT EXISTS map_color TEXT NULL;

NOTIFY pgrst, 'reload schema';
