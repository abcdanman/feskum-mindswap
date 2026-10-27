-- MindSwap @ FESKUM 2026
-- Partner booths, optional quizzes, unique usernames, and points-based ranking.
-- Additive migration. Run in Supabase SQL Editor.

-- ------------------------------------------------------------
-- 1. VISITOR USERNAMES
-- ------------------------------------------------------------
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS username TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visitors_username_format'
  ) THEN
    ALTER TABLE public.visitors
      ADD CONSTRAINT visitors_username_format
      CHECK (
        username IS NULL OR (
          username ~ '^[a-z][a-z0-9_]{2,19}$'
          AND username !~ '__'
          AND username !~ '_$'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitors_username
  ON public.visitors (lower(username))
  WHERE username IS NOT NULL;

-- ------------------------------------------------------------
-- 2. CHECKPOINT TYPE + QUIZ CONTENT
-- ------------------------------------------------------------
ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS booth_type TEXT NOT NULL DEFAULT 'required';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checkpoints_booth_type_check'
  ) THEN
    ALTER TABLE public.checkpoints
      ADD CONSTRAINT checkpoints_booth_type_check
      CHECK (booth_type IN ('required', 'partner'));
  END IF;
END $$;

ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS quiz JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checkpoints_quiz_array_check'
  ) THEN
    ALTER TABLE public.checkpoints
      ADD CONSTRAINT checkpoints_quiz_array_check
      CHECK (jsonb_typeof(quiz) = 'array');
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. BOOTH VISIT QUIZ RESULTS
-- ------------------------------------------------------------
ALTER TABLE public.booth_visits
  ADD COLUMN IF NOT EXISTS quiz_correct INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_total INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_points INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_completed_at TIMESTAMPTZ NULL;

-- ------------------------------------------------------------
-- 4. REWARD SETTINGS + POINTS-BASED RANKING
-- ------------------------------------------------------------
ALTER TABLE public.reward_settings
  ALTER COLUMN ranking_metric SET DEFAULT 'points';

UPDATE public.reward_settings
SET ranking_metric = 'points'
WHERE ranking_metric IS NULL OR ranking_metric = 'stamps';

UPDATE public.reward_settings
SET description = 'Complete 8 required faculty booth checkpoints to unlock your official MindSwap @ FESKUM 2026 souvenir! Partner booths are optional bonus stops.'
WHERE description NOT LIKE '%Partner booths are optional%';

-- ------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_checkpoints_booth_type
  ON public.checkpoints (booth_type);

CREATE INDEX IF NOT EXISTS idx_booth_visits_visited_at
  ON public.booth_visits (visited_at);

CREATE INDEX IF NOT EXISTS idx_speaker_votes_created_at
  ON public.speaker_votes (created_at);

-- ------------------------------------------------------------
-- 6. REMOVE THE LIVE TEST BOOTH (only if it has no visits)
-- ------------------------------------------------------------
DELETE FROM public.checkpoints
WHERE id = 'b09ff77a-7941-4629-a052-4e9b99776a1a'
  AND name ILIKE 'kepakaran cinta'
  AND NOT EXISTS (
    SELECT 1
    FROM public.booth_visits v
    WHERE v.checkpoint_id = 'b09ff77a-7941-4629-a052-4e9b99776a1a'
  );

-- Reload PostgREST so the new columns are visible immediately.
NOTIFY pgrst, 'reload schema';
