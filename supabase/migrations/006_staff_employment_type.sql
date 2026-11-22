-- ============================================================================
-- Migration 006: Add employment_type to staff and teachers tables
-- ============================================================================
-- Explicitly separates:
-- 1. 'civil_servant' -> ข้าราชการครูและบุคลากรทางการศึกษา (Eligible for salary rounds & academic standings)
-- 2. 'government_employee' -> พนักงานราชการ
-- 3. 'temporary_employee' -> ลูกจ้างชั่วคราว / จ้างเหมาบริการ (ธุรการ, นักการภารโรง, พี่เลี้ยงเด็กพิการ)
-- ============================================================================

DO $$
BEGIN
  -- 1. Create ENUM type if it does not exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type_enum') THEN
    CREATE TYPE public.employment_type_enum AS ENUM ('civil_servant', 'government_employee', 'temporary_employee');
  END IF;

  -- 2. Update public.teachers table if present
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teachers') THEN
    ALTER TABLE public.teachers
      ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'civil_servant';

    -- Backfill temporary/contract support staff
    UPDATE public.teachers
    SET employment_type = 'temporary_employee'
    WHERE position ILIKE '%ธุรการ%'
       OR position ILIKE '%นักการ%'
       OR position ILIKE '%ภารโรง%'
       OR position ILIKE '%พี่เลี้ยง%'
       OR position ILIKE '%ลูกจ้าง%'
       OR position ILIKE '%จ้างเหมา%'
       OR employee_code IN ('STF-001', 'STF-002', 'STF-003');

    -- Backfill civil servants (teachers and school director)
    UPDATE public.teachers
    SET employment_type = 'civil_servant'
    WHERE position ILIKE '%ผู้อำนวยการ%'
       OR position ILIKE '%ครู%'
       OR employee_code LIKE 'TCH-%'
       OR employee_code LIKE 'EXE-%';
  END IF;

  -- 3. Update public.staff table if present
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff') THEN
    ALTER TABLE public.staff
      ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'civil_servant';

    -- Backfill temporary/contract support staff
    UPDATE public.staff
    SET employment_type = 'temporary_employee'
    WHERE position_name ILIKE '%ธุรการ%'
       OR position_name ILIKE '%นักการ%'
       OR position_name ILIKE '%ภารโรง%'
       OR position_name ILIKE '%พี่เลี้ยง%'
       OR position_name ILIKE '%ลูกจ้าง%'
       OR position_name ILIKE '%จ้างเหมา%'
       OR employee_code IN ('STF-001', 'STF-002', 'STF-003');

    -- Backfill civil servants
    UPDATE public.staff
    SET employment_type = 'civil_servant'
    WHERE position_name ILIKE '%ผู้อำนวยการ%'
       OR position_name ILIKE '%ครู%'
       OR employee_code LIKE 'TCH-%'
       OR employee_code LIKE 'EXE-%';
  END IF;
END $$;
