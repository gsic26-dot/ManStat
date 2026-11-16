-- ============================================================================
-- ManStat-Modern: Complete Supabase PostgreSQL Schema & Regulatory Engine
-- Compliance: พ.ร.บ. บำเหน็จบำนาญฯ ม.19 (กฎ 1 ต.ค.), ระเบียบการลา 2555, 
--             ก.ค.ศ. ว15/2561, ว9/2564 (PA), ข้อบังคับคุรุสภา 2565, PDPA 2562
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & CUSTOM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('teacher', 'hr_admin', 'director');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE leave_type_enum AS ENUM (
        'ลาป่วย',
        'ลากิจส่วนตัว',
        'ลาคลอดบุตร',
        'ลาไปช่วยเหลือภริยาที่คลอดบุตร',
        'ลาพักผ่อน',
        'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์',
        'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล',
        'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE leave_status_enum AS ENUM ('pending', 'reviewed', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE half_day_enum AS ENUM ('full', 'morning', 'afternoon');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE license_type_enum AS ENUM (
        'P-License', 
        'B-License', 
        'A-License', 
        'ผู้บริหารสถานศึกษา', 
        'ผู้บริหารการศึกษา', 
        'ศึกษานิเทศก์'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. CORE TABLES
-- ----------------------------------------------------------------------------

-- 2.1 ตั้งค่าโรงเรียนและปีงบประมาณ
CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code VARCHAR(20) UNIQUE NOT NULL DEFAULT 'DEFAULT_SCHOOL',
    school_name TEXT NOT NULL DEFAULT 'โรงเรียนในสังกัด สพฐ.',
    affiliation TEXT NOT NULL DEFAULT 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน',
    director_name TEXT,
    director_position TEXT DEFAULT 'ผู้อำนวยการสถานศึกษา',
    current_fiscal_year INT NOT NULL DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE)::INT + 543),
    student_count INT NOT NULL DEFAULT 0,
    classroom_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 ข้อมูลบุคลากรหลัก (เชื่อมกับ auth.users ของ Supabase)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_code VARCHAR(30) UNIQUE,
    prefix VARCHAR(30) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    position_name TEXT NOT NULL DEFAULT 'ครู',
    academic_standing TEXT DEFAULT 'ไม่มีวิทยฐานะ', -- เช่น ชำนาญการ, ชำนาญการพิเศษ
    department TEXT, -- กลุ่มสาระฯ / ฝ่ายบริหาร 4 ฝ่าย
    birth_date DATE NOT NULL,
    start_service_date DATE NOT NULL, -- วันบรรจุเข้ารับราชการ
    is_year_round_staff BOOLEAN NOT NULL DEFAULT FALSE, -- มีสิทธิลาพักผ่อนหรือไม่ (ผอ./ธุรการ)
    role user_role NOT NULL DEFAULT 'teacher',
    signature_url TEXT, -- รูปลายเซ็นอิเล็กทรอนิกส์ใน Supabase Storage
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 ข้อมูลอ่อนไหวตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) แยกตารางล็อกสิทธิ์เข้มงวด
CREATE TABLE IF NOT EXISTS public.staff_sensitive (
    staff_id UUID PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
    citizen_id CHAR(13) UNIQUE NOT NULL CHECK (citizen_id ~ '^[0-9]{13}$'),
    phone_number VARCHAR(20),
    current_salary NUMERIC(10, 2) DEFAULT 0.00,
    bank_account VARCHAR(30),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 ใบอนุญาตประกอบวิชาชีพคุรุสภา (ข้อบังคับคุรุสภา พ.ศ. 2565)
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    license_number VARCHAR(50) NOT NULL,
    license_type license_type_enum NOT NULL DEFAULT 'B-License',
    issued_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 วันหยุดราชการประจำปี (ใช้หักวันทำการในการลา)
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE UNIQUE NOT NULL,
    holiday_name TEXT NOT NULL,
    fiscal_year INT NOT NULL, -- ปี พ.ศ. เช่น 2569, 2570
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 ประวัติการขออนุมัติลา (ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลา พ.ศ. 2555)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_no VARCHAR(50) UNIQUE, -- เลขที่ใบลาสำหรับสร้าง QR Code อ้างอิง
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    leave_type leave_type_enum NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    half_day half_day_enum NOT NULL DEFAULT 'full',
    total_days NUMERIC(4, 1) NOT NULL CHECK (total_days > 0),
    fiscal_year INT NOT NULL, -- ปีงบประมาณ พ.ศ. (1 ต.ค. - 30 ก.ย.)
    eval_round SMALLINT NOT NULL CHECK (eval_round IN (1, 2)), -- รอบ 1 (ต.ค.-มี.ค.), รอบ 2 (เม.ย.-ก.ย.)
    reason TEXT NOT NULL,
    contact_address TEXT,
    medical_cert_required BOOLEAN NOT NULL DEFAULT FALSE,
    medical_cert_url TEXT,
    substitute_staff_id UUID REFERENCES public.staff(id), -- ผู้สอนแทน/รับมอบงาน
    status leave_status_enum NOT NULL DEFAULT 'pending',
    reviewer_id UUID REFERENCES public.staff(id), -- หัวหน้างานบุคคล/ผู้ตรวจสอบ
    reviewed_at TIMESTAMPTZ,
    approver_id UUID REFERENCES public.staff(id), -- ผู้อำนวยการสถานศึกษา
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    is_retroactive BOOLEAN NOT NULL DEFAULT FALSE, -- บันทึกลาย้อนหลังหรือไม่
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- 2.7 ภาระงานครูตามเกณฑ์ PA (ว9/2564 และ ว21/2564)
CREATE TABLE IF NOT EXISTS public.workloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    fiscal_year INT NOT NULL,
    semester SMALLINT NOT NULL CHECK (semester IN (1, 2)),
    teaching_hours NUMERIC(4, 2) NOT NULL DEFAULT 0, -- ด้านที่ 1 ชั่วโมงสอนตามตารางสอน
    support_hours NUMERIC(4, 2) NOT NULL DEFAULT 0,  -- ด้านที่ 2 งานส่งเสริมและสนับสนุนการจัดการเรียนรู้
    development_hours NUMERIC(4, 2) NOT NULL DEFAULT 0, -- ด้านที่ 3 งานพัฒนาคุณภาพการจัดการศึกษาของสถานศึกษา
    policy_hours NUMERIC(4, 2) NOT NULL DEFAULT 0,   -- ด้านที่ 4 งานตอบสนองนโยบายและจุดเน้น
    admin_division TEXT, -- งานบริหาร 4 ฝ่าย (วิชาการ / งบประมาณ / บุคลากร / บริหารทั่วไป)
    obec_systems JSONB DEFAULT '[]'::JSONB, -- ระบบสารสนเทศ สพฐ. ที่รับผิดชอบ
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (staff_id, fiscal_year, semester)
);

