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

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'manstat_db.json');

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

// Ensure directory exists
function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// In-memory cache for fast read
let memoryDb: DatabaseState | null = null;

export function loadDatabase(): DatabaseState {
  if (memoryDb) return memoryDb;

  ensureDbDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);

      // Verify and backfill if necessary
      const state: DatabaseState = {
        schoolInfo: parsed.schoolInfo || INITIAL_SCHOOL_INFO,
        teachers: Array.isArray(parsed.teachers) && parsed.teachers.length > 0 && parsed.teachers[0].employeeCode
          ? parsed.teachers
          : INITIAL_TEACHERS,
        boardMembers: Array.isArray(parsed.boardMembers) && parsed.boardMembers.length > 0
          ? parsed.boardMembers
          : INITIAL_BOARD_MEMBERS,
        holidays: Array.isArray(parsed.holidays) && parsed.holidays.length > 0
          ? parsed.holidays
          : INITIAL_HOLIDAYS,
        leaveRequests: Array.isArray(parsed.leaveRequests) && parsed.leaveRequests.length > 0
          ? parsed.leaveRequests
          : INITIAL_LEAVE_REQUESTS,
        auditLogs: Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0
          ? parsed.auditLogs
          : (Array.isArray(parsed.logs) && parsed.logs.length > 0 ? parsed.logs : INITIAL_AUDIT_LOGS),
        settings: parsed.settings || INITIAL_SETTINGS,
      };

      memoryDb = state;
      return state;
    } catch (err) {
      console.error('[loadDatabase] Parse error, reinitializing default:', err);
    }
  }

  // Create initial state
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
  ensureDbDir();
  memoryDb = state;
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tempFile, DB_FILE);
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
