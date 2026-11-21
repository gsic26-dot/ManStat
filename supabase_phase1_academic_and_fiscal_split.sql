-- ============================================================================
-- Phase 1 Migration: Academic Year & Fiscal Period Decoupling
-- ManStat Modernization Standard (PostgreSQL / Supabase)
-- 
-- 100% Backward Compatible with existing school_info and application logic
-- ============================================================================

-- Ensure pgcrypto / uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Table: academic_years (ปีการศึกษา)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id TEXT NOT NULL DEFAULT '30030099',
    year_th INTEGER NOT NULL,
    offered_grades JSONB NOT NULL DEFAULT '["อนุบาล 2", "อนุบาล 3", "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3", "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6"]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_academic_years_school_year UNIQUE (school_id, year_th)
);

-- Partial Unique Index: Only 1 active academic year per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_one_active_per_school
    ON public.academic_years (school_id)
    WHERE (is_active = TRUE);

COMMENT ON TABLE public.academic_years IS 'เก็บข้อมูลปีการศึกษา ระดับชั้นที่เปิดสอน และสถานะปีการศึกษาที่ใช้งานอยู่';
COMMENT ON COLUMN public.academic_years.year_th IS 'ปีการศึกษา พ.ศ. เช่น 2569, 2570';
COMMENT ON COLUMN public.academic_years.offered_grades IS 'รายการระดับชั้นที่เปิดทำการสอนในแต่ละปีการศึกษา (JSON array)';
COMMENT ON COLUMN public.academic_years.is_active IS 'ปีการศึกษาปัจจุบันที่โรงเรียนกำลังเปิดสอน (true ได้เพียง 1 ปีต่อโรงเรียน)';


-- ----------------------------------------------------------------------------
-- 2. Table: student_census_snapshots (รอบนับจำนวนนักเรียน 10 มิ.ย. และ 10 พ.ย.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_census_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    round_code VARCHAR(20) NOT NULL CHECK (round_code IN ('JUN_10', 'NOV_10')),
    snapshot_date DATE NOT NULL,
    fiscal_year_th INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN EXTRACT(MONTH FROM snapshot_date) >= 10 
            THEN (EXTRACT(YEAR FROM snapshot_date)::INTEGER + 543 + 1)
            ELSE (EXTRACT(YEAR FROM snapshot_date)::INTEGER + 543)
        END
    ) STORED,
    kindergarten_students INTEGER NOT NULL DEFAULT 0 CHECK (kindergarten_students >= 0),
    kindergarten_classrooms INTEGER NOT NULL DEFAULT 0 CHECK (kindergarten_classrooms >= 0),
    primary_students INTEGER NOT NULL DEFAULT 0 CHECK (primary_students >= 0),
    primary_classrooms INTEGER NOT NULL DEFAULT 0 CHECK (primary_classrooms >= 0),
    secondary_students INTEGER NOT NULL DEFAULT 0 CHECK (secondary_students >= 0),
    secondary_classrooms INTEGER NOT NULL DEFAULT 0 CHECK (secondary_classrooms >= 0),
    total_students INTEGER NOT NULL DEFAULT 0 CHECK (total_students >= 0),
    total_classrooms INTEGER NOT NULL DEFAULT 0 CHECK (total_classrooms >= 0),
    is_primary_for_manpower BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_census_academic_year_round UNIQUE (academic_year_id, round_code)
);

-- Partial Unique Index: Only 1 snapshot can be primary for manpower per academic year
CREATE UNIQUE INDEX IF NOT EXISTS idx_census_snapshots_one_primary_per_year
    ON public.student_census_snapshots (academic_year_id)
    WHERE (is_primary_for_manpower = TRUE);

COMMENT ON TABLE public.student_census_snapshots IS 'ข้อมูลจำนวนนักเรียนและห้องเรียน ณ วันที่กำหนด (10 มิ.ย. และ 10 พ.ย.) ใช้คิดกรอบอัตรากำลัง';
COMMENT ON COLUMN public.student_census_snapshots.fiscal_year_th IS 'ปีงบประมาณที่คำนวณอัตโนมัติจาก snapshot_date (ถ้าเดือน >= 10 ถือเป็นปีงบประมาณถัดไป)';
COMMENT ON COLUMN public.student_census_snapshots.is_primary_for_manpower IS 'ระบุว่าเป็นรอบหลักที่ใช้คำนวณอัตรากำลังครูหรือไม่ (ปกติคือรอบ 10 มิ.ย.)';