-- 2.8 บันทึกประวัติการเข้าถึงข้อมูลส่วนบุคคลและการกระทำสำคัญ (PDPA & Security Audit Log)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- เช่น 'REVEAL_CITIZEN_ID', 'APPROVE_LEAVE', 'UPDATE_SALARY'
    target_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leave_staff_fy ON public.leave_requests(staff_id, fiscal_year, eval_round);
CREATE INDEX IF NOT EXISTS idx_leave_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_licenses_staff ON public.licenses(staff_id, expiry_date);

-- ----------------------------------------------------------------------------
-- 4. REGULATORY CALCULATION FUNCTIONS (THAI CIVIL SERVICE LAWS)
-- ----------------------------------------------------------------------------

-- 4.1 ฟังก์ชันหาปีงบประมาณ พ.ศ. และรอบการประเมินจากวันที่ (1 ต.ค. ขึ้นปีงบฯ ใหม่)
CREATE OR REPLACE FUNCTION public.fn_get_fiscal_year_be(target_date DATE)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
    SELECT EXTRACT(YEAR FROM target_date)::INT + 543 + 
           CASE WHEN EXTRACT(MONTH FROM target_date) >= 10 THEN 1 ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_eval_round(target_date DATE)
RETURNS SMALLINT LANGUAGE sql IMMUTABLE AS $$
    -- รอบที่ 1: 1 ต.ค. - 31 มี.ค. | รอบที่ 2: 1 เม.ย. - 30 ก.ย.
    SELECT CASE WHEN EXTRACT(MONTH FROM target_date) IN (10, 11, 12, 1, 2, 3) THEN 1::SMALLINT ELSE 2::SMALLINT END;
$$;

