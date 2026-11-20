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
