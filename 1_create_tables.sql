-- =========================================================================
-- MANSTAT GROUND-TRUTH PRODUCTION DATABASE SCHEMA (15 TABLES)
-- Generated automatically from ManStat.xlsx
-- Copy & Run in Supabase SQL Editor
-- =========================================================================

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
('มัธยมศึกษาปีที่ 1'),
('มัธยมศึกษาปีที่ 2'),
('มัธยมศึกษาปีที่ 3'),
('มัธยมศึกษาปีที่ 4'),
('มัธยมศึกษาปีที่ 5'),
('มัธยมศึกษาปีที่ 6')
ON CONFLICT (class_name) DO NOTHING;

-- =========================================================================
-- DML: INSERTING GROUND-TRUTH DATA FROM MANSTAT.XLSX
-- =========================================================================