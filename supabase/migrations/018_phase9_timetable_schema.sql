-- ============================================================================
-- Migration 018: Phase 9 Timetable & Weekly Teaching Hours Schema
-- ============================================================================
-- Creates 4 normalized tables for the Timetable System (Phases 9.1 – 9.3):
--   1. public.timetable_settings      (period times, fixed slots, footer note)
--   2. public.timetable_allocations   (course allocation / แผนการสอน per room)
--   3. public.timetable_slots         (5x7 room/teacher timetable grid slots)
--   4. public.kindergarten_schedules  (kindergarten อ.1-อ.3 schedules for 9.3)
-- Idempotent and safe to re-run. Forces PostgREST schema reload.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. public.timetable_settings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timetable_settings (
  id TEXT PRIMARY KEY,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('1', '2')),
  periods_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  fixed_slots_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  footer_note TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetable_settings_year_sem
  ON public.timetable_settings (academic_year, semester);

-- ----------------------------------------------------------------------------
-- 2. public.timetable_allocations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timetable_allocations (
  id TEXT PRIMARY KEY,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('1', '2')),
  room_name TEXT NOT NULL,
  subject_code TEXT DEFAULT '',
  subject_name TEXT NOT NULL,
  subject_group TEXT NOT NULL,
  subject_type TEXT NOT NULL DEFAULT 'พื้นฐาน' CHECK (
    subject_type IN ('พื้นฐาน', 'เพิ่มเติม', 'กิจกรรมพัฒนาผู้เรียน', 'ประจำชั้น')
  ),
  teacher_id TEXT NOT NULL,
  co_teacher_id TEXT DEFAULT '',
  periods_per_week INTEGER NOT NULL DEFAULT 1,
  prefer_morning BOOLEAN NOT NULL DEFAULT FALSE,
  consecutive_periods INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetable_allocations_year_sem
  ON public.timetable_allocations (academic_year, semester);

CREATE INDEX IF NOT EXISTS idx_timetable_allocations_room
  ON public.timetable_allocations (academic_year, semester, room_name);

-- ----------------------------------------------------------------------------
-- 3. public.timetable_slots
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id TEXT PRIMARY KEY,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('1', '2')),
  room_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  period_no INTEGER NOT NULL CHECK (period_no BETWEEN 1 AND 7),
  allocation_id TEXT DEFAULT '',
  subject_code TEXT DEFAULT '',
  subject_name TEXT NOT NULL,
  subject_group TEXT NOT NULL DEFAULT '',
  subject_type TEXT NOT NULL DEFAULT 'พื้นฐาน' CHECK (
    subject_type IN ('พื้นฐาน', 'เพิ่มเติม', 'กิจกรรมพัฒนาผู้เรียน', 'ประจำชั้น')
  ),
  teacher_id TEXT NOT NULL,
  co_teacher_id TEXT DEFAULT '',
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_timetable_slots_room_day_period
    UNIQUE (academic_year, semester, room_name, day_of_week, period_no)
);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_year_sem
  ON public.timetable_slots (academic_year, semester);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_teacher
  ON public.timetable_slots (academic_year, semester, teacher_id);

-- ----------------------------------------------------------------------------
-- 4. public.kindergarten_schedules (Schema ready for Phase 9.3)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kindergarten_schedules (
  id TEXT PRIMARY KEY,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('1', '2')),
  room_name TEXT NOT NULL,
  homeroom_teacher_id TEXT NOT NULL,
  assistant_teacher_id TEXT DEFAULT '',
  weekly_hours NUMERIC(5,2) NOT NULL DEFAULT 25,
  activities_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kindergarten_schedules_year_sem
  ON public.kindergarten_schedules (academic_year, semester);

-- ----------------------------------------------------------------------------
-- 5. Row Level Security (RLS) — Server API uses service_role; allow read access
-- ----------------------------------------------------------------------------
ALTER TABLE public.timetable_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kindergarten_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetable_settings_read_all" ON public.timetable_settings;
CREATE POLICY "timetable_settings_read_all" ON public.timetable_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "timetable_allocations_read_all" ON public.timetable_allocations;
CREATE POLICY "timetable_allocations_read_all" ON public.timetable_allocations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "timetable_slots_read_all" ON public.timetable_slots;
CREATE POLICY "timetable_slots_read_all" ON public.timetable_slots
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "kindergarten_schedules_read_all" ON public.kindergarten_schedules;
CREATE POLICY "kindergarten_schedules_read_all" ON public.kindergarten_schedules
  FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
