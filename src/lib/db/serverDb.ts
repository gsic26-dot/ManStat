/**
 * ============================================================================
 * ManStat-Modern: Server Database Engine (serverDb.ts)
 * ============================================================================
 * Dual-Mode Database Store for ManStat-Modern:
 * 1. Supabase PostgreSQL (Full Relational - Production & Connected Dev)
 *    - 7 Relational Tables: school_info, teachers, board_members, holidays,
 *      leave_requests, audit_logs, system_settings
 *    - Direct query without memory caching to guarantee cross-instance sync
 *    - Bypasses RLS via SUPABASE_SERVICE_ROLE_KEY
 * 2. Local JSON Storage (Offline Local Development Fallback ONLY)
 *    - data/manstat_db.json
 *    - Disallowed on Vercel without Supabase keys (throws clear configuration error)
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  INITIAL_TEACHERS,
  INITIAL_BOARD_MEMBERS,
  INITIAL_SCHOOL_INFO,
  INITIAL_LEAVE_REQUESTS,
  type TeacherRecord,
  type BoardMemberRecord,
  type SchoolInfoRecord,
  type LeaveRequestRecord,
} from '@/lib/data/schoolData';

export type {
  TeacherRecord,
  BoardMemberRecord,
  SchoolInfoRecord,
  LeaveRequestRecord,
};
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';
import { mapAccessLevelToRole } from '@/lib/auth/roles';

// ============================================================================
// DATA INTERFACES
// ============================================================================

export interface HolidayRecord {
  id: string;
  date: string;
  name: string;
  type: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  targetName: string;
  ipAddress: string;
  timestamp: string;
  details: string;
}

export interface SystemSettingsRecord {
  themeMode: 'light' | 'dark' | 'auto';
  preferredView: 'table' | 'grid';
  compactMode: boolean;
  maskCitizenId: boolean;
  fiscalYear: number;
  currentTerm: string;
  academicYear: string;
}

export interface DatabaseState {
  schoolInfo: SchoolInfoRecord;
  teachers: TeacherRecord[];
  boardMembers: BoardMemberRecord[];
  holidays: HolidayRecord[];
  leaveRequests: LeaveRequestRecord[];
  auditLogs: AuditLogRecord[];
  settings: SystemSettingsRecord;
}

export const INITIAL_HOLIDAYS: HolidayRecord[] = [
  { id: 'h-01', date: '2026-10-13', name: 'วันนวมินทรมหาราช', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-02', date: '2026-10-23', name: 'วันปิยมหาราช', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-03', date: '2026-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-04', date: '2026-12-07', name: 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', type: 'วันหยุดชดเชย' },
  { id: 'h-05', date: '2026-12-10', name: 'วันรัฐธรรมนูญ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-06', date: '2026-12-31', name: 'วันสิ้นปี', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-07', date: '2027-01-01', name: 'วันขึ้นปีใหม่', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-08', date: '2027-01-16', name: 'วันครูแห่งชาติ (วันหยุดเฉพาะสถานศึกษา)', type: 'วันหยุดเฉพาะสถานศึกษา' },
  { id: 'h-09', date: '2027-02-21', name: 'วันมาฆบูชา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-10', date: '2027-02-22', name: 'วันหยุดชดเชยวันมาฆบูชา', type: 'วันหยุดชดเชย' },
  { id: 'h-11', date: '2027-04-06', name: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-12', date: '2027-04-13', name: 'วันสงกรานต์', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-13', date: '2027-04-14', name: 'วันสงกรานต์', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-14', date: '2027-04-15', name: 'วันสงกรานต์', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-15', date: '2027-05-03', name: 'วันหยุดชดเชยวันแรงงานแห่งชาติ', type: 'วันหยุดชดเชย' },
  { id: 'h-16', date: '2027-05-04', name: 'วันฉัตรมงคล', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-17', date: '2027-05-20', name: 'วันวิสาขบูชา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-18', date: '2027-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-19', date: '2027-07-19', name: 'วันอาสาฬหบูชา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-20', date: '2027-07-20', name: 'วันเข้าพรรษา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-21', date: '2027-07-28', name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-22', date: '2027-08-12', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', type: 'วันหยุดราชการประจำปี' },
];

export const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'log-001',
    action: 'SYSTEM_INIT',
    actorName: 'Superuser (นายธีรศักดิ์ มโนธรรม)',
    actorRole: 'superuser',
    targetName: 'ระบบส่วนกลาง ManStat-Modern',
    ipAddress: '127.0.0.1',
    timestamp: '2026-11-19T08:00:00Z',
    details: 'เริ่มต้นระบบฐานข้อมูลและลงทะเบียนสิทธิ์การเข้าถึง',
  },
];

export const INITIAL_SETTINGS: SystemSettingsRecord = {
  themeMode: 'auto',
  preferredView: 'table',
  compactMode: false,
  maskCitizenId: true,
  fiscalYear: 2570,
  currentTerm: '2',
  academicYear: '2569',
};

// ============================================================================
// LOCAL STORAGE PATHS & HELPERS (OFFLINE FALLBACK)
// ============================================================================

const BUNDLED_DB_DIR = path.join(process.cwd(), 'data');
const BUNDLED_DB_FILE = path.join(BUNDLED_DB_DIR, 'manstat_db.json');
const TMP_DB_FILE = path.join(os.tmpdir(), 'manstat_db.json');

let cachedWritableFile: string | null = null;

function getWritableDbFile(): string {
  if (cachedWritableFile) return cachedWritableFile;

  if (
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NEXT_RUNTIME === 'edge'
  ) {
    cachedWritableFile = TMP_DB_FILE;
    return TMP_DB_FILE;
  }

  try {
    if (!fs.existsSync(BUNDLED_DB_DIR)) {
      fs.mkdirSync(BUNDLED_DB_DIR, { recursive: true });
    }
    const testFile = path.join(BUNDLED_DB_DIR, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, '1', 'utf8');
    fs.unlinkSync(testFile);
    cachedWritableFile = BUNDLED_DB_FILE;
    return BUNDLED_DB_FILE;
  } catch {
    cachedWritableFile = TMP_DB_FILE;
    return TMP_DB_FILE;
  }
}

let memoryDb: DatabaseState | null = null;
let lastLoadedMtime = 0;
let lastLoadedFile: string | null = null;

function parseDatabaseState(parsed: any): DatabaseState {
  return {
    schoolInfo: parsed.schoolInfo || INITIAL_SCHOOL_INFO,
    teachers:
      Array.isArray(parsed.teachers) && parsed.teachers.length > 0 && parsed.teachers[0].employeeCode
        ? parsed.teachers
        : INITIAL_TEACHERS,
    boardMembers:
      Array.isArray(parsed.boardMembers) && parsed.boardMembers.length > 0
        ? parsed.boardMembers
        : INITIAL_BOARD_MEMBERS,
    holidays:
      Array.isArray(parsed.holidays) && parsed.holidays.length > 0
        ? parsed.holidays.map((h: any, idx: number) => ({
            id: h.id || `h-${idx + 1}`,
            date: h.date || h.holiday_date || '',
            name: h.name || h.reason_type || 'วันหยุดราชการ',
            type: h.type || 'วันหยุดราชการประจำปี',
          }))
        : INITIAL_HOLIDAYS,
    leaveRequests:
      Array.isArray(parsed.leaveRequests) && parsed.leaveRequests.length > 0
        ? parsed.leaveRequests
        : INITIAL_LEAVE_REQUESTS,
    auditLogs:
      Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0
        ? parsed.auditLogs
        : Array.isArray(parsed.logs) && parsed.logs.length > 0
        ? parsed.logs
        : INITIAL_AUDIT_LOGS,
    settings: parsed.settings || INITIAL_SETTINGS,
  };
}

export function loadDatabase(forceReload = false): DatabaseState {
  const writableFile = getWritableDbFile();
  const activeFile = (writableFile === TMP_DB_FILE && fs.existsSync(TMP_DB_FILE))
    ? TMP_DB_FILE
    : (fs.existsSync(BUNDLED_DB_FILE) ? BUNDLED_DB_FILE : null);

  if (!forceReload && activeFile && memoryDb && lastLoadedFile === activeFile) {
    try {
      const stat = fs.statSync(activeFile);
      if (stat.mtimeMs === lastLoadedMtime && stat.mtimeMs > 0) {
        return memoryDb;
      }
    } catch {
      // ignore
    }
  }

  if (writableFile === TMP_DB_FILE && fs.existsSync(TMP_DB_FILE)) {
    try {
      const raw = fs.readFileSync(TMP_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      const state = parseDatabaseState(parsed);
      memoryDb = state;
      lastLoadedFile = TMP_DB_FILE;
      try {
        lastLoadedMtime = fs.statSync(TMP_DB_FILE).mtimeMs;
      } catch {
        lastLoadedMtime = Date.now();
      }
      return state;
    } catch (err) {
      console.warn('[loadDatabase] Failed reading from /tmp DB:', err);
    }
  }

  if (fs.existsSync(BUNDLED_DB_FILE)) {
    try {
      const raw = fs.readFileSync(BUNDLED_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      const state = parseDatabaseState(parsed);
      memoryDb = state;
      lastLoadedFile = BUNDLED_DB_FILE;
      try {
        lastLoadedMtime = fs.statSync(BUNDLED_DB_FILE).mtimeMs;
      } catch {
        lastLoadedMtime = Date.now();
      }
      return state;
    } catch (err) {
      console.error('[loadDatabase] Bundled parse error:', err);
    }
  }

  const defaultState: DatabaseState = {
    schoolInfo: INITIAL_SCHOOL_INFO,
    teachers: INITIAL_TEACHERS,
    boardMembers: INITIAL_BOARD_MEMBERS,
    holidays: INITIAL_HOLIDAYS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    auditLogs: INITIAL_AUDIT_LOGS,
    settings: INITIAL_SETTINGS,
  };

  saveDatabase(defaultState);
  memoryDb = defaultState;
  return defaultState;
}

export function saveDatabase(state: DatabaseState): void {
  const targetFile = getWritableDbFile();
  const targetDir = path.dirname(targetFile);

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const tempFile = `${targetFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tempFile, targetFile);

    memoryDb = state;
    lastLoadedFile = targetFile;
    try {
      lastLoadedMtime = fs.statSync(targetFile).mtimeMs;
    } catch {
      lastLoadedMtime = Date.now();
    }
  } catch (err: any) {
    if (targetFile !== TMP_DB_FILE) {
      try {
        const tmpTemp = `${TMP_DB_FILE}.tmp`;
        fs.writeFileSync(tmpTemp, JSON.stringify(state, null, 2), 'utf8');
        fs.renameSync(tmpTemp, TMP_DB_FILE);
        cachedWritableFile = TMP_DB_FILE;
        memoryDb = state;
        lastLoadedFile = TMP_DB_FILE;
        try {
          lastLoadedMtime = fs.statSync(TMP_DB_FILE).mtimeMs;
        } catch {
          lastLoadedMtime = Date.now();
        }
        return;
      } catch (fallbackErr: any) {
        throw new Error(`ไม่สามารถบันทึกฐานข้อมูลลงระบบไฟล์ได้: ${fallbackErr.message || fallbackErr}`);
      }
    }
    throw new Error(`ไม่สามารถบันทึกฐานข้อมูลลงระบบไฟล์ได้: ${err.message || err}`);
  }
}

// ============================================================================
// TWO-WAY ROW MAPPERS (camelCase <-> snake_case)
// ============================================================================

// 1. school_info
export function schoolInfoToDb(info: Partial<SchoolInfoRecord>) {
  return {
    id: 'default',
    app_name: info.appName ?? 'ManStat-Modern',
    school_name: info.schoolName ?? '',
    affiliation: info.affiliation ?? '',
    school_code_10: info.schoolCode10 ?? '',
    school_code_8: info.schoolCode8 ?? '',
    director_name: info.directorName ?? '',
    director_position: info.directorPosition ?? 'ผู้อำนวยการโรงเรียน',
    acting_director_1: info.actingDirector1 ?? '',
    acting_director_2: info.actingDirector2 ?? '',
    contact_phone: info.contactPhone ?? '',
    email: info.email ?? '',
    address: info.address ?? '',
    lat: info.lat != null ? String(info.lat) : '',
    lng: info.lng != null ? String(info.lng) : '',
    logo_base64: info.logoBase64 ?? '',
    academic_year: info.academicYear ?? '2569',
    current_term: info.currentTerm ?? '2',
    fiscal_year: info.fiscalYear ?? '2570',
    student_count: Number(info.studentCount) || 0,
    student_data_date: info.studentDataDate ?? '',
    active_classes: Array.isArray(info.activeClasses) ? info.activeClasses : [],
  };
}

export function schoolInfoFromDb(row: any): SchoolInfoRecord {
  return {
    appName: row.app_name || 'ManStat-Modern',
    schoolName: row.school_name || '',
    affiliation: row.affiliation || '',
    schoolCode10: row.school_code_10 || '',
    schoolCode8: row.school_code_8 || '',
    directorName: row.director_name || '',
    directorPosition: row.director_position || 'ผู้อำนวยการโรงเรียน',
    actingDirector1: row.acting_director_1 || '',
    actingDirector2: row.acting_director_2 || '',
    contactPhone: row.contact_phone || '',
    email: row.email || '',
    address: row.address || '',
    lat: row.lat ? parseFloat(row.lat) : undefined,
    lng: row.lng ? parseFloat(row.lng) : undefined,
    logoBase64: row.logo_base64 || '',
    academicYear: row.academic_year || '2569',
    currentTerm: row.current_term || '2',
    fiscalYear: row.fiscal_year || '2570',
    studentCount: Number(row.student_count) || 0,
    studentDataDate: row.student_data_date || '',
    activeClasses: Array.isArray(row.active_classes) ? row.active_classes : [],
  };
}

// 2. teachers
export function teacherToDb(t: TeacherRecord) {
  const accessLevel =
    t.accessLevel === 'Superuser' || t.accessLevel === 'Admin' || t.accessLevel === 'User'
      ? t.accessLevel
      : 'User';

  let role = t.role || mapAccessLevelToRole(accessLevel);
  if (!['superuser', 'director', 'hr_admin', 'teacher'].includes(role)) {
    role = mapAccessLevelToRole(accessLevel);
  }

  return {
    id: t.id || t.employeeCode,
    employee_code: t.employeeCode || t.id || '',
    name: t.name || '',
    prefix: t.prefix || '',
    first_name: t.firstName || '',
    last_name: t.lastName || '',
    position: t.position || 'ครู',
    academic_standing: t.academicStanding || '-',
    department: t.department || '',
    division: t.division || '',
    class_level: t.classLevel || '-',
    duty_day: t.dutyDay || '-',
    access_level: accessLevel,
    role: role,
    start_date: t.startDate || '',
    email: t.email || '',
    phone: t.phone || '',
    masked_citizen_id: t.maskedCitizenId || '',
    id_card: t.idCard || '',
    position_no: t.positionNo || '',
    member_id: t.memberId || '',
    highest_scout: t.highestScout || 'ไม่มีวุฒิลูกเสือ',
    scout_cert_no: t.scoutCertNo || '',
    teaching_hours: Number(t.teachingHours) || 18,
    ta_hours: Number(t.taHours) || 0,
    sick_used: Number(t.sickUsed) || 0,
    personal_used: Number(t.personalUsed) || 0,
    vacation_used: Number(t.vacationUsed) || 0,
    licenses: Array.isArray(t.licenses) ? t.licenses : [],
    standings: Array.isArray(t.standings) ? t.standings : [],
    educations: Array.isArray(t.educations) ? t.educations : [],
  };
}

export function teacherFromDb(row: any): TeacherRecord {
  return {
    id: row.id,
    employeeCode: row.employee_code || row.id,
    name: row.name,
    prefix: row.prefix || '',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    position: row.position || 'ครู',
    academicStanding: row.academic_standing || '-',
    department: row.department || '',
    division: row.division || '',
    classLevel: row.class_level || '-',
    dutyDay: row.duty_day || '-',
    accessLevel: row.access_level || 'User',
    role: row.role || 'teacher',
    startDate: row.start_date || '',
    email: row.email || '',
    phone: row.phone || '',
    maskedCitizenId: row.masked_citizen_id || '',
    idCard: row.id_card || '',
    positionNo: row.position_no || '',
    memberId: row.member_id || '',
    highestScout: row.highest_scout || 'ไม่มีวุฒิลูกเสือ',
    scoutCertNo: row.scout_cert_no || '',
    teachingHours: Number(row.teaching_hours) || 0,
    taHours: Number(row.ta_hours) || 0,
    sickUsed: Number(row.sick_used) || 0,
    personalUsed: Number(row.personal_used) || 0,
    vacationUsed: Number(row.vacation_used) || 0,
    licenses: Array.isArray(row.licenses) ? row.licenses : [],
    standings: Array.isArray(row.standings) ? row.standings : [],
    educations: Array.isArray(row.educations) ? row.educations : [],
  };
}

// 3. board_members
export function boardMemberToDb(b: BoardMemberRecord) {
  const validEndReasons = ['', 'ย้าย', 'ลาออก', 'เกษียณอายุราชการ'];
  const endReason = validEndReasons.includes(b.endReason || '') ? (b.endReason || '') : '';

  return {
    id: b.id,
    full_name: b.fullName || '',
    position: b.position || 'EXPERT',
    position_title: b.positionTitle || 'กรรมการผู้ทรงคุณวุฒิ',
    occupation: b.occupation || '-',
    organization: b.organization || '-',
    phone: b.phone || '-',
    status: b.status || 'ดำรงตำแหน่ง',
    term_number: Number(b.termNumber) || 1,
    is_ex_officio: Boolean(b.isExOfficio),
    appointment_date: b.appointmentDate || '',
    end_date: b.endDate || '',
    end_reason: endReason,
  };
}

export function boardMemberFromDb(row: any): BoardMemberRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    position: row.position || 'EXPERT',
    positionTitle: row.position_title || 'กรรมการผู้ทรงคุณวุฒิ',
    occupation: row.occupation || '-',
    organization: row.organization || '-',
    phone: row.phone || '-',
    status: row.status || 'ดำรงตำแหน่ง',
    termNumber: Number(row.term_number) || 1,
    isExOfficio: Boolean(row.is_ex_officio),
    appointmentDate: row.appointment_date || '',
    endDate: row.end_date || '',
    endReason: row.end_reason || '',
  };
}

// 4. holidays
export function holidayToDb(h: HolidayRecord) {
  return {
    id: h.id,
    date: h.date,
    name: h.name,
    type: h.type || 'วันหยุดราชการประจำปี',
  };
}

export function holidayFromDb(row: any): HolidayRecord {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    type: row.type || 'วันหยุดราชการประจำปี',
  };
}

// 5. leave_requests
export function leaveRequestToDb(r: LeaveRequestRecord) {
  return {
    id: r.id,
    doc_no: r.docNo || '',
    teacher_id: r.teacherId,
    teacher_name: r.teacherName,
    position: r.position || '',
    department: r.department || '',
    leave_type: r.leaveType,
    leave_type_name: r.leaveTypeName,
    start_date: r.startDate,
    end_date: r.endDate,
    total_days: Number(r.totalDays) || 0,
    start_time: r.startTime || '',
    end_time: r.endTime || '',
    total_hours: Number(r.totalHours) || 0,
    place: r.place || r.destination || '',
    reason: r.reason || '',
    substitute_teacher_name: r.substituteTeacherName || '',
    workload_json: r.workloadJson || r.workloads || [],
    status: r.status || 'pending',
    current_step: String(r.currentStep ?? '1'),
    supervisor_remark: r.supervisorRemark || '',
    director_remark: r.directorRemark || '',
    submitted_at: r.submittedAt || new Date().toISOString(),
  };
}

export function leaveRequestFromDb(row: any): LeaveRequestRecord {
  return {
    id: row.id,
    docNo: row.doc_no || '',
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    position: row.position || '',
    department: row.department || '',
    leaveType: row.leave_type,
    leaveTypeName: row.leave_type_name,
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays: Number(row.total_days) || 0,
    startTime: row.start_time || null,
    endTime: row.end_time || null,
    totalHours: Number(row.total_hours) || 0,
    place: row.place || '',
    destination: row.place || '',
    reason: row.reason || '',
    substituteTeacherName: row.substitute_teacher_name || '',
    workloadJson: Array.isArray(row.workload_json) ? row.workload_json : [],
    workloads: Array.isArray(row.workload_json) ? row.workload_json : [],
    status: row.status || 'pending',
    currentStep: Number(row.current_step) || 1,
    supervisorRemark: row.supervisor_remark || '',
    directorRemark: row.director_remark || '',
    submittedAt: row.submitted_at || '',
  };
}

// 6. audit_logs
export function auditLogToDb(log: AuditLogRecord) {
  return {
    id: log.id,
    action: log.action,
    actor_name: log.actorName,
    actor_role: log.actorRole,
    target_name: log.targetName || '',
    ip_address: log.ipAddress || '127.0.0.1',
    timestamp: log.timestamp || new Date().toISOString(),
    details: log.details || '',
  };
}

export function auditLogFromDb(row: any): AuditLogRecord {
  return {
    id: row.id,
    action: row.action,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    targetName: row.target_name || '',
    ipAddress: row.ip_address || '127.0.0.1',
    timestamp: typeof row.timestamp === 'string' ? row.timestamp : new Date(row.timestamp).toISOString(),
    details: row.details || '',
  };
}

// 7. system_settings
export function systemSettingsToDb(s: Partial<SystemSettingsRecord>) {
  const validThemes = ['light', 'dark', 'auto'] as const;
  const themeMode = validThemes.includes(s.themeMode as any) ? s.themeMode : 'auto';
  const validViews = ['table', 'grid'] as const;
  const preferredView = validViews.includes(s.preferredView as any) ? s.preferredView : 'table';

  return {
    id: 'default',
    theme_mode: themeMode,
    preferred_view: preferredView,
    compact_mode: Boolean(s.compactMode),
    mask_citizen_id: s.maskCitizenId !== undefined ? Boolean(s.maskCitizenId) : true,
    fiscal_year: Number(s.fiscalYear) || 2570,
    current_term: s.currentTerm || '2',
    academic_year: s.academicYear || '2569',
  };
}

export function systemSettingsFromDb(row: any): SystemSettingsRecord {
  return {
    themeMode: row.theme_mode || 'auto',
    preferredView: row.preferred_view || 'table',
    compactMode: Boolean(row.compact_mode),
    maskCitizenId: Boolean(row.mask_citizen_id),
    fiscalYear: Number(row.fiscal_year) || 2570,
    currentTerm: row.current_term || '2',
    academicYear: row.academic_year || '2569',
  };
}

// ============================================================================
// ONE-TIME SEEDING (ensureSupabaseSeeded)
// ============================================================================

let isSeededChecked = false;

export async function ensureSupabaseSeeded(): Promise<void> {
  if (isSeededChecked) return;
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getSupabaseAdmin();

    // Check count of teachers and school_info
    const [teachersRes, schoolRes] = await Promise.all([
      supabase.from('teachers').select('id', { count: 'exact', head: true }),
      supabase.from('school_info').select('id', { count: 'exact', head: true }),
    ]);

    const teacherCount = teachersRes.count ?? 0;
    const schoolCount = schoolRes.count ?? 0;

    // Seed only if both are empty (0 rows)
    if (teacherCount === 0 && schoolCount === 0) {
      console.log('[ensureSupabaseSeeded] Supabase database is empty. Seeding initial data from local JSON/defaults...');
      const localData = loadDatabase();

      // 1. school_info
      await supabase.from('school_info').upsert(schoolInfoToDb(localData.schoolInfo));

      // 2. teachers
      if (localData.teachers.length > 0) {
        await supabase.from('teachers').upsert(localData.teachers.map(teacherToDb));
      }

      // 3. board_members
      if (localData.boardMembers.length > 0) {
        await supabase.from('board_members').upsert(localData.boardMembers.map(boardMemberToDb));
      }

      // 4. holidays
      if (localData.holidays.length > 0) {
        await supabase.from('holidays').upsert(localData.holidays.map(holidayToDb));
      }

      // 5. leave_requests
      if (localData.leaveRequests.length > 0) {
        await supabase.from('leave_requests').upsert(localData.leaveRequests.map(leaveRequestToDb));
      }

      // 6. audit_logs
      if (localData.auditLogs.length > 0) {
        await supabase.from('audit_logs').upsert(localData.auditLogs.map(auditLogToDb));
      }

      // 7. system_settings
      await supabase.from('system_settings').upsert(systemSettingsToDb(localData.settings));

      console.log('[ensureSupabaseSeeded] Seeding completed successfully.');
    }

    isSeededChecked = true;
  } catch (seedErr: any) {
    console.error('[ensureSupabaseSeeded] Error seeding initial Supabase data:', seedErr);
  }
}

function verifyVercelConfiguration(): void {
  if (process.env.VERCEL && !isSupabaseConfigured()) {
    throw new Error(
      'ระบบกำลังทำงานบน Vercel แต่ยังไม่ได้กำหนด SUPABASE_SERVICE_ROLE_KEY และ NEXT_PUBLIC_SUPABASE_URL ใน Environment Variables'
    );
  }
}

// ============================================================================
// ASYNC DATABASE OPERATIONS (RELATIONAL SUPABASE + LOCAL DEV FALLBACK)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. SCHOOL INFO
// ----------------------------------------------------------------------------
export async function dbGetSchoolInfo(): Promise<SchoolInfoRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('school_info').select('*').eq('id', 'default').maybeSingle();
    if (error) {
      console.error('[dbGetSchoolInfo] Supabase query error:', error);
      throw new Error(`ไม่สามารถดึงข้อมูลสถานศึกษาจาก Supabase ได้: ${error.message}`);
    }
    if (data) {
      return schoolInfoFromDb(data);
    }
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return db.schoolInfo;
}

export async function dbSaveSchoolInfo(info: Partial<SchoolInfoRecord>): Promise<SchoolInfoRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const current = await dbGetSchoolInfo();
    const merged: SchoolInfoRecord = {
      ...current,
      ...info,
      activeClasses: Array.isArray(info.activeClasses) ? info.activeClasses : current.activeClasses,
    };
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('school_info')
      .upsert(schoolInfoToDb(merged), { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[dbSaveSchoolInfo] Supabase upsert error:', error);
      throw new Error(`ไม่สามารถบันทึกข้อมูลสถานศึกษาลง Supabase ได้: ${error.message}`);
    }
    return schoolInfoFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.schoolInfo = {
    ...db.schoolInfo,
    ...info,
    activeClasses: Array.isArray(info.activeClasses) ? info.activeClasses : db.schoolInfo.activeClasses,
  };
  saveDatabase(db);
  return db.schoolInfo;
}

// ----------------------------------------------------------------------------
// 2. TEACHERS
// ----------------------------------------------------------------------------
export async function dbGetTeachers(): Promise<TeacherRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('[dbGetTeachers] Supabase query error:', error);
      throw new Error(`ไม่สามารถดึงข้อมูลบุคลากรจาก Supabase ได้: ${error.message}`);
    }
    return (data || []).map(teacherFromDb);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return db.teachers;
}

export async function dbUpsertTeacher(teacher: TeacherRecord): Promise<TeacherRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const row = teacherToDb(teacher);
    const { data, error } = await supabase
      .from('teachers')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[dbUpsertTeacher] Supabase upsert error:', error);
      throw new Error(`ไม่สามารถบันทึกข้อมูลบุคลากรลง Supabase ได้: ${error.message}`);
    }
    return teacherFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const existingIndex = db.teachers.findIndex(
    (t) =>
      (teacher.id && t.id === teacher.id) ||
      (teacher.employeeCode && teacher.employeeCode.trim() !== '' && t.employeeCode === teacher.employeeCode)
  );

  if (existingIndex >= 0) {
    db.teachers[existingIndex] = teacher;
  } else {
    db.teachers.unshift(teacher);
  }
  saveDatabase(db);
  return teacher;
}

export async function dbDeleteTeacher(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) {
      console.error('[dbDeleteTeacher] Supabase delete error:', error);
      throw new Error(`ไม่สามารถลบบุคลากรจาก Supabase ได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.teachers = db.teachers.filter((t) => t.id !== id);
  saveDatabase(db);
  return true;
}

// ----------------------------------------------------------------------------
// 3. BOARD MEMBERS
// ----------------------------------------------------------------------------
export async function dbGetBoardMembers(): Promise<BoardMemberRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('board_members').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('[dbGetBoardMembers] Supabase query error:', error);
      throw new Error(`ไม่สามารถดึงข้อมูลคณะกรรมการสถานศึกษาจาก Supabase ได้: ${error.message}`);
    }
    return (data || []).map(boardMemberFromDb);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return db.boardMembers || [];
}

export async function dbUpsertBoardMember(member: BoardMemberRecord): Promise<BoardMemberRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const row = boardMemberToDb(member);
    const { data, error } = await supabase
      .from('board_members')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[dbUpsertBoardMember] Supabase upsert error:', error);
      throw new Error(`ไม่สามารถบันทึกข้อมูลคณะกรรมการลง Supabase ได้: ${error.message}`);
    }
    return boardMemberFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (!db.boardMembers) db.boardMembers = [];
  const existingIndex = db.boardMembers.findIndex((b) => b.id === member.id);
  if (existingIndex >= 0) {
    db.boardMembers[existingIndex] = member;
  } else {
    db.boardMembers.push(member);
  }
  saveDatabase(db);
  return member;
}

export async function dbDeleteBoardMember(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('board_members').delete().eq('id', id);
    if (error) {
      console.error('[dbDeleteBoardMember] Supabase delete error:', error);
      throw new Error(`ไม่สามารถลบคณะกรรมการสถานศึกษาจาก Supabase ได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.boardMembers = (db.boardMembers || []).filter((b) => b.id !== id);
  saveDatabase(db);
  return true;
}

// ----------------------------------------------------------------------------
// 4. HOLIDAYS
// ----------------------------------------------------------------------------
export async function dbGetHolidays(): Promise<HolidayRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('holidays').select('*').order('date', { ascending: true });
    if (error) {
      console.error('[dbGetHolidays] Supabase query error:', error);
      throw new Error(`ไม่สามารถดึงข้อมูลวันหยุดจาก Supabase ได้: ${error.message}`);
    }
    return (data || []).map(holidayFromDb);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return db.holidays || [];
}

export async function dbAddHoliday(holiday: HolidayRecord): Promise<HolidayRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const row = holidayToDb(holiday);
    const { data, error } = await supabase
      .from('holidays')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[dbAddHoliday] Supabase upsert error:', error);
      throw new Error(`ไม่สามารถบันทึกวันหยุดลง Supabase ได้: ${error.message}`);
    }
    return holidayFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.holidays.push(holiday);
  db.holidays.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  saveDatabase(db);
  return holiday;
}

export async function dbDeleteHoliday(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) {
      console.error('[dbDeleteHoliday] Supabase delete error:', error);
      throw new Error(`ไม่สามารถลบวันหยุดจาก Supabase ได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.holidays = db.holidays.filter((h) => h.id !== id);
  saveDatabase(db);
  return true;
}

// ----------------------------------------------------------------------------
// 5. LEAVE REQUESTS
// ----------------------------------------------------------------------------
export async function dbGetLeaveRequests(status?: string): Promise<LeaveRequestRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    let query = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[dbGetLeaveRequests] Supabase query error:', error);
      throw new Error(`ไม่สามารถดึงข้อมูลคำขอลาจาก Supabase ได้: ${error.message}`);
    }
    return (data || []).map(leaveRequestFromDb);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  let list = db.leaveRequests || [];
  if (status) {
    list = list.filter((r) => r.status === status);
  }
  return list;
}

export async function dbUpsertLeaveRequest(req: LeaveRequestRecord): Promise<LeaveRequestRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const row = leaveRequestToDb(req);
    const { data, error } = await supabase
      .from('leave_requests')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[dbUpsertLeaveRequest] Supabase upsert error:', error);
      throw new Error(`ไม่สามารถบันทึกคำขอลาลง Supabase ได้: ${error.message}`);
    }
    return leaveRequestFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (!db.leaveRequests) db.leaveRequests = [];
  const existingIndex = db.leaveRequests.findIndex((r) => r.id === req.id);
  if (existingIndex >= 0) {
    db.leaveRequests[existingIndex] = req;
  } else {
    db.leaveRequests.unshift(req);
  }
  saveDatabase(db);
  return req;
}

export async function dbDeleteLeaveRequest(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('leave_requests').delete().eq('id', id);
    if (error) {
      console.error('[dbDeleteLeaveRequest] Supabase delete error:', error);
      throw new Error(`ไม่สามารถลบคำขอลาจาก Supabase ได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.leaveRequests = (db.leaveRequests || []).filter((r) => r.id !== id);
  saveDatabase(db);
  return true;
}

// ----------------------------------------------------------------------------
// 6. AUDIT LOGS
// ----------------------------------------------------------------------------
export async function dbGetAuditLogs(limit = 200): Promise<AuditLogRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[dbGetAuditLogs] Supabase query error:', error);
      throw new Error(`ไม่สามารถดึงประวัติความปลอดภัยจาก Supabase ได้: ${error.message}`);
    }
    return (data || []).map(auditLogFromDb);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return (db.auditLogs || []).slice(0, limit);
}

export function recordAuditLog(
  action: string,
  actorName: string,
  actorRole: string,
  targetName: string,
  details: string,
  ipAddress: string = '127.0.0.1'
): AuditLogRecord {
  const newLog: AuditLogRecord = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    action,
    actorName,
    actorRole,
    targetName,
    ipAddress,
    timestamp: new Date().toISOString(),
    details,
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    // Fire and record asynchronously to Supabase
    Promise.resolve(supabase.from('audit_logs').insert(auditLogToDb(newLog)))
      .then(({ error }) => {
        if (error) {
          console.error('[recordAuditLog] Supabase insert error:', error.message);
        }
      })
      .catch((err: any) => {
        console.error('[recordAuditLog] Supabase insert exception:', err);
      });
  }

  // Always update local disk/memory fallback if not on Vercel
  if (!process.env.VERCEL) {
    try {
      const db = loadDatabase();
      db.auditLogs.unshift(newLog);
      if (db.auditLogs.length > 200) {
        db.auditLogs = db.auditLogs.slice(0, 200);
      }
      saveDatabase(db);
    } catch {
      // ignore
    }
  }

  return newLog;
}

// ----------------------------------------------------------------------------
// 7. SYSTEM SETTINGS
// ----------------------------------------------------------------------------
export async function dbGetSettings(): Promise<SystemSettingsRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('system_settings').select('*').eq('id', 'default').maybeSingle();
    if (error) {
      console.error('[dbGetSettings] Supabase query error:', error);
      throw new Error(`ไม่สามารถดึงข้อมูลการตั้งค่าระบบจาก Supabase ได้: ${error.message}`);
    }
    if (data) {
      return systemSettingsFromDb(data);
    }
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return db.settings;
}

export async function dbSaveSettings(settings: Partial<SystemSettingsRecord>): Promise<SystemSettingsRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const current = await dbGetSettings();
    const merged: SystemSettingsRecord = {
      ...current,
      ...settings,
    };
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('system_settings')
      .upsert(systemSettingsToDb(merged), { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[dbSaveSettings] Supabase upsert error:', error);
      throw new Error(`ไม่สามารถบันทึกการตั้งค่าระบบลง Supabase ได้: ${error.message}`);
    }
    return systemSettingsFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.settings = {
    ...db.settings,
    ...settings,
  };
  saveDatabase(db);
  return db.settings;
}
