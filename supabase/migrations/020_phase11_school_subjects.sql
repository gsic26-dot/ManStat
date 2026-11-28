-- ============================================================================
-- Migration 020: Phase 11.1 School Subject Catalog (คลังรายวิชา อ.1–ม.3)
-- ============================================================================
-- Creates `public.school_subjects` for persistent management of Kindergarten
-- (อ.1–อ.3), Primary (ป.1–ป.6), and Lower Secondary (ม.1–ม.3) curricula.
-- Idempotent and safe to re-run. Forces PostgREST schema reload.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.school_subjects (
  id TEXT PRIMARY KEY,
  subject_code TEXT NOT NULL DEFAULT '',
  subject_name TEXT NOT NULL,
  subject_group TEXT NOT NULL,
  subject_type TEXT NOT NULL DEFAULT 'พื้นฐาน'
    CHECK (subject_type IN ('พื้นฐาน', 'เพิ่มเติม', 'กิจกรรมพัฒนาผู้เรียน', 'ประจำชั้น', 'ประสบการณ์ปฐมวัย')),
  level_group TEXT NOT NULL DEFAULT 'primary'
    CHECK (level_group IN ('kindergarten', 'primary', 'secondary')),
  grade_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  semester_scope TEXT NOT NULL DEFAULT 'both'
    CHECK (semester_scope IN ('both', '1', '2')),
  default_hours_per_week NUMERIC(4,1) NOT NULL DEFAULT 1.0,
  hours_per_year INTEGER NOT NULL DEFAULT 40,
  credits NUMERIC(4,1) NOT NULL DEFAULT 0.0,
  prefer_morning BOOLEAN NOT NULL DEFAULT FALSE,
  default_consecutive INTEGER NOT NULL DEFAULT 1
    CHECK (default_consecutive IN (1, 2)),
  curriculum_version TEXT NOT NULL DEFAULT 'หลักสูตรสถานศึกษา 2555 (ปรับปรุงล่าสุด)',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_subjects_level_active
  ON public.school_subjects (level_group, is_active);

CREATE INDEX IF NOT EXISTS idx_school_subjects_group
  ON public.school_subjects (subject_group);

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) matching Migrations 018–019
-- ----------------------------------------------------------------------------
ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_subjects_read_all" ON public.school_subjects;
CREATE POLICY "school_subjects_read_all" ON public.school_subjects
  FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
