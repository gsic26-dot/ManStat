-- =========================================================================
-- MANSTAT GROUND-TRUTH PRODUCTION DATABASE SCHEMA (15 TABLES)
-- Step 1: Run this file first in Supabase SQL Editor
-- =========================================================================
BEGIN;

-- Drop any previous draft tables to guarantee 100% schema alignment
DROP TABLE IF EXISTS school_info CASCADE;
DROP TABLE IF EXISTS fiscal_data CASCADE;
DROP TABLE IF EXISTS active_classes CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS leave_quota CASCADE;
DROP TABLE IF EXISTS leave_logs CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS board_members CASCADE;
DROP TABLE IF EXISTS school_board_staff_terms CASCADE;
DROP TABLE IF EXISTS board_meetings CASCADE;
DROP TABLE IF EXISTS staff_workloads CASCADE;
DROP TABLE IF EXISTS workloads CASCADE;
DROP TABLE IF EXISTS system_feedback CASCADE;
DROP TABLE IF EXISTS feedbacks CASCADE;
DROP TABLE IF EXISTS history_standing CASCADE;
DROP TABLE IF EXISTS history_education CASCADE;
DROP TABLE IF EXISTS history_licenses CASCADE;
DROP TABLE IF EXISTS history_scout CASCADE;

-- 1. school_info (Vertical Key-Value 20 rows)
CREATE TABLE IF NOT EXISTS school_info (
  key VARCHAR(100) PRIMARY KEY,
  val TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. fiscal_data
CREATE TABLE IF NOT EXISTS fiscal_data (
  fiscal_year INT PRIMARY KEY,
  period1_start TEXT,
  period1_end TEXT,
  period2_start TEXT,
  period2_end TEXT,
  active_period_mode VARCHAR(50),
  status VARCHAR(50),
  updated_at TEXT
);

-- 3. active_classes
CREATE TABLE IF NOT EXISTS active_classes (
  id SERIAL PRIMARY KEY,
  class_name VARCHAR(100) UNIQUE NOT NULL
);

-- 4. teachers
CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50),
  class_level VARCHAR(100),
  role TEXT,
  duty_day VARCHAR(50),
  password TEXT,
  is_password_hashed BOOLEAN DEFAULT true,
  access_level VARCHAR(50) DEFAULT 'User',
  status VARCHAR(50) DEFAULT 'ปกติ',
  start_date TEXT,
  department TEXT,
  emp_type TEXT,
  id_card VARCHAR(50),
  division TEXT,
  position_no VARCHAR(50),
  member_id VARCHAR(50),
  birth_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. leave_quota (Composite PK: emp_id, fiscal_year)
CREATE TABLE IF NOT EXISTS leave_quota (
  emp_id VARCHAR(50) NOT NULL,
  fiscal_year INT NOT NULL,
  sick_max NUMERIC(5,2) DEFAULT 60,
  sick_used NUMERIC(5,2) DEFAULT 0,
  personal_max NUMERIC(5,2) DEFAULT 45,
  personal_used NUMERIC(5,2) DEFAULT 0,
  vacation_max NUMERIC(5,2) DEFAULT 10,
  vacation_used NUMERIC(5,2) DEFAULT 0,
  PRIMARY KEY (emp_id, fiscal_year)
);

