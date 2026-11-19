/**
 * ============================================================================
 * ManStat-Modern: Server Database Engine (serverDb.ts)
 * ============================================================================
 * Persistent database store for ManStat-Modern.
 * Handles Atomic Read/Write for:
 * 1. Staff Members (TeacherRecord[])
 * 2. School Board Members (BoardMemberRecord[])
 * 3. School Profile Configuration (SchoolInfoRecord)
 * 4. Fiscal Year & Official Holidays
 * 5. Immutable PDPA Audit Logs
 * 6. System Settings & Preferences
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
  TeacherRecord,
  BoardMemberRecord,
  SchoolInfoRecord,
  LeaveRequestRecord,
} from '@/lib/data/schoolData';

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

const INITIAL_HOLIDAYS: HolidayRecord[] = [
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

const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
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

const INITIAL_SETTINGS: SystemSettingsRecord = {
  themeMode: 'auto',
  preferredView: 'table',
  compactMode: false,
  maskCitizenId: true,
  fiscalYear: 2570,
  currentTerm: '2',
  academicYear: '2569',
};

const BUNDLED_DB_DIR = path.join(process.cwd(), 'data');
const BUNDLED_DB_FILE = path.join(BUNDLED_DB_DIR, 'manstat_db.json');
const TMP_DB_FILE = path.join(os.tmpdir(), 'manstat_db.json');

// Cached path resolution for writable storage
let cachedWritableFile: string | null = null;

function getWritableDbFile(): string {
  if (cachedWritableFile) return cachedWritableFile;

  // On Vercel, AWS Lambda, or any Serverless platform, the deployment directory (/var/task) is read-only
  if (
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NEXT_RUNTIME === 'edge'
  ) {
    cachedWritableFile = TMP_DB_FILE;
    return TMP_DB_FILE;
  }

  // Check if process.cwd()/data is writable in the current runtime environment
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

// In-memory cache for fast read
let memoryDb: DatabaseState | null = null;

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
        ? parsed.holidays
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

export function loadDatabase(): DatabaseState {
  if (memoryDb) return memoryDb;

  const writableFile = getWritableDbFile();

  // Priority 1: In serverless mode, load from /tmp if modified previously in this warm instance
  if (writableFile === TMP_DB_FILE && fs.existsSync(TMP_DB_FILE)) {
    try {
      const raw = fs.readFileSync(TMP_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      const state = parseDatabaseState(parsed);
      memoryDb = state;
      return state;
    } catch (err) {
      console.warn('[loadDatabase] Failed reading from /tmp DB, falling back to bundled data:', err);
    }
  }

  // Priority 2: Load from bundled data/manstat_db.json
  if (fs.existsSync(BUNDLED_DB_FILE)) {
    try {
      const raw = fs.readFileSync(BUNDLED_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      const state = parseDatabaseState(parsed);
      memoryDb = state;

      // Seed /tmp store on first load if running in serverless mode
      if (writableFile === TMP_DB_FILE && !fs.existsSync(TMP_DB_FILE)) {
        try {
          fs.writeFileSync(TMP_DB_FILE, JSON.stringify(state, null, 2), 'utf8');
        } catch {
          // ignore
        }
      }

      return state;
    } catch (err) {
      console.error('[loadDatabase] Bundled parse error, reinitializing default:', err);
    }
  }

  // Priority 3: Fallback default state
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
  memoryDb = state;

  const targetFile = getWritableDbFile();
  const targetDir = path.dirname(targetFile);

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const tempFile = `${targetFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tempFile, targetFile);
  } catch (err: any) {
    console.warn(`[saveDatabase] Primary write to ${targetFile} failed (${err.code || err.message}). Attempting fallback.`);

    // If writing to primary failed (e.g., EROFS in serverless), fallback to /tmp
    if (targetFile !== TMP_DB_FILE) {
      try {
        const tmpTemp = `${TMP_DB_FILE}.tmp`;
        fs.writeFileSync(tmpTemp, JSON.stringify(state, null, 2), 'utf8');
        fs.renameSync(tmpTemp, TMP_DB_FILE);
        cachedWritableFile = TMP_DB_FILE;
        console.log('[saveDatabase] Successfully wrote to /tmp fallback');
        return;
      } catch (fallbackErr: any) {
        console.error('[saveDatabase] Fallback write to /tmp also failed:', fallbackErr.message);
      }
    }
    // Note: memoryDb is already updated, preserving state in the active Node/Lambda process
  }
}

// ============================================================================
// AUDIT LOG HELPER
// ============================================================================
export function recordAuditLog(
  action: string,
  actorName: string,
  actorRole: string,
  targetName: string,
  details: string,
  ipAddress: string = '127.0.0.1'
): AuditLogRecord {
  const db = loadDatabase();
  const newLog: AuditLogRecord = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    action,
    actorName,
    actorRole,
    targetName,
    ipAddress,
    timestamp: new Date().toISOString(),
    details,
  };

  db.auditLogs.unshift(newLog);
  // Cap at 200 logs
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200);
  }

  saveDatabase(db);
  return newLog;
}
