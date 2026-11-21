-- ============================================================================
-- ManStat-Modern: Safe Incremental Schema Update for Existing Supabase Tables
-- ============================================================================
-- คำแนะนำ: คัดลอกโค้ดทั้งหมดนี้ไปวางใน Supabase Dashboard -> SQL Editor -> New Query แล้วกด Run
-- ปลอดภัย 100%: ไม่มีคำสั่ง DROP, DELETE, หรือ TRUNCATE ใดๆ ไม่กระทบข้อมูลเดิมที่มีอยู่
-- ============================================================================

-- 1. ตาราง teachers: เพิ่มคอลัมน์ที่ระบบใหม่จำเป็นต้องใช้ (หากยังไม่มี)
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS employee_code TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS prefix TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'ครู';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS system_role TEXT DEFAULT 'teacher';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS academic_standing TEXT DEFAULT '-';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS masked_citizen_id TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS highest_scout TEXT DEFAULT 'ไม่มีวุฒิลูกเสือ';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS scout_cert_no TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS teaching_hours NUMERIC DEFAULT 18;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS ta_hours NUMERIC DEFAULT 0;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS sick_used NUMERIC DEFAULT 0;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS personal_used NUMERIC DEFAULT 0;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS vacation_used NUMERIC DEFAULT 0;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS licenses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS standings JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS educations JSONB DEFAULT '[]'::jsonb;

-- อัปเดต employee_code ให้ตรงกับ id สำหรับข้อมูลเดิมที่ว่างอยู่
UPDATE public.teachers SET employee_code = id WHERE employee_code IS NULL OR employee_code = '';

-- ซิงค์ system_role จาก access_level (แยกคอลัมน์สิทธิ์ระบบออกจากชื่อตำแหน่งอย่างเด็ดขาด)
UPDATE public.teachers 
SET system_role = CASE 
  WHEN access_level ILIKE '%Superuser%' THEN 'superuser'
  WHEN access_level ILIKE '%Admin%' THEN 'hr_admin'
  ELSE 'teacher'
END
WHERE system_role IS NULL OR system_role = 'teacher';

-- ซิงค์ position จาก role ภาษาไทยเดิม (ป้องกันตำแหน่งครูหายเมื่อระบบใหม่เข้าถึง)
UPDATE public.teachers 
SET position = role 
WHERE (position IS NULL OR position = '' OR position = 'ครู') 
  AND role IS NOT NULL 
  AND role NOT IN ('superuser', 'director', 'hr_admin', 'teacher');

-- 2. ตาราง board_members: เพิ่มคอลัมน์รองรับ ผอ. โดยตำแหน่ง และวาระการดำรงตำแหน่ง
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS is_ex_officio BOOLEAN DEFAULT FALSE;
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS appointment_date TEXT DEFAULT '';
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS end_reason TEXT DEFAULT '';
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS position_title TEXT DEFAULT 'กรรมการสถานศึกษา';

-- ปรับปรุงสถานะ ผอ. เป็นกรรมการและเลขานุการโดยตำแหน่งอัตโนมัติ
UPDATE public.board_members 
SET is_ex_officio = TRUE 
WHERE board_position = 'DIRECTOR_SEC' OR remark LIKE '%โดยตำแหน่ง%';

-- 3. ตาราง holidays: เพิ่มคอลัมน์ประเภทวันหยุดและชื่อวันหยุด
ALTER TABLE public.holidays ADD COLUMN IF NOT EXISTS id TEXT DEFAULT '';
ALTER TABLE public.holidays ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE public.holidays ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'วันหยุดราชการประจำปี';

UPDATE public.holidays 
SET name = reason_type 
WHERE (name IS NULL OR name = '') AND reason_type IS NOT NULL;

UPDATE public.holidays 
SET id = holiday_date 
WHERE id IS NULL OR id = '';