-- 6. leave_logs
CREATE TABLE IF NOT EXISTS leave_logs (
  leave_id VARCHAR(100) PRIMARY KEY,
  emp_id VARCHAR(50),
  full_name TEXT,
  leave_type VARCHAR(100),
  start_date TEXT,
  end_date TEXT,
  start_time VARCHAR(20) DEFAULT '-',
  end_time VARCHAR(20) DEFAULT '-',
  total_days NUMERIC(5,2) DEFAULT 1,
  total_hours NUMERIC(5,2) DEFAULT 0,
  reason TEXT,
  substitute_info TEXT DEFAULT 'ไม่มีคาบสอน',
  attach_url TEXT DEFAULT '-',
  status VARCHAR(50) DEFAULT 'รออนุมัติ',
  step_hr VARCHAR(50) DEFAULT 'รอตรวจสอบ',
  step_academic VARCHAR(50) DEFAULT 'รอตรวจสอบ',
  step_director VARCHAR(50) DEFAULT 'รอลงนาม',
  signer_name TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  form_meta_json TEXT DEFAULT '',
  timestamp TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. holidays
CREATE TABLE IF NOT EXISTS holidays (
  holiday_date TEXT PRIMARY KEY,
  reason_type TEXT,
  note TEXT,
  director_name TEXT,
  timestamp TEXT
);

-- 8. board_members
CREATE TABLE IF NOT EXISTS board_members (
  member_id VARCHAR(100) PRIMARY KEY,
  prefix VARCHAR(50),
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  board_position VARCHAR(100),
  occupation TEXT,
  organization TEXT,
  phone VARCHAR(50),
  email VARCHAR(150),
  appointment_order_no TEXT,
  order_date TEXT,
  start_date TEXT,
  end_date TEXT,
  term_number INT DEFAULT 1,
  status VARCHAR(50) DEFAULT 'ดำรงตำแหน่ง',
  doc_url TEXT,
  remark TEXT,
  updated_by TEXT,
  timestamp TEXT
);

-- 9. school_board_staff_terms
CREATE TABLE IF NOT EXISTS school_board_staff_terms (
  term_id VARCHAR(100) PRIMARY KEY,
  emp_id VARCHAR(50),
  full_name TEXT,
  board_position VARCHAR(100),
  start_date TEXT,
  end_date TEXT,
  term_number INT DEFAULT 1,
  appointment_order_no TEXT,
  status VARCHAR(50),
  updated_by TEXT,
  timestamp TEXT
);

-- 10. board_meetings
CREATE TABLE IF NOT EXISTS board_meetings (
  meeting_id VARCHAR(100) PRIMARY KEY,
  meeting_no VARCHAR(50),
  fiscal_year VARCHAR(20),
  meeting_date TEXT,
  meeting_time VARCHAR(50),
  location TEXT,
  agenda_summary TEXT,
  present_member_ids TEXT,
  absent_member_ids TEXT,
  resolutions TEXT,
  report_doc_url TEXT,
  recorded_by TEXT,
  timestamp TEXT
);

-- 11. staff_workloads (15 columns)
CREATE TABLE IF NOT EXISTS staff_workloads (
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

-- 12. system_feedback
CREATE TABLE IF NOT EXISTS system_feedback (
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

-- 13. history_standing
CREATE TABLE IF NOT EXISTS history_standing (
  record_id VARCHAR(100) PRIMARY KEY,
  emp_id VARCHAR(50),
  standing_level TEXT,
  effective_date TEXT,
  order_number TEXT,
  doc_link TEXT,
  timestamp TEXT
);

-- 14. history_education
CREATE TABLE IF NOT EXISTS history_education (
  record_id VARCHAR(100) PRIMARY KEY,
  emp_id VARCHAR(50),
  degree_level TEXT,
  degree_short TEXT,
  major TEXT,
  institute TEXT,
  grad_year VARCHAR(50),
  timestamp TEXT
);

-- 15. history_licenses
CREATE TABLE IF NOT EXISTS history_licenses (
  record_id VARCHAR(100) PRIMARY KEY,
  emp_id VARCHAR(50),
  license_category TEXT,
  license_type TEXT,
  license_number VARCHAR(100),
  issue_date TEXT,
  expiry_date TEXT,
  timestamp TEXT
);

-- 16. history_scout
CREATE TABLE IF NOT EXISTS history_scout (
  record_id VARCHAR(100) PRIMARY KEY,
  emp_id VARCHAR(50),
  scout_qualification TEXT,
  scout_type TEXT,
  scout_position TEXT,
  cert_number VARCHAR(100),
  approved_year VARCHAR(50),
  timestamp TEXT
);

-- Active Classes Seed
INSERT INTO active_classes (class_name) VALUES
('อนุบาล 1'),
('อนุบาล 2'),
('อนุบาล 3'),
('ประถมศึกษาปีที่ 1'),
('ประถมศึกษาปีที่ 2'),
('ประถมศึกษาปีที่ 3'),
('ประถมศึกษาปีที่ 4'),
('ประถมศึกษาปีที่ 5'),
('ประถมศึกษาปีที่ 6'),
('มัธยมศึกษาปีที่ 1'),
('มัธยมศึกษาปีที่ 2'),
('มัธยมศึกษาปีที่ 3')
ON CONFLICT (class_name) DO NOTHING;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) & SECURITY POLICIES (Supabase Security Advisor 0 Issues)
-- =========================================================================
ALTER TABLE school_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_board_staff_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_workloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_standing ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_scout ENABLE ROW LEVEL SECURITY;

-- 1. Full Access for backend (service_role)
CREATE POLICY "service_role_all_school_info" ON school_info FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_fiscal_data" ON fiscal_data FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_active_classes" ON active_classes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_teachers" ON teachers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_leave_quota" ON leave_quota FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_leave_logs" ON leave_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_holidays" ON holidays FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_board_members" ON board_members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_school_board_staff_terms" ON school_board_staff_terms FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_board_meetings" ON board_meetings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_staff_workloads" ON staff_workloads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_system_feedback" ON system_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_history_standing" ON history_standing FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_history_education" ON history_education FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_history_licenses" ON history_licenses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_history_scout" ON history_scout FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Read Access for authenticated users
CREATE POLICY "auth_read_school_info" ON school_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_fiscal_data" ON fiscal_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_active_classes" ON active_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_teachers" ON teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_leave_quota" ON leave_quota FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_leave_logs" ON leave_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_holidays" ON holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_board_members" ON board_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_school_board_staff_terms" ON school_board_staff_terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_board_meetings" ON board_meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_staff_workloads" ON staff_workloads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_system_feedback" ON system_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_history_standing" ON history_standing FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_history_education" ON history_education FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_history_licenses" ON history_licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_history_scout" ON history_scout FOR SELECT TO authenticated USING (true);

-- 3. Safe Public / Anon Read for non-sensitive public metadata
CREATE POLICY "anon_read_school_info" ON school_info FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_fiscal_data" ON fiscal_data FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_active_classes" ON active_classes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_holidays" ON holidays FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_board_members" ON board_members FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_board_meetings" ON board_meetings FOR SELECT TO anon USING (true);

COMMIT;


-- =========================================================================
-- MANSTAT GROUND-TRUTH PRODUCTION DATA (15 SHEETS)
-- Step 2: Run this file second in Supabase SQL Editor
-- =========================================================================
BEGIN;

-- 1. Insert SchoolInfo (20 rows)
INSERT INTO school_info (key, val) VALUES ('ชื่อสถานศึกษา', 'โรงเรียนชุมชนบ้านตะขบ') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('หน่วยงานต้นสังกัด', 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 3') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('รหัส 10 หลัก', '1030200688') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('รหัส 8 หลัก', '30030099') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('ชื่อระบบแอปพลิเคชัน', 'ManStat') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('ชื่อผู้อำนวยการ', 'นายธีรศักดิ์ มโนธรรม') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('ตำแหน่งผู้อำนวยการ', 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('เบอร์โทรศัพท์', '099-173-2233') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('อีเมล', 'chumchonbantakhob2473@gmail.com') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('ที่อยู่', 'ม.1 โรงเรียนชุมชนบ้านตะขบ ต.ตะขบ อ.ปักธงชัย จ.นครราชสีมา 30150') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('ละติจูด (Lat)', '14.634629') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('ลองจิจูด (Lng)', '101.852567') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('Logo Base64', '') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('รักษาการคนที่ 1', 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('รักษาการคนที่ 2', 'นายธวัชชัย เหลืองโอฬาร') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('ปีการศึกษา', '2569') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('ปีงบประมาณ', '2570') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('ภาคเรียนปัจจุบัน', '2') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('จำนวนนักเรียน', '94') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
INSERT INTO school_info (key, val) VALUES ('วันที่อ้างอิงข้อมูลนักเรียน', '') ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

-- 2. Insert Teachers (15 rows)
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('EXE-001', 'นายธีรศักดิ์ มโนธรรม', 'gsic26@gmail.com', '099-173-2233', '', 'ผู้อำนวยการสถานศึกษา', '', 'sha256$7801b4d69cc1c1fc7793775ee89a0483330a595c9b1d181428e97da50f2ef46d', TRUE, 'Superuser', 'ปกติ', '2012-01-10', 'สายงานบริหารและสนับสนุนการศึกษา', 'ข้าราชการครูและบุคลากรทางการศึกษา', '3301401302311', 'ผู้บริหารสถานศึกษา', '', '3301401302311', '1983-09-06')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-003', 'นายธวัชชัย เหลืองโอฬาร', 'musicdang1z2@gmail.com', '06-2032-9458', 'มัธยมศึกษาปีที่ 1', 'ครูชำนาญการพิเศษ', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'Admin', 'ปกติ', '2004-11-25', 'ศิลปะ', 'ข้าราชการครูและบุคลากรทางการศึกษา', '5310190033680', 'ผู้รักษาราชการแทนผู้อำนวยการสถานศึกษา (ลำดับที่ 2), หัวหน้าฝ่ายบริหารทั่วไปและกิจการนักเรียน, หัวหน้ากลุ่มสาระการเรียนรู้ศิลปะ, [หลัก] งานกิจการนักเรียน การปกครอง และส่งเสริมวินัย, [หลัก] งานป้องกันและแก้ไขปัญหาพฤติกรรม ยาเสพติด การกลั่นแกล้ง และความรุนแรง', '75362', '5310190033680', '1971-12-31')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-004', 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์', 'Dechap19@gmail.com', '086-867-9339', 'มัธยมศึกษาปีที่ 3', 'ครูชำนาญการพิเศษ', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'Admin', 'ปกติ', '1998-05-05', 'คณิตศาสตร์', 'ข้าราชการครูและบุคลากรทางการศึกษา', '3301400192724', 'หัวหน้าฝ่ายบริหารวิชาการ, ผู้รักษาราชการแทนผู้อำนวยการสถานศึกษา (ลำดับที่ 1), หัวหน้าระดับชั้นมัธยมศึกษาตอนต้น (ม.1 - ม.3), [หลัก] ผู้ดูแลห้องปฏิบัติการคอมพิวเตอร์', '61080', '3301400192724', '1976-07-19')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-005', 'นางสาวกุสุมาลย์กมล พราหมณ์ตะขบ', 'kusumarnkamol@gmail.com', '093-495-7951', 'มัธยมศึกษาปีที่ 2', 'ครูชำนาญการพิเศษ', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'User', 'ปกติ', '2003-02-28', 'ภาษาต่างประเทศ', 'ข้าราชการครูและบุคลากรทางการศึกษา', '3301401162101', 'งานประกันคุณภาพภายในสถานศึกษา', '14095', '3301401162101', '1977-07-28')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-006', 'นางณิชกานต์ พลอยฉิมพลี', '123456@gmail.com', '081-725-9258', 'ประถมศึกษาปีที่ 4', 'ครูชำนาญการพิเศษ', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'User', 'ปกติ', '2008-05-26', 'คณิตศาสตร์', 'ข้าราชการครูและบุคลากรทางการศึกษา', '3301400511714', 'เจ้าหน้าที่ฝ่ายบริหารทั่วไป', '10133', '3301400511714', '1977-01-09')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-007', 'นางสาวทัชชกร ช่วยจังหรีด', 'bestpore@gmail.com', '', 'ประถมศึกษาปีที่ 5', 'ครูชำนาญการพิเศษ', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'Admin', 'ปกติ', '2011-05-19', 'คณิตศาสตร์', 'ข้าราชการครูและบุคลากรทางการศึกษา', '3301401235770', 'หัวหน้าฝ่ายบริหารงานบุคคล', '10354', '3301401235770', '1982-09-06')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-008', 'นางสาวสุนิสา สุทธิวงศ์', 'heureuxamp@gmail.com', '089-526-6705', 'ประถมศึกษาปีที่ 6', 'ครู คศ. 1', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'User', 'ปกติ', '2020-08-27', 'วิทยาศาสตร์และเทคโนโลยี', 'ข้าราชการครูและบุคลากรทางการศึกษา', '3140900049816', 'หัวหน้าฝ่ายบริหารงบประมาณและแผนงาน', '24950', '3140900049816', '1982-07-18')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-009', 'นายกิตติพณ พรหมทอง', 'xxxxxxxxxx@gmail.com', '093-383-4518', 'ประถมศึกษาปีที่ 3', 'ครู คศ. 1', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'User', 'ปกติ', '2020-06-01', 'สังคมศึกษา ศาสนาและวัฒนธรรม', 'ข้าราชการครูและบุคลากรทางการศึกษา', '1309900615625', 'งานระบบดูแลช่วยเหลือนักเรียน / กิจการนักเรียน', '1401', '1309900615625', '1990-09-07')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-010', 'นางสาวภัสราวดี ทองลาด', 'thepas2026@gmail.com', '090-294-9991', 'อนุบาล 2', 'ครู คศ. 1', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'User', 'ปกติ', '2023-07-27', 'การศึกษาปฐมวัย', 'ข้าราชการครูและบุคลากรทางการศึกษา', '1319900671495', 'งานพัสดุและสินทรัพย์', '118902', '1319900671495', '1999-02-12')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-011', 'นางสาวสิรินภา สินไชย', 'Sirinapaff1802@gmail.com', '093-263-8983', 'อนุบาล 3', 'ครู คศ. 1', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'User', 'ปกติ', '2023-07-27', 'การศึกษาปฐมวัย', 'ข้าราชการครูและบุคลากรทางการศึกษา', '1199900744923', 'งานการเงินและบัญชี', '10356', '1199900744923', '2000-02-18')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-012', 'นางสาวสุธิดา สิงขรอาจ', 'suthida.nooknook29@gmail.com', '098-194-4390', 'ประถมศึกษาปีที่ 1', 'ครู คศ. 1', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'User', 'ปกติ', '2023-11-20', 'ภาษาไทย', 'ข้าราชการครูและบุคลากรทางการศึกษา', '1309902702711', 'งานพัสดุและสินทรัพย์', '', '1309902702711', '1999-09-02')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-013', 'นายชินวัจน์ มาตย์นอก', 'gielock7@gmail.com', '0870867389', 'ประถมศึกษาปีที่ 2', 'ครูผู้ช่วย', '', '123456', TRUE, 'User', 'ปกติ', '2022-11-12', 'ภาษาไทย', 'ข้าราชการครูและบุคลากรทางการศึกษา', '', 'งานเทคโนโลยีสารสนเทศ (ICT / DMC)', '', '', '')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('TCH-014', 'นางสาวอภิชญา พุสดีดอน', 'kik123456@gmail.com', '094-478-1680', 'อนุบาล 1', 'พี่เลี้ยงเด็กพิการโรงเรียนทั่วไปจัดการเรียนรวม', '', 'sha256$8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', TRUE, 'User', 'ปกติ', '2022-11-13', 'สังคมศึกษา ศาสนาและวัฒนธรรม', 'ข้าราชการครูและบุคลากรทางการศึกษา', '', '[รอง] งานระบบดูแลช่วยเหลือนักเรียน / กิจการนักเรียน', '', '', '')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('STF-001', 'นางสาวอุไรวรรณ อินแพง', 'uraiwan922@gmail.com', '083-382-5324', '', 'เจ้าหน้าที่ธุรการโรงเรียน', '', '123456', TRUE, 'Admin', 'ปกติ', '2022-11-14', 'สังคมศึกษา ศาสนาและวัฒนธรรม', 'ข้าราชการครูและบุคลากรทางการศึกษา', '', 'งานธุรการและสารบรรณ', '', '', '')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;
INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES ('STF-002', 'นายกำพล กักหมื่นไวย', '', '098-736-8819', '', 'นักการภารโรง', '', '123456', TRUE, 'User', 'ปกติ', '2026-10-23', 'ภาษาไทย', 'ข้าราชการครูและบุคลากรทางการศึกษา', '', 'เจ้าหน้าที่ฝ่ายบริหารทั่วไป', '', '', '')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;

