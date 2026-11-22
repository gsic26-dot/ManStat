/**
 * ============================================================================
 * ManStat: Audit Log Translation, Categorization & Filtering
 * ============================================================================
 * Provides:
 * 1. Action code translation to concise Thai
 * 2. Visual dot color hierarchy & category classification
 * 3. Chronological sorting (newest first) & client-side filtering
 * 4. Target name & actor cleanup
 * ============================================================================
 */

import type { AuditLogRecord } from '@/lib/db/serverDb';

export type AuditCategory = 'delete' | 'sensitive' | 'update';

export interface AuditActionMeta {
  title: string;
  category: AuditCategory;
  dotClass: string;
  textClass: string;
}

const ACTION_MAP: Record<string, { title: string; category: AuditCategory }> = {
  // Sensitive / PDPA
  VIEW_CITIZEN_ID: { title: 'เปิดดูเลขประจำตัวประชาชน', category: 'sensitive' },
  REVEAL_CITIZEN_ID: { title: 'เปิดดูเลขประจำตัวประชาชน', category: 'sensitive' },
  VIEW_SENSITIVE_DATA: { title: 'เข้าถึงข้อมูลอ่อนไหว', category: 'sensitive' },
  ACCESS_SENSITIVE_DATA: { title: 'เข้าถึงข้อมูลอ่อนไหว', category: 'sensitive' },
  PDPA_UNMASK_SELF: { title: 'เปิดดูข้อมูลส่วนบุคคลตนเอง', category: 'sensitive' },
  PDPA_UNMASK_OTHER: { title: 'เปิดดูข้อมูลส่วนบุคคลผู้อื่น (งานบุคคล)', category: 'sensitive' },
  VIEW_FINANCIAL_SALARY_DATA: { title: 'เปิดดูข้อมูลเงินเดือน (PDPA)', category: 'sensitive' },

  // Delete Actions
  DELETE_ACADEMIC_YEAR: { title: 'ลบปีการศึกษา', category: 'delete' },
  DELETE_BOARD_MEMBER: { title: 'ลบคณะกรรมการ', category: 'delete' },
  DELETE_HOLIDAY: { title: 'ลบวันหยุด', category: 'delete' },
  DELETE_LEAVE_REQUEST: { title: 'ลบรายการลา', category: 'delete' },
  DELETE_SCOUT: { title: 'ลบวุฒิลูกเสือ', category: 'delete' },
  DELETE_STAFF: { title: 'ลบบุคลากร', category: 'delete' },
  DELETE_WORKLOAD: { title: 'ลบภาระงานสอน', category: 'delete' },

  // Create / Update / System
  SYSTEM_INIT: { title: 'เริ่มต้นระบบฐานข้อมูล', category: 'update' },
  CREATE_ACADEMIC_YEAR: { title: 'สร้างปีการศึกษา', category: 'update' },
  UPDATE_ACADEMIC_YEAR: { title: 'แก้ไขปีการศึกษา', category: 'update' },
  UPDATE_OFFERED_GRADES: { title: 'ปรับระดับชั้นที่เปิดสอน', category: 'update' },
  UPDATE_CENSUS_SNAPSHOT: { title: 'บันทึกยอดข้อมูล 10 มิ.ย.', category: 'update' },
  SET_PRIMARY_CENSUS_ROUND: { title: 'กำหนดยอดสำรวจหลัก', category: 'update' },
  LOCK_CENSUS_SNAPSHOT: { title: 'ล็อกยอดสำรวจ', category: 'update' },
  UNLOCK_CENSUS_SNAPSHOT: { title: 'ปลดล็อกยอดสำรวจ', category: 'update' },
  CREATE_FISCAL_PERIOD: { title: 'สร้างรอบงบประมาณ', category: 'update' },
  UPDATE_FISCAL_PERIOD: { title: 'แก้ไขรอบงบประมาณ', category: 'update' },
  SNAPSHOT_STAFF_SALARY: { title: 'บันทึกฐานเงินเดือน', category: 'update' },
  SAVE_SALARY_PROMOTION_RECORD: { title: 'บันทึกการเลื่อนเงินเดือน', category: 'update' },
  CREATE_BOARD_MEMBER: { title: 'เพิ่มคณะกรรมการ', category: 'update' },
  UPDATE_BOARD_MEMBER: { title: 'แก้ไขคณะกรรมการ', category: 'update' },
  ADD_HOLIDAY: { title: 'เพิ่มวันหยุด', category: 'update' },
  UPDATE_SCHOOL_INFO: { title: 'แก้ไขข้อมูลสถานศึกษา', category: 'update' },
  UPDATE_SCOUT: { title: 'แก้ไขวุฒิลูกเสือ', category: 'update' },
  UPDATE_SYSTEM_SETTINGS: { title: 'แก้ไขตั้งค่าระบบ', category: 'update' },
  CREATE_STAFF: { title: 'เพิ่มบุคลากร', category: 'update' },
  UPDATE_STAFF: { title: 'แก้ไขข้อมูลบุคลากร', category: 'update' },
  UPDATE_WORKLOAD: { title: 'แก้ไขภาระงานสอน', category: 'update' },
  CREATE_LEAVE_REQUEST: { title: 'บันทึกการลา', category: 'update' },
  UPDATE_LEAVE_REQUEST: { title: 'แก้ไขรายการลา', category: 'update' },
};

/**
 * Translates an audit action code into Thai title and styling metadata
 */
