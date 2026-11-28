/**
 * ============================================================================
 * ManStat: Server Database Engine (serverDb.ts)
 * ============================================================================
 * Compatible Dual-Mode Database Store:
 * 1. Supabase PostgreSQL (Full Relational & Pre-existing 16 Tables Architecture)
 *    - Connects directly to existing Supabase tables (teachers, board_members,
 *      holidays, leave_logs, school_info, active_classes, audit_logs, system_settings)
 *    - Uses exact primary keys:
 *      * board_members -> member_id
 *      * holidays      -> holiday_date
 *      * leave_logs    -> leave_id (with leave_requests fallback)
 *      * teachers      -> id (with employee_code sync)
 *      * school_info   -> supports both vertical (key, val) & flat rows
 *    - Zero-loss guarantee: NEVER overwrites or truncates existing Supabase data
 *    - Direct query without stale caching
 * 2. Local JSON Storage (Offline Local Development Fallback ONLY)
 *    - data/manstat_db.json
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { resolveHighestScout, EMPTY_HIGHEST_SCOUT } from '@/lib/regulations/scout-ranking';
import {
  INITIAL_TEACHERS,
  INITIAL_BOARD_MEMBERS,
  INITIAL_SCHOOL_INFO,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_SCOUTS,
  INITIAL_WORKLOAD_ITEMS,
  type TeacherRecord,
  type BoardMemberRecord,
  type SchoolInfoRecord,
  type LeaveRequestRecord,
  type ScoutRecord,
  type WorkloadItem,
  type WorkloadCategory,
  type FeedbackItem,
  type AcademicYearRecord,
  type StudentCensusSnapshotRecord,
  type FiscalPeriodRecord,
  type SalaryPromotionRecord,
  type EmploymentType,
} from '@/lib/data/schoolData';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin';
import type { PerformanceEvaluationRecord } from '@/types/database.types';
import { mapAccessLevelToRole } from '@/lib/auth/roles';
import { formatStaffName, parseThaiName } from '@/lib/regulations/staff-formatting';
import type {
  TimetableSettings,
  TimetableAllocation,
  TimetableSlot,
  TimetableBundle,
  TimetableSemester,
  TimetableSubjectType,
} from '@/lib/data/timetableTypes';
import { getDefaultTimetableSettings } from '@/lib/regulations/timetable-utils';

export type {
  TeacherRecord,
  BoardMemberRecord,
  SchoolInfoRecord,
  LeaveRequestRecord,
  ScoutRecord,
  WorkloadItem,
  WorkloadCategory,
  FeedbackItem,
  AcademicYearRecord,
  StudentCensusSnapshotRecord,
  FiscalPeriodRecord,
  SalaryPromotionRecord,
};

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
  scouts?: ScoutRecord[];
  workloads?: WorkloadItem[];
  feedbacks?: FeedbackItem[];
  academicYears?: AcademicYearRecord[];
  studentCensusSnapshots?: StudentCensusSnapshotRecord[];
  fiscalPeriods?: FiscalPeriodRecord[];
  salaryPromotionRecords?: SalaryPromotionRecord[];
  timetableSettings?: TimetableSettings[];
  timetableAllocations?: TimetableAllocation[];
  timetableSlots?: TimetableSlot[];
}

export const BOARD_POSITIONS_MAP: Record<string, string> = {
  CHAIR: 'ประธานกรรมการ',
  PARENT_REP: 'ผู้แทนผู้ปกครอง',
  TEACHER_REP: 'ผู้แทนครู',
  COMMUNITY_REP: 'ผู้แทนองค์กรชุมชน',
  LOCAL_ADMIN: 'ผู้แทนองค์กรปกครองส่วนท้องถิ่น',
  ALUMNI_REP: 'ผู้แทนศิษย์เก่า',
  RELIGION_REP: 'ผู้แทนพระภิกษุสงฆ์ / ศาสนา',
  EXPERT: 'กรรมการผู้ทรงคุณวุฒิ',
  DIRECTOR_SEC: 'กรรมการและเลขานุการ',
};

export const INITIAL_HOLIDAYS: HolidayRecord[] = [
  // =========================================================================
  // ปี 2569 (ค.ศ. 2026) - 24 วันหยุด
  // =========================================================================
  { id: 'h-2026-01-01', date: '2026-01-01', name: 'วันขึ้นปีใหม่', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-01-02', date: '2026-01-02', name: 'วันหยุดราชการเพิ่มเป็นกรณีพิเศษ (มติ ครม.)', type: 'วันหยุดพิเศษ / ตามมติ ครม.' },
  { id: 'h-2026-01-16', date: '2026-01-16', name: 'วันครูแห่งชาติ (วันหยุดเฉพาะสถานศึกษา)', type: 'วันหยุดเฉพาะสถานศึกษา' },
  { id: 'h-2026-03-03', date: '2026-03-03', name: 'วันมาฆบูชา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-04-06', date: '2026-04-06', name: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์ (วันจักรี)', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-04-13', date: '2026-04-13', name: 'วันสงกรานต์', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-04-14', date: '2026-04-14', name: 'วันสงกรานต์', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-04-15', date: '2026-04-15', name: 'วันสงกรานต์', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-05-01', date: '2026-05-01', name: 'วันแรงงานแห่งชาติ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-05-04', date: '2026-05-04', name: 'วันฉัตรมงคล', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-05-13', date: '2026-05-13', name: 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-05-31', date: '2026-05-31', name: 'วันวิสาขบูชา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-06-01', date: '2026-06-01', name: 'วันหยุดชดเชยวันวิสาขบูชา', type: 'วันหยุดชดเชย' },
  { id: 'h-2026-06-03', date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-07-28', date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-07-29', date: '2026-07-29', name: 'วันอาสาฬหบูชา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-07-30', date: '2026-07-30', name: 'วันเข้าพรรษา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-08-12', date: '2026-08-12', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-10-13', date: '2026-10-13', name: 'วันนวมินทรมหาราช', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-10-23', date: '2026-10-23', name: 'วันปิยมหาราช', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-12-05', date: '2026-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-12-07', date: '2026-12-07', name: 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', type: 'วันหยุดชดเชย' },
  { id: 'h-2026-12-10', date: '2026-12-10', name: 'วันรัฐธรรมนูญ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2026-12-31', date: '2026-12-31', name: 'วันสิ้นปี', type: 'วันหยุดราชการประจำปี' },

  // =========================================================================
  // ปี 2570 (ค.ศ. 2027) - 26 วันหยุด
  // =========================================================================
  { id: 'h-2027-01-01', date: '2027-01-01', name: 'วันขึ้นปีใหม่', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-01-16', date: '2027-01-16', name: 'วันครูแห่งชาติ (วันหยุดเฉพาะสถานศึกษา)', type: 'วันหยุดเฉพาะสถานศึกษา' },
  { id: 'h-2027-02-21', date: '2027-02-21', name: 'วันมาฆบูชา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-02-22', date: '2027-02-22', name: 'วันหยุดชดเชยวันมาฆบูชา', type: 'วันหยุดชดเชย' },
  { id: 'h-2027-04-06', date: '2027-04-06', name: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์ (วันจักรี)', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-04-13', date: '2027-04-13', name: 'วันสงกรานต์', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-04-14', date: '2027-04-14', name: 'วันสงกรานต์', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-04-15', date: '2027-04-15', name: 'วันสงกรานต์', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-05-01', date: '2027-05-01', name: 'วันแรงงานแห่งชาติ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-05-03', date: '2027-05-03', name: 'วันหยุดชดเชยวันแรงงานแห่งชาติ', type: 'วันหยุดชดเชย' },
  { id: 'h-2027-05-04', date: '2027-05-04', name: 'วันฉัตรมงคล', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-05-13', date: '2027-05-13', name: 'วันพืชมงคลจรดพระนังคัลแรกนาขวัญ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-05-20', date: '2027-05-20', name: 'วันวิสาขบูชา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-06-03', date: '2027-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-07-18', date: '2027-07-18', name: 'วันอาสาฬหบูชา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-07-19', date: '2027-07-19', name: 'วันเข้าพรรษา', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-07-20', date: '2027-07-20', name: 'วันหยุดชดเชยวันอาสาฬหบูชา', type: 'วันหยุดชดเชย' },
  { id: 'h-2027-07-28', date: '2027-07-28', name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-08-12', date: '2027-08-12', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-10-13', date: '2027-10-13', name: 'วันนวมินทรมหาราช', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-10-23', date: '2027-10-23', name: 'วันปิยมหาราช', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-10-25', date: '2027-10-25', name: 'วันหยุดชดเชยวันปิยมหาราช', type: 'วันหยุดชดเชย' },
  { id: 'h-2027-12-05', date: '2027-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-12-06', date: '2027-12-06', name: 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9', type: 'วันหยุดชดเชย' },
  { id: 'h-2027-12-10', date: '2027-12-10', name: 'วันรัฐธรรมนูญ', type: 'วันหยุดราชการประจำปี' },
  { id: 'h-2027-12-31', date: '2027-12-31', name: 'วันสิ้นปี', type: 'วันหยุดราชการประจำปี' },
];

export const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'log-001',
    action: 'SYSTEM_INIT',
    actorName: 'Superuser (นายธีรศักดิ์ มโนธรรม)',
    actorRole: 'superuser',
    targetName: 'ระบบส่วนกลาง ManStat',
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
      Array.isArray(parsed.teachers) && parsed.teachers.length > 0
        ? parsed.teachers
        : INITIAL_TEACHERS,
    boardMembers:
      Array.isArray(parsed.boardMembers) && parsed.boardMembers.length > 0
        ? parsed.boardMembers
        : INITIAL_BOARD_MEMBERS,
    holidays:
      Array.isArray(parsed.holidays) && parsed.holidays.length > 0
        ? parsed.holidays.map((h: any, idx: number) => ({
            id: h.id || h.holiday_date || `h-${idx + 1}`,
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
    scouts:
      Array.isArray(parsed.scouts) && parsed.scouts.length > 0
        ? parsed.scouts
        : INITIAL_SCOUTS,
    workloads:
      Array.isArray(parsed.workloads) && parsed.workloads.length > 0
        ? parsed.workloads
        : INITIAL_WORKLOAD_ITEMS,
    feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
  };
}

export function loadDatabase(forceReload = false): DatabaseState {
  const writableFile = getWritableDbFile();
  const activeFile =
    writableFile === TMP_DB_FILE && fs.existsSync(TMP_DB_FILE)
      ? TMP_DB_FILE
      : fs.existsSync(BUNDLED_DB_FILE)
      ? BUNDLED_DB_FILE
      : null;

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
// TWO-WAY ROW MAPPERS (camelCase <-> Supabase Schema)
// ============================================================================

// 1. school_info (Vertical Key-Value ↔ SchoolInfoRecord)
export const SCHOOL_INFO_KEYS_MAP: Record<string, keyof SchoolInfoRecord> = {
  'ชื่อสถานศึกษา': 'schoolName',
  'หน่วยงานต้นสังกัด': 'affiliation',
  'รหัส 10 หลัก': 'schoolCode10',
  'รหัส 8 หลัก': 'schoolCode8',
  'ชื่อระบบแอปพลิเคชัน': 'appName',
  'ชื่อผู้อำนวยการ': 'directorName',
  'ตำแหน่งผู้อำนวยการ': 'directorPosition',
  'เบอร์โทรศัพท์': 'contactPhone',
  'อีเมล': 'email',
  'ที่อยู่': 'address',
  'ละติจูด (Lat)': 'lat',
  'ลองจิจูด (Lng)': 'lng',
  'Logo Base64': 'logoBase64',
  'รักษาการคนที่ 1': 'actingDirector1',
  'รักษาการคนที่ 2': 'actingDirector2',
  'ปีการศึกษา': 'academicYear',
  'ปีงบประมาณ': 'fiscalYear',
  'ภาคเรียนปัจจุบัน': 'currentTerm',
  'จำนวนนักเรียน': 'studentCount',
  'วันที่อ้างอิงข้อมูลนักเรียน': 'studentDataDate',
};

export function schoolInfoToDb(info: Partial<SchoolInfoRecord>) {
  return {
    id: 'default',
    app_name: info.appName ?? 'ManStat',
    school_name: info.schoolName ?? '',
    affiliation: info.affiliation ?? '',
    school_code_10: info.schoolCode10 ?? '',
    school_code_8: info.schoolCode8 ?? '',
    director_name: formatStaffName(info.directorName ?? ''),
    director_position: info.directorPosition ?? 'ผู้อำนวยการโรงเรียน',
    acting_director_1: formatStaffName(info.actingDirector1 ?? ''),
    acting_director_2: formatStaffName(info.actingDirector2 ?? ''),
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
  // If row is a vertical key-value array
  if (Array.isArray(row)) {
    const res: any = { ...INITIAL_SCHOOL_INFO };
    for (const item of row) {
      const mappedKey = SCHOOL_INFO_KEYS_MAP[item.key];
      if (mappedKey) {
        if (mappedKey === 'studentCount') {
          res[mappedKey] = parseInt(item.val) || 0;
        } else if (mappedKey === 'lat' || mappedKey === 'lng') {
          res[mappedKey] = item.val ? parseFloat(item.val) : undefined;
        } else if (mappedKey === 'directorName' || mappedKey === 'actingDirector1' || mappedKey === 'actingDirector2') {
          res[mappedKey] = formatStaffName(item.val || '');
        } else {
          res[mappedKey] = item.val || '';
        }
      }
    }
    return res;
  }

  // Flat row format
  return {
    appName: row.app_name || row.appName || 'ManStat',
    schoolName: row.school_name || row.schoolName || '',
    affiliation: row.affiliation || '',
    schoolCode10: row.school_code_10 || row.schoolCode10 || '',
    schoolCode8: row.school_code_8 || row.schoolCode8 || '',
    directorName: formatStaffName(row.director_name || row.directorName || ''),
    directorPosition: row.director_position || row.directorPosition || 'ผู้อำนวยการโรงเรียน',
    actingDirector1: formatStaffName(row.acting_director_1 || row.actingDirector1 || ''),
    actingDirector2: formatStaffName(row.acting_director_2 || row.actingDirector2 || ''),
    contactPhone: row.contact_phone || row.contactPhone || '',
    email: row.email || '',
    address: row.address || '',
    lat: row.lat ? parseFloat(row.lat) : undefined,
    lng: row.lng ? parseFloat(row.lng) : undefined,
    logoBase64: row.logo_base64 || row.logoBase64 || '',
    academicYear: row.academic_year || row.academicYear || '2569',
    currentTerm: row.current_term || row.currentTerm || '2',
    fiscalYear: row.fiscal_year || row.fiscalYear || '2570',
    studentCount: Number(row.student_count ?? row.studentCount) || 0,
    studentDataDate: row.student_data_date || row.studentDataDate || '',
    activeClasses: Array.isArray(row.active_classes) ? row.active_classes : [],
  };
}

// ----------------------------------------------------------------------------
// Employment Type Helper (Separates Civil Servants vs. Contract/Support Staff)
// ----------------------------------------------------------------------------
export function deriveEmploymentType(staff: any): EmploymentType {
  const pos = (staff?.position || staff?.role || staff?.position_name || '').toLowerCase();
  const id = staff?.id || staff?.employeeCode || staff?.employee_code || '';
  if (
    id === 'TCH-014' ||
    id === 'STF-001' ||
    id === 'STF-002' ||
    pos.includes('ธุรการ') ||
    pos.includes('นักการ') ||
    pos.includes('ภารโรง') ||
    pos.includes('พี่เลี้ยง') ||
    pos.includes('ลูกจ้าง') ||
    pos.includes('จ้างเหมา')
  ) {
    return 'temporary_employee';
  }
  const raw = staff?.employment_type || staff?.employmentType;
  if (raw && ['civil_servant', 'government_employee', 'temporary_employee'].includes(raw)) {
    return raw as EmploymentType;
  }
  if (pos.includes('พนักงานราชการ')) {
    return 'government_employee';
  }
  return 'civil_servant';
}

/**
 * Normalizes staff department to prevent support staff from inheriting irrelevant academic teaching subjects
 */
