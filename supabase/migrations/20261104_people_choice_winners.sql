-- People's Choice Award rework: judges pick the top 3 (marked as winners
-- and excluded from the public vote); the remaining speakers become
-- eligible for a separate People's Choice vote, which starts OFF until
-- admin turns it on. The voting_events.is_active column already existed
-- in schema.sql but was never actually enforced anywhere — this migration
-- both adds the winner flag and flips the seeded event to inactive so the
-- feature starts in the correct "not open yet" state.
-- Additive migration. Run in Supabase SQL Editor.

ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS is_winner BOOLEAN NOT NULL DEFAULT false;

UPDATE public.voting_events
SET is_active = false
WHERE id = '00000000-0000-0000-0000-000000000002';

NOTIFY pgrst, 'reload schema';
