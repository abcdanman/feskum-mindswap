-- Lets admin assign each booth to one of the 17 numbered faculty positions
-- on the physical venue floor plan. Purely a labeling field for now — no
-- uniqueness constraint, since assignments are still being finalized.
-- Additive migration. Run in Supabase SQL Editor.

ALTER TABLE public.checkpoints ADD COLUMN IF NOT EXISTS map_label INT NULL;

NOTIFY pgrst, 'reload schema';