export function deriveDepartment(staff: any): string {
  const pos = (staff?.position || staff?.role || staff?.position_name || '').toLowerCase();
  const id = staff?.id || staff?.employeeCode || staff?.employee_code || '';
  if (
    id === 'TCH-014' ||
    id === 'STF-001' ||
    id === 'STF-002' ||
    pos.includes('ธุรการ') ||
    pos.includes('นักการ') ||
    pos.includes('ภารโรง') ||
    pos.includes('พี่เลี้ยง') ||
    pos.includes('จ้างเหมา') ||
    pos.includes('ลูกจ้าง')
  ) {
    const dept = staff?.department || '';
    if (
      !dept ||
      dept === 'ภาษาไทย' ||
      dept.includes('สังคมศึกษา') ||
      dept.includes('คณิตศาสตร์') ||
      dept.includes('วิทยาศาสตร์') ||
      dept.includes('ศิลปะ') ||
      dept.includes('ภาษาต่างประเทศ') ||
      dept.includes('การศึกษาปฐมวัย')
    ) {
      return 'สายงานบริหารและสนับสนุนการศึกษา';
    }
  }
  return staff?.department || '';
}

// 2. teachers (PK: id)
export function teacherToDb(t: TeacherRecord) {
  const accessLevel =
    t.accessLevel === 'Superuser' || t.accessLevel === 'Admin' || t.accessLevel === 'User'
      ? t.accessLevel
      : 'User';

  const systemRole = mapAccessLevelToRole(accessLevel);

  // Position preservation: if t.position is specified, use it.
  // If not, check if t.role has a Thai position title (i.e. not a system role).
  const positionTitle =
    t.position && t.position.trim() !== '' && !['superuser', 'director', 'hr_admin', 'teacher'].includes(t.position)
      ? t.position
      : t.role && !['superuser', 'director', 'hr_admin', 'teacher'].includes(t.role)
      ? t.role
      : 'ครู';

  const id = t.id || t.employeeCode;
  const formattedName = formatStaffName(t);
  let prefix = t.prefix || '';
  let firstName = t.firstName || '';
  let lastName = t.lastName || '';
  if (!prefix || !firstName) {
    const parsed = parseThaiName(formattedName, prefix);
    if (!prefix) prefix = parsed.prefix;
    if (!firstName) firstName = parsed.firstName;
    if (!lastName) lastName = parsed.lastName;
  }

  const cleanStr = (v?: string | null) => (v && v.trim() !== '' ? v.trim() : null);

  const normalizedMemberType = cleanStr(t.khurusaphaMemberType) || (t.memberId ? 'สมาชิกสามัญ' : null);
  const normalizedMemberNo =
    normalizedMemberType === 'ไม่เป็นสมาชิก'
      ? null
      : cleanStr(t.khurusaphaMemberNo) || cleanStr(t.memberId);

  return {
    id,
    employee_code: t.employeeCode || id,
    name: formattedName,
    prefix,
    first_name: firstName,
    last_name: lastName,
    position: positionTitle,
    academic_standing: t.academicStanding || '-',
    employment_type: t.employment_type || (t as any).employmentType || deriveEmploymentType(t),
    department: deriveDepartment(t),
    division: t.division || '',
    major: cleanStr(t.major),
    class_level: t.classLevel || '-',
    duty_day: t.dutyDay || '-',
    access_level: accessLevel,
    role: positionTitle, // Preserve Thai position title in legacy role column! NEVER overwrite with system roles ('superuser'|'hr_admin'|'teacher')
    system_role: systemRole,
    start_date: t.startDate || '',
    current_position_date: cleanStr(t.currentPositionDate),
    birth_date: cleanStr(t.birthDate),
    emergency_contact_name: cleanStr(t.emergencyContactName),
    emergency_contact_relation: cleanStr(t.emergencyContactRelation),
    emergency_contact_phone: cleanStr(t.emergencyContactPhone),
    address_house_no: cleanStr(t.addressHouseNo),
    address_moo: cleanStr(t.addressMoo),
    address_soi_road: cleanStr(t.addressSoiRoad),
    address_subdistrict: cleanStr(t.addressSubdistrict),
    address_district: cleanStr(t.addressDistrict),
    address_province: cleanStr(t.addressProvince),
    address_postal_code: cleanStr(t.addressPostalCode),
    khurusapha_member_type: normalizedMemberType,
    khurusapha_member_no: normalizedMemberNo,
    education_level: cleanStr(t.educationLevel),
    education_program_years: cleanStr(t.educationProgramYears),
    education_degree: cleanStr(t.educationDegree),
    education_institution: cleanStr(t.educationInstitution),
    education_grad_year: cleanStr(t.educationGradYear),
    email: t.email || '',
    phone: t.phone || '',
    masked_citizen_id: t.maskedCitizenId || '',
    id_card: t.idCard || '',
    position_no: t.positionNo || '',
    member_id: normalizedMemberNo || '',
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
  const accessLevel =
    row.access_level === 'Superuser' || row.access_level === 'Admin' || row.access_level === 'User'
      ? row.access_level
      : 'User';

  // System role is strictly derived from access_level or system_role column.
  // NEVER blindly trust row.role because in existing Supabase tables, row.role stores Thai position titles!
  const systemRole =
    row.system_role && ['superuser', 'director', 'hr_admin', 'teacher'].includes(row.system_role)
      ? row.system_role
      : mapAccessLevelToRole(accessLevel);

  // Position is derived from position column, falling back to legacy role column if it contains a Thai title.
  const position =
    row.position && row.position.trim() !== '' && !['superuser', 'director', 'hr_admin', 'teacher'].includes(row.position)
      ? row.position
      : row.role && !['superuser', 'director', 'hr_admin', 'teacher'].includes(row.role)
      ? row.role
      : (row.position || 'ครู');

  const formattedName = formatStaffName({
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name || '',
    prefix: row.prefix,
    firstName: row.first_name,
    lastName: row.last_name,
  });

  let prefix = row.prefix || '';
  let firstName = row.first_name || '';
  let lastName = row.last_name || '';

  if (!prefix || !firstName) {
    const parsed = parseThaiName(formattedName, prefix);
    if (!prefix) prefix = parsed.prefix;
    if (!firstName) firstName = parsed.firstName;
    if (!lastName) lastName = parsed.lastName;
  }

  return {
    id: row.id,
    employeeCode: row.employee_code || row.id,
    name: formattedName,
    prefix,
    firstName,
    lastName,
    position,
    academicStanding: row.academic_standing || '-',
    employment_type: deriveEmploymentType(row),
    employmentType: deriveEmploymentType(row),
    department: deriveDepartment(row),
    division: row.division || '',
    major: row.major || '',
    classLevel: row.class_level || '-',
    dutyDay: row.duty_day || '-',
    accessLevel,
    role: systemRole,
    startDate: row.start_date || '',
    currentPositionDate: row.current_position_date || '',
    birthDate: row.birth_date || '',
    emergencyContactName: row.emergency_contact_name || '',
    emergencyContactRelation: row.emergency_contact_relation || '',
    emergencyContactPhone: row.emergency_contact_phone || '',
    addressHouseNo: row.address_house_no || '',
    addressMoo: row.address_moo || '',
    addressSoiRoad: row.address_soi_road || '',
    addressSubdistrict: row.address_subdistrict || '',
    addressDistrict: row.address_district || '',
    addressProvince: row.address_province || '',
    addressPostalCode: row.address_postal_code || '',
    khurusaphaMemberType: row.khurusapha_member_type || (row.member_id ? 'สมาชิกสามัญ' : ''),
    khurusaphaMemberNo: row.khurusapha_member_no || row.member_id || '',
    educationLevel: row.education_level || '',
    educationProgramYears: row.education_program_years || '',
    educationDegree: row.education_degree || '',
    educationInstitution: row.education_institution || '',
    educationGradYear: row.education_grad_year || '',
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

// 3. board_members (PK: member_id)
export function boardMemberToDb(b: BoardMemberRecord) {
  const memberId = b.id || (b as any).member_id || `SBD-${Date.now()}`;
  const validEndReasons = ['', 'ย้าย', 'ลาออก', 'เกษียณอายุราชการ'];
  const endReason = validEndReasons.includes(b.endReason || '') ? (b.endReason || '') : '';
  const boardPosition = b.position || (b as any).board_position || 'EXPERT';
  const positionTitle =
    b.positionTitle ||
    BOARD_POSITIONS_MAP[boardPosition] ||
    'กรรมการสถานศึกษา';

  const isExOfficio =
    b.isExOfficio !== undefined
      ? Boolean(b.isExOfficio)
      : boardPosition === 'DIRECTOR_SEC';

  const toNullableDate = (val?: string | null): string | null => {
    if (!val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  };

  const normalizedAppointmentDate = toNullableDate(b.appointmentDate || (b as any).start_date);
  const normalizedStartDate = toNullableDate((b as any).start_date || b.appointmentDate);
  const normalizedEndDate = toNullableDate(b.endDate);

  return {
    member_id: memberId,
    full_name: formatStaffName(b.fullName || ''),
    prefix: (b as any).prefix || '',
    first_name: (b as any).firstName || '',
    last_name: (b as any).lastName || '',
    board_position: boardPosition,
    position_title: positionTitle,
    occupation: b.occupation || '-',
    organization: b.organization || '-',
    phone: b.phone || '-',
    status: b.status || 'ดำรงตำแหน่ง',
    term_number: Number(b.termNumber) || 1,
    is_ex_officio: isExOfficio,
    appointment_date: normalizedAppointmentDate,
    start_date: normalizedStartDate,
    end_date: normalizedEndDate,
    end_reason: endReason || null,
  };
}

export function boardMemberFromDb(row: any): BoardMemberRecord {
  const position = row.board_position || row.position || 'EXPERT';
  const positionTitle =
    row.position_title ||
    BOARD_POSITIONS_MAP[position] ||
    'กรรมการสถานศึกษา';

  const isExOfficio =
    row.is_ex_officio !== undefined
      ? Boolean(row.is_ex_officio)
      : position === 'DIRECTOR_SEC' || (row.remark && row.remark.includes('โดยตำแหน่ง'));

  return {
    id: row.member_id || row.id,
    fullName: formatStaffName(row.full_name || row.fullName || '-'),
    position,
    positionTitle,
    occupation: row.occupation || '-',
    organization: row.organization || '-',
    phone: row.phone || '-',
    status: row.status || 'ดำรงตำแหน่ง',
    termNumber: Number(row.term_number ?? row.termNumber ?? 1),
    isExOfficio,
    appointmentDate: row.appointment_date || row.start_date || '',
    endDate: row.end_date || '',
    endReason: row.end_reason || '',
  };
}

// 4. holidays (PK: holiday_date)
export function holidayToDb(h: HolidayRecord) {
  const date = h.date || (h as any).holiday_date;
  const name = h.name || (h as any).reason_type || 'วันหยุดราชการ';
  return {
    holiday_date: date,
    reason_type: name,
    name,
    type: h.type || 'วันหยุดราชการประจำปี',
    id: h.id || date,
  };
}

export function holidayFromDb(row: any): HolidayRecord {
  const date = row.holiday_date || row.date || '';
  const name = row.reason_type || row.name || 'วันหยุดราชการ';
  return {
    id: row.id || date,
    date,
    name,
    type: row.type || 'วันหยุดราชการประจำปี',
  };
}

// 5. leave_logs / leave_requests (PK: leave_id)
export function leaveRequestToDb(r: LeaveRequestRecord) {
  const leaveId = r.id || `LEV-${Date.now()}`;
  return {
    leave_id: leaveId,
    id: leaveId,
    doc_no: r.docNo || '',
    emp_id: r.teacherId,
    teacher_id: r.teacherId,
    full_name: r.teacherName,
    teacher_name: formatStaffName(r.teacherName),
    position: r.position || '',
    department: r.department || '',
    leave_type: r.leaveType,
    leave_type_name: r.leaveTypeName,
    start_date: r.startDate,
    end_date: r.endDate,
    total_days: Number(r.totalDays) || 0,
    start_time: r.startTime || '-',
    end_time: r.endTime || '-',
    total_hours: Number(r.totalHours) || 0,
    place: r.place || r.destination || '',
    reason: r.reason || '',
    substitute_info: r.substituteTeacherName ? formatStaffName(r.substituteTeacherName) : 'ไม่มีคาบสอน',
    substitute_teacher_name: r.substituteTeacherName ? formatStaffName(r.substituteTeacherName) : '',
    workload_json: r.workloadJson || r.workloads || [],
    status: r.status || 'pending',
    current_step: String(r.currentStep ?? '1'),
    supervisor_remark: r.supervisorRemark || '',
    director_remark: r.directorRemark || '',
    submitted_at: r.submittedAt || new Date().toISOString(),
  };
}

export function leaveRequestFromDb(row: any): LeaveRequestRecord {
  const id = row.leave_id || row.id;
  const teacherId = row.emp_id || row.teacher_id || '';
  const teacherName = formatStaffName(row.full_name || row.teacher_name || '');

  return {
    id,
    docNo: row.doc_no || '',
    teacherId,
    teacherName,
    position: row.position || '',
    department: row.department || '',
    leaveType: row.leave_type,
    leaveTypeName: row.leave_type_name || row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays: Number(row.total_days) || 0,
    startTime: row.start_time || null,
    endTime: row.end_time || null,
    totalHours: Number(row.total_hours) || 0,
    place: row.place || '',
    destination: row.place || '',
    reason: row.reason || '',
    substituteTeacherName: formatStaffName(row.substitute_teacher_name || row.substitute_info || ''),
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
// ZERO-OVERWRITE SEEDING (ensureSupabaseSeeded)
// ============================================================================

let isSeededChecked = false;

export async function ensureSupabaseSeeded(): Promise<void> {
  if (isSeededChecked) return;
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getSupabaseAdmin();

    // Check existing count of teachers
    const { count, error } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    if (!error && count !== null && count > 0) {
      // Existing data exists! NEVER overwrite existing Supabase data!
      console.warn(`[ensureSupabaseSeeded] Existing teachers found (${count} rows). Skipping seeding to preserve Supabase data.`);
      isSeededChecked = true;
      return;
    }

    // Only seed if teachers table is completely empty (0 rows)
    if (count === 0) {
      console.warn('[ensureSupabaseSeeded] Supabase database has 0 teachers. Seeding initial data from local JSON...');
      const localData = loadDatabase();

      // Seed teachers
      if (localData.teachers.length > 0) {
        await supabase.from('teachers').upsert(localData.teachers.map(teacherToDb), { onConflict: 'id' });
      }

      // Seed board_members
      if (localData.boardMembers.length > 0) {
        await supabase.from('board_members').upsert(localData.boardMembers.map(boardMemberToDb), { onConflict: 'member_id' });
      }

      // Seed holidays
      if (localData.holidays.length > 0) {
        await supabase.from('holidays').upsert(localData.holidays.map(holidayToDb), { onConflict: 'holiday_date' });
      }

      // Seed system_settings
      await supabase.from('system_settings').upsert(systemSettingsToDb(localData.settings), { onConflict: 'id' });

      console.warn('[ensureSupabaseSeeded] Initial seeding completed successfully.');
    }

    isSeededChecked = true;
  } catch (seedErr: any) {
    console.error('[ensureSupabaseSeeded] Error checking/seeding Supabase data:', seedErr);
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

    // 1. Check backward-compatible view: v_school_info_current
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('v_school_info_current')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!viewError && viewData) {
        return {
          ...INITIAL_SCHOOL_INFO,
          schoolName: viewData.schoolName ?? INITIAL_SCHOOL_INFO.schoolName,
          affiliation: viewData.affiliation ?? INITIAL_SCHOOL_INFO.affiliation,
          schoolCode10: viewData.schoolCode10 ?? INITIAL_SCHOOL_INFO.schoolCode10,
          schoolCode8: viewData.schoolCode8 ?? INITIAL_SCHOOL_INFO.schoolCode8,
          appName: viewData.appName ?? INITIAL_SCHOOL_INFO.appName,
          directorName: viewData.directorName ?? INITIAL_SCHOOL_INFO.directorName,
          directorPosition: viewData.directorPosition ?? INITIAL_SCHOOL_INFO.directorPosition,
          contactPhone: viewData.contactPhone ?? INITIAL_SCHOOL_INFO.contactPhone,
          email: viewData.email ?? INITIAL_SCHOOL_INFO.email,
          address: viewData.address ?? INITIAL_SCHOOL_INFO.address,
          lat: viewData.lat != null ? Number(viewData.lat) : INITIAL_SCHOOL_INFO.lat,
          lng: viewData.lng != null ? Number(viewData.lng) : INITIAL_SCHOOL_INFO.lng,
          logoBase64: viewData.logoBase64 ?? INITIAL_SCHOOL_INFO.logoBase64,
          actingDirector1: viewData.actingDirector1 ?? INITIAL_SCHOOL_INFO.actingDirector1,
          actingDirector2: viewData.actingDirector2 ?? INITIAL_SCHOOL_INFO.actingDirector2,
          academicYear: viewData.academicYear ?? INITIAL_SCHOOL_INFO.academicYear,
          fiscalYear: viewData.fiscalYear ?? INITIAL_SCHOOL_INFO.fiscalYear,
          currentTerm: viewData.currentTerm ?? INITIAL_SCHOOL_INFO.currentTerm,
          studentCount: viewData.studentCount != null ? Number(viewData.studentCount) : INITIAL_SCHOOL_INFO.studentCount,
          studentDataDate: viewData.studentDataDate ?? INITIAL_SCHOOL_INFO.studentDataDate,
          activeClasses: Array.isArray(viewData.activeClasses) ? viewData.activeClasses : INITIAL_SCHOOL_INFO.activeClasses,
          activeAcademicYearId: viewData.activeAcademicYearId,
          primaryCensusId: viewData.primaryCensusId,
          censusRoundCode: viewData.censusRoundCode,
          activeFiscalPeriodId: viewData.activeFiscalPeriodId,
          fiscalRoundNo: viewData.fiscalRoundNo,
        };
      }
    } catch {
      // Fallback to legacy school_info table query
    }

    // 2. Fallback: Check if school_info is vertical key-value or flat
    const { data: rawRows, error } = await supabase.from('school_info').select('*');
    if (error) {
      console.error('[dbGetSchoolInfo] Supabase query error:', error);
      throw new Error(`ไม่สามารถดึงข้อมูลสถานศึกษาจาก Supabase ได้: ${error.message}`);
    }

    if (Array.isArray(rawRows) && rawRows.length > 0) {
      // Check if vertical (has 'key' column)
      if (rawRows[0].key !== undefined) {
        const parsedInfo = schoolInfoFromDb(rawRows);
        // Also fetch active_classes from active_classes table if available
        const { data: classesData } = await supabase.from('active_classes').select('class_name').order('id', { ascending: true });
        if (Array.isArray(classesData) && classesData.length > 0) {
          parsedInfo.activeClasses = classesData.map((c: any) => c.class_name);
        }
        return parsedInfo;
      }
      // If flat row
      return schoolInfoFromDb(rawRows[0]);
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

    // Check table format
    const { data: testRows } = await supabase.from('school_info').select('*').limit(1);
    const isVertical = Array.isArray(testRows) && testRows.length > 0 && testRows[0].key !== undefined;

    if (isVertical) {
      // Upsert vertical key-value rows
      const verticalEntries: Array<{ key: string; val: string }> = [
        { key: 'ชื่อสถานศึกษา', val: merged.schoolName },
        { key: 'หน่วยงานต้นสังกัด', val: merged.affiliation },
        { key: 'รหัส 10 หลัก', val: merged.schoolCode10 },
        { key: 'รหัส 8 หลัก', val: merged.schoolCode8 },
        { key: 'ชื่อระบบแอปพลิเคชัน', val: merged.appName || 'ManStat' },
        { key: 'ชื่อผู้อำนวยการ', val: merged.directorName },
        { key: 'ตำแหน่งผู้อำนวยการ', val: merged.directorPosition },
        { key: 'เบอร์โทรศัพท์', val: merged.contactPhone },
        { key: 'อีเมล', val: merged.email },
        { key: 'ที่อยู่', val: merged.address },
        { key: 'ละติจูด (Lat)', val: merged.lat != null ? String(merged.lat) : '' },
        { key: 'ลองจิจูด (Lng)', val: merged.lng != null ? String(merged.lng) : '' },
        { key: 'Logo Base64', val: merged.logoBase64 || '' },
        { key: 'รักษาการคนที่ 1', val: merged.actingDirector1 },
        { key: 'รักษาการคนที่ 2', val: merged.actingDirector2 },
        { key: 'ปีการศึกษา', val: merged.academicYear },
        { key: 'ปีงบประมาณ', val: merged.fiscalYear },
        { key: 'ภาคเรียนปัจจุบัน', val: merged.currentTerm },
        { key: 'จำนวนนักเรียน', val: String(merged.studentCount || 0) },
        { key: 'วันที่อ้างอิงข้อมูลนักเรียน', val: merged.studentDataDate || '' },
      ];

      for (const entry of verticalEntries) {
        const { error: upErr } = await supabase.from('school_info').upsert(entry, { onConflict: 'key' });
        if (upErr) {
          throw new Error(`ไม่สามารถบันทึกข้อมูล ${entry.key} ลง Supabase ได้: ${upErr.message}`);
        }
      }

      // Sync active_classes table if updated
      if (Array.isArray(info.activeClasses)) {
        for (const cls of info.activeClasses) {
          await supabase.from('active_classes').upsert({ class_name: cls }, { onConflict: 'class_name' });
        }
      }

      return merged;
    } else {
      // Flat table format
      const { data, error } = await supabase
        .from('school_info')
        .upsert(schoolInfoToDb(merged), { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[dbSaveSchoolInfo] Supabase upsert error:', error);
        throw new Error(`ไม่สามารถบันทึกข้อมูลสถานศึกษาลง Supabase ได้: ${error.message}`);
      }

      // Synchronize offered_grades to active academic year in Supabase
      if (Array.isArray(merged.activeClasses)) {
        try {
          const { data: activeYear } = await supabase
            .from('academic_years')
            .select('id')
            .eq('school_id', merged.schoolCode8 || '30030099')
            .eq('is_active', true)
            .single();
          if (activeYear?.id) {
            await supabase
              .from('academic_years')
              .update({
                offered_grades: merged.activeClasses,
                updated_at: new Date().toISOString(),
              })
              .eq('id', activeYear.id);
          }
        } catch (syncErr) {
          console.warn('[dbSaveSchoolInfo] Failed to sync offered_grades to active academic year:', syncErr);
        }
      }

      return schoolInfoFromDb(data);
    }
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.schoolInfo = {
    ...db.schoolInfo,
    ...info,
    activeClasses: Array.isArray(info.activeClasses) ? info.activeClasses : db.schoolInfo.activeClasses,
  };
  // Synchronize offeredGrades to active academic year in local DB
  if (Array.isArray(info.activeClasses) && db.academicYears) {
    const activeYear = db.academicYears.find((y) => y.isActive);
    if (activeYear) {
      activeYear.offeredGrades = info.activeClasses;
    }
  }
  saveDatabase(db);
  return db.schoolInfo;
}

// ----------------------------------------------------------------------------
// 2. TEACHERS (PK: id)
// ----------------------------------------------------------------------------
export async function dbGetTeachers(): Promise<TeacherRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('teachers').select('*').order('id', { ascending: true });
    if (error) {
      console.error('[dbGetTeachers] Supabase query error:', error);
      throw new Error(`ไม่สามารถดึงข้อมูลบุคลากรจาก Supabase ได้: ${error.message}`);
    }
    const teachers = (data || []).map(teacherFromDb);

    // Hydrate licenses from history_licenses or INITIAL_TEACHERS if Supabase teachers table has empty licenses
    try {
      const anyTeacherHasLicenses = teachers.some((t) => t.licenses && t.licenses.length > 0);
      if (!anyTeacherHasLicenses) {
        const { data: licRows } = await supabase.from('history_licenses').select('*');
        if (Array.isArray(licRows) && licRows.length > 0) {
          const licMap = new Map<string, any[]>();
          licRows.forEach((r: any) => {
            const empId = r.emp_id || r.teacher_id;
            if (empId) {
              if (!licMap.has(empId)) licMap.set(empId, []);
              licMap.get(empId)!.push({
                category: r.license_category || 'ครู',
                type: r.license_type || 'ใบอนุญาตประกอบวิชาชีพครู',
                number: r.license_number || '',
                issueDate: r.issue_date || '',
                expiryDate: r.expiry_date || '',
              });
            }
          });
          teachers.forEach((t) => {
            if ((!t.licenses || t.licenses.length === 0) && licMap.has(t.id)) {
              t.licenses = licMap.get(t.id)!;
            }
          });
        }
      }
    } catch (e) {
      console.warn('[dbGetTeachers] history_licenses hydration fallback skipped:', e);
    }

    // Ensure seed teachers (like EXE-001) always have their initial licenses if still empty
    teachers.forEach((t) => {
      if (!t.licenses || t.licenses.length === 0) {
        const seedT = INITIAL_TEACHERS.find((st) => st.id === t.id);
        if (seedT && seedT.licenses && seedT.licenses.length > 0) {
          t.licenses = seedT.licenses;
        }
      }
    });

    return teachers;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  (db.teachers || []).forEach((t: any) => {
    if (!t.licenses || t.licenses.length === 0) {
      const seedT = INITIAL_TEACHERS.find((st) => st.id === t.id);
      if (seedT && seedT.licenses && seedT.licenses.length > 0) {
        t.licenses = seedT.licenses;
      }
    }
  });
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

    // Keep history_licenses in sync if configured
    if (Array.isArray(teacher.licenses) && teacher.licenses.length > 0) {
      try {
        for (let i = 0; i < teacher.licenses.length; i++) {
          const lic = teacher.licenses[i];
          const recId = `LIC-${teacher.id}-${i + 1}`;
          await supabase.from('history_licenses').upsert(
            {
              record_id: recId,
              emp_id: teacher.id,
              license_category: lic.category,
              license_type: lic.type,
              license_number: lic.number,
              issue_date: lic.issueDate,
              expiry_date: lic.expiryDate,
              timestamp: new Date().toISOString(),
            },
            { onConflict: 'record_id' }
          );
        }
      } catch (licSyncErr) {
        console.warn('[dbUpsertTeacher] Note: could not sync to history_licenses:', licSyncErr);
      }
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
// 3. BOARD MEMBERS (PK: member_id)
// ----------------------------------------------------------------------------
export async function dbGetBoardMembers(): Promise<BoardMemberRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('board_members').select('*').order('term_number', { ascending: true });
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
      .upsert(row, { onConflict: 'member_id' })
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
  const memberId = member.id || (member as any).member_id;
  const existingIndex = db.boardMembers.findIndex(
    (b) => b.id === memberId || (b as any).member_id === memberId
  );
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
    // Delete by member_id
    const { error } = await supabase.from('board_members').delete().eq('member_id', id);
    if (error) {
      console.error('[dbDeleteBoardMember] Supabase delete error:', error);
      throw new Error(`ไม่สามารถลบคณะกรรมการสถานศึกษาจาก Supabase ได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.boardMembers = (db.boardMembers || []).filter((b) => b.id !== id && (b as any).member_id !== id);
  saveDatabase(db);
  return true;
}

// ----------------------------------------------------------------------------
// 4. HOLIDAYS (PK: holiday_date)
// ----------------------------------------------------------------------------
export async function dbGetHolidays(): Promise<HolidayRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: true });
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
      .upsert(row, { onConflict: 'holiday_date' })
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
    // Delete by holiday_date or id
    const { error } = await supabase.from('holidays').delete().eq('holiday_date', id);
    if (error) {
      console.error('[dbDeleteHoliday] Supabase delete error:', error);
      throw new Error(`ไม่สามารถลบวันหยุดจาก Supabase ได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.holidays = db.holidays.filter((h) => h.id !== id && h.date !== id);
  saveDatabase(db);
  return true;
}

// ----------------------------------------------------------------------------
// 5. LEAVE REQUESTS (leave_logs / leave_requests)
// ----------------------------------------------------------------------------
export async function dbGetLeaveRequests(status?: string): Promise<LeaveRequestRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();

    // Prioritize leave_logs table, fallback to leave_requests
    let targetTable = 'leave_logs';
    let query = supabase.from(targetTable).select('*').order('start_date', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    let { data, error } = await query;

    if (error && error.message.includes('leave_logs')) {
      targetTable = 'leave_requests';
      let fbQuery = supabase.from(targetTable).select('*').order('created_at', { ascending: false });
      if (status) fbQuery = fbQuery.eq('status', status);
      const fbRes = await fbQuery;
      data = fbRes.data;
      error = fbRes.error;
    }

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

    // Try leave_logs first
    let { data, error } = await supabase
      .from('leave_logs')
      .upsert(row, { onConflict: 'leave_id' })
      .select()
      .single();

    if (error && error.message.includes('leave_logs')) {
      const fbRes = await supabase
        .from('leave_requests')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();
      data = fbRes.data;
      error = fbRes.error;
    }

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
    let { error } = await supabase.from('leave_logs').delete().eq('leave_id', id);
    if (error && error.message.includes('leave_logs')) {
      const fbRes = await supabase.from('leave_requests').delete().eq('id', id);
      error = fbRes.error;
    }
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
  const logs = [...(db.auditLogs || [])];
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return logs.slice(0, limit);
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

// ============================================================================
// 8. SCOUT QUALIFICATIONS DATABASE ENGINE (history_scout & teachers)
// ============================================================================

export function scoutFromDb(row: any, teachers: TeacherRecord[] = []): ScoutRecord {
  const teacher = teachers.find(
    (t) => t.id === row.emp_id || (t.employeeCode && t.employeeCode === row.emp_id)
  );

  return {
    id: row.record_id || row.id || `SCT-${Date.now()}`,
    teacherId: row.emp_id || row.teacher_id || teacher?.id || 'TCH-001',
    teacherName: teacher?.name || row.teacher_name || 'ไม่ระบุชื่อ',
    position: teacher?.position || row.position || 'ครู',
    qualification: row.scout_qualification || row.qualification || 'ลูกเสือ',
    badgeLevel: row.scout_type || row.badge_level || 'ทั่วไป',
    category: row.scout_position || row.category || 'ผู้บังคับบัญชาลูกเสือ',
    issueDate: row.approved_year || row.issue_date || '',
    certificateNo: row.cert_number || row.certificate_no || '',
    issuedBy: row.issued_by || 'สำนักงานลูกเสือแห่งชาติ',
    orderNumber: row.order_number || '',
  };
}

export function scoutToDb(s: ScoutRecord) {
  return {
    record_id: s.id,
    emp_id: s.teacherId,
    scout_qualification: s.qualification,
    scout_type: s.badgeLevel,
    scout_position: s.category,
    cert_number: s.certificateNo,
    approved_year: s.issueDate,
    order_number: s.orderNumber || '',
    issued_by: s.issuedBy || 'สำนักงานลูกเสือแห่งชาติ',
    timestamp: new Date().toISOString(),
  };
}

export async function dbGetScouts(): Promise<ScoutRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const teachers = await dbGetTeachers();
    const { data, error } = await supabase.from('history_scout').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r: any) => scoutFromDb(r, teachers));
    }
    // Also include scout data from teachers if history_scout table is empty
    const scoutsFromTeachers: ScoutRecord[] = teachers
      .filter((t: any) => t.highestScout && t.highestScout !== 'ไม่มีวุฒิลูกเสือ' && t.highestScout !== '-')
      .map((t: any, idx: number) => ({
        id: `SCT-${t.id || idx + 1}`,
        teacherId: t.id,
        teacherName: t.name,
        position: t.position,
        qualification: t.highestScout,
        badgeLevel: t.highestScout.includes('ท่อน') ? t.highestScout.split('(')[0].trim() : t.highestScout,
        category: 'ผู้บังคับบัญชาลูกเสือ',
        issueDate: '',
        certificateNo: t.scoutCertNo || '',
        issuedBy: 'สำนักงานลูกเสือแห่งชาติ',
        orderNumber: '',
      }));
    return scoutsFromTeachers;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (Array.isArray(db.scouts) && db.scouts.length > 0) {
    return db.scouts;
  }
  const localTeachers = (db.teachers || []) as any[];
  const localScoutsFromTeachers: ScoutRecord[] = localTeachers
    .filter((t: any) => t.highestScout && t.highestScout !== 'ไม่มีวุฒิลูกเสือ' && t.highestScout !== '-')
    .map((t: any, idx: number) => ({
      id: `SCT-${t.id || idx + 1}`,
      teacherId: t.id,
      teacherName: t.name,
      position: t.position,
      qualification: t.highestScout,
      badgeLevel: t.highestScout.includes('ท่อน') ? t.highestScout.split('(')[0].trim() : t.highestScout,
      category: 'ผู้บังคับบัญชาลูกเสือ',
      issueDate: '',
      certificateNo: t.scoutCertNo || '',
      issuedBy: 'สำนักงานลูกเสือแห่งชาติ',
      orderNumber: '',
    }));
  return localScoutsFromTeachers;
}

async function syncHighestScoutToTeacherSupabase(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  teacherKey: string,
  teachers: TeacherRecord[]
): Promise<{ highestScout: string; scoutCertNo: string; teacherId: string }> {
  const owner = teachers.find(
    (t) => t.id === teacherKey || (t.employeeCode && t.employeeCode === teacherKey)
  );
  const candidateKeys = Array.from(
    new Set([teacherKey, owner?.id, owner?.employeeCode].filter((k): k is string => Boolean(k)))
  );

  const { data: remainingRows, error: fetchErr } = await supabase
    .from('history_scout')
    .select('*')
    .in('emp_id', candidateKeys);

  if (fetchErr) {
    console.error('[syncHighestScoutToTeacherSupabase] fetch remaining error:', fetchErr);
  }

  const remainingScouts = Array.isArray(remainingRows)
    ? remainingRows.map((r: any) => scoutFromDb(r, teachers))
    : [];

  const resolved = resolveHighestScout(remainingScouts);

  const orFilter = candidateKeys
    .map((k) => `id.eq.${k},employee_code.eq.${k}`)
    .join(',');

  if (orFilter) {
    const { error: updateErr } = await supabase
      .from('teachers')
      .update({
        highest_scout: resolved.highestScout,
        scout_cert_no: resolved.scoutCertNo,
      })
      .or(orFilter);

    if (updateErr) {
      console.error('[syncHighestScoutToTeacherSupabase] teachers update error:', updateErr);
    }
  }

  return {
    highestScout: resolved.highestScout,
    scoutCertNo: resolved.scoutCertNo,
    teacherId: owner?.id || teacherKey,
  };
}

export async function dbUpsertScout(scout: ScoutRecord): Promise<ScoutRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const dbRow = scoutToDb(scout);
    const { data, error } = await supabase
      .from('history_scout')
      .upsert(dbRow, { onConflict: 'record_id' })
      .select()
      .single();

    if (error) {
      console.error('[dbUpsertScout] Supabase upsert error:', error);
      throw new Error(`ไม่สามารถบันทึกข้อมูลวุฒิลูกเสือลง Supabase ได้: ${error.message}`);
    }

    const teachers = await dbGetTeachers();
    if (scout.teacherId) {
      await syncHighestScoutToTeacherSupabase(supabase, scout.teacherId, teachers);
    }

    return scoutFromDb(data, teachers);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const currentScouts = db.scouts || INITIAL_SCOUTS;
  const existingIdx = currentScouts.findIndex((s) => s.id === scout.id);
  if (existingIdx >= 0) {
    currentScouts[existingIdx] = scout;
  } else {
    currentScouts.push(scout);
  }
  db.scouts = currentScouts;

  if (scout.teacherId && Array.isArray(db.teachers)) {
    const owner = db.teachers.find(
      (t) => t.id === scout.teacherId || t.employeeCode === scout.teacherId
    );
    const ownerScouts = currentScouts.filter(
      (s) =>
        s.teacherId === scout.teacherId ||
        (owner && (s.teacherId === owner.id || s.teacherId === owner.employeeCode))
    );
    const resolved = resolveHighestScout(ownerScouts);
    if (owner) {
      owner.highestScout = resolved.highestScout;
      owner.scoutCertNo = resolved.scoutCertNo;
    }
  }

  saveDatabase(db);
  return scout;
}

export interface DeleteScoutResult {
  deleted: boolean;
  teacherId?: string;
  highestScout: string;
  scoutCertNo: string;
}

export async function dbDeleteScout(id: string): Promise<DeleteScoutResult> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();

    // 1. Identify owning staff key before deleting the row
    const { data: targetRow } = await supabase
      .from('history_scout')
      .select('emp_id')
      .eq('record_id', id)
      .maybeSingle();

    const owningEmpId: string | undefined = targetRow?.emp_id || undefined;

    // 2. Delete the target scout row
    const { error } = await supabase.from('history_scout').delete().eq('record_id', id);
    if (error) {
      console.error('[dbDeleteScout] Supabase delete error:', error);
      throw new Error(`ไม่สามารถลบข้อมูลวุฒิลูกเสือจาก Supabase ได้: ${error.message}`);
    }

    // 3. Recalculate remaining highest scout & sync back to public.teachers
    if (owningEmpId) {
      const teachers = await dbGetTeachers();
      const synced = await syncHighestScoutToTeacherSupabase(supabase, owningEmpId, teachers);
      return {
        deleted: true,
        teacherId: synced.teacherId,
        highestScout: synced.highestScout,
        scoutCertNo: synced.scoutCertNo,
      };
    }

    return {
      deleted: true,
      highestScout: EMPTY_HIGHEST_SCOUT,
      scoutCertNo: '',
    };
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const currentScouts = db.scouts || INITIAL_SCOUTS;
  const targetScout = currentScouts.find((s) => s.id === id);
  const owningTeacherId = targetScout?.teacherId;

  const remainingAll = currentScouts.filter((s) => s.id !== id);
  db.scouts = remainingAll;

  let resolved = { highestScout: EMPTY_HIGHEST_SCOUT, scoutCertNo: '' };
  if (owningTeacherId && Array.isArray(db.teachers)) {
    const owner = db.teachers.find(
      (t) => t.id === owningTeacherId || t.employeeCode === owningTeacherId
    );
    const ownerRemaining = remainingAll.filter(
      (s) =>
        s.teacherId === owningTeacherId ||
        (owner && (s.teacherId === owner.id || s.teacherId === owner.employeeCode))
    );
    resolved = resolveHighestScout(ownerRemaining);
    if (owner) {
      owner.highestScout = resolved.highestScout;
      owner.scoutCertNo = resolved.scoutCertNo;
    }
  }

  saveDatabase(db);
  return {
    deleted: true,
    teacherId: owningTeacherId,
    highestScout: resolved.highestScout,
    scoutCertNo: resolved.scoutCertNo,
  };
}

// ============================================================================
// 9. WORKLOADS & PA DATABASE ENGINE (staff_workloads)
// ============================================================================

export function workloadFromDb(row: any): WorkloadItem {
  return {
    id: row.workload_id || row.id || `WL-${Date.now()}`,
    teacherId: row.emp_id || row.teacher_id || 'TCH-001',
    category: (row.category || 'งานสอนและการจัดการเรียนรู้') as WorkloadCategory,
    title: row.title || '',
    subGroupOrLevel: row.sub_group_or_level || '',
    hoursPerWeek: Number(row.hours_per_week) || 0,
    roleInTask: row.role_in_task || 'ผู้รับผิดชอบหลัก',
    orderOrRef: row.order_or_ref || '',
    status: (row.status || 'กำลังดำเนินการ') as WorkloadItem['status'],
    coEmp: row.co_emp_ids || '',
    courseCode: row.academic_term || '',
    type: (row.effective_period === 'TA' ? 'TA' : 'MAIN'),
    academicYear: row.academic_year || '',
    scopeDescription: row.scope_description || '',
    obecSystems: Array.isArray(row.obec_systems) ? row.obec_systems : [],
    coResponsibleIds: Array.isArray(row.co_responsible_ids) ? row.co_responsible_ids : [],
  };
}

export function workloadToDb(w: WorkloadItem) {
  return {
    workload_id: w.id,
    emp_id: w.teacherId,
    co_emp_ids: w.coEmp || '',
    category: w.category,
    title: w.title,
    sub_group_or_level: w.subGroupOrLevel || '',
    hours_per_week: w.hoursPerWeek,
    role_in_task: w.roleInTask,
    academic_term: w.courseCode || '',
    order_or_ref: w.orderOrRef || '',
    effective_period: w.type || 'MAIN',
    status: w.status,
    academic_year: w.academicYear || '',
    scope_description: w.scopeDescription || '',
    obec_systems: Array.isArray(w.obecSystems) ? w.obecSystems : [],
    co_responsible_ids: Array.isArray(w.coResponsibleIds) ? w.coResponsibleIds : [],
    timestamp: new Date().toISOString(),
  };
}

export async function dbGetWorkloads(): Promise<WorkloadItem[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('staff_workloads').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(workloadFromDb);
    }
    if (data && data.length === 0) {
      return INITIAL_WORKLOAD_ITEMS;
    }
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return db.workloads && db.workloads.length > 0 ? db.workloads : INITIAL_WORKLOAD_ITEMS;
}

export async function dbUpsertWorkload(workload: WorkloadItem): Promise<WorkloadItem> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const dbRow = workloadToDb(workload);
    const { data, error } = await supabase
      .from('staff_workloads')
      .upsert(dbRow, { onConflict: 'workload_id' })
      .select()
      .single();

    if (error) {
      console.error('[dbUpsertWorkload] Supabase upsert error:', error);
      throw new Error(`ไม่สามารถบันทึกข้อมูลภาระงานลง Supabase ได้: ${error.message}`);
    }
    return workloadFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const currentWorkloads = db.workloads && db.workloads.length > 0 ? db.workloads : [...INITIAL_WORKLOAD_ITEMS];
  const existingIdx = currentWorkloads.findIndex((w) => w.id === workload.id);
  if (existingIdx >= 0) {
    currentWorkloads[existingIdx] = workload;
  } else {
    currentWorkloads.push(workload);
  }
  db.workloads = currentWorkloads;
  saveDatabase(db);
  return workload;
}

export async function dbInsertWorkloadsBatch(workloads: WorkloadItem[]): Promise<WorkloadItem[]> {
  if (!workloads || workloads.length === 0) return [];

  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const dbRows = workloads.map(workloadToDb);
    const { data, error } = await supabase
      .from('staff_workloads')
      .upsert(dbRows, { onConflict: 'workload_id' })
      .select();

    if (error) {
      console.error('[dbInsertWorkloadsBatch] Supabase batch upsert error:', error);
      throw new Error(`ไม่สามารถคัดลอกโครงสร้างงานลง Supabase ได้: ${error.message}`);
    }
    return Array.isArray(data) ? data.map(workloadFromDb) : workloads;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const currentWorkloads = db.workloads && db.workloads.length > 0 ? [...db.workloads] : [...INITIAL_WORKLOAD_ITEMS];
  for (const item of workloads) {
    const existingIdx = currentWorkloads.findIndex((w) => w.id === item.id);
    if (existingIdx >= 0) {
      currentWorkloads[existingIdx] = item;
    } else {
      currentWorkloads.push(item);
    }
  }
  db.workloads = currentWorkloads;
  saveDatabase(db);
  return workloads;
}

export async function dbDeleteWorkload(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('staff_workloads').delete().eq('workload_id', id);
    if (error) {
      console.error('[dbDeleteWorkload] Supabase delete error:', error);
      throw new Error(`ไม่สามารถลบข้อมูลภาระงานจาก Supabase ได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const currentWorkloads = db.workloads && db.workloads.length > 0 ? db.workloads : [...INITIAL_WORKLOAD_ITEMS];
  db.workloads = currentWorkloads.filter((w) => w.id !== id);
  saveDatabase(db);
  return true;
}

// ============================================================================
// 10. SYSTEM FEEDBACK DATABASE ENGINE (system_feedback)
// ============================================================================

export function feedbackFromDb(row: any): FeedbackItem {
  return {
    id: row.feedback_id || row.id || `FB-${Date.now()}`,
    category: (row.category || 'feature') as any,
    title: row.topic || row.title || '',
    description: row.detail || row.description || '',
    senderName: row.full_name || row.sender_name || 'ไม่ระบุชื่อ',
    status: row.status === 'รอการตอบรับ' ? 'pending' : row.status === 'เสร็จสิ้น' ? 'resolved' : (row.status || 'pending'),
    submittedAt: row.timestamp || new Date().toISOString(),
    response: row.admin_reply || row.response || '',
  };
}

export function feedbackToDb(f: FeedbackItem) {
  const dbStatus = f.status === 'pending' ? 'รอการตอบรับ' : f.status === 'resolved' ? 'เสร็จสิ้น' : f.status;
  return {
    feedback_id: f.id,
    emp_id: '',
    full_name: f.senderName,
    category: f.category,
    topic: f.title,
    detail: f.description,
    status: dbStatus,
    admin_reply: f.response || '',
    timestamp: f.submittedAt || new Date().toISOString(),
  };
}

export async function dbGetFeedbacks(): Promise<FeedbackItem[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('system_feedback')
      .select('*')
      .order('timestamp', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map(feedbackFromDb);
    }
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return db.feedbacks || [];
}

export async function dbCreateFeedback(feedback: FeedbackItem): Promise<FeedbackItem> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const dbRow = feedbackToDb(feedback);
    const { data, error } = await supabase
      .from('system_feedback')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      console.error('[dbCreateFeedback] Supabase insert error:', error);
      throw new Error(`ไม่สามารถบันทึกข้อเสนอแนะลง Supabase ได้: ${error.message}`);
    }
    return feedbackFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const list = db.feedbacks || [];
  list.unshift(feedback);
  db.feedbacks = list;
  saveDatabase(db);
  return feedback;
}

export async function dbUpdateFeedback(feedback: FeedbackItem): Promise<FeedbackItem> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const dbRow = feedbackToDb(feedback);
    const { data, error } = await supabase
      .from('system_feedback')
      .update(dbRow)
      .eq('feedback_id', feedback.id)
      .select()
      .single();

    if (error) {
      console.error('[dbUpdateFeedback] Supabase update error:', error);
      throw new Error(`ไม่สามารถอัปเดตข้อเสนอแนะใน Supabase ได้: ${error.message}`);
    }
    return feedbackFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const list = db.feedbacks || [];
  const idx = list.findIndex((f) => f.id === feedback.id);
  if (idx >= 0) {
    list[idx] = feedback;
  }
  db.feedbacks = list;
  saveDatabase(db);
  return feedback;
}

// ============================================================================
// 10. ACADEMIC YEARS & FISCAL PERIODS (PHASE 1 DATABASE ENGINE)
// ============================================================================

export async function dbGetAcademicYears(schoolId: string = '30030099'): Promise<AcademicYearRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', schoolId)
      .order('year_th', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        yearTh: r.year_th,
        offeredGrades: Array.isArray(r.offered_grades) ? r.offered_grades : [],
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return db.academicYears || [
    {
      id: 'ay-2569',
      schoolId,
      yearTh: 2569,
      offeredGrades: [
        'อนุบาล 2', 'อนุบาล 3',
        'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
        'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6',
      ],
      isActive: true,
    },
    {
      id: 'ay-2570',
      schoolId,
      yearTh: 2570,
      offeredGrades: [
        'อนุบาล 2', 'อนุบาล 3',
        'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
        'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6',
      ],
      isActive: false,
    },
  ];
}

export async function dbGetStudentCensusSnapshots(academicYearId?: string): Promise<StudentCensusSnapshotRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    let query = supabase.from('student_census_snapshots').select('*');
    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }
    const { data, error } = await query.order('snapshot_date', { ascending: true });

    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        academicYearId: r.academic_year_id,
        roundCode: r.round_code,
        snapshotDate: r.snapshot_date,
        fiscalYearTh: r.fiscal_year_th,
        kindergartenStudents: r.kindergarten_students ?? 0,
        kindergartenClassrooms: r.kindergarten_classrooms ?? 0,
        primaryStudents: r.primary_students ?? 0,
        primaryClassrooms: r.primary_classrooms ?? 0,
        secondaryStudents: r.secondary_students ?? 0,
        secondaryClassrooms: r.secondary_classrooms ?? 0,
        totalStudents: r.total_students ?? 0,
        totalClassrooms: r.total_classrooms ?? 0,
        isPrimaryForManpower: Boolean(r.is_primary_for_manpower),
        isLocked: Boolean(r.is_locked),
        notes: r.notes || '',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const allSnapshots = db.studentCensusSnapshots || [
    {
      id: 'census-2569-jun',
      academicYearId: 'ay-2569',
      roundCode: 'JUN_10',
      snapshotDate: '2026-06-10',
      fiscalYearTh: 2569,
      kindergartenStudents: 19,
      kindergartenClassrooms: 2,
      primaryStudents: 75,
      primaryClassrooms: 6,
      secondaryStudents: 0,
      secondaryClassrooms: 0,
      totalStudents: 94,
      totalClassrooms: 8,
      isPrimaryForManpower: true,
      isLocked: false,
    },
    {
      id: 'census-2569-nov',
      academicYearId: 'ay-2569',
      roundCode: 'NOV_10',
      snapshotDate: '2026-11-10',
      fiscalYearTh: 2570,
      kindergartenStudents: 19,
      kindergartenClassrooms: 2,
      primaryStudents: 75,
      primaryClassrooms: 6,
      secondaryStudents: 0,
      secondaryClassrooms: 0,
      totalStudents: 94,
      totalClassrooms: 8,
      isPrimaryForManpower: false,
      isLocked: false,
    },
  ];

  if (academicYearId) {
    return allSnapshots.filter((s) => s.academicYearId === academicYearId);
  }
  return allSnapshots;
}

export async function dbGetFiscalPeriods(schoolId: string = '30030099'): Promise<FiscalPeriodRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('school_id', schoolId)
      .order('fiscal_year_th', { ascending: false })
      .order('round_no', { ascending: true });

    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        schoolId: r.school_id,
        fiscalYearTh: r.fiscal_year_th,
        roundNo: r.round_no,
        evalStart: r.eval_start,
        evalEnd: r.eval_end,
        refCensusSnapshotId: r.ref_census_snapshot_id,
        isActive: Boolean(r.is_active),
        isLocked: Boolean(r.is_locked),
        autoUnlockDays: r.auto_unlock_days ? Number(r.auto_unlock_days) : 15,
        unlockedStaffIds: Array.isArray(r.unlocked_staff_ids) ? r.unlocked_staff_ids : [],
        evaluationStatus: (r.evaluation_status as any) || (Boolean(r.is_locked) ? 'locked' : 'auto'),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  return db.fiscalPeriods || [
    {
      id: 'fp-2570-r1',
      schoolId,
      fiscalYearTh: 2570,
      roundNo: 1,
      evalStart: '2026-10-01',
      evalEnd: '2027-03-31',
      refCensusSnapshotId: 'census-2569-jun',
      isActive: true,
      isLocked: false,
      evaluationStatus: 'auto',
      autoUnlockDays: 15,
      unlockedStaffIds: [],
    },
    {
      id: 'fp-2570-r2',
      schoolId,
      fiscalYearTh: 2570,
      roundNo: 2,
      evalStart: '2027-04-01',
      evalEnd: '2027-09-30',
      refCensusSnapshotId: 'census-2569-jun',
      isActive: false,
      isLocked: false,
      evaluationStatus: 'auto',
      autoUnlockDays: 15,
      unlockedStaffIds: [],
    },
  ];
}

export async function dbSetActiveAcademicYear(
  academicYearId: string,
  schoolId: string = '30030099'
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.rpc('set_active_academic_year', {
      p_school_id: schoolId,
      p_academic_year_id: academicYearId,
    });
    if (error) {
      console.error('[dbSetActiveAcademicYear] RPC error:', error);
      throw new Error(`ไม่สามารถเปลี่ยนปีการศึกษาที่ใช้งานได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (db.academicYears) {
    db.academicYears.forEach((y) => {
      y.isActive = y.id === academicYearId;
    });
    saveDatabase(db);
  }
  return true;
}

export async function dbCreateAcademicYearWithDefaults(
  yearTh: number,
  schoolId: string = '30030099'
): Promise<string> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('create_academic_year_with_defaults', {
      p_school_id: schoolId,
      p_year_th: yearTh,
    });
    if (error) {
      console.error('[dbCreateAcademicYearWithDefaults] RPC error:', error);
      throw new Error(`ไม่สามารถเพิ่มปีการศึกษาใหม่ได้: ${error.message}`);
    }
    return data as string;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const newId = `ay-${yearTh}`;
  if (!db.academicYears) db.academicYears = [];
  db.academicYears.push({
    id: newId,
    schoolId,
    yearTh,
    offeredGrades: [
      'อนุบาล 2', 'อนุบาล 3',
      'ประถมศึกษาปีที่ 1', 'ประถมศึกษาปีที่ 2', 'ประถมศึกษาปีที่ 3',
      'ประถมศึกษาปีที่ 4', 'ประถมศึกษาปีที่ 5', 'ประถมศึกษาปีที่ 6',
    ],
    isActive: false,
  });
  saveDatabase(db);
  return newId;
}

export async function dbUpdateAcademicYearOfferedGrades(
  yearId: string,
  offeredGrades: string[]
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('academic_years')
      .update({
        offered_grades: offeredGrades,
        updated_at: new Date().toISOString(),
      })
      .eq('id', yearId);

    if (error) {
      console.error('[dbUpdateAcademicYearOfferedGrades] Supabase error:', error);
      throw new Error(`ไม่สามารถบันทึกระดับชั้นที่เปิดสอนได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (db.academicYears) {
    const target = db.academicYears.find((y) => y.id === yearId);
    if (target) {
      target.offeredGrades = offeredGrades;
      saveDatabase(db);
    }
  }
  return true;
}

export async function dbDeleteAcademicYear(
  yearId: string,
  schoolId: string = '30030099'
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    // Check if active
    const { data: target, error: checkError } = await supabase
      .from('academic_years')
      .select('is_active')
      .eq('id', yearId)
      .single();

    if (checkError) {
      console.error('[dbDeleteAcademicYear] Check error:', checkError);
      throw new Error(`ไม่พบปีการศึกษาที่ระบุ: ${checkError.message}`);
    }

    if (target?.is_active) {
      throw new Error('ไม่สามารถลบปีการศึกษาที่กำลังใช้งานอยู่ได้');
    }

    // Delete related census snapshots first
    await supabase.from('student_census_snapshots').delete().eq('academic_year_id', yearId);

    // Delete academic year
    const { error } = await supabase.from('academic_years').delete().eq('id', yearId);
    if (error) {
      console.error('[dbDeleteAcademicYear] Supabase error:', error);
      throw new Error(`ไม่สามารถลบปีการศึกษาได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (db.academicYears) {
    const target = db.academicYears.find((y) => y.id === yearId);
    if (target?.isActive) {
      throw new Error('ไม่สามารถลบปีการศึกษาที่กำลังใช้งานอยู่ได้');
    }
    db.academicYears = db.academicYears.filter((y) => y.id !== yearId);
  }
  if (db.studentCensusSnapshots) {
    db.studentCensusSnapshots = db.studentCensusSnapshots.filter(
      (s) => s.academicYearId !== yearId
    );
  }
  saveDatabase(db);
  return true;
}

export async function dbSetPrimaryCensusRound(
  academicYearId: string,
  snapshotId: string
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.rpc('set_primary_census_round', {
      p_academic_year_id: academicYearId,
      p_snapshot_id: snapshotId,
    });
    if (error) {
      console.error('[dbSetPrimaryCensusRound] RPC error:', error);
      throw new Error(`ไม่สามารถตั้งรอบนักเรียนหลักได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (db.studentCensusSnapshots) {
    db.studentCensusSnapshots
      .filter((s) => s.academicYearId === academicYearId)
      .forEach((s) => {
        s.isPrimaryForManpower = s.id === snapshotId;
      });
    saveDatabase(db);
  }
  return true;
}

export async function dbSetActiveFiscalPeriod(
  fiscalPeriodId: string,
  schoolId: string = '30030099'
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.rpc('set_active_fiscal_period', {
      p_school_id: schoolId,
      p_fiscal_period_id: fiscalPeriodId,
    });
    if (error) {
      console.error('[dbSetActiveFiscalPeriod] RPC error:', error);
      throw new Error(`ไม่สามารถเปลี่ยนรอบปีงบประมาณที่ใช้งานได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (db.fiscalPeriods) {
    db.fiscalPeriods.forEach((f) => {
      f.isActive = f.id === fiscalPeriodId;
    });
    saveDatabase(db);
  }
  return true;
}

export async function dbSaveCensusSnapshot(
  snapshot: Partial<StudentCensusSnapshotRecord> & { id: string }
): Promise<Partial<StudentCensusSnapshotRecord>> {
  const totalStudents =
    (snapshot.kindergartenStudents ?? 0) +
    (snapshot.primaryStudents ?? 0) +
    (snapshot.secondaryStudents ?? 0);
  const totalClassrooms =
    (snapshot.kindergartenClassrooms ?? 0) +
    (snapshot.primaryClassrooms ?? 0) +
    (snapshot.secondaryClassrooms ?? 0);

  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();

    // Lock Guard: check if current snapshot is locked
    const { data: currentSnapshot } = await supabase
      .from('student_census_snapshots')
      .select('is_locked')
      .eq('id', snapshot.id)
      .single();

    const isChangingLockStatusOnly =
      snapshot.isLocked !== undefined &&
      Object.keys(snapshot).filter((k) => k !== 'id').every((k) => k === 'isLocked');

    if (currentSnapshot?.is_locked && !isChangingLockStatusOnly) {
      throw new Error('ข้อมูลรอบนี้ถูกล็อกไว้แล้ว ไม่สามารถแก้ไขได้ กรุณาปลดล็อกก่อนดำเนินการ (Data is locked)');
    }

    const dbUpdate: any = {
      kindergarten_students: snapshot.kindergartenStudents,
      kindergarten_classrooms: snapshot.kindergartenClassrooms,
      primary_students: snapshot.primaryStudents,
      primary_classrooms: snapshot.primaryClassrooms,
      secondary_students: snapshot.secondaryStudents,
      secondary_classrooms: snapshot.secondaryClassrooms,
      total_students: totalStudents,
      total_classrooms: totalClassrooms,
      is_locked: snapshot.isLocked,
      notes: snapshot.notes,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('student_census_snapshots')
      .update(dbUpdate)
      .eq('id', snapshot.id)
      .select()
      .single();

    if (error) {
      console.error('[dbSaveCensusSnapshot] Supabase update error:', error);
      throw new Error(`ไม่สามารถบันทึกข้อมูลรอบนักเรียนได้: ${error.message}`);
    }
    return data;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (db.studentCensusSnapshots) {
    const idx = db.studentCensusSnapshots.findIndex((s) => s.id === snapshot.id);
    if (idx >= 0) {
      const current = db.studentCensusSnapshots[idx];
      const isChangingLockStatusOnly =
        snapshot.isLocked !== undefined &&
        Object.keys(snapshot).filter((k) => k !== 'id').every((k) => k === 'isLocked');
      if (current?.isLocked && !isChangingLockStatusOnly) {
        throw new Error('ข้อมูลรอบนี้ถูกล็อกไว้แล้ว ไม่สามารถแก้ไขได้ กรุณาปลดล็อกก่อนดำเนินการ (Data is locked)');
      }

      db.studentCensusSnapshots[idx] = {
        ...db.studentCensusSnapshots[idx],
        ...snapshot,
        totalStudents,
        totalClassrooms,
      } as StudentCensusSnapshotRecord;
      saveDatabase(db);
    }
  }
  return snapshot;
}

export async function dbCreateFiscalPeriod(
  period: Partial<FiscalPeriodRecord> & { schoolId: string; fiscalYearTh: number; roundNo: 1 | 2 }
): Promise<FiscalPeriodRecord> {
  const evalStart =
    period.evalStart ||
    (period.roundNo === 1
      ? `${period.fiscalYearTh - 1 - 543}-10-01`
      : `${period.fiscalYearTh - 543}-04-01`);
  const evalEnd =
    period.evalEnd ||
    (period.roundNo === 1
      ? `${period.fiscalYearTh - 543}-03-31`
      : `${period.fiscalYearTh - 543}-09-30`);

  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('fiscal_periods')
      .insert({
        school_id: period.schoolId,
        fiscal_year_th: period.fiscalYearTh,
        round_no: period.roundNo,
        eval_start: evalStart,
        eval_end: evalEnd,
        ref_census_snapshot_id: period.refCensusSnapshotId || null,
        is_active: false,
        is_locked: false,
        evaluation_status: period.evaluationStatus || 'auto',
        auto_unlock_days: period.autoUnlockDays || 15,
        unlocked_staff_ids: period.unlockedStaffIds || [],
      })
      .select()
      .single();

    if (error) {
      console.error('[dbCreateFiscalPeriod] Supabase insert error:', error);
      throw new Error(`ไม่สามารถสร้างรอบปีงบประมาณได้: ${error.message}`);
    }
    return {
      id: data.id,
      schoolId: data.school_id,
      fiscalYearTh: data.fiscal_year_th,
      roundNo: data.round_no,
      evalStart: data.eval_start,
      evalEnd: data.eval_end,
      refCensusSnapshotId: data.ref_census_snapshot_id,
      isActive: Boolean(data.is_active),
      isLocked: Boolean(data.is_locked),
      autoUnlockDays: data.auto_unlock_days ? Number(data.auto_unlock_days) : 15,
      unlockedStaffIds: Array.isArray(data.unlocked_staff_ids) ? data.unlocked_staff_ids : [],
      evaluationStatus: (data.evaluation_status as any) || 'auto',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const newPeriod: FiscalPeriodRecord = {
    id: `fp-${period.fiscalYearTh}-r${period.roundNo}-${Date.now().toString().slice(-4)}`,
    schoolId: period.schoolId,
    fiscalYearTh: period.fiscalYearTh,
    roundNo: period.roundNo,
    evalStart,
    evalEnd,
    refCensusSnapshotId: period.refCensusSnapshotId || null,
    isActive: false,
    isLocked: false,
    evaluationStatus: period.evaluationStatus || 'auto',
    autoUnlockDays: period.autoUnlockDays || 15,
    unlockedStaffIds: period.unlockedStaffIds || [],
  };
  if (!db.fiscalPeriods) db.fiscalPeriods = [];
  db.fiscalPeriods.push(newPeriod);
  saveDatabase(db);
  return newPeriod;
}

export async function dbUpdateFiscalPeriod(
  periodId: string,
  updates: Partial<FiscalPeriodRecord>
): Promise<FiscalPeriodRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const dbUpdate: any = { updated_at: new Date().toISOString() };
    if (updates.refCensusSnapshotId !== undefined) {
      dbUpdate.ref_census_snapshot_id = updates.refCensusSnapshotId;
    }
    if (updates.isLocked !== undefined) {
      dbUpdate.is_locked = updates.isLocked;
    }
    if (updates.autoUnlockDays !== undefined) {
      dbUpdate.auto_unlock_days = updates.autoUnlockDays;
    }
    if (updates.unlockedStaffIds !== undefined) {
      dbUpdate.unlocked_staff_ids = updates.unlockedStaffIds;
    }
    if (updates.evaluationStatus !== undefined) {
      dbUpdate.evaluation_status = updates.evaluationStatus;
      if (updates.evaluationStatus === 'locked') {
        dbUpdate.is_locked = true;
      } else if (updates.isLocked === undefined) {
        dbUpdate.is_locked = false;
      }
    }

    let { data, error } = await supabase
      .from('fiscal_periods')
      .update(dbUpdate)
      .eq('id', periodId)
      .select()
      .single();

    // If updating evaluation_status failed due to missing column (before migration 008 is applied), retry without it
    if (error && dbUpdate.evaluation_status !== undefined) {
      console.warn('[dbUpdateFiscalPeriod] evaluation_status column might be missing, retrying without it:', error.message);
      delete dbUpdate.evaluation_status;
      const retryResult = await supabase
        .from('fiscal_periods')
        .update(dbUpdate)
        .eq('id', periodId)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error('[dbUpdateFiscalPeriod] Supabase update error:', error);
      throw new Error(`ไม่สามารถอัปเดตรอบปีงบประมาณได้: ${error.message}`);
    }
    return {
      id: data.id,
      schoolId: data.school_id,
      fiscalYearTh: data.fiscal_year_th,
      roundNo: data.round_no,
      evalStart: data.eval_start,
      evalEnd: data.eval_end,
      refCensusSnapshotId: data.ref_census_snapshot_id,
      isActive: Boolean(data.is_active),
      isLocked: Boolean(data.is_locked),
      autoUnlockDays: data.auto_unlock_days ? Number(data.auto_unlock_days) : (updates.autoUnlockDays ?? 15),
      unlockedStaffIds: Array.isArray(data.unlocked_staff_ids) ? data.unlocked_staff_ids : (updates.unlockedStaffIds || []),
      evaluationStatus: (data.evaluation_status as any) || updates.evaluationStatus || (Boolean(data.is_locked) ? 'locked' : 'auto'),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (db.fiscalPeriods) {
    const idx = db.fiscalPeriods.findIndex((p) => p.id === periodId);
    if (idx >= 0) {
      db.fiscalPeriods[idx] = {
        ...db.fiscalPeriods[idx],
        ...updates,
      };
      saveDatabase(db);
      return db.fiscalPeriods[idx];
    }
  }
  return { id: periodId, ...updates } as FiscalPeriodRecord;
}

export async function dbGetSalaryPromotionRecords(
  fiscalPeriodId: string
): Promise<SalaryPromotionRecord[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('salary_promotion_records')
      .select('*')
      .eq('fiscal_period_id', fiscalPeriodId)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        fiscalPeriodId: r.fiscal_period_id,
        staffId: r.staff_id,
        positionSnapshot: r.position_snapshot,
        standingSnapshot: r.standing_snapshot,
        salaryBefore: Number(r.salary_before),
        calculationBase: Number(r.calculation_base),
        promotionPercent: Number(r.promotion_percent),
        salaryAfter: Number(r.salary_after),
        orderNo: r.order_no || '',
        orderDate: r.order_date || null,
        notes: r.notes || '',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const records = db.salaryPromotionRecords || [];
  return records.filter((r) => r.fiscalPeriodId === fiscalPeriodId);
}

export async function dbSaveSalaryPromotionRecord(
  record: Partial<SalaryPromotionRecord> & { fiscalPeriodId: string; staffId: string }
): Promise<SalaryPromotionRecord> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();

    // Check if target fiscal period is locked
    const { data: period } = await supabase
      .from('fiscal_periods')
      .select('is_locked')
      .eq('id', record.fiscalPeriodId)
      .single();

    if (period?.is_locked) {
      throw new Error('รอบปีงบประมาณนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขข้อมูลการเลื่อนเงินเดือนได้');
    }

    const payload: any = {
      fiscal_period_id: record.fiscalPeriodId,
      staff_id: record.staffId,
      position_snapshot: record.positionSnapshot || '',
      standing_snapshot: record.standingSnapshot || '-',
      salary_before: Number(record.salaryBefore ?? 0),
      calculation_base: Number(record.calculationBase ?? 0),
      promotion_percent: Number(record.promotionPercent ?? 0),
      salary_after: Number(record.salaryAfter ?? 0),
      order_no: record.orderNo || '',
      order_date: record.orderDate || null,
      notes: record.notes || '',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('salary_promotion_records')
      .upsert(payload, { onConflict: 'fiscal_period_id,staff_id' })
      .select()
      .single();

    if (error) {
      console.error('[dbSaveSalaryPromotionRecord] Supabase upsert error:', error);
      throw new Error(`ไม่สามารถบันทึกข้อมูลการเลื่อนเงินเดือนได้: ${error.message}`);
    }
    return {
      id: data.id,
      fiscalPeriodId: data.fiscal_period_id,
      staffId: data.staff_id,
      positionSnapshot: data.position_snapshot,
      standingSnapshot: data.standing_snapshot,
      salaryBefore: Number(data.salary_before),
      calculationBase: Number(data.calculation_base),
      promotionPercent: Number(data.promotion_percent),
      salaryAfter: Number(data.salary_after),
      orderNo: data.order_no || '',
      orderDate: data.order_date || null,
      notes: data.notes || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  if (!db.salaryPromotionRecords) db.salaryPromotionRecords = [];

  const existingIdx = db.salaryPromotionRecords.findIndex(
    (r) => r.fiscalPeriodId === record.fiscalPeriodId && r.staffId === record.staffId
  );

  const fullRecord: SalaryPromotionRecord = {
    id: record.id || `spr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fiscalPeriodId: record.fiscalPeriodId,
    staffId: record.staffId,
    positionSnapshot: record.positionSnapshot || '',
    standingSnapshot: record.standingSnapshot || '-',
    salaryBefore: Number(record.salaryBefore ?? 0),
    calculationBase: Number(record.calculationBase ?? 0),
    promotionPercent: Number(record.promotionPercent ?? 0),
    salaryAfter: Number(record.salaryAfter ?? 0),
    orderNo: record.orderNo || '',
    orderDate: record.orderDate || null,
    notes: record.notes || '',
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    db.salaryPromotionRecords[existingIdx] = fullRecord;
  } else {
    db.salaryPromotionRecords.push(fullRecord);
  }
  saveDatabase(db);
  return fullRecord;
}

export async function dbSnapshotStaffForFiscalPeriod(
  fiscalPeriodId: string,
  staffList: TeacherRecord[]
): Promise<SalaryPromotionRecord[]> {
  const records: SalaryPromotionRecord[] = [];
  for (const staff of staffList) {
    const record = await dbSaveSalaryPromotionRecord({
      fiscalPeriodId,
      staffId: staff.id,
      positionSnapshot: staff.position || 'ครูผู้สอน',
      standingSnapshot: staff.academicStanding || '-',
      salaryBefore: 0,
      calculationBase: 0,
      promotionPercent: 0,
      salaryAfter: 0,
      orderNo: '',
      notes: '',
    });
    records.push(record);
  }
  return records;
}

// ============================================================================
// 12. PERFORMANCE EVALUATIONS (แบบประเมินผลการปฏิบัติงาน ก.ค.ศ. สพฐ.)
// ============================================================================

let inMemoryPerformanceEvaluations: PerformanceEvaluationRecord[] = [];

/**
 * ดึงข้อมูลแบบประเมินผลการปฏิบัติงานของบุคลากรรายบุคคล ในปีงบประมาณและรอบที่ระบุ
 */
export async function dbGetPerformanceEvaluation(
  staffId: string,
  fiscalYear: number,
  roundNumber: number
): Promise<PerformanceEvaluationRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('performance_evaluations')
        .select('*')
        .eq('staff_id', staffId)
        .eq('fiscal_year', fiscalYear)
        .eq('round_number', roundNumber)
        .maybeSingle();

      if (!error && data) {
        return data as PerformanceEvaluationRecord;
      }
    } catch (err) {
      console.warn('[dbGetPerformanceEvaluation] Fallback to in-memory:', err);
    }
  }

  const found = inMemoryPerformanceEvaluations.find(
    (e) =>
      e.staff_id === staffId &&
      e.fiscal_year === fiscalYear &&
      e.round_number === roundNumber
  );
  return found || null;
}

/**
 * ดึงข้อมูลแบบประเมินทั้งหมดในรอบปีงบประมาณที่ระบุ
 */
export async function dbGetPerformanceEvaluationsForRound(
  fiscalYear: number,
  roundNumber: number
): Promise<PerformanceEvaluationRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('performance_evaluations')
        .select('*')
        .eq('fiscal_year', fiscalYear)
        .eq('round_number', roundNumber);

      if (!error && Array.isArray(data)) {
        return data as PerformanceEvaluationRecord[];
      }
    } catch (err) {
      console.warn('[dbGetPerformanceEvaluationsForRound] Fallback to in-memory:', err);
    }
  }

  return inMemoryPerformanceEvaluations.filter(
    (e) => e.fiscal_year === fiscalYear && e.round_number === roundNumber
  );
}

/**
 * บันทึกหรืออัปเดตแบบประเมินผลการปฏิบัติงาน (Upsert)
 */
export async function dbSavePerformanceEvaluation(
  evaluation: Partial<PerformanceEvaluationRecord> & {
    staff_id: string;
    fiscal_year: number;
    round_number: number;
    template_key: string;
  }
): Promise<PerformanceEvaluationRecord> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const payload = {
        ...evaluation,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('performance_evaluations')
        .upsert(payload, {
          onConflict: 'staff_id,fiscal_year,round_number',
        })
        .select('*')
        .single();

      if (!error && data) {
        return data as PerformanceEvaluationRecord;
      }
      console.warn('[dbSavePerformanceEvaluation] Supabase upsert error, falling back:', error);
    } catch (err) {
      console.warn('[dbSavePerformanceEvaluation] Supabase exception, falling back:', err);
    }
  }

  // In-memory fallback
  const existingIdx = inMemoryPerformanceEvaluations.findIndex(
    (e) =>
      e.staff_id === evaluation.staff_id &&
      e.fiscal_year === evaluation.fiscal_year &&
      e.round_number === evaluation.round_number
  );

  if (existingIdx !== -1) {
    const updated: PerformanceEvaluationRecord = {
      ...inMemoryPerformanceEvaluations[existingIdx],
      ...evaluation,
      updated_at: now,
    } as PerformanceEvaluationRecord;
    inMemoryPerformanceEvaluations[existingIdx] = updated;
    return updated;
  }

  const created: PerformanceEvaluationRecord = {
    id: evaluation.id || `eval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    staff_id: evaluation.staff_id,
    fiscal_year: evaluation.fiscal_year,
    round_number: evaluation.round_number,
    template_key: evaluation.template_key,
    part1_snapshot: evaluation.part1_snapshot || {},
    self_scores: evaluation.self_scores || {},
    supervisor_scores: evaluation.supervisor_scores || {},
    self_total: evaluation.self_total ?? null,
    supervisor_total: evaluation.supervisor_total ?? null,
    rating_level: evaluation.rating_level ?? null,
    supervisor_comment: evaluation.supervisor_comment ?? null,
    status: evaluation.status || 'draft',
    self_signed_at: evaluation.self_signed_at ?? null,
    supervisor_signed_at: evaluation.supervisor_signed_at ?? null,
    acknowledged_at: evaluation.acknowledged_at ?? null,
    terms_accepted_at: evaluation.terms_accepted_at ?? null,
    created_at: now,
    updated_at: now,
  };

  inMemoryPerformanceEvaluations.push(created);
  return created;
}

// ============================================================================
// 15. TIMETABLE & WEEKLY TEACHING HOURS ENGINE (Phase 9.1)
// ============================================================================

function timetableSettingsFromDb(row: any, academicYear: string, semester: TimetableSemester): TimetableSettings {
  const defaults = getDefaultTimetableSettings(academicYear, semester);
  return {
    id: row.id || defaults.id,
    academicYear: row.academic_year || academicYear,
    semester: (row.semester === '2' ? '2' : '1') as TimetableSemester,
    periodsConfig:
      Array.isArray(row.periods_config) && row.periods_config.length > 0
        ? row.periods_config
        : defaults.periodsConfig,
    fixedSlotsConfig: Array.isArray(row.fixed_slots_config) ? row.fixed_slots_config : [],
    footerNote: typeof row.footer_note === 'string' && row.footer_note.length > 0
      ? row.footer_note
      : defaults.footerNote,
    updatedAt: row.updated_at || undefined,
  };
}

function timetableAllocationFromDb(row: any): TimetableAllocation {
  return {
    id: row.id,
    academicYear: row.academic_year || '',
    semester: (row.semester === '2' ? '2' : '1') as TimetableSemester,
    roomName: row.room_name || '',
    subjectCode: row.subject_code || '',
    subjectName: row.subject_name || '',
    subjectGroup: row.subject_group || '',
    subjectType: (row.subject_type || 'พื้นฐาน') as TimetableSubjectType,
    teacherId: row.teacher_id || '',
    coTeacherId: row.co_teacher_id || '',
    periodsPerWeek: Number(row.periods_per_week) || 1,
    preferMorning: Boolean(row.prefer_morning),
    consecutivePeriods: Number(row.consecutive_periods) === 2 ? 2 : 1,
    createdAt: row.created_at || undefined,
  };
}

function timetableSlotFromDb(row: any): TimetableSlot {
  return {
    id: row.id,
    academicYear: row.academic_year || '',
    semester: (row.semester === '2' ? '2' : '1') as TimetableSemester,
    roomName: row.room_name || '',
    dayOfWeek: Number(row.day_of_week) || 1,
    periodNo: Number(row.period_no) || 1,
    allocationId: row.allocation_id || '',
    subjectCode: row.subject_code || '',
    subjectName: row.subject_name || '',
    subjectGroup: row.subject_group || '',
    subjectType: (row.subject_type || 'พื้นฐาน') as TimetableSubjectType,
    teacherId: row.teacher_id || '',
    coTeacherId: row.co_teacher_id || '',
    isLocked: Boolean(row.is_locked),
    updatedAt: row.updated_at || undefined,
  };
}

export async function dbGetTimetableBundle(
  academicYear: string,
  semester: TimetableSemester
): Promise<TimetableBundle> {
  const defaults = getDefaultTimetableSettings(academicYear, semester);

  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const [settingsRes, allocRes, slotsRes] = await Promise.all([
      supabase
        .from('timetable_settings')
        .select('*')
        .eq('academic_year', academicYear)
        .eq('semester', semester)
        .maybeSingle(),
      supabase
        .from('timetable_allocations')
        .select('*')
        .eq('academic_year', academicYear)
        .eq('semester', semester)
        .order('created_at', { ascending: true }),
      supabase
        .from('timetable_slots')
        .select('*')
        .eq('academic_year', academicYear)
        .eq('semester', semester),
    ]);

    if (settingsRes.error) {
      throw new Error(`ไม่สามารถโหลดตั้งค่าตารางสอนจาก Supabase ได้: ${settingsRes.error.message}`);
    }
    if (allocRes.error) {
      throw new Error(`ไม่สามารถโหลดแผนการสอนจาก Supabase ได้: ${allocRes.error.message}`);
    }
    if (slotsRes.error) {
      throw new Error(`ไม่สามารถโหลดคาบเรียนจาก Supabase ได้: ${slotsRes.error.message}`);
    }

    return {
      settings: settingsRes.data
        ? timetableSettingsFromDb(settingsRes.data, academicYear, semester)
        : defaults,
      allocations: Array.isArray(allocRes.data) ? allocRes.data.map(timetableAllocationFromDb) : [],
      slots: Array.isArray(slotsRes.data) ? slotsRes.data.map(timetableSlotFromDb) : [],
    };
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const savedSettings = (db.timetableSettings || []).find(
    (s) => s.academicYear === academicYear && s.semester === semester
  );
  const allocations = (db.timetableAllocations || []).filter(
    (a) => a.academicYear === academicYear && a.semester === semester
  );
  const slots = (db.timetableSlots || []).filter(
    (s) => s.academicYear === academicYear && s.semester === semester
  );

  return {
    settings: savedSettings || defaults,
    allocations,
    slots,
  };
}

export async function dbUpsertTimetableSettings(settings: TimetableSettings): Promise<TimetableSettings> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const row = {
      id: settings.id || `${settings.academicYear}-${settings.semester}`,
      academic_year: settings.academicYear,
      semester: settings.semester,
      periods_config: settings.periodsConfig,
      fixed_slots_config: settings.fixedSlotsConfig || [],
      footer_note: settings.footerNote || '',
      updated_at: now,
    };
    const { data, error } = await supabase
      .from('timetable_settings')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      throw new Error(`ไม่สามารถบันทึกตั้งค่าตารางสอนลง Supabase ได้: ${error.message}`);
    }
    return timetableSettingsFromDb(data, settings.academicYear, settings.semester);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const list = [...(db.timetableSettings || [])];
  const next: TimetableSettings = { ...settings, updatedAt: now };
  const idx = list.findIndex(
    (s) => s.academicYear === settings.academicYear && s.semester === settings.semester
  );
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  db.timetableSettings = list;
  saveDatabase(db);
  return next;
}

export async function dbUpsertTimetableAllocation(
  allocation: TimetableAllocation
): Promise<TimetableAllocation> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const row = {
      id: allocation.id,
      academic_year: allocation.academicYear,
      semester: allocation.semester,
      room_name: allocation.roomName,
      subject_code: allocation.subjectCode || '',
      subject_name: allocation.subjectName,
      subject_group: allocation.subjectGroup,
      subject_type: allocation.subjectType,
      teacher_id: allocation.teacherId,
      co_teacher_id: allocation.coTeacherId || '',
      periods_per_week: allocation.periodsPerWeek,
      prefer_morning: Boolean(allocation.preferMorning),
      consecutive_periods: allocation.consecutivePeriods === 2 ? 2 : 1,
      created_at: allocation.createdAt || now,
    };
    const { data, error } = await supabase
      .from('timetable_allocations')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      throw new Error(`ไม่สามารถบันทึกแผนการสอนลง Supabase ได้: ${error.message}`);
    }
    return timetableAllocationFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const list = [...(db.timetableAllocations || [])];
  const next: TimetableAllocation = { ...allocation, createdAt: allocation.createdAt || now };
  const idx = list.findIndex((a) => a.id === allocation.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  db.timetableAllocations = list;
  saveDatabase(db);
  return next;
}

export async function dbDeleteTimetableAllocation(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('timetable_allocations').delete().eq('id', id);
    if (error) {
      throw new Error(`ไม่สามารถลบแผนการสอนจาก Supabase ได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.timetableAllocations = (db.timetableAllocations || []).filter((a) => a.id !== id);
  saveDatabase(db);
  return true;
}

export async function dbUpsertTimetableSlot(slot: TimetableSlot): Promise<TimetableSlot> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const row = {
      id: slot.id,
      academic_year: slot.academicYear,
      semester: slot.semester,
      room_name: slot.roomName,
      day_of_week: slot.dayOfWeek,
      period_no: slot.periodNo,
      allocation_id: slot.allocationId || '',
      subject_code: slot.subjectCode || '',
      subject_name: slot.subjectName,
      subject_group: slot.subjectGroup || '',
      subject_type: slot.subjectType,
      teacher_id: slot.teacherId,
      co_teacher_id: slot.coTeacherId || '',
      is_locked: Boolean(slot.isLocked),
      updated_at: now,
    };
    const { data, error } = await supabase
      .from('timetable_slots')
      .upsert(row, { onConflict: 'academic_year,semester,room_name,day_of_week,period_no' })
      .select()
      .single();
    if (error) {
      throw new Error(`ไม่สามารถบันทึกคาบเรียนลง Supabase ได้: ${error.message}`);
    }
    return timetableSlotFromDb(data);
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  const list = [...(db.timetableSlots || [])];
  const next: TimetableSlot = { ...slot, updatedAt: now };
  const idx = list.findIndex(
    (s) =>
      s.id === slot.id ||
      (s.academicYear === slot.academicYear &&
        s.semester === slot.semester &&
        s.roomName === slot.roomName &&
        s.dayOfWeek === slot.dayOfWeek &&
        s.periodNo === slot.periodNo)
  );
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  db.timetableSlots = list;
  saveDatabase(db);
  return next;
}

export async function dbDeleteTimetableSlot(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('timetable_slots').delete().eq('id', id);
    if (error) {
      throw new Error(`ไม่สามารถลบคาบเรียนจาก Supabase ได้: ${error.message}`);
    }
    return true;
  }

  verifyVercelConfiguration();
  const db = loadDatabase();
  db.timetableSlots = (db.timetableSlots || []).filter((s) => s.id !== id);
  saveDatabase(db);
  return true;
}