-- ----------------------------------------------------------------------------
-- 3. Table: fiscal_periods (รอบการประเมิน / ปีงบประมาณ)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fiscal_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id TEXT NOT NULL DEFAULT '30030099',
    fiscal_year_th INTEGER NOT NULL,
    round_no INTEGER NOT NULL CHECK (round_no IN (1, 2)),
    eval_start DATE NOT NULL,
    eval_end DATE NOT NULL,
    ref_census_snapshot_id UUID REFERENCES public.student_census_snapshots(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fiscal_periods_school_year_round UNIQUE (school_id, fiscal_year_th, round_no)
);

-- Partial Unique Index: Only 1 active fiscal period per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_fiscal_periods_one_active_per_school
    ON public.fiscal_periods (school_id)
    WHERE (is_active = TRUE);

COMMENT ON TABLE public.fiscal_periods IS 'รอบการประเมินและบริหารงานบุคคลตามปีงบประมาณ (รอบที่ 1: 1 เม.ย., รอบที่ 2: 1 ต.ค.)';
COMMENT ON COLUMN public.fiscal_periods.round_no IS '1 = รอบที่ 1 (1 ต.ค. - 31 มี.ค. เลื่อน 1 เม.ย.), 2 = รอบที่ 2 (1 เม.ย. - 30 ก.ย. เลื่อน 1 ต.ค.)';
COMMENT ON COLUMN public.fiscal_periods.ref_census_snapshot_id IS 'รอบข้อมูลนักเรียนที่ใช้อ้างอิงการจัดสรรงบประมาณหรือกรอบอัตรากำลังในรอบนี้';


-- ----------------------------------------------------------------------------
-- 4. Table: salary_promotion_records (บันทึกประวัติการเลื่อนเงินเดือนแบบ Snapshot)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salary_promotion_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_period_id UUID NOT NULL REFERENCES public.fiscal_periods(id) ON DELETE CASCADE,
    staff_id VARCHAR(100) NOT NULL,
    position_snapshot TEXT NOT NULL DEFAULT '',
    standing_snapshot TEXT DEFAULT '-',
    salary_before NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    calculation_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    promotion_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    salary_after NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    order_no TEXT DEFAULT '',
    order_date DATE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_salary_promotion_period_staff UNIQUE (fiscal_period_id, staff_id)
);

COMMENT ON TABLE public.salary_promotion_records IS 'ประวัติการเลื่อนขั้นเงินเดือน Snapshot เพื่อป้องกันการแก้ไขข้อมูลครูปัจจุบันกระทบข้อมูลประวัติศาสตร์';


-- ----------------------------------------------------------------------------
-- 5. RPC Functions (Atomic Transactions)
-- ----------------------------------------------------------------------------