-- 3. Insert Leave_Quota (34 rows)
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('EMP001', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('SUPERUSER', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('EXE-001', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-001', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-002', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-003', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-004', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-005', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-006', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-007', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-008', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-009', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-010', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-011', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-012', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-013', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-014', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('STF-001', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('STF-002', 2570, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('EXE-001', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-003', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-004', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-005', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-006', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-007', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-008', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-009', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-010', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-011', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-012', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-013', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('TCH-014', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('STF-001', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;
INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES ('STF-002', 2571, 60, 0, 45, 0, 10, 0)
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;

-- 4. Insert FiscalYear (2 rows)
INSERT INTO fiscal_data (fiscal_year, period1_start, period1_end, period2_start, period2_end, active_period_mode, status, updated_at)
VALUES (2570, '2026-04-01', '2026-09-30', '2026-10-01', '2027-03-31', 'PERIOD_1', 'Active', '2026-10-29')
ON CONFLICT (fiscal_year) DO UPDATE SET
  period1_start = EXCLUDED.period1_start, period1_end = EXCLUDED.period1_end, period2_start = EXCLUDED.period2_start, period2_end = EXCLUDED.period2_end, active_period_mode = EXCLUDED.active_period_mode, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;
INSERT INTO fiscal_data (fiscal_year, period1_start, period1_end, period2_start, period2_end, active_period_mode, status, updated_at)
VALUES (2571, '2027-04-01', '2027-09-30', '2027-10-01', '2028-03-31', 'PERIOD_1', 'Inactive', '2026-10-29')
ON CONFLICT (fiscal_year) DO UPDATE SET
  period1_start = EXCLUDED.period1_start, period1_end = EXCLUDED.period1_end, period2_start = EXCLUDED.period2_start, period2_end = EXCLUDED.period2_end, active_period_mode = EXCLUDED.active_period_mode, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;

-- 5. Insert Board_Members (9 rows)
INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES ('SBD-261030151715', 'นาย', 'ธีรศักดิ์', 'มโนธรรม', 'นายธีรศักดิ์ มโนธรรม', 'DIRECTOR_SEC', 'ผู้อำนวยการสถานศึกษา', 'โรงเรียนชุมชนบ้านตะขบ', '099-173-2233', 'gsic26@gmail.com', '', '', '', '', 1, 'ดำรงตำแหน่ง', '', 'กรรมการและเลขานุการโดยตำแหน่งผู้อำนวยการสถานศึกษา (รหัสบุคลากร: EXE-001)', 'gsic26@gmail.com', '2026-10-30')
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;
INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES ('SBD-TCH-TCH-006', 'นาง', 'ณิชกานต์', 'พลอยฉิมพลี', 'นางณิชกานต์ พลอยฉิมพลี', 'TEACHER_REP', 'ครูชำนาญการพิเศษ', 'โรงเรียนชุมชนบ้านตะขบ', '081-725-9258', '123456@gmail.com', '', '', '2024-01-05', '2028-10-12', 1, 'ดำรงตำแหน่ง', '', 'ผู้แทนครูในคณะกรรมการสถานศึกษา (รหัสบุคลากร: TCH-006)', 'gsic26@gmail.com', '2026-10-30')
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;
INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES ('SBD-003', 'นาง', 'เสาวนีย์', 'ศิริวรรณโยธา', 'นางเสาวนีย์ ศิริวรรณโยธา', 'CHAIR', 'ธุรกิจส่วนตัว', '', '064-178-9789', '', '', '', '2024-05-24', '2028-05-23', 1, 'ดำรงตำแหน่ง', '', '', 'gsic26@gmail.com', '2026-11-02')
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;
INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES ('SBD-004', 'นาง', 'ปวิมล', 'มะสิโกวา', 'นางปวิมล มะสิโกวา', 'PARENT_REP', '', '', '', '', '', '', '2024-05-24', '2028-05-23', 1, 'ดำรงตำแหน่ง', '', '', 'gsic26@gmail.com', '2026-11-02')
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;
INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES ('SBD-005', 'นาง', 'ปัทมาพร', 'ธงตะขบ', 'นางปัทมาพร ธงตะขบ', 'ALUMNI_REP', '', '', '', '', '', '', '2024-05-24', '2028-05-23', 1, 'ดำรงตำแหน่ง', '', '', 'gsic26@gmail.com', '2026-11-02')
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;
INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES ('SBD-006', 'พระครู', 'ธวัชชโยดม', '', 'พระครูธวัชชโยดม', 'RELIGION_REP', '', '', '', '', '', '', '2024-05-24', '2028-05-23', 1, 'ดำรงตำแหน่ง', '', '', 'gsic26@gmail.com', '2026-11-02')
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;
INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES ('SBD-007', 'นางสาว', 'ปฐมา', 'ควรตะขบ', 'นางสาวปฐมา ควรตะขบ', 'COMMUNITY_REP', '', '', '', '', '', '', '2024-05-24', '2028-05-23', 1, 'ดำรงตำแหน่ง', '', '', 'gsic26@gmail.com', '2026-11-02')
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;
INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES ('SBD-008', 'นาง', 'เกศรินทร์', 'ไชยหาญ', 'นางเกศรินทร์ ไชยหาญ', 'LOCAL_ADMIN', '', '', '', '', '', '', '2024-05-24', '2028-05-23', 1, 'ดำรงตำแหน่ง', '', '', 'gsic26@gmail.com', '2026-11-02')
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;
INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES ('SBD-009', 'นาย', 'สวัสดิ์', 'งามตะขบ', 'นายสวัสดิ์ งามตะขบ', 'EXPERT', '', '', '', '', '', '', '2024-05-24', '2028-05-23', 1, 'ดำรงตำแหน่ง', '', '', 'gsic26@gmail.com', '2026-11-02')
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;

-- 6. Insert SchoolBoard_StaffTerms (2 rows)
INSERT INTO school_board_staff_terms (term_id, emp_id, full_name, board_position, start_date, end_date, term_number, appointment_order_no, status, updated_by, timestamp)
VALUES ('TERM-DIR-1793418693281', 'EXE-001', 'นายธีรศักดิ์ มโนธรรม', 'DIRECTOR_SEC', '2025-01-13', 'ย้ายหรือเกษียณอายุราชการ', 0, '', 'ดำรงตำแหน่ง', 'gsic26@gmail.com', '2026-11-02')
ON CONFLICT (term_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, end_date = EXCLUDED.end_date, status = EXCLUDED.status;
INSERT INTO school_board_staff_terms (term_id, emp_id, full_name, board_position, start_date, end_date, term_number, appointment_order_no, status, updated_by, timestamp)
VALUES ('TERM-TCH-1793593326503', 'TCH-006', 'นางณิชกานต์ พลอยฉิมพลี', 'TEACHER_REP', '2024-05-24', '2028-05-23', 1, '', 'ดำรงตำแหน่ง', 'gsic26@gmail.com', '2026-11-02')
ON CONFLICT (term_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, end_date = EXCLUDED.end_date, status = EXCLUDED.status;

-- 7. Insert History_Standing (1 row)
INSERT INTO history_standing (record_id, emp_id, standing_level, effective_date, order_number, doc_link, timestamp)
VALUES ('REC-1792852939573', 'TCH-003', 'ครูชำนาญการพิเศษ', '2016-11-02', 'XX/2559', '-', '2026-10-24')
ON CONFLICT (record_id) DO UPDATE SET standing_level = EXCLUDED.standing_level;

-- 8. Insert History_Education (1 row)
INSERT INTO history_education (record_id, emp_id, degree_level, degree_short, major, institute, grad_year, timestamp)
VALUES ('REC-1792850056982', 'EXE-001', 'ปริญญาตรี', 'ศศ.บ.', 'บรรณารักษศาสตร์และสารนิเทศศาสตร์', 'มหาวิทยาลัยราชภัฏวไลยอลงกรณ์ ในพระบรมราชูปถัมภ์', '2548', '2026-10-24')
ON CONFLICT (record_id) DO UPDATE SET institute = EXCLUDED.institute;

-- 9. Insert History_Licenses (2 rows)
INSERT INTO history_licenses (record_id, emp_id, license_category, license_type, license_number, issue_date, expiry_date, timestamp)
VALUES ('REC-1792836354316', 'EXE-001', 'ครู', 'B License (ใบอนุญาตประกอบวิชาชีพครู ชั้นต้น)', 'B68400502383947', '2026-08-27', '2030-08-25', '2026-10-24')
ON CONFLICT (record_id) DO UPDATE SET license_number = EXCLUDED.license_number;
INSERT INTO history_licenses (record_id, emp_id, license_category, license_type, license_number, issue_date, expiry_date, timestamp)
VALUES ('REC-1792836420285', 'EXE-001', 'ผู้บริหารสถานศึกษา', 'ใบอนุญาตประกอบวิชาชีพผู้บริหารสถานศึกษา', '67229000036282', '2024-11-12', '2029-11-11', '2026-10-24')
ON CONFLICT (record_id) DO UPDATE SET license_number = EXCLUDED.license_number;

-- 10. Insert Holidays (50 rows: ปี 2569 - 2570)
INSERT INTO holidays (holiday_date, reason_type, note, director_name, timestamp) VALUES
('2026-01-01', 'วันขึ้นปีใหม่', '', '', ''),
('2026-01-02', 'วันหยุดราชการเพิ่มเป็นกรณีพิเศษ (มติ ครม.)', '', '', ''),
('2026-01-16', 'วันครูแห่งชาติ (วันหยุดเฉพาะสถานศึกษา)', '', '', ''),
('2026-03-03', 'วันมาฆบูชา', '', '', ''),
('2026-04-06', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)', '', '', ''),
('2026-04-13', 'วันสงกรานต์', '', '', ''),
('2026-04-14', 'วันสงกรานต์', '', '', ''),
('2026-04-15', 'วันสงกรานต์', '', '', ''),
('2026-05-01', 'วันแรงงานแห่งชาติ', '', '', ''),
('2026-05-04', 'วันฉัตรมงคล', '', '', ''),
('2026-05-13', 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', '', '', ''),
('2026-05-31', 'วันวิสาขบูชา', '', '', ''),
('2026-06-01', 'วันหยุดชดเชยวันวิสาขบูชา', '', '', ''),
('2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', '', '', ''),
('2026-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', '', '', ''),
('2026-07-29', 'วันอาสาฬหบูชา', '', '', ''),
('2026-07-30', 'วันเข้าพรรษา', '', '', ''),
('2026-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', '', '', ''),
('2026-10-13', 'วันนวมินทรมหาราช', '', '', ''),
('2026-10-23', 'วันปิยมหาราช', '', '', ''),
('2026-12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', '', '', ''),
('2026-12-07', 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', '', '', ''),
('2026-12-10', 'วันรัฐธรรมนูญ', '', '', ''),
('2026-12-31', 'วันสิ้นปี', '', '', ''),
('2027-01-01', 'วันขึ้นปีใหม่', '', '', ''),
('2027-01-16', 'วันครูแห่งชาติ (วันหยุดเฉพาะสถานศึกษา)', '', '', ''),
('2027-02-21', 'วันมาฆบูชา', '', '', ''),
('2027-02-22', 'วันหยุดชดเชยวันมาฆบูชา', '', '', ''),
('2027-04-06', 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)', '', '', ''),
('2027-04-13', 'วันสงกรานต์', '', '', ''),
('2027-04-14', 'วันสงกรานต์', '', '', ''),
('2027-04-15', 'วันสงกรานต์', '', '', ''),
('2027-05-01', 'วันแรงงานแห่งชาติ', '', '', ''),
('2027-05-03', 'วันหยุดชดเชยวันแรงงานแห่งชาติ', '', '', ''),
('2027-05-04', 'วันฉัตรมงคล', '', '', ''),
('2027-05-13', 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', '', '', ''),
('2027-05-20', 'วันวิสาขบูชา', '', '', ''),
('2027-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', '', '', ''),
('2027-07-18', 'วันอาสาฬหบูชา', '', '', ''),
('2027-07-19', 'วันเข้าพรรษา', '', '', ''),
('2027-07-20', 'วันหยุดชดเชยวันอาสาฬหบูชา', '', '', ''),
('2027-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', '', '', ''),
('2027-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', '', '', ''),
('2027-10-13', 'วันนวมินทรมหาราช', '', '', ''),
('2027-10-23', 'วันปิยมหาราช', '', '', ''),
('2027-10-25', 'วันหยุดชดเชยวันปิยมหาราช', '', '', ''),
('2027-12-05', 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', '', '', ''),
('2027-12-06', 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', '', '', ''),
('2027-12-10', 'วันรัฐธรรมนูญ', '', '', ''),
('2027-12-31', 'วันสิ้นปี', '', '', '')
ON CONFLICT (holiday_date) DO UPDATE SET reason_type = EXCLUDED.reason_type;

COMMIT;
