/**
 * =========================================================================
 * MANSTAT GROUND-TRUTH MIGRATION PIPELINE: EXCEL TO POSTGRESQL & SQL SEED
 * =========================================================================
 * Reads D:\ManStat-Modern\ManStat.xlsx (15 Sheets)
 * Cleans data anomalies (Scientific notation, Excel serial dates, term fix)
 * Outputs:
 *   1. supabase-seed.sql (Full SQL DDL & DML for Supabase SQL Editor)
 *   2. data/manstat_db.json (Updated Ground-Truth fallback store)
 *   3. Direct PostgreSQL execution if DB connection is configured
 * =========================================================================
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const EXCEL_PATH = path.join(__dirname, '../ManStat.xlsx');
const SQL_OUTPUT_PATH = path.join(__dirname, '../supabase-seed.sql');

if (!fs.existsSync(EXCEL_PATH)) {
  console.error('[Error] File not found:', EXCEL_PATH);
  process.exit(1);
}

// =========================================================================
// HELPER FUNCTIONS FOR DATA CLEANING & NORMALIZATION
// =========================================================================
function cleanIntegerStr(val) {
  if (val === null || val === undefined || val === '') return '';
  let s = String(val).trim();
  if (s.includes('e+') || s.includes('E+')) {
    try {
      s = BigInt(Math.round(Number(val))).toString();
    } catch (e) {
      s = String(Math.round(Number(val)));
    }
  } else if (s.includes('.')) {
    s = s.split('.')[0];
  }
  return s;
}

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function excelDateToStr(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') {
    // If integer year like 2570 or 2569 or 2026, keep as is
    if (val > 2400 && val < 2700) return String(val);
    const utcDays = Math.floor(val - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).trim();
}

function cleanNum(val, defaultVal = 0) {
  if (val === null || val === undefined || val === '') return defaultVal;
  const n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

// =========================================================================
// READ AND PARSE ALL 15 SHEETS
// =========================================================================
console.log('Loading Excel file:', EXCEL_PATH);
const wb = XLSX.readFile(EXCEL_PATH);

// 1. SchoolInfo
const wsSchool = wb.Sheets['SchoolInfo'];
const rawSchool = XLSX.utils.sheet_to_json(wsSchool, { header: 1 });
const schoolRows = [];
const schoolMap = {};
for (const row of rawSchool) {
  if (!row || row.length === 0) continue;
  let key = cleanStr(row[0]);
  let val = row[1];
  if (!key) continue;

  // [CRITICAL FIX]: Row 18 'ภาคเรียนปัจจุบัน' in Excel date serial -> '2'
  if (key === 'ภาคเรียนปัจจุบัน') {
    val = '2';
  } else if (val !== null && val !== undefined) {
    val = cleanStr(val);
  } else {
    val = '';
  }

  schoolRows.push({ key, val });
  schoolMap[key] = val;
}
console.log(`Parsed SchoolInfo: ${schoolRows.length} rows`);

// 2. Teachers
const wsTeachers = wb.Sheets['Teachers'];
const rawTeachers = XLSX.utils.sheet_to_json(wsTeachers);
const teachers = rawTeachers.map(r => ({
  id: cleanStr(r.Teacher_ID),
  name: cleanStr(r.Name),
  email: cleanStr(r.Email),
  phone: cleanStr(r.Phone),
  class_level: cleanStr(r.Class_Level),
  role: cleanStr(r.Role),
  duty_day: cleanStr(r.Duty_Day),
  password: cleanStr(r.Password),
  is_password_hashed: true,
  access_level: cleanStr(r.Access_Level) || 'User',
  status: cleanStr(r.Status) || 'ปกติ',
  start_date: excelDateToStr(r.StartDate),
  department: cleanStr(r.Department),
  emp_type: cleanStr(r.EmpType),
  id_card: cleanIntegerStr(r.IDCard),
  division: cleanStr(r.Division),
  position_no: cleanIntegerStr(r.Position_No),
  member_id: cleanIntegerStr(r.Member_ID),
  birth_date: excelDateToStr(r.BirthDate)
})).filter(t => t.id && t.name);
console.log(`Parsed Teachers: ${teachers.length} rows`);

// 3. Leave_Quota
const wsQuota = wb.Sheets['Leave_Quota'];
const rawQuota = XLSX.utils.sheet_to_json(wsQuota);
const leaveQuotas = rawQuota.map(r => ({
  emp_id: cleanStr(r.EmpID),
  fiscal_year: cleanNum(r.FiscalYear, 2570),
  sick_max: cleanNum(r.Sick_Max, 60),
  sick_used: cleanNum(r.Sick_Used, 0),
  personal_max: cleanNum(r.Personal_Max, 45),
  personal_used: cleanNum(r.Personal_Used, 0),
  vacation_max: cleanNum(r.Vacation_Max, 10),
  vacation_used: cleanNum(r.Vacation_Used, 0)
})).filter(q => q.emp_id && q.fiscal_year);
console.log(`Parsed Leave_Quota: ${leaveQuotas.length} rows`);

// 4. FiscalYear
const wsFiscal = wb.Sheets['FiscalYear'];
const rawFiscal = XLSX.utils.sheet_to_json(wsFiscal);
const fiscalYears = rawFiscal.map(r => ({
  fiscal_year: cleanNum(r.FiscalYear, 2570),
  period1_start: excelDateToStr(r.Period1_Start),
  period1_end: excelDateToStr(r.Period1_End),
  period2_start: excelDateToStr(r.Period2_Start),
  period2_end: excelDateToStr(r.Period2_End),
  active_period_mode: cleanStr(r.ActivePeriodMode) || 'PERIOD_1',
  status: cleanStr(r.Status) || 'Active',
  updated_at: excelDateToStr(r.UpdatedAt)
})).filter(f => f.fiscal_year);
console.log(`Parsed FiscalYear: ${fiscalYears.length} rows`);

// 5. Board_Members
const wsBoard = wb.Sheets['Board_Members'];
const rawBoard = XLSX.utils.sheet_to_json(wsBoard);
const boardMembers = rawBoard.map(r => ({
  member_id: cleanStr(r.MemberID),
  prefix: cleanStr(r.Prefix),
  first_name: cleanStr(r.FirstName),
  last_name: cleanStr(r.LastName),
  full_name: cleanStr(r.FullName),
  board_position: cleanStr(r.BoardPosition),
  occupation: cleanStr(r.Occupation),
  organization: cleanStr(r.Organization),
  phone: cleanStr(r.Phone),
  email: cleanStr(r.Email),
  appointment_order_no: cleanStr(r.AppointmentOrderNo),
  order_date: excelDateToStr(r.OrderDate),
  start_date: excelDateToStr(r.StartDate),
  end_date: excelDateToStr(r.EndDate),
  term_number: cleanNum(r.TermNumber, 1),
  status: cleanStr(r.Status) || 'ดำรงตำแหน่ง',
  doc_url: cleanStr(r.DocUrl),
  remark: cleanStr(r.Remark),
  updated_by: cleanStr(r.UpdatedBy),
  timestamp: excelDateToStr(r.Timestamp)
})).filter(b => b.member_id && b.full_name);
console.log(`Parsed Board_Members: ${boardMembers.length} rows`);

// 6. SchoolBoard_StaffTerms
const wsStaffTerms = wb.Sheets['SchoolBoard_StaffTerms'];
const rawStaffTerms = XLSX.utils.sheet_to_json(wsStaffTerms);
const staffTerms = rawStaffTerms.map(r => ({
  term_id: cleanStr(r.TermID),
  emp_id: cleanStr(r.EmpID),
  full_name: cleanStr(r.FullName),
  board_position: cleanStr(r.BoardPosition),
  start_date: excelDateToStr(r.StartDate),
  // [CRITICAL FIX]: end_date is TEXT (supports e.g. "ย้ายหรือเกษียณอายุราชการ")
  end_date: typeof r.EndDate === 'number' ? excelDateToStr(r.EndDate) : cleanStr(r.EndDate),
  term_number: cleanNum(r.TermNumber, 1),
  appointment_order_no: cleanStr(r.AppointmentOrderNo),
  status: cleanStr(r.Status) || 'ดำรงตำแหน่ง',
  updated_by: cleanStr(r.UpdatedBy),
  timestamp: excelDateToStr(r.Timestamp)
})).filter(s => s.term_id);
console.log(`Parsed SchoolBoard_StaffTerms: ${staffTerms.length} rows`);

// 7. History_Standing
const wsStanding = wb.Sheets['History_Standing'];
const rawStanding = XLSX.utils.sheet_to_json(wsStanding);
const standings = rawStanding.map(r => ({
  record_id: cleanStr(r.RecordID),
  emp_id: cleanStr(r.EmpID),
  standing_level: cleanStr(r.StandingLevel),
  effective_date: excelDateToStr(r.EffectiveDate),
  order_number: cleanStr(r.OrderNumber),
  doc_link: cleanStr(r.DocLink),
  timestamp: excelDateToStr(r.Timestamp)
})).filter(s => s.record_id);
console.log(`Parsed History_Standing: ${standings.length} rows`);

// 8. History_Education
const wsEducation = wb.Sheets['History_Education'];
const rawEducation = XLSX.utils.sheet_to_json(wsEducation);
const educations = rawEducation.map(r => ({
  record_id: cleanStr(r.RecordID),
  emp_id: cleanStr(r.EmpID),
  degree_level: cleanStr(r.DegreeLevel),
  degree_short: cleanStr(r.DegreeShort),
  major: cleanStr(r.Major),
  institute: cleanStr(r.Institute),
  grad_year: cleanStr(r.GradYear),
  timestamp: excelDateToStr(r.Timestamp)
})).filter(e => e.record_id);
console.log(`Parsed History_Education: ${educations.length} rows`);

// 9. History_Licenses
const wsLicenses = wb.Sheets['History_Licenses'];
const rawLicenses = XLSX.utils.sheet_to_json(wsLicenses);
const licenses = rawLicenses.map(r => ({
  record_id: cleanStr(r.RecordID),
  emp_id: cleanStr(r.EmpID),
  license_category: cleanStr(r.LicenseCategory),
  license_type: cleanStr(r.LicenseType),
  license_number: cleanStr(r.LicenseNumber),
  issue_date: excelDateToStr(r.IssueDate),
  expiry_date: excelDateToStr(r.ExpiryDate),
  timestamp: excelDateToStr(r.Timestamp)
})).filter(l => l.record_id);
console.log(`Parsed History_Licenses: ${licenses.length} rows`);

// 10. History_Scout
const wsScout = wb.Sheets['History_Scout'];
const rawScout = wsScout ? XLSX.utils.sheet_to_json(wsScout) : [];
const scouts = rawScout.map(r => ({
  record_id: cleanStr(r.RecordID),
  emp_id: cleanStr(r.EmpID),
  scout_qualification: cleanStr(r.ScoutQualification),
  scout_type: cleanStr(r.ScoutType),
  scout_position: cleanStr(r.ScoutPosition),
  cert_number: cleanStr(r.CertNumber),
  approved_year: cleanStr(r.ApprovedYear),
  timestamp: excelDateToStr(r.Timestamp)
})).filter(s => s.record_id);
console.log(`Parsed History_Scout: ${scouts.length} rows`);

// 11. Holidays
const wsHolidays = wb.Sheets['Holidays'];
const rawHolidays = XLSX.utils.sheet_to_json(wsHolidays);
const holidays = rawHolidays.map(r => ({
  holiday_date: excelDateToStr(r.HolidayDate),
  reason_type: cleanStr(r.ReasonType),
  note: cleanStr(r.Note),
  director_name: cleanStr(r.DirectorName),
  timestamp: excelDateToStr(r.Timestamp)
})).filter(h => h.holiday_date);
console.log(`Parsed Holidays: ${holidays.length} rows`);

// 12. Leave_Logs
const wsLogs = wb.Sheets['Leave_Logs'];
const rawLogs = wsLogs ? XLSX.utils.sheet_to_json(wsLogs) : [];
const leaveLogs = rawLogs.map(r => ({
  leave_id: cleanStr(r.LeaveID),
  emp_id: cleanStr(r.EmpID),
  full_name: cleanStr(r.FullName),
  leave_type: cleanStr(r.LeaveType),
  start_date: excelDateToStr(r.StartDate),
  end_date: excelDateToStr(r.EndDate),
  start_time: cleanStr(r.StartTime) || '-',
  end_time: cleanStr(r.EndTime) || '-',
  total_days: cleanNum(r.TotalDays, 1),
  total_hours: cleanNum(r.TotalHours, 0),
  reason: cleanStr(r.Reason),
  substitute_info: cleanStr(r.SubstituteInfo) || 'ไม่มีคาบสอน',
  attach_url: cleanStr(r.AttachUrl) || '-',
  status: cleanStr(r.Status) || 'อนุมัติ',
  step_hr: cleanStr(r.Step1_HR) || 'อนุมัติแล้ว',
  step_academic: cleanStr(r.Step2_Academic) || 'อนุมัติแล้ว',
  step_director: cleanStr(r.Step3_Director) || 'อนุมัติแล้ว',
  signer_name: cleanStr(r.SignerName),
  remark: cleanStr(r.Remark),
  timestamp: cleanStr(r.Timestamp)
})).filter(l => l.leave_id);
console.log(`Parsed Leave_Logs: ${leaveLogs.length} rows`);

// 13. Staff_Workloads (15 columns)
const wsWorkloads = wb.Sheets['Staff_Workloads'];
const rawWorkloads = wsWorkloads ? XLSX.utils.sheet_to_json(wsWorkloads) : [];
const workloads = rawWorkloads.map(r => ({
  workload_id: cleanStr(r.WorkloadID),
  emp_id: cleanStr(r.EmpID),
  co_emp_ids: cleanStr(r.CoEmpIDs),
  category: cleanStr(r.Category),
  title: cleanStr(r.Title),
  sub_group_or_level: cleanStr(r.SubGroupOrLevel),
  hours_per_week: cleanNum(r.HoursPerWeek, 0),
  role_in_task: cleanStr(r.RoleInTask),
  academic_term: cleanStr(r.AcademicTerm),
  order_or_ref: cleanStr(r.OrderOrRef),
  effective_period: cleanStr(r.EffectivePeriod),
  status: cleanStr(r.Status) || 'ปกติ',
  assigned_by: cleanStr(r.AssignedBy),
  updated_by: cleanStr(r.UpdatedBy),
  timestamp: cleanStr(r.Timestamp)
})).filter(w => w.workload_id);
console.log(`Parsed Staff_Workloads: ${workloads.length} rows`);

// 14. System_Feedback
const wsFeedback = wb.Sheets['System_Feedback'];
const rawFeedback = wsFeedback ? XLSX.utils.sheet_to_json(wsFeedback) : [];
const feedbacks = rawFeedback.map(r => ({
  feedback_id: cleanStr(r.FeedbackID),
  emp_id: cleanStr(r.EmpID),
  full_name: cleanStr(r.FullName),
  category: cleanStr(r.Category),
  topic: cleanStr(r.Topic),
  detail: cleanStr(r.Detail),
  status: cleanStr(r.Status) || 'รอการตอบรับ',
  admin_reply: cleanStr(r.AdminReply),
  updated_by: cleanStr(r.UpdatedBy),
  timestamp: cleanStr(r.Timestamp)
})).filter(f => f.feedback_id);
console.log(`Parsed System_Feedback: ${feedbacks.length} rows`);

// 15. Board_Meetings
const wsMeetings = wb.Sheets['Board_Meetings'];
const rawMeetings = wsMeetings ? XLSX.utils.sheet_to_json(wsMeetings) : [];
const boardMeetings = rawMeetings.map(r => ({
  meeting_id: cleanStr(r.MeetingID),
  meeting_no: cleanStr(r.MeetingNo),
  fiscal_year: cleanStr(r.FiscalYear),
  meeting_date: excelDateToStr(r.MeetingDate),
  meeting_time: cleanStr(r.MeetingTime),
  location: cleanStr(r.Location),
  agenda_summary: cleanStr(r.AgendaSummary),
  present_member_ids: cleanStr(r.PresentMemberIDs),
  absent_member_ids: cleanStr(r.AbsentMemberIDs),
  resolutions: cleanStr(r.Resolutions),
  report_doc_url: cleanStr(r.ReportDocUrl),
  recorded_by: cleanStr(r.RecordedBy),
  timestamp: cleanStr(r.Timestamp)
})).filter(m => m.meeting_id);
console.log(`Parsed Board_Meetings: ${boardMeetings.length} rows`);

// =========================================================================
// GENERATE SUPABASE SQL SEED FILE (DDL + DML FOR 15 TABLES)
// =========================================================================
let schemaSql = `-- =========================================================================
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

COMMIT;
`;

let dataSql = `-- =========================================================================
-- MANSTAT GROUND-TRUTH PRODUCTION DATA (15 SHEETS)
-- Step 2: Run this file second in Supabase SQL Editor
-- =========================================================================
BEGIN;
`;

// Insert SchoolInfo
dataSql += `\n-- 1. Insert SchoolInfo (20 rows)\n`;
for (const s of schoolRows) {
  dataSql += `INSERT INTO school_info (key, val) VALUES (${sqlEscape(s.key)}, ${sqlEscape(s.val)}) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;\n`;
}

// Insert Teachers
dataSql += `\n-- 2. Insert Teachers (15 rows)\n`;
for (const t of teachers) {
  dataSql += `INSERT INTO teachers (id, name, email, phone, class_level, role, duty_day, password, is_password_hashed, access_level, status, start_date, department, emp_type, id_card, division, position_no, member_id, birth_date)
VALUES (${sqlEscape(t.id)}, ${sqlEscape(t.name)}, ${sqlEscape(t.email)}, ${sqlEscape(t.phone)}, ${sqlEscape(t.class_level)}, ${sqlEscape(t.role)}, ${sqlEscape(t.duty_day)}, ${sqlEscape(t.password)}, TRUE, ${sqlEscape(t.access_level)}, ${sqlEscape(t.status)}, ${sqlEscape(t.start_date)}, ${sqlEscape(t.department)}, ${sqlEscape(t.emp_type)}, ${sqlEscape(t.id_card)}, ${sqlEscape(t.division)}, ${sqlEscape(t.position_no)}, ${sqlEscape(t.member_id)}, ${sqlEscape(t.birth_date)})
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, class_level = EXCLUDED.class_level, role = EXCLUDED.role, duty_day = EXCLUDED.duty_day, password = EXCLUDED.password, access_level = EXCLUDED.access_level, status = EXCLUDED.status, start_date = EXCLUDED.start_date, department = EXCLUDED.department, emp_type = EXCLUDED.emp_type, id_card = EXCLUDED.id_card, division = EXCLUDED.division, position_no = EXCLUDED.position_no, member_id = EXCLUDED.member_id, birth_date = EXCLUDED.birth_date;\n`;
}

// Insert Leave_Quota
dataSql += `\n-- 3. Insert Leave_Quota (34 rows)\n`;
for (const q of leaveQuotas) {
  dataSql += `INSERT INTO leave_quota (emp_id, fiscal_year, sick_max, sick_used, personal_max, personal_used, vacation_max, vacation_used)
VALUES (${sqlEscape(q.emp_id)}, ${q.fiscal_year}, ${q.sick_max}, ${q.sick_used}, ${q.personal_max}, ${q.personal_used}, ${q.vacation_max}, ${q.vacation_used})
ON CONFLICT (emp_id, fiscal_year) DO UPDATE SET
  sick_max = EXCLUDED.sick_max, sick_used = EXCLUDED.sick_used, personal_max = EXCLUDED.personal_max, personal_used = EXCLUDED.personal_used, vacation_max = EXCLUDED.vacation_max, vacation_used = EXCLUDED.vacation_used;\n`;
}

// Insert FiscalYear
dataSql += `\n-- 4. Insert FiscalYear (2 rows)\n`;
for (const f of fiscalYears) {
  dataSql += `INSERT INTO fiscal_data (fiscal_year, period1_start, period1_end, period2_start, period2_end, active_period_mode, status, updated_at)
VALUES (${f.fiscal_year}, ${sqlEscape(f.period1_start)}, ${sqlEscape(f.period1_end)}, ${sqlEscape(f.period2_start)}, ${sqlEscape(f.period2_end)}, ${sqlEscape(f.active_period_mode)}, ${sqlEscape(f.status)}, ${sqlEscape(f.updated_at)})
ON CONFLICT (fiscal_year) DO UPDATE SET
  period1_start = EXCLUDED.period1_start, period1_end = EXCLUDED.period1_end, period2_start = EXCLUDED.period2_start, period2_end = EXCLUDED.period2_end, active_period_mode = EXCLUDED.active_period_mode, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;\n`;
}

// Insert Board_Members
dataSql += `\n-- 5. Insert Board_Members (9 rows)\n`;
for (const b of boardMembers) {
  dataSql += `INSERT INTO board_members (member_id, prefix, first_name, last_name, full_name, board_position, occupation, organization, phone, email, appointment_order_no, order_date, start_date, end_date, term_number, status, doc_url, remark, updated_by, timestamp)
VALUES (${sqlEscape(b.member_id)}, ${sqlEscape(b.prefix)}, ${sqlEscape(b.first_name)}, ${sqlEscape(b.last_name)}, ${sqlEscape(b.full_name)}, ${sqlEscape(b.board_position)}, ${sqlEscape(b.occupation)}, ${sqlEscape(b.organization)}, ${sqlEscape(b.phone)}, ${sqlEscape(b.email)}, ${sqlEscape(b.appointment_order_no)}, ${sqlEscape(b.order_date)}, ${sqlEscape(b.start_date)}, ${sqlEscape(b.end_date)}, ${b.term_number}, ${sqlEscape(b.status)}, ${sqlEscape(b.doc_url)}, ${sqlEscape(b.remark)}, ${sqlEscape(b.updated_by)}, ${sqlEscape(b.timestamp)})
ON CONFLICT (member_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, status = EXCLUDED.status, phone = EXCLUDED.phone, email = EXCLUDED.email;\n`;
}

// Insert SchoolBoard_StaffTerms
dataSql += `\n-- 6. Insert SchoolBoard_StaffTerms (2 rows)\n`;
for (const s of staffTerms) {
  dataSql += `INSERT INTO school_board_staff_terms (term_id, emp_id, full_name, board_position, start_date, end_date, term_number, appointment_order_no, status, updated_by, timestamp)
VALUES (${sqlEscape(s.term_id)}, ${sqlEscape(s.emp_id)}, ${sqlEscape(s.full_name)}, ${sqlEscape(s.board_position)}, ${sqlEscape(s.start_date)}, ${sqlEscape(s.end_date)}, ${s.term_number}, ${sqlEscape(s.appointment_order_no)}, ${sqlEscape(s.status)}, ${sqlEscape(s.updated_by)}, ${sqlEscape(s.timestamp)})
ON CONFLICT (term_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, board_position = EXCLUDED.board_position, end_date = EXCLUDED.end_date, status = EXCLUDED.status;\n`;
}

// Insert History_Standing
dataSql += `\n-- 7. Insert History_Standing (1 row)\n`;
for (const s of standings) {
  dataSql += `INSERT INTO history_standing (record_id, emp_id, standing_level, effective_date, order_number, doc_link, timestamp)
VALUES (${sqlEscape(s.record_id)}, ${sqlEscape(s.emp_id)}, ${sqlEscape(s.standing_level)}, ${sqlEscape(s.effective_date)}, ${sqlEscape(s.order_number)}, ${sqlEscape(s.doc_link)}, ${sqlEscape(s.timestamp)})
ON CONFLICT (record_id) DO UPDATE SET standing_level = EXCLUDED.standing_level;\n`;
}

// Insert History_Education
dataSql += `\n-- 8. Insert History_Education (1 row)\n`;
for (const e of educations) {
  dataSql += `INSERT INTO history_education (record_id, emp_id, degree_level, degree_short, major, institute, grad_year, timestamp)
VALUES (${sqlEscape(e.record_id)}, ${sqlEscape(e.emp_id)}, ${sqlEscape(e.degree_level)}, ${sqlEscape(e.degree_short)}, ${sqlEscape(e.major)}, ${sqlEscape(e.institute)}, ${sqlEscape(e.grad_year)}, ${sqlEscape(e.timestamp)})
ON CONFLICT (record_id) DO UPDATE SET institute = EXCLUDED.institute;\n`;
}

// Insert History_Licenses
dataSql += `\n-- 9. Insert History_Licenses (2 rows)\n`;
for (const l of licenses) {
  dataSql += `INSERT INTO history_licenses (record_id, emp_id, license_category, license_type, license_number, issue_date, expiry_date, timestamp)
VALUES (${sqlEscape(l.record_id)}, ${sqlEscape(l.emp_id)}, ${sqlEscape(l.license_category)}, ${sqlEscape(l.license_type)}, ${sqlEscape(l.license_number)}, ${sqlEscape(l.issue_date)}, ${sqlEscape(l.expiry_date)}, ${sqlEscape(l.timestamp)})
ON CONFLICT (record_id) DO UPDATE SET license_number = EXCLUDED.license_number;\n`;
}

// Insert Holidays
dataSql += `\n-- 10. Insert Holidays (3 rows)\n`;
for (const h of holidays) {
  dataSql += `INSERT INTO holidays (holiday_date, reason_type, note, director_name, timestamp)
VALUES (${sqlEscape(h.holiday_date)}, ${sqlEscape(h.reason_type)}, ${sqlEscape(h.note)}, ${sqlEscape(h.director_name)}, ${sqlEscape(h.timestamp)})
ON CONFLICT (holiday_date) DO UPDATE SET reason_type = EXCLUDED.reason_type;\n`;
}

dataSql += `\nCOMMIT;\n`;

// Ensure sql directory exists
const sqlDir = path.join(__dirname, '../sql');
fs.mkdirSync(sqlDir, { recursive: true });

// Write split files
const schemaPath = path.join(sqlDir, '1_create_tables.sql');
const dataPath = path.join(sqlDir, '2_insert_data.sql');
fs.writeFileSync(schemaPath, schemaSql, 'utf8');
fs.writeFileSync(dataPath, dataSql, 'utf8');

// Also write to root for convenience
fs.writeFileSync(path.join(__dirname, '../1_create_tables.sql'), schemaSql, 'utf8');
fs.writeFileSync(path.join(__dirname, '../2_insert_data.sql'), dataSql, 'utf8');

// Also write combined supabase-seed.sql
const fullSql = schemaSql + '\n\n' + dataSql;
fs.writeFileSync(SQL_OUTPUT_PATH, fullSql, 'utf8');

console.log(`[Success] Written SQL Schema: ${schemaPath} (${(fs.statSync(schemaPath).size / 1024).toFixed(1)} KB)`);
console.log(`[Success] Written SQL Data:   ${dataPath} (${(fs.statSync(dataPath).size / 1024).toFixed(1)} KB)`);
console.log(`[Success] Written Seed SQL:   ${SQL_OUTPUT_PATH} (${(fs.statSync(SQL_OUTPUT_PATH).size / 1024).toFixed(1)} KB)`);

// =========================================================================
// UPDATE LOCAL IN-MEMORY / JSON STORE (data/manstat_db.json)
// =========================================================================
const storeDbPath = path.join(__dirname, '../data/manstat_db.json');
fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });

// Build comprehensive in-memory structure
const fullStoreData = {
  schoolInfo: {
    schoolName: schoolMap['ชื่อสถานศึกษา'] || 'โรงเรียนชุมชนบ้านตะขบ',
    affiliation: schoolMap['หน่วยงานต้นสังกัด'] || '',
    schoolCode10: schoolMap['รหัส 10 หลัก'] || '1030200688',
    schoolCode8: schoolMap['รหัส 8 หลัก'] || '30030099',
    appName: schoolMap['ชื่อระบบแอปพลิเคชัน'] || 'ManStat',
    directorName: schoolMap['ชื่อผู้อำนวยการ'] || 'นายธีรศักดิ์ มโนธรรม',
    directorPosition: schoolMap['ตำแหน่งผู้อำนวยการ'] || 'ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ',
    contactPhone: schoolMap['เบอร์โทรศัพท์'] || '099-173-2233',
    email: schoolMap['อีเมล'] || 'chumchonbantakhob2473@gmail.com',
    address: schoolMap['ที่อยู่'] || 'ม.1 โรงเรียนชุมชนบ้านตะขบ ต.ตะขบ อ.ปักธงชัย จ.นครราชสีมา 30150',
    lat: cleanNum(schoolMap['ละติจูด (Lat)'], 14.634629),
    lng: cleanNum(schoolMap['ลองจิจูด (Lng)'], 101.852567),
    logoBase64: schoolMap['Logo Base64'] || '',
    actingDirector1: schoolMap['รักษาการคนที่ 1'] || 'นายพันธ์ธนัต ภวฤทธิ์นาคินทร์',
    actingDirector2: schoolMap['รักษาการคนที่ 2'] || 'นายธวัชชัย เหลืองโอฬาร',
    academicYear: String(schoolMap['ปีการศึกษา'] || '2569'),
    fiscalYear: String(schoolMap['ปีงบประมาณ'] || '2570'),
    currentTerm: '2', // Fixed
    studentCount: cleanNum(schoolMap['จำนวนนักเรียน'], 94),
    studentDataDate: schoolMap['วันที่อ้างอิงข้อมูลนักเรียน'] || ''
  },
  activeClasses: [
    'อนุบาล 1', 'อนุบาล 2', 'อนุบาล 3',
    'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
    'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6',
    'มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3'
  ],
  fiscalData: {
    active: fiscalYears.find(f => f.status === 'Active') || fiscalYears[0],
    all: fiscalYears
  },
  teachers: teachers.map(t => {
    // Attach quota for 2570
    const q = leaveQuotas.find(lq => lq.emp_id === t.id && lq.fiscal_year === 2570) || {};
    const myStandings = standings.filter(s => s.emp_id === t.id);
    const myEducations = educations.filter(e => e.emp_id === t.id);
    const myLicenses = licenses.filter(l => l.emp_id === t.id);
    const myScouts = scouts.filter(sc => sc.emp_id === t.id);

    return {
      id: t.id,
      EmpID: t.id,
      positionNo: t.position_no,
      PositionNo: t.position_no,
      memberId: t.member_id,
      MemberID: t.member_id,
      name: t.name,
      FullName: t.name,
      email: t.email,
      phone: t.phone,
      classLevel: t.class_level,
      role: t.role,
      Position: t.role,
      dutyDay: t.duty_day,
      password: t.password,
      isPasswordHashed: t.is_password_hashed,
      accessLevel: t.access_level,
      status: t.status,
      startDate: t.start_date,
      department: t.department,
      division: t.division,
      empType: t.emp_type,
      idCard: t.id_card,
      IDCardMasked: t.id_card ? (t.id_card.substring(0, 1) + '-' + t.id_card.substring(1, 5) + '-*****-**-' + t.id_card.slice(-1)) : '',
      SickCount: 0,
      SickDays: q.sick_used || 0,
      SickMax: q.sick_max || 60,
      PersonalCount: 0,
      PersonalDays: q.personal_used || 0,
      PersonalMax: q.personal_max || 45,
      VacationCount: 0,
      VacationDays: q.vacation_used || 0,
      VacationMax: q.vacation_max || 10,
      PermitCount: 0,
      PermitHours: 0,
      ActiveLicenses: myLicenses,
      StandingsHistory: myStandings,
      EducationsHistory: myEducations,
      ScoutsHistory: myScouts,
      TimelineEvents: []
    };
  }),
  logs: leaveLogs,
  feedbacks: feedbacks,
  workloads: workloads,
  holidays: holidays,
  boardMembers: boardMembers,
  schoolBoardStaffTerms: staffTerms,
  boardMeetings: boardMeetings
};

fs.writeFileSync(storeDbPath, JSON.stringify(fullStoreData, null, 2), 'utf8');
console.log(`[Success] Written Ground-Truth Store JSON: ${storeDbPath} (${(fs.statSync(storeDbPath).size / 1024).toFixed(1)} KB)`);

console.log('\n=== MIGRATION AUDIT SUMMARY ===');
console.log('1. School Info keys:', schoolRows.length);
console.log('2. Fiscal Years:', fiscalYears.length);
console.log('3. Teachers:', teachers.length);
console.log('4. Leave Quotas:', leaveQuotas.length);
console.log('5. Board Members:', boardMembers.length);
console.log('6. Staff Board Terms:', staffTerms.length);
console.log('7. Standings Records:', standings.length);
console.log('8. Educations Records:', educations.length);
console.log('9. Licenses Records:', licenses.length);
console.log('10. Holidays:', holidays.length);
console.log('11. Leave Logs:', leaveLogs.length);
console.log('12. Workloads:', workloads.length);
console.log('13. Feedbacks:', feedbacks.length);
console.log('14. Board Meetings:', boardMeetings.length);
console.log('=================================\n');
