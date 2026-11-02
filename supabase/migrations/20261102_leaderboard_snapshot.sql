-- Precomputed leaderboard snapshot. Load testing found the on-demand
-- leaderboard (4 full-table reads + in-memory aggregation per request)
-- collapsing under concurrent load: every request races past an empty
-- cache and hits Postgres independently. A shared snapshot row, with an
-- atomic claim so only one request recomputes it at a time, fixes this
-- across serverless instances (an in-memory single-flight cannot, since
-- concurrent requests may land on different, memory-isolated instances).
-- Additive migration. Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  day TEXT PRIMARY KEY,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  computing_since TIMESTAMPTZ NULL
);

ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public CRUD leaderboard_snapshots" ON public.leaderboard_snapshots;

REVOKE ALL ON TABLE public.leaderboard_snapshots FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