-- 4.2 ฟังก์ชันคำนวณปีเกษียณอายุราชการ (พ.ร.บ. บำเหน็จบำนาญฯ ม.19 - กฎเหล็กวันที่ 1 ตุลาคม)
-- เกิดวันที่ 1 ต.ค. เกษียณในปีงบประมาณที่ครบ 60 ปีพอดี (ไม่บวก 1)
-- เฉพาะผู้ที่เกิดตั้งแต่วันที่ 2 ต.ค. ถึง 31 ธ.ค. เท่านั้นที่บวกปีเกษียณเพิ่ม 1 ปี
CREATE OR REPLACE FUNCTION public.fn_calculate_retirement_year_be(b_date DATE)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
    SELECT (EXTRACT(YEAR FROM b_date)::INT + 543) + 60 + 
           CASE 
               WHEN (EXTRACT(MONTH FROM b_date) = 10 AND EXTRACT(DAY FROM b_date) >= 2) 
                    OR EXTRACT(MONTH FROM b_date) IN (11, 12) 
               THEN 1 
               ELSE 0 
           END;
$$;

-- 4.3 ฟังก์ชันคำนวณวันลา (แยกวันทำการ vs วันปฏิทิน และรองรับลาครึ่งวัน 0.5)
CREATE OR REPLACE FUNCTION public.fn_calculate_leave_days(
    p_start_date DATE,
    p_end_date DATE,
    p_leave_type leave_type_enum,
    p_half_day half_day_enum DEFAULT 'full'
)
RETURNS NUMERIC(4, 1) LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_days NUMERIC(4, 1) := 0;
BEGIN
    IF p_end_date < p_start_date THEN
        RAISE EXCEPTION 'วันสิ้นสุดการลาต้องไม่น้อยกว่าวันเริ่มต้น';
    END IF;

    -- กรณีลาครึ่งวัน (ใช้ได้เฉพาะลาป่วยและลากิจส่วนตัวในวันเดียวกันตามระเบียบ ข้อ 10 วรรค 6)
    IF p_half_day IN ('morning', 'afternoon') AND p_start_date = p_end_date THEN
        RETURN 0.5;
    END IF;

    -- ประเภทการลาที่นับตาม "วันปฏิทิน" (รวมวันหยุดเสาร์-อาทิตย์และนักขัตฤกษ์)
    IF p_leave_type IN (
        'ลาคลอดบุตร',
        'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์',
        'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล',
        'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน'
    ) THEN
        RETURN (p_end_date - p_start_date + 1)::NUMERIC(4, 1);
    END IF;

    -- ประเภทการลาที่นับเฉพาะ "วันทำการ" (หักเสาร์-อาทิตย์ และหักตาราง holidays)
    SELECT COUNT(*)::NUMERIC(4, 1) INTO v_days
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d(day)
    WHERE EXTRACT(ISODOW FROM d.day) NOT IN (6, 7) -- 6 = Saturday, 7 = Sunday
      AND NOT EXISTS (
          SELECT 1 FROM public.holidays h WHERE h.holiday_date = d.day::DATE
      );

    RETURN v_days;
END;
$$;

-- 4.4 Trigger คำนวณจำนวนวันลา ปีงบประมาณ และรอบประเมินอัตโนมัติก่อนบันทึกใบลา
CREATE OR REPLACE FUNCTION public.trg_before_save_leave_request()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.fiscal_year := public.fn_get_fiscal_year_be(NEW.start_date);
    NEW.eval_round := public.fn_get_eval_round(NEW.start_date);
    NEW.total_days := public.fn_calculate_leave_days(NEW.start_date, NEW.end_date, NEW.leave_type, NEW.half_day);
    
    -- แจ้งเตือนต้องแนบใบรับรองแพทย์เมื่อลาป่วยตั้งแต่ 30 วันทำการขึ้นไปตามระเบียบ
    IF NEW.leave_type = 'ลาป่วย' AND NEW.total_days >= 30 THEN
        NEW.medical_cert_required := TRUE;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_auto_calc ON public.leave_requests;
CREATE TRIGGER trg_leave_auto_calc
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_before_save_leave_request();

-- ----------------------------------------------------------------------------
-- 5. ANALYTICS & REGULATORY VIEWS
-- ----------------------------------------------------------------------------

