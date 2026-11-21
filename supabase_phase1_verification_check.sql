-- ============================================================================
-- Verification Queries: Phase 1 (Academic Years & Fiscal Periods Decoupling)
-- Run this in Supabase SQL Editor to verify tables, data, view, and RPC functions
-- ============================================================================

-- 1. Check Tables Created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('academic_years', 'student_census_snapshots', 'fiscal_periods', 'salary_promotion_records', 'v_school_info_current')
ORDER BY table_name;

-- 2. Inspect Academic Years & Active Status
SELECT id, school_id, year_th, is_active, offered_grades 
FROM public.academic_years 
ORDER BY year_th DESC;

-- 3. Inspect Student Census Snapshots (Verify Generated Column fiscal_year_th)
SELECT 
    cs.id,
    ay.year_th AS academic_year,
    cs.round_code,
    cs.snapshot_date,
    cs.fiscal_year_th AS generated_fiscal_year,
    cs.total_students,
    cs.total_classrooms,
    cs.is_primary_for_manpower,
    cs.is_locked
FROM public.student_census_snapshots cs
JOIN public.academic_years ay ON cs.academic_year_id = ay.id
ORDER BY ay.year_th DESC, cs.snapshot_date ASC;

-- 4. Inspect Fiscal Periods & Active Status
SELECT 
    id,
    school_id,
    fiscal_year_th,
    round_no,
    eval_start,
    eval_end,
    is_active,
    is_locked
FROM public.fiscal_periods
ORDER BY fiscal_year_th DESC, round_no ASC;

-- 5. Test Backward Compatibility View (v_school_info_current)
-- Verify that existing app code can read academicYear, studentCount, fiscalYear, activeClasses
SELECT 
    "schoolName",
    "schoolCode8",
    "academicYear",
    "currentTerm",
    "studentCount",
    "studentDataDate",
    "fiscalYear",
    "activeClasses",
    "activeAcademicYearId",
    "primaryCensusId"
FROM public.v_school_info_current;

-- 6. Test Atomic RPC Functions
-- 6.1 Test switching active academic year
-- SELECT public.set_active_academic_year('30030099', '<target_academic_year_id>');

-- 6.2 Test creating academic year with defaults
-- SELECT public.create_academic_year_with_defaults('30030099', 2571);

-- 6.3 Test switching primary census round
-- SELECT public.set_primary_census_round('<academic_year_id>', '<snapshot_id>');

-- 6.4 Test switching active fiscal period
-- SELECT public.set_active_fiscal_period('30030099', '<target_fiscal_period_id>');
