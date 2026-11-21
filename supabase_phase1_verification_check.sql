-- ============================================================================
-- ManStat: Full SQL Verification & Dry-Run Suite (Phases 1-4)
-- Canonical Migration: supabase/migrations/004_academic_and_fiscal_split.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: Schema, Constraints, Generated Columns & Security Verification
-- ----------------------------------------------------------------------------

-- 1.1 ตรวจสอบตารางและ View ครบถ้วน (Expected: 4 tables, 1 view)
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('academic_years', 'student_census_snapshots', 'fiscal_periods', 'salary_promotion_records', 'v_school_info_current')
ORDER BY table_name;

-- 1.2 ตรวจสอบ Partial Unique Indexes (รับประกันมี Active ได้เพียง 1 รายการ)
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN (
    'idx_academic_years_one_active_per_school',
    'idx_fiscal_periods_one_active_per_school',
    'idx_census_snapshots_one_primary_per_year'
  );

-- 1.3 ตรวจสอบ Generated Column fiscal_year_th (คำนวณข้ามปีงบประมาณถ้าเดือน >= 10)
SELECT 
    column_name, 
    data_type, 
    is_generated, 
    generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'student_census_snapshots' 
  AND column_name = 'fiscal_year_th';

-- 1.4 ตรวจสอบสถานะการเปิดใช้งาน RLS (Row Level Security) บนทุกตารางใหม่
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('academic_years', 'student_census_snapshots', 'fiscal_periods', 'salary_promotion_records');

-- 1.5 ตรวจสอบสิทธิ์ GRANT EXECUTE บน RPC Functions สำหรับ authenticated role
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'set_active_academic_year',
    'create_academic_year_with_defaults',
    'set_primary_census_round',
    'set_active_fiscal_period'
  );

-- 1.6 ตรวจสอบ Backward Compatibility View (v_school_info_current)
SELECT 
    "schoolName",
    "schoolCode8",
    "academicYear",
    "studentCount",
    "fiscalYear",
    "activeClasses"
FROM public.v_school_info_current;


-- ----------------------------------------------------------------------------
-- PART 2: Safe Dry-Run Transaction (ทดสอบการทำงานของ RPC โดยไม่กระทบข้อมูลจริง)
-- ----------------------------------------------------------------------------
BEGIN;

  -- 2.1 ตรวจสอบ RPC การสลับรอบปีงบประมาณ
  DO $$
  DECLARE
      v_test_period_id UUID;
  BEGIN
      SELECT id INTO v_test_period_id FROM public.fiscal_periods WHERE school_id = '30030099' LIMIT 1;
      IF v_test_period_id IS NOT NULL THEN
          PERFORM public.set_active_fiscal_period('30030099', v_test_period_id);
          RAISE NOTICE '[DRY-RUN PASS] set_active_fiscal_period executed successfully';
      END IF;
  END $$;

  -- 2.2 ตรวจสอบ RPC การสลับปีการศึกษา
  DO $$
  DECLARE
      v_test_year_id UUID;
  BEGIN
      SELECT id INTO v_test_year_id FROM public.academic_years WHERE school_id = '30030099' LIMIT 1;
      IF v_test_year_id IS NOT NULL THEN
          PERFORM public.set_active_academic_year('30030099', v_test_year_id);
          RAISE NOTICE '[DRY-RUN PASS] set_active_academic_year executed successfully';
      END IF;
  END $$;

  -- 2.3 ตรวจสอบความปลอดภัย: ยกเลิกการเปลี่ยนแปลงทั้งหมด คืนค่าเดิม 100%
ROLLBACK;
