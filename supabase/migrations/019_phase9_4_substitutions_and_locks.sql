-- ============================================================================
-- Migration 019: Phase 9.4 Daily Substitutions, Master Timetable Lock & Lunch Config
-- ============================================================================
-- 1. Extends `public.timetable_settings` with:
--    - is_locked    BOOLEAN NOT NULL DEFAULT FALSE
--    - lunch_config JSONB   NOT NULL DEFAULT '{"afterPeriod":3,"startTime":"11.30","endTime":"12.30","durationMinutes":60}'
-- 2. Creates `public.teaching_substitutions` for daily Leave-to-Substitute tracking.
-- Idempotent and safe to re-run. Forces PostgREST schema reload.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extend public.timetable_settings
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'timetable_settings'
  ) THEN
    ALTER TABLE public.timetable_settings
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS lunch_config JSONB NOT NULL DEFAULT '{"afterPeriod":3,"startTime":"11.30","endTime":"12.30","durationMinutes":60}'::jsonb;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Create public.teaching_substitutions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teaching_substitutions (
  id TEXT PRIMARY KEY,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('1', '2')),
  sub_date TEXT NOT NULL,
  room_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  period_no INTEGER NOT NULL CHECK (period_no BETWEEN 0 AND 7),
  subject_name TEXT NOT NULL,
  absent_teacher_id TEXT NOT NULL,
  substitute_teacher_id TEXT NOT NULL,
  leave_id TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_teaching_substitutions_date_room_period
    UNIQUE (sub_date, room_name, period_no)
);

CREATE INDEX IF NOT EXISTS idx_teaching_substitutions_term_date
  ON public.teaching_substitutions (academic_year, semester, sub_date);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS) matching Migration 018
-- ----------------------------------------------------------------------------
ALTER TABLE public.teaching_substitutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teaching_substitutions_read_all" ON public.teaching_substitutions;
CREATE POLICY "teaching_substitutions_read_all" ON public.teaching_substitutions
  FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