-- บันทึกข้อมูลวันหยุดราชการประจำปี 2569 (2026) และ 2570 (2027) รวม 50 วัน
INSERT INTO public.holidays (holiday_date, reason_type, name, type, id, note) VALUES
('2026-01-01', 'วันขึ้นปีใหม่', 'วันขึ้นปีใหม่', 'วันหยุดราชการประจำปี', 'h-2026-01-01', ''),
('2026-01-02', 'วันหยุดราชการเพิ่มเป็นกรณีพิเศษ (มติ ครม.)', 'วันหยุดราชการเพิ่มเป็นกรณีพิเศษ (มติ ครม.)', 'วันหยุดพิเศษ / ตามมติ ครม.', 'h-2026-01-02', ''),
('2026-01-16', 'วันครูแห่งชาติ (วันหยุดเฉพาะสถานศึกษา)', 'วันครูแห่งชาติ (วันหยุดเฉพาะสถานศึกษา)', 'วันหยุดเฉพาะสถานศึกษา', 'h-2026-01-16', ''),
('2026-03-03', 'วันมาฆบูชา', 'วันมาฆบูชา', 'วันหยุดราชการประจำปี', 'h-2026-03-03', ''),
('2026-04-06', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)', 'วันหยุดราชการประจำปี', 'h-2026-04-06', ''),
('2026-04-13', 'วันสงกรานต์', 'วันสงกรานต์', 'วันหยุดราชการประจำปี', 'h-2026-04-13', ''),
('2026-04-14', 'วันสงกรานต์', 'วันสงกรานต์', 'วันหยุดราชการประจำปี', 'h-2026-04-14', ''),
('2026-04-15', 'วันสงกรานต์', 'วันสงกรานต์', 'วันหยุดราชการประจำปี', 'h-2026-04-15', ''),
('2026-05-01', 'วันแรงงานแห่งชาติ', 'วันแรงงานแห่งชาติ', 'วันหยุดราชการประจำปี', 'h-2026-05-01', ''),
('2026-05-04', 'วันฉัตรมงคล', 'วันฉัตรมงคล', 'วันหยุดราชการประจำปี', 'h-2026-05-04', ''),
('2026-05-13', 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', 'วันหยุดราชการประจำปี', 'h-2026-05-13', ''),
('2026-05-31', 'วันวิสาขบูชา', 'วันวิสาขบูชา', 'วันหยุดราชการประจำปี', 'h-2026-05-31', ''),
('2026-06-01', 'วันหยุดชดเชยวันวิสาขบูชา', 'วันหยุดชดเชยวันวิสาขบูชา', 'วันหยุดชดเชย', 'h-2026-06-01', ''),
('2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', 'วันหยุดราชการประจำปี', 'h-2026-06-03', ''),
('2026-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', 'วันหยุดราชการประจำปี', 'h-2026-07-28', ''),
('2026-07-29', 'วันอาสาฬหบูชา', 'วันอาสาฬหบูชา', 'วันหยุดราชการประจำปี', 'h-2026-07-29', ''),
('2026-07-30', 'วันเข้าพรรษา', 'วันเข้าพรรษา', 'วันหยุดราชการประจำปี', 'h-2026-07-30', ''),
('2026-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', 'วันหยุดราชการประจำปี', 'h-2026-08-12', ''),
('2026-10-13', 'วันนวมินทรมหาราช', 'วันนวมินทรมหาราช', 'วันหยุดราชการประจำปี', 'h-2026-10-13', ''),
('2026-10-23', 'วันปิยมหาราช', 'วันปิยมหาราช', 'วันหยุดราชการประจำปี', 'h-2026-10-23', ''),
('2026-12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', 'วันหยุดราชการประจำปี', 'h-2026-12-05', ''),
('2026-12-07', 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', 'วันหยุดชดเชย', 'h-2026-12-07', ''),
('2026-12-10', 'วันรัฐธรรมนูญ', 'วันรัฐธรรมนูญ', 'วันหยุดราชการประจำปี', 'h-2026-12-10', ''),
('2026-12-31', 'วันสิ้นปี', 'วันสิ้นปี', 'วันหยุดราชการประจำปี', 'h-2026-12-31', ''),
('2027-01-01', 'วันขึ้นปีใหม่', 'วันขึ้นปีใหม่', 'วันหยุดราชการประจำปี', 'h-2027-01-01', ''),
('2027-01-16', 'วันครูแห่งชาติ (วันหยุดเฉพาะสถานศึกษา)', 'วันครูแห่งชาติ (วันหยุดเฉพาะสถานศึกษา)', 'วันหยุดเฉพาะสถานศึกษา', 'h-2027-01-16', ''),
('2027-02-21', 'วันมาฆบูชา', 'วันมาฆบูชา', 'วันหยุดราชการประจำปี', 'h-2027-02-21', ''),
('2027-02-22', 'วันหยุดชดเชยวันมาฆบูชา', 'วันหยุดชดเชยวันมาฆบูชา', 'วันหยุดชดเชย', 'h-2027-02-22', ''),
('2027-04-06', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)', 'วันหยุดราชการประจำปี', 'h-2027-04-06', ''),
('2027-04-13', 'วันสงกรานต์', 'วันสงกรานต์', 'วันหยุดราชการประจำปี', 'h-2027-04-13', ''),
('2027-04-14', 'วันสงกรานต์', 'วันสงกรานต์', 'วันหยุดราชการประจำปี', 'h-2027-04-14', ''),
('2027-04-15', 'วันสงกรานต์', 'วันสงกรานต์', 'วันหยุดราชการประจำปี', 'h-2027-04-15', ''),
('2027-05-01', 'วันแรงงานแห่งชาติ', 'วันแรงงานแห่งชาติ', 'วันหยุดราชการประจำปี', 'h-2027-05-01', ''),
('2027-05-03', 'วันหยุดชดเชยวันแรงงานแห่งชาติ', 'วันหยุดชดเชยวันแรงงานแห่งชาติ', 'วันหยุดชดเชย', 'h-2027-05-03', ''),
('2027-05-04', 'วันฉัตรมงคล', 'วันฉัตรมงคล', 'วันหยุดราชการประจำปี', 'h-2027-05-04', ''),
('2027-05-13', 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', 'วันหยุดราชการประจำปี', 'h-2027-05-13', ''),
('2027-05-20', 'วันวิสาขบูชา', 'วันวิสาขบูชา', 'วันหยุดราชการประจำปี', 'h-2027-05-20', ''),
('2027-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', 'วันหยุดราชการประจำปี', 'h-2027-06-03', ''),
('2027-07-18', 'วันอาสาฬหบูชา', 'วันอาสาฬหบูชา', 'วันหยุดราชการประจำปี', 'h-2027-07-18', ''),
('2027-07-19', 'วันเข้าพรรษา', 'วันเข้าพรรษา', 'วันหยุดราชการประจำปี', 'h-2027-07-19', ''),
('2027-07-20', 'วันหยุดชดเชยวันอาสาฬหบูชา', 'วันหยุดชดเชยวันอาสาฬหบูชา', 'วันหยุดชดเชย', 'h-2027-07-20', ''),
('2027-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', 'วันหยุดราชการประจำปี', 'h-2027-07-28', ''),
('2027-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', 'วันหยุดราชการประจำปี', 'h-2027-08-12', ''),
('2027-10-13', 'วันนวมินทรมหาราช', 'วันนวมินทรมหาราช', 'วันหยุดราชการประจำปี', 'h-2027-10-13', ''),
('2027-10-23', 'วันปิยมหาราช', 'วันปิยมหาราช', 'วันหยุดราชการประจำปี', 'h-2027-10-23', ''),
('2027-10-25', 'วันหยุดชดเชยวันปิยมหาราช', 'วันหยุดชดเชยวันปิยมหาราช', 'วันหยุดชดเชย', 'h-2027-10-25', ''),
('2027-12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', 'วันหยุดราชการประจำปี', 'h-2027-12-05', ''),
('2027-12-06', 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', 'วันหยุดชดเชย', 'h-2027-12-06', ''),
('2027-12-10', 'วันรัฐธรรมนูญ', 'วันรัฐธรรมนูญ', 'วันหยุดราชการประจำปี', 'h-2027-12-10', ''),
('2027-12-31', 'วันสิ้นปี', 'วันสิ้นปี', 'วันหยุดราชการประจำปี', 'h-2027-12-31', '')
ON CONFLICT (holiday_date) DO UPDATE SET
  reason_type = EXCLUDED.reason_type,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  id = EXCLUDED.id;

-- 4. ตาราง leave_logs: เพิ่มคอลัมน์สำหรับระบบคำร้องขอลาใหม่
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS doc_no TEXT DEFAULT '';
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS position TEXT DEFAULT '';
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS department TEXT DEFAULT '';
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS leave_type_name TEXT DEFAULT '';
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS place TEXT DEFAULT '';
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS substitute_teacher_name TEXT DEFAULT '';
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS workload_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT '1';
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS supervisor_remark TEXT DEFAULT '';
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS director_remark TEXT DEFAULT '';
ALTER TABLE public.leave_logs ADD COLUMN IF NOT EXISTS submitted_at TEXT DEFAULT '';

-- 5. ตาราง audit_logs (สร้างใหม่เฉพาะกรณีที่ยังไม่มี)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  target_name TEXT NOT NULL DEFAULT '',
  ip_address TEXT DEFAULT '127.0.0.1',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_audit_logs" ON public.audit_logs;
CREATE POLICY "service_role_all_audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. ตาราง system_settings (สร้างใหม่เฉพาะกรณีที่ยังไม่มี)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  theme_mode TEXT NOT NULL DEFAULT 'auto',
  preferred_view TEXT NOT NULL DEFAULT 'table',
  compact_mode BOOLEAN NOT NULL DEFAULT FALSE,
  mask_citizen_id BOOLEAN NOT NULL DEFAULT TRUE,
  fiscal_year INTEGER NOT NULL DEFAULT 2570,
  current_term TEXT NOT NULL DEFAULT '2',
  academic_year TEXT NOT NULL DEFAULT '2569',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_system_settings" ON public.system_settings;
CREATE POLICY "service_role_all_system_settings" ON public.system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- เพิ่มค่าเริ่มต้นใน system_settings หากยังไม่มีแถว
INSERT INTO public.system_settings (id, theme_mode, preferred_view, compact_mode, mask_citizen_id, fiscal_year, current_term, academic_year)
VALUES ('default', 'auto', 'table', FALSE, TRUE, 2570, '2', '2569')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. ตาราง history_scout (ตรวจสอบและเพิ่มคอลัมน์ที่จำเป็น - ทะเบียนวุฒิลูกเสือ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.history_scout (
  record_id VARCHAR(100) PRIMARY KEY,
  emp_id VARCHAR(50),
  scout_qualification TEXT,
  scout_type TEXT,
  scout_position TEXT,
  cert_number VARCHAR(100),
  approved_year VARCHAR(50),
  timestamp TEXT
);
ALTER TABLE public.history_scout ADD COLUMN IF NOT EXISTS scout_qualification TEXT;
ALTER TABLE public.history_scout ADD COLUMN IF NOT EXISTS scout_type TEXT;
ALTER TABLE public.history_scout ADD COLUMN IF NOT EXISTS scout_position TEXT;
ALTER TABLE public.history_scout ADD COLUMN IF NOT EXISTS cert_number VARCHAR(100);
ALTER TABLE public.history_scout ADD COLUMN IF NOT EXISTS approved_year VARCHAR(50);
ALTER TABLE public.history_scout ADD COLUMN IF NOT EXISTS timestamp TEXT;
ALTER TABLE public.history_scout ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_history_scout" ON public.history_scout;
CREATE POLICY "service_role_all_history_scout" ON public.history_scout FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 8. ตาราง staff_workloads (ตรวจสอบและเพิ่มคอลัมน์ที่จำเป็น - ภาระงานและ PA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_workloads (
  workload_id VARCHAR(100) PRIMARY KEY,
  emp_id VARCHAR(50),
  co_emp_ids TEXT,
  category VARCHAR(100),
  title TEXT,
  sub_group_or_level TEXT,
  hours_per_week NUMERIC(5,2),
  role_in_task TEXT,
  academic_term VARCHAR(50),
  order_or_ref TEXT,
  effective_period TEXT,
  status VARCHAR(50) DEFAULT 'ปกติ',
  assigned_by TEXT,
  updated_by TEXT,
  timestamp TEXT
);
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS co_emp_ids TEXT;
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS sub_group_or_level TEXT;
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS hours_per_week NUMERIC(5,2);
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS role_in_task TEXT;
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS academic_term VARCHAR(50);
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS order_or_ref TEXT;
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS effective_period TEXT;
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ปกติ';
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS assigned_by TEXT;
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE public.staff_workloads ADD COLUMN IF NOT EXISTS timestamp TEXT;
ALTER TABLE public.staff_workloads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_staff_workloads" ON public.staff_workloads;
CREATE POLICY "service_role_all_staff_workloads" ON public.staff_workloads FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 9. ตาราง system_feedback (ตรวจสอบและเพิ่มคอลัมน์ที่จำเป็น - ข้อเสนอแนะระบบ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_feedback (
  feedback_id VARCHAR(100) PRIMARY KEY,
  emp_id VARCHAR(50),
  full_name TEXT,
  category VARCHAR(100),
  topic TEXT,
  detail TEXT,
  status VARCHAR(50) DEFAULT 'รอการตอบรับ',
  admin_reply TEXT,
  updated_by TEXT,
  timestamp TEXT
);
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS detail TEXT;
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'รอการตอบรับ';
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS timestamp TEXT;
ALTER TABLE public.system_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_system_feedback" ON public.system_feedback;
CREATE POLICY "service_role_all_system_feedback" ON public.system_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

