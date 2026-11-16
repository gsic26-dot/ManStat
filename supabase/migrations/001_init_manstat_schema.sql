-- =========================================================================
-- MANSTAT MODERN - PRODUCTION DATABASE SCHEMA & PDPA SHIELD
-- Migration: 001_init_manstat_schema.sql
-- Conforms to: Thai Civil Service Laws, OPSC (ก.ค.ศ. ว15/2561), and PDPA
-- =========================================================================

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. SCHOOL SETTINGS & CONFIGURATION
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'โรงเรียนชุมชนบ้านตะขบ',
  affiliation TEXT NOT NULL DEFAULT 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3',
  school_code_10 VARCHAR(10) NOT NULL DEFAULT '1030200688',
  school_code_8 VARCHAR(8) NOT NULL DEFAULT '30030099',
  director_name TEXT NOT NULL DEFAULT 'นายธีรศักดิ์ มโนธรรม',
  director_position TEXT NOT NULL DEFAULT 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ',
  current_fiscal_year INT NOT NULL DEFAULT 2570,
  current_academic_year INT NOT NULL DEFAULT 2569,
  current_term SMALLINT NOT NULL DEFAULT 2,
  student_count INT NOT NULL DEFAULT 94,
  student_data_date DATE DEFAULT '2026-11-10',
  contact_phone VARCHAR(50) DEFAULT '099-173-2233',
  address TEXT DEFAULT 'หมู่ที่ 2 ตำบลตะขบ อำเภอปักธงชัย จังหวัดนครราชสีมา 30150',
  logo_base64 TEXT,
  alert_settings JSONB NOT NULL DEFAULT '{
    "leave_count_threshold": 6,
    "sick_personal_days_threshold": 23,
    "license_expiry_warning_days": 90,
    "retirement_warning_years": 5
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 2. STAFF (Core Personnel Table - Tied to auth.users)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  emp_id VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'hr_admin', 'director')),
  position TEXT NOT NULL DEFAULT 'ครู',
  standing TEXT DEFAULT 'ไม่มีวิทยฐานะ',
  department TEXT NOT NULL DEFAULT 'ไม่ระบุ',
  division TEXT DEFAULT 'ฝ่ายบริหารงานวิชาการ',
  position_no VARCHAR(50),
  member_id VARCHAR(50),
  birth_date DATE NOT NULL,
  start_date DATE NOT NULL,
  duty_day VARCHAR(50) DEFAULT 'จันทร์',
  phone VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'ปกติ' CHECK (status IN ('ปกติ', 'ช่วยราชการ', 'ไปราชการ', 'ลาออก', 'ย้าย/เกษียณ')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_emp_id ON staff(emp_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);

-- -------------------------------------------------------------------------
-- 3. STAFF SENSITIVE (PDPA Shield - Citizen ID & Salary Isolated)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_sensitive (
  emp_id VARCHAR(50) PRIMARY KEY REFERENCES staff(emp_id) ON DELETE CASCADE,
  citizen_id VARCHAR(13) NOT NULL,
  salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  bank_account VARCHAR(50),
  blood_group VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 4. PROFESSIONAL LICENSES (Khurusapha Standards)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) NOT NULL REFERENCES staff(emp_id) ON DELETE CASCADE,
  license_type VARCHAR(50) NOT NULL CHECK (
    license_type IN ('P-License', 'B-License', 'A-License', 'ผู้บริหารสถานศึกษา', 'ศึกษานิเทศก์')
  ),
  license_number VARCHAR(100) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  doc_url TEXT DEFAULT '-',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_licenses_emp_id ON licenses(emp_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry_date);

-- -------------------------------------------------------------------------
-- 5. OFFICIAL HOLIDAYS (Government & Compensatory Days)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holidays (
  holiday_date DATE PRIMARY KEY,
  title TEXT NOT NULL,
  holiday_type VARCHAR(50) DEFAULT 'วันหยุดราชการ',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);

-- -------------------------------------------------------------------------
-- 6. LEAVE REQUESTS (Official Civil Service Leave Logs)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_code VARCHAR(50) UNIQUE NOT NULL,
  emp_id VARCHAR(50) NOT NULL REFERENCES staff(emp_id) ON DELETE CASCADE,
  leave_type VARCHAR(100) NOT NULL CHECK (
    leave_type IN (
      'ลาป่วย', 'ลากิจส่วนตัว', 'ลาพักผ่อน', 'ลาคลอดบุตร',
      'ลาช่วยภริยาคลอดบุตร', 'ลาอุปสมบท/ฮัจย์', 'ลาตรวจเลือก/เตรียมพล',
      'ขออนุญาตออกนอกบริเวณสถานศึกษา', 'ไปราชการ'
    )
  ),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  half_day_period VARCHAR(20) NOT NULL DEFAULT 'FULL' CHECK (half_day_period IN ('FULL', 'MORNING', 'AFTERNOON')),
  total_days NUMERIC(4,1) NOT NULL,
  fiscal_year INT NOT NULL,
  eval_round SMALLINT NOT NULL CHECK (eval_round IN (1, 2)),
  reason TEXT NOT NULL,
  contact_address TEXT,
  contact_phone VARCHAR(50),
  medical_cert_url TEXT DEFAULT '-',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  step_hr VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (step_hr IN ('pending', 'approved', 'rejected')),
  step_director VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (step_director IN ('pending', 'approved', 'rejected')),
  approver_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leave_emp_id ON leave_requests(emp_id);
CREATE INDEX IF NOT EXISTS idx_leave_fiscal ON leave_requests(fiscal_year, eval_round);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- -------------------------------------------------------------------------
-- 7. WORKLOADS (PA Performance Agreement & Administrative Duties)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id VARCHAR(50) NOT NULL REFERENCES staff(emp_id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL CHECK (
    category IN (
      'ด้านที่ 1 การจัดการเรียนรู้',
      'ด้านที่ 2 การส่งเสริมสนับสนุน',
      'ด้านที่ 3 การพัฒนาตนเองและวิชาชีพ',
      'ด้านที่ 4 ภาระงานตามที่ ก.ค.ศ. กำหนด',
      'งานบริหาร 4 ฝ่าย'
    )
  ),
  title TEXT NOT NULL,
  hours_per_week NUMERIC(4,1) NOT NULL DEFAULT 0,
  role_in_task VARCHAR(50) NOT NULL DEFAULT 'ผู้รับผิดชอบหลัก',
  academic_term VARCHAR(20) NOT NULL DEFAULT '2/2569',
  fiscal_year INT NOT NULL DEFAULT 2570,
  order_reference TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ปกติ',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workloads_emp ON workloads(emp_id, fiscal_year);

-- -------------------------------------------------------------------------
-- 8. AUDIT LOGS (PDPA Access & Modification Trail)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  emp_id VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_emp ON audit_logs(emp_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- -------------------------------------------------------------------------
-- 9. STORED FUNCTION: fn_calculate_working_days
-- Automatically skips Saturdays, Sundays, and holidays for civil service leave
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_working_days(
  p_start_date DATE,
  p_end_date DATE,
  p_leave_type TEXT,
  p_half_day_period TEXT DEFAULT 'FULL'
)
RETURNS NUMERIC AS $$
DECLARE
  v_curr DATE := p_start_date;
  v_count NUMERIC := 0;
  v_is_continuous BOOLEAN;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RETURN 0;
  END IF;

  -- Short school exit permit does not count as official leave day
  IF p_leave_type LIKE '%ออกนอกบริเวณ%' OR p_leave_type LIKE '%3 ชม.%' THEN
    RETURN 0;
  END IF;

  -- Half day handling for single date
  IF p_start_date = p_end_date AND p_half_day_period IN ('MORNING', 'AFTERNOON') THEN
    RETURN 0.5;
  END IF;

  -- Calendar days: Maternity, Ordination, Military Service
  v_is_continuous := (
    p_leave_type LIKE '%คลอด%' OR
    p_leave_type LIKE '%อุปสมบท%' OR
    p_leave_type LIKE '%ฮัจย์%' OR
    p_leave_type LIKE '%ตรวจเลือก%' OR
    p_leave_type LIKE '%เตรียมพล%'
  );

  IF v_is_continuous THEN
    RETURN (p_end_date - p_start_date + 1);
  END IF;

  -- Working days: Exclude Saturday (6), Sunday (0), and holidays table
  WHILE v_curr <= p_end_date LOOP
    IF EXTRACT(DOW FROM v_curr) NOT IN (0, 6) AND NOT EXISTS (
      SELECT 1 FROM holidays WHERE holiday_date = v_curr
    ) THEN
      v_count := v_count + 1;
    END IF;
    v_curr := v_curr + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- -------------------------------------------------------------------------
-- 10. SQL VIEW: v_leave_promotion_radar (ก.ค.ศ. ว15/2561 Radar)
-- -------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_leave_promotion_radar AS
SELECT
  s.emp_id,
  s.full_name,
  s.position,
  s.department,
  lr.fiscal_year,
  lr.eval_round,
  COUNT(lr.id) AS leave_count,
  COALESCE(SUM(CASE WHEN lr.leave_type IN ('ลาป่วย', 'ลากิจส่วนตัว') THEN lr.total_days ELSE 0 END), 0) AS sick_personal_days,
  COALESCE(SUM(CASE WHEN lr.leave_type = 'ลาป่วย' THEN lr.total_days ELSE 0 END), 0) AS sick_days,
  COALESCE(SUM(CASE WHEN lr.leave_type = 'ลากิจส่วนตัว' THEN lr.total_days ELSE 0 END), 0) AS personal_days,
  COALESCE(SUM(CASE WHEN lr.leave_type = 'ลาพักผ่อน' THEN lr.total_days ELSE 0 END), 0) AS vacation_days,
  COALESCE(SUM(lr.total_days), 0) AS total_leave_days,
  -- Flags per OPSC ว15/2561
  (COUNT(lr.id) > 6) AS is_leave_count_exceeded,
  (COALESCE(SUM(CASE WHEN lr.leave_type IN ('ลาป่วย', 'ลากิจส่วนตัว') THEN lr.total_days ELSE 0 END), 0) > 23) AS is_days_exceeded
FROM staff s
LEFT JOIN leave_requests lr ON s.emp_id = lr.emp_id AND lr.status = 'approved'
GROUP BY s.emp_id, s.full_name, s.position, s.department, lr.fiscal_year, lr.eval_round;

-- -------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_sensitive ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE workloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper to fetch user's internal role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS VARCHAR AS $$
  SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 11.1 school_settings: All authenticated can read, only hr_admin or director can edit
CREATE POLICY "school_settings_select" ON school_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "school_settings_admin_all" ON school_settings FOR ALL TO authenticated USING (
  auth_user_role() IN ('hr_admin', 'director')
) WITH CHECK (
  auth_user_role() IN ('hr_admin', 'director')
);

-- 11.2 staff: All authenticated can read basic staff directory; hr_admin/director can manage
CREATE POLICY "staff_select_all" ON staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_admin_manage" ON staff FOR ALL TO authenticated USING (
  auth_user_role() IN ('hr_admin', 'director')
) WITH CHECK (
  auth_user_role() IN ('hr_admin', 'director')
);

-- 11.3 staff_sensitive: PDPA Lockdown
-- Users can ONLY read their own record; hr_admin/director can read
CREATE POLICY "staff_sensitive_select_own" ON staff_sensitive FOR SELECT TO authenticated USING (
  emp_id IN (SELECT emp_id FROM staff WHERE user_id = auth.uid()) OR
  auth_user_role() IN ('hr_admin', 'director')
);
CREATE POLICY "staff_sensitive_admin_modify" ON staff_sensitive FOR ALL TO authenticated USING (
  auth_user_role() IN ('hr_admin', 'director')
) WITH CHECK (
  auth_user_role() IN ('hr_admin', 'director')
);

-- 11.4 licenses: All can read; hr_admin/director and license owner can insert/update
CREATE POLICY "licenses_select" ON licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "licenses_manage_own_or_admin" ON licenses FOR ALL TO authenticated USING (
  emp_id IN (SELECT emp_id FROM staff WHERE user_id = auth.uid()) OR
  auth_user_role() IN ('hr_admin', 'director')
) WITH CHECK (
  emp_id IN (SELECT emp_id FROM staff WHERE user_id = auth.uid()) OR
  auth_user_role() IN ('hr_admin', 'director')
);

-- 11.5 holidays: All can read; hr_admin/director can manage
CREATE POLICY "holidays_select" ON holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "holidays_admin_manage" ON holidays FOR ALL TO authenticated USING (
  auth_user_role() IN ('hr_admin', 'director')
) WITH CHECK (
  auth_user_role() IN ('hr_admin', 'director')
);

-- 11.6 leave_requests:
-- Teachers can view their own and insert new ones
-- Teachers CANNOT modify or delete once status is 'approved'
-- HR Admin and Director can view all and update approval steps
CREATE POLICY "leave_select_own_or_admin" ON leave_requests FOR SELECT TO authenticated USING (
  emp_id IN (SELECT emp_id FROM staff WHERE user_id = auth.uid()) OR
  auth_user_role() IN ('hr_admin', 'director')
);
CREATE POLICY "leave_insert_own" ON leave_requests FOR INSERT TO authenticated WITH CHECK (
  emp_id IN (SELECT emp_id FROM staff WHERE user_id = auth.uid())
);
CREATE POLICY "leave_update_own_pending" ON leave_requests FOR UPDATE TO authenticated USING (
  emp_id IN (SELECT emp_id FROM staff WHERE user_id = auth.uid()) AND status = 'pending'
) WITH CHECK (
  emp_id IN (SELECT emp_id FROM staff WHERE user_id = auth.uid()) AND status = 'pending'
);
CREATE POLICY "leave_admin_approval" ON leave_requests FOR ALL TO authenticated USING (
  auth_user_role() IN ('hr_admin', 'director')
) WITH CHECK (
  auth_user_role() IN ('hr_admin', 'director')
);

-- 11.7 workloads: All authenticated can read; teachers can update their own
CREATE POLICY "workloads_select" ON workloads FOR SELECT TO authenticated USING (true);
CREATE POLICY "workloads_manage_own_or_admin" ON workloads FOR ALL TO authenticated USING (
  emp_id IN (SELECT emp_id FROM staff WHERE user_id = auth.uid()) OR
  auth_user_role() IN ('hr_admin', 'director')
) WITH CHECK (
  emp_id IN (SELECT emp_id FROM staff WHERE user_id = auth.uid()) OR
  auth_user_role() IN ('hr_admin', 'director')
);

-- 11.8 audit_logs: Any authenticated can INSERT their own log; only hr_admin/director can SELECT
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT TO authenticated USING (
  auth_user_role() IN ('hr_admin', 'director')
);

COMMIT;
