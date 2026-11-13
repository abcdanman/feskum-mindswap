-- Admin wants to save a speaker as a placeholder and fill in details
-- later — every field was previously mandatory at the DB level (NOT
-- NULL), blocking a save with anything left blank. Drop those
-- constraints; the UI already treats a missing field as blank text.
-- Additive migration. Run in Supabase SQL Editor.

alter table public.speakers
  alter column name drop not null,
  alter column position drop not null,
  alter column organisation drop not null,
  alter column bio drop not null,
  alter column session_title drop not null,
  alter column session_time drop not null;

NOTIFY pgrst, 'reload schema';
