-- ============================================================================
-- Migration 022: Phase 12.3 Course Specs & Academic Deliverable Tracker
-- ============================================================================
-- 1. Extends `public.school_subjects` with:
--    - course_description TEXT NOT NULL DEFAULT ''
--    - assessment_ratio   TEXT NOT NULL DEFAULT ''  (e.g., '80:20', '70:30')
-- 2. Creates `public.academic_deliverables` for per-teacher per-room-subject
--    tracking of แผนการจัดการเรียนรู้ (Lesson Plan) & ปพ.5 (Gradebook).
-- Idempotent and safe to re-run. Forces PostgREST schema reload.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extend public.school_subjects
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'school_subjects'
  ) THEN
    ALTER TABLE public.school_subjects
      ADD COLUMN IF NOT EXISTS course_description TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS assessment_ratio TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Create public.academic_deliverables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_deliverables (
  id TEXT PRIMARY KEY,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('1', '2')),
  teacher_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL DEFAULT '',
  lesson_plan_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (lesson_plan_status IN ('pending', 'reviewing', 'submitted')),
  gradebook_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (gradebook_status IN ('pending', 'reviewing', 'submitted')),
  remarks TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_academic_deliverables_term_teacher_room_subject
    UNIQUE (academic_year, semester, teacher_id, room_name, subject_name)
);

CREATE INDEX IF NOT EXISTS idx_academic_deliverables_year_sem
  ON public.academic_deliverables (academic_year, semester);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS) matching Migrations 018–020
-- ----------------------------------------------------------------------------
ALTER TABLE public.academic_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_deliverables_read_all" ON public.academic_deliverables;
CREATE POLICY "academic_deliverables_read_all" ON public.academic_deliverables
  FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