-- 5.1 set_active_academic_year
CREATE OR REPLACE FUNCTION public.set_active_academic_year(
    p_school_id TEXT,
    p_academic_year_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify target academic year exists
    IF NOT EXISTS (
        SELECT 1 FROM public.academic_years 
        WHERE id = p_academic_year_id AND school_id = p_school_id
    ) THEN
        RAISE EXCEPTION 'Academic year % not found for school %', p_academic_year_id, p_school_id;
    END IF;

    -- Deactivate all academic years for this school
    UPDATE public.academic_years
    SET is_active = FALSE, updated_at = NOW()
    WHERE school_id = p_school_id AND is_active = TRUE;

    -- Activate target academic year
    UPDATE public.academic_years
    SET is_active = TRUE, updated_at = NOW()
    WHERE id = p_academic_year_id AND school_id = p_school_id;

    RETURN TRUE;
END;
$$;

-- 5.2 create_academic_year_with_defaults
CREATE OR REPLACE FUNCTION public.create_academic_year_with_defaults(
    p_school_id TEXT,
    p_year_th INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_id UUID;
    v_latest_grades JSONB;
    v_existing_id UUID;
    v_has_active BOOLEAN;
    v_make_active BOOLEAN := FALSE;
BEGIN
    -- If year already exists, return existing id
    SELECT id INTO v_existing_id
    FROM public.academic_years
    WHERE school_id = p_school_id AND year_th = p_year_th;

    IF v_existing_id IS NOT NULL THEN
        RETURN v_existing_id;
    END IF;

    -- If no active academic year exists for this school, make this one active
    SELECT EXISTS(
        SELECT 1 FROM public.academic_years 
        WHERE school_id = p_school_id AND is_active = TRUE
    ) INTO v_has_active;

    IF NOT v_has_active THEN
        v_make_active := TRUE;
    END IF;

    -- Fetch offered_grades from the latest academic year if available
    SELECT offered_grades INTO v_latest_grades
    FROM public.academic_years
    WHERE school_id = p_school_id
    ORDER BY year_th DESC
    LIMIT 1;

    IF v_latest_grades IS NULL THEN
        v_latest_grades := '["อนุบาล 2", "อนุบาล 3", "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3", "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6"]'::jsonb;
    END IF;

    -- Insert new academic year
    INSERT INTO public.academic_years (
        school_id,
        year_th,
        offered_grades,
        is_active
    ) VALUES (
        p_school_id,
        p_year_th,
        v_latest_grades,
        v_make_active
    ) RETURNING id INTO v_new_id;

    -- Auto-generate default snapshots: JUN_10 (primary) and NOV_10
    INSERT INTO public.student_census_snapshots (
        academic_year_id,
        round_code,
        snapshot_date,
        is_primary_for_manpower,
        total_students,
        total_classrooms
    ) VALUES
    (
        v_new_id,
        'JUN_10',
        MAKE_DATE(p_year_th - 543, 6, 10),
        TRUE,
        0,
        0
    ),
    (
        v_new_id,
        'NOV_10',
        MAKE_DATE(p_year_th - 543, 11, 10),
        FALSE,
        0,
        0
    )
    ON CONFLICT (academic_year_id, round_code) DO NOTHING;

    RETURN v_new_id;
END;
$$;

-- 5.3 set_primary_census_round
CREATE OR REPLACE FUNCTION public.set_primary_census_round(
    p_academic_year_id UUID,
    p_snapshot_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify snapshot belongs to specified academic year
    IF NOT EXISTS (
        SELECT 1 FROM public.student_census_snapshots 
        WHERE id = p_snapshot_id AND academic_year_id = p_academic_year_id
    ) THEN
        RAISE EXCEPTION 'Snapshot % not found for academic year %', p_snapshot_id, p_academic_year_id;
    END IF;

    -- Reset primary status on all snapshots for this academic year
    UPDATE public.student_census_snapshots
    SET is_primary_for_manpower = FALSE, updated_at = NOW()
    WHERE academic_year_id = p_academic_year_id AND is_primary_for_manpower = TRUE;

    -- Set target snapshot as primary
    UPDATE public.student_census_snapshots
    SET is_primary_for_manpower = TRUE, updated_at = NOW()
    WHERE id = p_snapshot_id AND academic_year_id = p_academic_year_id;

    RETURN TRUE;
END;
$$;

-- 5.4 set_active_fiscal_period
CREATE OR REPLACE FUNCTION public.set_active_fiscal_period(
    p_school_id TEXT,
    p_fiscal_period_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify target period exists
    IF NOT EXISTS (
        SELECT 1 FROM public.fiscal_periods 
        WHERE id = p_fiscal_period_id AND school_id = p_school_id
    ) THEN
        RAISE EXCEPTION 'Fiscal period % not found for school %', p_fiscal_period_id, p_school_id;
    END IF;

    -- Deactivate all fiscal periods for this school
    UPDATE public.fiscal_periods
    SET is_active = FALSE, updated_at = NOW()
    WHERE school_id = p_school_id AND is_active = TRUE;

    -- Activate target period
    UPDATE public.fiscal_periods
    SET is_active = TRUE, updated_at = NOW()
    WHERE id = p_fiscal_period_id AND school_id = p_school_id;

    RETURN TRUE;
END;
$$;


-- ----------------------------------------------------------------------------
-- 6. Backward Compatibility View: v_school_info_current
-- ----------------------------------------------------------------------------
-- Joins school_info metadata with active academic_year and primary census snapshot
CREATE OR REPLACE VIEW public.v_school_info_current AS
WITH si_pivoted AS (
    SELECT
        COALESCE(MAX(CASE WHEN key = 'ชื่อสถานศึกษา' THEN val END), 'โรงเรียนชุมชนบ้านตะขบ') AS school_name,
        COALESCE(MAX(CASE WHEN key = 'หน่วยงานต้นสังกัด' THEN val END), 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3') AS affiliation,
        COALESCE(MAX(CASE WHEN key = 'รหัส 10 หลัก' THEN val END), '1030200688') AS school_code10,
        COALESCE(MAX(CASE WHEN key = 'รหัส 8 หลัก' THEN val END), '30030099') AS school_code8,
        COALESCE(MAX(CASE WHEN key = 'ชื่อระบบแอปพลิเคชัน' THEN val END), 'ManStat') AS app_name,
        COALESCE(MAX(CASE WHEN key = 'ชื่อผู้อำนวยการ' THEN val END), 'นายธีรศักดิ์ มโนธรรม') AS director_name,
        COALESCE(MAX(CASE WHEN key = 'ตำแหน่งผู้อำนวยการ' THEN val END), 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ') AS director_position,
        COALESCE(MAX(CASE WHEN key = 'เบอร์โทรศัพท์' THEN val END), '099-173-2233') AS contact_phone,
        COALESCE(MAX(CASE WHEN key = 'อีเมล' THEN val END), 'chumchonbantakhob2473@gmail.com') AS email,
        COALESCE(MAX(CASE WHEN key = 'ที่อยู่' THEN val END), 'ม.1 โรงเรียนชุมชนบ้านตะขบ ต.ตะขบ อ.ปักธงชัย จ.นครราชสีมา 30150') AS address,
        COALESCE(MAX(CASE WHEN key = 'ละติจูด (Lat)' THEN val END), '14.634629')::numeric AS lat,
        COALESCE(MAX(CASE WHEN key = 'ลองจิจูด (Lng)' THEN val END), '101.852567')::numeric AS lng,
        COALESCE(MAX(CASE WHEN key = 'Logo Base64' THEN val END), '') AS logo_base64,
        COALESCE(MAX(CASE WHEN key = 'รักษาการคนที่ 1' THEN val END), 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์') AS acting_director1,
        COALESCE(MAX(CASE WHEN key = 'รักษาการคนที่ 2' THEN val END), 'นายธวัชชัย เหลืองโอฬาร') AS acting_director2,
        COALESCE(MAX(CASE WHEN key = 'ภาคเรียนปัจจุบัน' THEN val END), '2') AS current_term,
        COALESCE(MAX(CASE WHEN key = 'ปีการศึกษา' THEN val END), '2569') AS fallback_academic_year,
        COALESCE(MAX(CASE WHEN key = 'ปีงบประมาณ' THEN val END), '2570') AS fallback_fiscal_year,
        COALESCE(MAX(CASE WHEN key = 'จำนวนนักเรียน' THEN val END), '94')::integer AS fallback_student_count,
        COALESCE(MAX(CASE WHEN key = 'วันที่อ้างอิงข้อมูลนักเรียน' THEN val END), '10 มิ.ย. 2569') AS fallback_student_date
    FROM public.school_info
),
active_ay AS (
    SELECT
        ay.id AS academic_year_id,
        ay.school_id,
        ay.year_th,
        ay.offered_grades
    FROM public.academic_years ay
    WHERE ay.is_active = TRUE
    LIMIT 1
),
primary_census AS (
    SELECT
        cs.id AS census_id,
        cs.academic_year_id,
        cs.round_code,
        cs.snapshot_date,
        cs.fiscal_year_th,
        cs.total_students,
        cs.total_classrooms
    FROM public.student_census_snapshots cs
    JOIN active_ay ON cs.academic_year_id = active_ay.academic_year_id
    WHERE cs.is_primary_for_manpower = TRUE
    LIMIT 1
),
active_fp AS (
    SELECT
        fp.id AS fiscal_period_id,
        fp.fiscal_year_th,
        fp.round_no,
        fp.eval_start,
        fp.eval_end
    FROM public.fiscal_periods fp
    WHERE fp.is_active = TRUE
    LIMIT 1
)
SELECT
    si.school_name AS "schoolName",
    si.affiliation AS "affiliation",
    si.school_code10 AS "schoolCode10",
    si.school_code8 AS "schoolCode8",
    si.app_name AS "appName",
    si.director_name AS "directorName",
    si.director_position AS "directorPosition",
    si.contact_phone AS "contactPhone",
    si.email AS "email",
    si.address AS "address",
    si.lat AS "lat",
    si.lng AS "lng",
    si.logo_base64 AS "logoBase64",
    si.acting_director1 AS "actingDirector1",
    si.acting_director2 AS "actingDirector2",
    si.current_term AS "currentTerm",
    COALESCE(ay.year_th::TEXT, si.fallback_academic_year) AS "academicYear",
    COALESCE(cs.total_students, si.fallback_student_count) AS "studentCount",
    COALESCE(
        CASE 
            WHEN cs.snapshot_date IS NOT NULL 
            THEN TO_CHAR(cs.snapshot_date, 'DD/MM/') || (EXTRACT(YEAR FROM cs.snapshot_date)::INTEGER + 543)::TEXT
            ELSE NULL 
        END, 
        si.fallback_student_date
    ) AS "studentDataDate",
    COALESCE(fp.fiscal_year_th::TEXT, si.fallback_fiscal_year) AS "fiscalYear",
    COALESCE(ay.offered_grades, '["อนุบาล 2", "อนุบาล 3", "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3", "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6"]'::jsonb) AS "activeClasses",
    ay.academic_year_id AS "activeAcademicYearId",
    cs.census_id AS "primaryCensusId",
    cs.round_code AS "censusRoundCode",
    fp.fiscal_period_id AS "activeFiscalPeriodId",
    fp.round_no AS "fiscalRoundNo"
FROM si_pivoted si
LEFT JOIN active_ay ay ON TRUE
LEFT JOIN primary_census cs ON TRUE
LEFT JOIN active_fp fp ON TRUE;

COMMENT ON VIEW public.v_school_info_current IS 'View สำหรับ Backward Compatibility กับโค้ดเดิม คืนค่า academicYear, studentCount, fiscalYear จากตารางใหม่';


-- ----------------------------------------------------------------------------
-- 7. Idempotent Data Migration from Existing school_info
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_school_id TEXT := '30030099';
    v_acad_year_val INTEGER := 2569;
    v_fiscal_year_val INTEGER := 2570;
    v_student_count_val INTEGER := 94;
    v_ay_id UUID;
    v_ay_2570_id UUID;
    v_fp_id UUID;
    v_census_jun UUID;
BEGIN
    -- Read from school_info if available
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_info') THEN
        SELECT COALESCE(NULLIF(val, ''), '30030099') INTO v_school_id
        FROM public.school_info WHERE key = 'รหัส 8 หลัก' LIMIT 1;
        IF v_school_id IS NULL THEN v_school_id := '30030099'; END IF;

        SELECT COALESCE(NULLIF(val, '')::INTEGER, 2569) INTO v_acad_year_val
        FROM public.school_info WHERE key = 'ปีการศึกษา' LIMIT 1;
        IF v_acad_year_val IS NULL THEN v_acad_year_val := 2569; END IF;

        SELECT COALESCE(NULLIF(val, '')::INTEGER, 2570) INTO v_fiscal_year_val
        FROM public.school_info WHERE key = 'ปีงบประมาณ' LIMIT 1;
        IF v_fiscal_year_val IS NULL THEN v_fiscal_year_val := 2570; END IF;

        SELECT COALESCE(NULLIF(val, '')::INTEGER, 94) INTO v_student_count_val
        FROM public.school_info WHERE key = 'จำนวนนักเรียน' LIMIT 1;
        IF v_student_count_val IS NULL THEN v_student_count_val := 94; END IF;
    END IF;

    -- 1. Create or ensure Academic Year (active)
    INSERT INTO public.academic_years (
        school_id,
        year_th,
        offered_grades,
        is_active
    ) VALUES (
        v_school_id,
        v_acad_year_val,
        '["อนุบาล 2", "อนุบาล 3", "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3", "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6"]'::jsonb,
        TRUE
    )
    ON CONFLICT (school_id, year_th) 
    DO UPDATE SET is_active = TRUE
    RETURNING id INTO v_ay_id;

    -- Also seed upcoming Academic Year 2570 if not exists
    INSERT INTO public.academic_years (
        school_id,
        year_th,
        offered_grades,
        is_active
    ) VALUES (
        v_school_id,
        v_acad_year_val + 1,
        '["อนุบาล 2", "อนุบาล 3", "ประถมศึกษาปีที่ 1", "ประถมศึกษาปีที่ 2", "ประถมศึกษาปีที่ 3", "ประถมศึกษาปีที่ 4", "ประถมศึกษาปีที่ 5", "ประถมศึกษาปีที่ 6"]'::jsonb,
        FALSE
    )
    ON CONFLICT (school_id, year_th) DO NOTHING
    RETURNING id INTO v_ay_2570_id;

    -- 2. Create Snapshots for active academic year (JUN_10 & NOV_10)
    INSERT INTO public.student_census_snapshots (
        academic_year_id,
        round_code,
        snapshot_date,
        kindergarten_students,
        kindergarten_classrooms,
        primary_students,
        primary_classrooms,
        secondary_students,
        secondary_classrooms,
        total_students,
        total_classrooms,
        is_primary_for_manpower,
        is_locked
    ) VALUES (
        v_ay_id,
        'JUN_10',
        MAKE_DATE(v_acad_year_val - 543, 6, 10),
        19, 2,  -- อนุบาล 2-3: 19 คน, 2 ห้อง
        75, 6,  -- ประถม 1-6: 75 คน, 6 ห้อง
        0, 0,   -- มัธยม: 0
        v_student_count_val, 8,
        TRUE,
        FALSE
    )
    ON CONFLICT (academic_year_id, round_code) 
    DO UPDATE SET 
        total_students = EXCLUDED.total_students,
        total_classrooms = EXCLUDED.total_classrooms,
        is_primary_for_manpower = TRUE
    RETURNING id INTO v_census_jun;

    INSERT INTO public.student_census_snapshots (
        academic_year_id,
        round_code,
        snapshot_date,
        kindergarten_students,
        kindergarten_classrooms,
        primary_students,
        primary_classrooms,
        secondary_students,
        secondary_classrooms,
        total_students,
        total_classrooms,
        is_primary_for_manpower,
        is_locked
    ) VALUES (
        v_ay_id,
        'NOV_10',
        MAKE_DATE(v_acad_year_val - 543, 11, 10),
        19, 2,
        75, 6,
        0, 0,
        v_student_count_val, 8,
        FALSE,
        FALSE
    )
    ON CONFLICT (academic_year_id, round_code) DO NOTHING;

    -- Snapshots for 2570 if created
    IF v_ay_2570_id IS NOT NULL THEN
        INSERT INTO public.student_census_snapshots (
            academic_year_id,
            round_code,
            snapshot_date,
            kindergarten_students,
            kindergarten_classrooms,
            primary_students,
            primary_classrooms,
            secondary_students,
            secondary_classrooms,
            total_students,
            total_classrooms,
            is_primary_for_manpower
        ) VALUES 
        (v_ay_2570_id, 'JUN_10', MAKE_DATE(v_acad_year_val + 1 - 543, 6, 10), 0, 0, 0, 0, 0, 0, 0, 0, TRUE),
        (v_ay_2570_id, 'NOV_10', MAKE_DATE(v_acad_year_val + 1 - 543, 11, 10), 0, 0, 0, 0, 0, 0, 0, 0, FALSE)
        ON CONFLICT (academic_year_id, round_code) DO NOTHING;
    END IF;

    -- 3. Create Fiscal Periods for fiscal year (Round 1: active, Round 2: inactive)
    INSERT INTO public.fiscal_periods (
        school_id,
        fiscal_year_th,
        round_no,
        eval_start,
        eval_end,
        ref_census_snapshot_id,
        is_active,
        is_locked
    ) VALUES (
        v_school_id,
        v_fiscal_year_val,
        1,
        MAKE_DATE(v_fiscal_year_val - 1 - 543, 10, 1),
        MAKE_DATE(v_fiscal_year_val - 543, 3, 31),
        v_census_jun,
        TRUE,
        FALSE
    )
    ON CONFLICT (school_id, fiscal_year_th, round_no) 
    DO UPDATE SET is_active = TRUE
    RETURNING id INTO v_fp_id;

    INSERT INTO public.fiscal_periods (
        school_id,
        fiscal_year_th,
        round_no,
        eval_start,
        eval_end,
        ref_census_snapshot_id,
        is_active,
        is_locked
    ) VALUES (
        v_school_id,
        v_fiscal_year_val,
        2,
        MAKE_DATE(v_fiscal_year_val - 543, 4, 1),
        MAKE_DATE(v_fiscal_year_val - 543, 9, 30),
        v_census_jun,
        FALSE,
        FALSE
    )
    ON CONFLICT (school_id, fiscal_year_th, round_no) DO NOTHING;

END $$;


-- ----------------------------------------------------------------------------
-- 8. Security & Permissions (RLS & Grants)
-- ----------------------------------------------------------------------------

-- Enable Row Level Security
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_census_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_promotion_records ENABLE ROW LEVEL SECURITY;

-- 8.1 academic_years Policies
DROP POLICY IF EXISTS "Public read academic_years" ON public.academic_years;
CREATE POLICY "Public read academic_years"
    ON public.academic_years
    FOR SELECT
    TO public, anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated modify academic_years" ON public.academic_years;
CREATE POLICY "Authenticated modify academic_years"
    ON public.academic_years
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8.2 student_census_snapshots Policies
DROP POLICY IF EXISTS "Public read student_census_snapshots" ON public.student_census_snapshots;
CREATE POLICY "Public read student_census_snapshots"
    ON public.student_census_snapshots
    FOR SELECT
    TO public, anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated modify student_census_snapshots" ON public.student_census_snapshots;
CREATE POLICY "Authenticated modify student_census_snapshots"
    ON public.student_census_snapshots
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8.3 fiscal_periods Policies
DROP POLICY IF EXISTS "Public read fiscal_periods" ON public.fiscal_periods;
CREATE POLICY "Public read fiscal_periods"
    ON public.fiscal_periods
    FOR SELECT
    TO public, anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated modify fiscal_periods" ON public.fiscal_periods;
CREATE POLICY "Authenticated modify fiscal_periods"
    ON public.fiscal_periods
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8.4 salary_promotion_records Policies
DROP POLICY IF EXISTS "Authenticated read salary_promotion_records" ON public.salary_promotion_records;
CREATE POLICY "Authenticated read salary_promotion_records"
    ON public.salary_promotion_records
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated modify salary_promotion_records" ON public.salary_promotion_records;
CREATE POLICY "Authenticated modify salary_promotion_records"
    ON public.salary_promotion_records
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8.5 Grant Table Permissions
GRANT SELECT ON public.academic_years TO anon, authenticated;
GRANT ALL ON public.academic_years TO authenticated, service_role;

GRANT SELECT ON public.student_census_snapshots TO anon, authenticated;
GRANT ALL ON public.student_census_snapshots TO authenticated, service_role;

GRANT SELECT ON public.fiscal_periods TO anon, authenticated;
GRANT ALL ON public.fiscal_periods TO authenticated, service_role;

GRANT ALL ON public.salary_promotion_records TO authenticated, service_role;

GRANT SELECT ON public.v_school_info_current TO anon, authenticated, service_role;

-- 8.6 Grant RPC Function Execution
GRANT EXECUTE ON FUNCTION public.set_active_academic_year(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_academic_year_with_defaults(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_primary_census_round(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_active_fiscal_period(TEXT, UUID) TO authenticated, service_role;