-- 5.1 View ข้อมูลบุคลากรพร้อมคำนวณวันเกษียณและซ่อนเลขบัตรประชาชน (PDPA Default Mask)
CREATE OR REPLACE VIEW public.v_staff_directory AS
SELECT 
    s.id,
    s.employee_code,
    s.prefix,
    s.first_name,
    s.last_name,
    (s.prefix || s.first_name || ' ' || s.last_name) AS full_name,
    s.position_name,
    s.academic_standing,
    s.department,
    s.birth_date,
    s.start_service_date,
    s.role,
    s.is_active,
    public.fn_calculate_retirement_year_be(s.birth_date) AS retirement_fiscal_year_be,
    MAKE_DATE(public.fn_calculate_retirement_year_be(s.birth_date) - 543, 9, 30) AS retirement_date_ce,
    -- PDPA Masking: แสดงรูปแบบ 1-xxxx-xxxxx-12-3 เสมอใน View ปกติ
    CASE 
        WHEN ss.citizen_id IS NOT NULL THEN 
            SUBSTRING(ss.citizen_id FROM 1 FOR 1) || '-xxxx-xxxxx-' || 
            SUBSTRING(ss.citizen_id FROM 11 FOR 2) || '-' || 
            SUBSTRING(ss.citizen_id FROM 13 FOR 1)
        ELSE 'ไม่ระบุ'
    END AS masked_citizen_id
FROM public.staff s
LEFT JOIN public.staff_sensitive ss ON s.id = ss.staff_id;

-- 5.2 View เรดาร์เฝ้าระวังเกณฑ์เลื่อนเงินเดือน (ก.ค.ศ. ว15/2561: เกิน 6 ครั้ง หรือ ป่วย+กิจ เกิน 23 วัน/รอบ)
CREATE OR REPLACE VIEW public.v_leave_promotion_radar AS
SELECT 
    s.id AS staff_id,
    (s.prefix || s.first_name || ' ' || s.last_name) AS full_name,
    s.position_name,
    lr.fiscal_year,
    lr.eval_round,
    COUNT(lr.id) FILTER (WHERE lr.status = 'approved' AND lr.leave_type IN ('ลาป่วย', 'ลากิจส่วนตัว')) AS leave_occurrences,
    COALESCE(SUM(lr.total_days) FILTER (WHERE lr.status = 'approved' AND lr.leave_type = 'ลาป่วย'), 0) AS sick_days,
    COALESCE(SUM(lr.total_days) FILTER (WHERE lr.status = 'approved' AND lr.leave_type = 'ลากิจส่วนตัว'), 0) AS personal_days,
    COALESCE(SUM(lr.total_days) FILTER (WHERE lr.status = 'approved' AND lr.leave_type IN ('ลาป่วย', 'ลากิจส่วนตัว')), 0) AS combined_sick_personal_days,
    -- Flag แจ้งเตือนความเสี่ยงเลื่อนเงินเดือนตาม ว15/2561
    (COUNT(lr.id) FILTER (WHERE lr.status = 'approved' AND lr.leave_type IN ('ลาป่วย', 'ลากิจส่วนตัว')) > 6) AS is_exceed_occurrences_limit,
    (COALESCE(SUM(lr.total_days) FILTER (WHERE lr.status = 'approved' AND lr.leave_type IN ('ลาป่วย', 'ลากิจส่วนตัว')), 0) > 23) AS is_exceed_days_limit
FROM public.staff s
LEFT JOIN public.leave_requests lr ON s.id = lr.staff_id
GROUP BY s.id, s.prefix, s.first_name, s.last_name, s.position_name, lr.fiscal_year, lr.eval_round;

-- 5.3 View ตรวจสอบสถานะใบอนุญาตประกอบวิชาชีพคุรุสภา (แจ้งเตือนล่วงหน้า 90 วัน)
CREATE OR REPLACE VIEW public.v_license_status AS
SELECT 
    l.*,
    (s.prefix || s.first_name || ' ' || s.last_name) AS full_name,
    (l.expiry_date - CURRENT_DATE) AS days_remaining,
    CASE 
        WHEN l.expiry_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN (l.expiry_date - CURRENT_DATE) <= 90 THEN 'EXPIRING_SOON'
        ELSE 'VALID'
    END AS license_health
FROM public.licenses l
JOIN public.staff s ON l.staff_id = s.id;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) & PDPA RPC
-- ----------------------------------------------------------------------------

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_sensitive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ฟังก์ชันเช็กสิทธิ์ผู้ใช้งานปัจจุบันว่าเป็น Admin หรือ ผอ. หรือไม่
CREATE OR REPLACE FUNCTION public.fn_is_admin_or_director()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.staff 
        WHERE id = auth.uid() AND role IN ('hr_admin', 'director') AND is_active = TRUE
    );
$$;

-- RLS: Staff (ทุกคนที่ล็อกอินดูข้อมูลพื้นฐานเพื่อนร่วมงานได้ แต่แก้ไขได้เฉพาะแอดมิน/ตัวเอง)
CREATE POLICY "staff_select_authenticated" ON public.staff FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "staff_modify_admin" ON public.staff FOR ALL TO authenticated USING (public.fn_is_admin_or_director());