export function translateAuditAction(action: string): AuditActionMeta {
  const upper = (action || '').toUpperCase().trim();
  const mapped = ACTION_MAP[upper];

  if (mapped) {
    if (mapped.category === 'delete') {
      return {
        title: mapped.title,
        category: 'delete',
        dotClass: 'bg-rose-400',
        textClass: 'text-rose-400 dark:text-rose-300',
      };
    }
    if (mapped.category === 'sensitive') {
      return {
        title: mapped.title,
        category: 'sensitive',
        dotClass: 'bg-amber-400',
        textClass: 'text-amber-400 dark:text-amber-300',
      };
    }
    return {
      title: mapped.title,
      category: 'update',
      dotClass: 'bg-sky-400',
      textClass: 'text-slate-700 dark:text-slate-200',
    };
  }

  // Fallback pattern detection
  if (upper.startsWith('DELETE') || upper.includes('REMOVE') || upper.includes('DROP')) {
    const cleanWord = upper.replace(/^DELETE_?/, '').toLowerCase();
    return {
      title: `ลบข้อมูล (${cleanWord || 'รายการ'})`,
      category: 'delete',
      dotClass: 'bg-rose-400',
      textClass: 'text-rose-400 dark:text-rose-300',
    };
  }

  if (upper.includes('CITIZEN') || upper.includes('REVEAL') || upper.includes('SENSITIVE')) {
    return {
      title: 'เข้าถึงข้อมูลอ่อนไหว',
      category: 'sensitive',
      dotClass: 'bg-amber-400',
      textClass: 'text-amber-400 dark:text-amber-300',
    };
  }

  // Generic fallback
  return {
    title: upper || 'กิจกรรมระบบ',
    category: 'update',
    dotClass: 'bg-sky-400',
    textClass: 'text-slate-700 dark:text-slate-200',
  };
}

/**
 * Cleans target name by removing unnecessary parenthetical phrases
 * e.g. "ตั้งค่าระบบ (System Preferences)" -> "ตั้งค่าระบบ"
 */
export function cleanAuditTargetName(targetName: string): string {
  if (!targetName) return '-';
  return targetName
    .replace(/\s*\([^)]*Preferences[^)]*\)/gi, '')
    .replace(/\s*\([^)]*Audit[^)]*\)/gi, '')
    .replace(/\s*\([^)]*Append-only[^)]*\)/gi, '')
    .trim() || targetName.trim();
}

/**
 * Splits actor string into clean name and role
 * e.g. "Superuser (นายธีรศักดิ์ มโนธรรม)" -> { name: "นายธีรศักดิ์ มโนธรรม", role: "ผู้ดูแลระบบสูงสุด" }
 * e.g. "นายสมชาย (Admin)" -> { name: "นายสมชาย", role: "ผู้ดูแลระบบ" }
 */
export function cleanAuditActor(
  actorName: string,
  actorRole: string
): { name: string; roleLabel: string } {
  let name = (actorName || '').trim();
  let role = (actorRole || '').trim();

  // If format is "Role (Actual Name)"
  const rolePrefixMatch = name.match(/^(Superuser|Admin|HR Admin)\s*\(([^)]+)\)$/i);
  if (rolePrefixMatch) {
    name = rolePrefixMatch[2].trim();
    if (!role) role = rolePrefixMatch[1].toLowerCase();
  }

  // If format is "Actual Name (Role)"
  const roleSuffixMatch = name.match(/^(.+?)\s*\((Admin|Superuser|HR Admin|Teacher|Staff)\)$/i);
  if (roleSuffixMatch) {
    name = roleSuffixMatch[1].trim();
    if (!role) role = roleSuffixMatch[2].toLowerCase();
  }

  // Translate role to concise Thai
  let roleLabel = 'ผู้ดูแลระบบ';
  const roleLower = role.toLowerCase();
  if (roleLower.includes('super')) {
    roleLabel = 'ผู้ดูแลระบบสูงสุด';
  } else if (roleLower.includes('hr')) {
    roleLabel = 'เจ้าหน้าที่งานบุคคล';
  } else if (roleLower.includes('teacher') || roleLower.includes('ครู')) {
    roleLabel = 'ครูผู้สอน';
  } else if (roleLower.includes('staff')) {
    roleLabel = 'บุคลากร';
  } else if (role) {
    roleLabel = role;
  }

  return { name: name || 'ผู้ใช้งานระบบ', roleLabel };
}

/**
 * Sorts audit logs by timestamp DESC (Newest First) and filters by query and category
 */
export function filterAndSortAuditLogs(
  logs: AuditLogRecord[],
  query: string = '',
  categoryFilter: string = 'all'
): AuditLogRecord[] {
  // 1. Sort strictly descending (Newest first)
  const sorted = [...logs].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });

  const q = query.trim().toLowerCase();

  return sorted.filter((log) => {
    const meta = translateAuditAction(log.action);

    // Category filter
    if (categoryFilter !== 'all' && meta.category !== categoryFilter) {
      return false;
    }

    // Text search query
    if (q) {
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const matchTitle = meta.title.toLowerCase().includes(q);
      const matchActor = (log.actorName || '').toLowerCase().includes(q);
      const matchTarget = (log.targetName || '').toLowerCase().includes(q);
      const matchDetails = (log.details || '').toLowerCase().includes(q);
      const matchIp = (log.ipAddress || '').toLowerCase().includes(q);

      return matchAction || matchTitle || matchActor || matchTarget || matchDetails || matchIp;
    }

    return true;
  });
}