-- RLS: Staff Sensitive (ห้าม SELECT ตรงๆ ยกเว้นเจ้าของข้อมูล หรือ Admin/ผอ.)
CREATE POLICY "sensitive_select_owner_or_admin" ON public.staff_sensitive 
    FOR SELECT TO authenticated 
    USING (staff_id = auth.uid() OR public.fn_is_admin_or_director());

CREATE POLICY "sensitive_modify_admin" ON public.staff_sensitive 
    FOR ALL TO authenticated 
    USING (public.fn_is_admin_or_director());

-- RLS: Leave Requests (ครูดูและยื่นของตัวเองได้ / แอดมินและผอ. ดูและอนุมัติได้ทั้งหมด)
CREATE POLICY "leave_select_policy" ON public.leave_requests 
    FOR SELECT TO authenticated 
    USING (staff_id = auth.uid() OR substitute_staff_id = auth.uid() OR public.fn_is_admin_or_director());

CREATE POLICY "leave_insert_own" ON public.leave_requests 
    FOR INSERT TO authenticated 
    WITH CHECK (staff_id = auth.uid() OR public.fn_is_admin_or_director());

CREATE POLICY "leave_update_policy" ON public.leave_requests 
    FOR UPDATE TO authenticated 
    USING ((staff_id = auth.uid() AND status = 'pending') OR public.fn_is_admin_or_director());

-- RLS: Licenses & Workloads & Holidays
CREATE POLICY "holidays_read_all" ON public.holidays FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "holidays_admin_all" ON public.holidays FOR ALL TO authenticated USING (public.fn_is_admin_or_director());

CREATE POLICY "licenses_select_policy" ON public.licenses FOR SELECT TO authenticated USING (staff_id = auth.uid() OR public.fn_is_admin_or_director());
CREATE POLICY "licenses_admin_all" ON public.licenses FOR ALL TO authenticated USING (public.fn_is_admin_or_director());

CREATE POLICY "workloads_select_policy" ON public.workloads FOR SELECT TO authenticated USING (staff_id = auth.uid() OR public.fn_is_admin_or_director());
CREATE POLICY "workloads_modify_policy" ON public.workloads FOR ALL TO authenticated USING (staff_id = auth.uid() OR public.fn_is_admin_or_director());

-- 6.1 RPC สำหรับกดปุ่มขอดูเลขบัตรประชาชน 13 หลัก (บันทึก Audit Log อัตโนมัติตามกฎหมาย PDPA)
CREATE OR REPLACE FUNCTION public.rpc_reveal_citizen_id(p_target_staff_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_citizen_id TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF auth.uid() <> p_target_staff_id AND NOT public.fn_is_admin_or_director() THEN
        RAISE EXCEPTION 'ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนบุคคลของผู้อื่นตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)';
    END IF;

    SELECT citizen_id INTO v_citizen_id FROM public.staff_sensitive WHERE staff_id = p_target_staff_id;

    -- บันทึกประวัติการเปิดดูลงตาราง audit_logs ทันที
    INSERT INTO public.audit_logs (actor_id, action_type, target_staff_id, details)
    VALUES (
        auth.uid(), 
        'REVEAL_CITIZEN_ID', 
        p_target_staff_id, 
        jsonb_build_object('timestamp', NOW(), 'auto_remask_seconds', 15)
    );

    RETURN v_citizen_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- 7. AUTOMATED STORAGE BUCKETS & STORAGE RLS (One-Click All-in-One Execution)
-- ----------------------------------------------------------------------------

-- สร้าง Bucket 'leave-documents' และ 'signatures' อัตโนมัติผ่าน SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('leave-documents', 'leave-documents', FALSE, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('signatures', 'signatures', FALSE, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS สำหรับอัปโหลดและดูเอกสารใบลา
DROP POLICY IF EXISTS "allow_auth_upload_leave_docs" ON storage.objects;
CREATE POLICY "allow_auth_upload_leave_docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('leave-documents', 'signatures'));

DROP POLICY IF EXISTS "allow_auth_read_leave_docs" ON storage.objects;
CREATE POLICY "allow_auth_read_leave_docs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id IN ('leave-documents', 'signatures'));

DROP POLICY IF EXISTS "allow_auth_delete_leave_docs" ON storage.objects;
CREATE POLICY "allow_auth_delete_leave_docs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id IN ('leave-documents', 'signatures') AND (auth.uid() = owner OR public.fn_is_admin_or_director()));
