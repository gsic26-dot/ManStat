/**
 * ============================================================================
 * ManStat: Leave Calculator & Quota Validation Regulatory Engine
 * ============================================================================
 * Governing Regulations:
 * 1. ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
 * 2. หลักเกณฑ์การเลื่อนเงินเดือนข้าราชการครู (ก.ค.ศ. ว15/2561)
 * ============================================================================
 */

import type { LeaveType, HalfDayPeriod } from '@/types/database.types';
import { isZeroDayLeaveType } from './leaveTypes';

export type LeaveCountingMode = 'working_days_only' | 'continuous';

export interface LeaveCountingRule {
  canonicalType: LeaveType;
  codeKey: string;
  submissionCountingMode: 'continuous';
  calculationCountingMode: LeaveCountingMode;
  allowHalfDay: boolean;
  regulationLabel: string;
  unitLabel: 'วันทำการ' | 'วัน';
  /** Maximum consecutive calendar days (submissionCalendarDays) within School Director authority (0 = requires OBEC Area Director / สพป.) */
  directorMaxApprovalDays: number;
}

/**
 * Official 2555 Civil Service Leave Counting Matrix
 * (ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 — ครบทั้ง 11 ประเภท)
 *
 * 1. submissionCountingMode: ALWAYS 'continuous' (นับต่อเนื่องรวมวันหยุด) for all 11 types
 * 2. calculationCountingMode:
 *    - 4 types = 'working_days_only' (นับเฉพาะวันทำการ หักเสาร์-อาทิตย์ และวันหยุดราชการ)
 *    - 7 types = 'continuous' (นับต่อเนื่องรวมวันหยุดราชการ)
 */
export const LEAVE_COUNTING_RULES_2555: Readonly<Record<string, LeaveCountingRule>> = {
  // --- 4 Working-Days-Only Leave Types ---
  'ลาป่วย': {
    canonicalType: 'ลาป่วย',
    codeKey: 'sick',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'working_days_only',
    allowHalfDay: true,
    regulationLabel: 'นับเฉพาะวันทำการ',
    unitLabel: 'วันทำการ',
    directorMaxApprovalDays: 60,
  },
  'ลาไปช่วยเหลือภริยาที่คลอดบุตร': {
    canonicalType: 'ลาไปช่วยเหลือภริยาที่คลอดบุตร',
    codeKey: 'paternity',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'working_days_only',
    allowHalfDay: false,
    regulationLabel: 'นับเฉพาะวันทำการ',
    unitLabel: 'วันทำการ',
    directorMaxApprovalDays: 15,
  },
  'ลากิจส่วนตัว': {
    canonicalType: 'ลากิจส่วนตัว',
    codeKey: 'personal',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'working_days_only',
    allowHalfDay: true,
    regulationLabel: 'นับเฉพาะวันทำการ',
    unitLabel: 'วันทำการ',
    directorMaxApprovalDays: 30,
  },
  'ลาพักผ่อน': {
    canonicalType: 'ลาพักผ่อน',
    codeKey: 'vacation',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'working_days_only',
    allowHalfDay: true,
    regulationLabel: 'นับเฉพาะวันทำการ',
    unitLabel: 'วันทำการ',
    directorMaxApprovalDays: 30,
  },

  // --- 7 Continuous Calendar-Days Leave Types ---
  'ลาคลอดบุตร': {
    canonicalType: 'ลาคลอดบุตร',
    codeKey: 'maternity',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'continuous',
    allowHalfDay: false,
    regulationLabel: 'นับต่อเนื่อง (รวมวันหยุด)',
    unitLabel: 'วัน',
    directorMaxApprovalDays: 90,
  },
  'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์': {
    canonicalType: 'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์',
    codeKey: 'ordination',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'continuous',
    allowHalfDay: false,
    regulationLabel: 'นับต่อเนื่อง (รวมวันหยุด)',
    unitLabel: 'วัน',
    directorMaxApprovalDays: 0,
  },
  'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล': {
    canonicalType: 'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล',
    codeKey: 'military',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'continuous',
    allowHalfDay: false,
    regulationLabel: 'นับต่อเนื่อง (รวมวันหยุด)',
    unitLabel: 'วัน',
    directorMaxApprovalDays: 0,
  },
  'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน': {
    canonicalType: 'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน',
    codeKey: 'study',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'continuous',
    allowHalfDay: false,
    regulationLabel: 'นับต่อเนื่อง (รวมวันหยุด)',
    unitLabel: 'วัน',
    directorMaxApprovalDays: 0,
  },
  'ลาไปปฏิบัติงานในองค์การระหว่างประเทศ': {
    canonicalType: 'ลาไปปฏิบัติงานในองค์การระหว่างประเทศ',
    codeKey: 'intl_org',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'continuous',
    allowHalfDay: false,
    regulationLabel: 'นับต่อเนื่อง (รวมวันหยุด)',
    unitLabel: 'วัน',
    directorMaxApprovalDays: 0,
  },
  'ลาติดตามคู่สมรส': {
    canonicalType: 'ลาติดตามคู่สมรส',
    codeKey: 'spouse',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'continuous',
    allowHalfDay: false,
    regulationLabel: 'นับต่อเนื่อง (รวมวันหยุด)',
    unitLabel: 'วัน',
    directorMaxApprovalDays: 0,
  },
  'ลาไปฟื้นฟูสมรรถภาพด้านอาชีพ': {
    canonicalType: 'ลาไปฟื้นฟูสมรรถภาพด้านอาชีพ',
    codeKey: 'rehab',
    submissionCountingMode: 'continuous',
    calculationCountingMode: 'continuous',
    allowHalfDay: false,
    regulationLabel: 'นับต่อเนื่อง (รวมวันหยุด)',
    unitLabel: 'วัน',
    directorMaxApprovalDays: 0,
  },
};

const CODE_KEY_TO_CANONICAL: Readonly<Record<string, LeaveType>> = {
  sick: 'ลาป่วย',
  paternity: 'ลาไปช่วยเหลือภริยาที่คลอดบุตร',
  personal: 'ลากิจส่วนตัว',
  vacation: 'ลาพักผ่อน',
  maternity: 'ลาคลอดบุตร',
  ordination: 'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์',
  military: 'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล',
  study: 'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน',
  intl_org: 'ลาไปปฏิบัติงานในองค์การระหว่างประเทศ',
  spouse: 'ลาติดตามคู่สมรส',
  rehab: 'ลาไปฟื้นฟูสมรรถภาพด้านอาชีพ',
};

/**
 * Resolves a leave type string (Thai canonical name, prefixed with "การ",
 * suffixed with "(บันทึกย้อนหลัง)", or English code key) to its 2555 counting rule.
 */
export function getLeaveCountingRule(leaveType: string | undefined | null): LeaveCountingRule | null {
  if (!leaveType) return null;
  const raw = leaveType.trim();
  if (!raw || isZeroDayLeaveType(raw)) return null;

  const lower = raw.toLowerCase();
  if (CODE_KEY_TO_CANONICAL[lower]) {
    return LEAVE_COUNTING_RULES_2555[CODE_KEY_TO_CANONICAL[lower]];
  }

  // Strip optional leading "การ" and trailing "(...)" note such as "(บันทึกย้อนหลัง)"
  const normalized = raw
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/^การ/, '')
    .trim();

  if (LEAVE_COUNTING_RULES_2555[normalized]) {
    return LEAVE_COUNTING_RULES_2555[normalized];
  }

  // Fallback substring matching for shortened Thai labels
  if (normalized.includes('ช่วยเหลือภริยา')) return LEAVE_COUNTING_RULES_2555['ลาไปช่วยเหลือภริยาที่คลอดบุตร'];
  if (normalized.includes('คลอดบุตร')) return LEAVE_COUNTING_RULES_2555['ลาคลอดบุตร'];
  if (normalized.includes('ป่วย')) return LEAVE_COUNTING_RULES_2555['ลาป่วย'];
  if (normalized.includes('กิจส่วนตัว') || normalized === 'ลากิจ') return LEAVE_COUNTING_RULES_2555['ลากิจส่วนตัว'];
  if (normalized.includes('พักผ่อน')) return LEAVE_COUNTING_RULES_2555['ลาพักผ่อน'];
  if (normalized.includes('อุปสมบท') || normalized.includes('ฮัจย์')) return LEAVE_COUNTING_RULES_2555['ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์'];
  if (normalized.includes('ตรวจเลือก') || normalized.includes('เตรียมพล')) return LEAVE_COUNTING_RULES_2555['ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล'];
  if (normalized.includes('ศึกษา') || normalized.includes('ฝึกอบรม') || normalized.includes('ดูงาน')) return LEAVE_COUNTING_RULES_2555['ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน'];
  if (normalized.includes('องค์การระหว่างประเทศ')) return LEAVE_COUNTING_RULES_2555['ลาไปปฏิบัติงานในองค์การระหว่างประเทศ'];
  if (normalized.includes('ติดตามคู่สมรส')) return LEAVE_COUNTING_RULES_2555['ลาติดตามคู่สมรส'];
  if (normalized.includes('ฟื้นฟูสมรรถภาพ')) return LEAVE_COUNTING_RULES_2555['ลาไปฟื้นฟูสมรรถภาพด้านอาชีพ'];

  return null;
}

/**
 * Timezone-safe YYYY-MM-DD parser returning UTC midnight timestamp.
 * Avoids local-timezone off-by-one shifts when calling toISOString() in UTC+7.
 */
function parseIsoDateUtcMs(dateStr: string): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const isoPart = dateStr.trim().split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoPart);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return ms;
}

function formatUtcMsToIso(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface CalculateLeaveDurationParams {
  leaveType: LeaveType | string;
  startDate: string;
  endDate: string;
  halfDayPeriod?: HalfDayPeriod;
  holidays?: readonly string[];
}

export interface LeaveDurationResult {
  calculatedLeaveDays: number;
  submissionCalendarDays: number;
  workingDaysCount: number;
  excludedWeekendOrHolidayCount: number;
  calculationCountingMode: LeaveCountingMode;
  submissionCountingMode: 'continuous';
  allowHalfDay: boolean;
  regulationLabel: string;
  unitLabel: 'วันทำการ' | 'วัน';
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Canonical Leave Duration Calculator (ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลา พ.ศ. 2555)
 * Computes BOTH:
 * - `submissionCalendarDays`: ALWAYS continuous inclusive calendar days (all 11 types)
 * - `calculatedLeaveDays`: working days only (4 types) OR continuous calendar days (7 types)
 */
export function calculateLeaveDuration(params: CalculateLeaveDurationParams): LeaveDurationResult {
  const {
    leaveType,
    startDate,
    endDate,
    halfDayPeriod = 'full',
    holidays = [],
  } = params;

  const rule = getLeaveCountingRule(String(leaveType || ''));
  const calculationCountingMode: LeaveCountingMode =
    rule?.calculationCountingMode ?? 'working_days_only';
  const allowHalfDay = rule?.allowHalfDay ?? false;
  const regulationLabel = rule?.regulationLabel ?? 'นับเฉพาะวันทำการ';
  const unitLabel = rule?.unitLabel ?? 'วันทำการ';

  const startMs = parseIsoDateUtcMs(startDate);
  const endMs = parseIsoDateUtcMs(endDate);

  if (startMs === null || endMs === null || endMs < startMs) {
    return {
      calculatedLeaveDays: 0,
      submissionCalendarDays: 0,
      workingDaysCount: 0,
      excludedWeekendOrHolidayCount: 0,
      calculationCountingMode,
      submissionCountingMode: 'continuous',
      allowHalfDay,
      regulationLabel,
      unitLabel,
    };
  }

  const submissionCalendarDays = Math.round((endMs - startMs) / MS_PER_DAY) + 1;

  // Zero-day special permissions (ออกนอกบริเวณโรงเรียน <= 3 ชม. / ไปราชการ)
  if (isZeroDayLeaveType(String(leaveType || ''))) {
    return {
      calculatedLeaveDays: 0,
      submissionCalendarDays,
      workingDaysCount: 0,
      excludedWeekendOrHolidayCount: 0,
      calculationCountingMode: 'working_days_only',
      submissionCountingMode: 'continuous',
      allowHalfDay: false,
      regulationLabel: 'ไม่นับวันลา (0 วัน)',
      unitLabel: 'วันทำการ',
    };
  }

  const holidaySet = new Set(holidays.map((h) => String(h).trim().split('T')[0]));

  let workingDays = 0;
  let excludedCount = 0;

  for (let currMs = startMs; currMs <= endMs; currMs += MS_PER_DAY) {
    const dayOfWeek = new Date(currMs).getUTCDay(); // 0 = Sun, 6 = Sat
    const iso = formatUtcMsToIso(currMs);
    if (dayOfWeek === 0 || dayOfWeek === 6 || holidaySet.has(iso)) {
      excludedCount++;
    } else {
      workingDays++;
    }
  }

  // Half-day leave on a single working day (permitted only for working-day types with allowHalfDay = true)
  const isHalfDay = halfDayPeriod === 'morning' || halfDayPeriod === 'afternoon';
  if (isHalfDay && startMs === endMs && allowHalfDay) {
    const halfDayValue = workingDays === 1 ? 0.5 : 0;
    return {
      calculatedLeaveDays: halfDayValue,
      submissionCalendarDays: 1,
      workingDaysCount: halfDayValue,
      excludedWeekendOrHolidayCount: excludedCount,
      calculationCountingMode,
      submissionCountingMode: 'continuous',
      allowHalfDay,
      regulationLabel,
      unitLabel,
    };
  }

  const calculatedLeaveDays =
    calculationCountingMode === 'continuous' ? submissionCalendarDays : workingDays;

  return {
    calculatedLeaveDays,
    submissionCalendarDays,
    workingDaysCount: workingDays,
    excludedWeekendOrHolidayCount: excludedCount,
    calculationCountingMode,
    submissionCountingMode: 'continuous',
    allowHalfDay,
    regulationLabel,
    unitLabel,
  };
}

export interface LeaveApprovalAuthorityResult {
  approverLevel: 'director' | 'obec_area';
  approverLabel: string;
  note: string;
}

/**
 * Evaluates approval authority routing using `submissionCalendarDays` (นับต่อเนื่องทุกประเภท)
 * per ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555.
 */
export function evaluateLeaveApprovalAuthority(params: {
  leaveType: LeaveType | string;
  submissionCalendarDays: number;
}): LeaveApprovalAuthorityResult {
  const { leaveType, submissionCalendarDays } = params;
  if (isZeroDayLeaveType(String(leaveType || ''))) {
    return {
      approverLevel: 'director',
      approverLabel: 'ผู้อำนวยการสถานศึกษา',
      note: 'อยู่ในอำนาจพิจารณาอนุมัติของผู้อำนวยการสถานศึกษา',
    };
  }

  const rule = getLeaveCountingRule(String(leaveType || ''));
  if (!rule) {
    return {
      approverLevel: 'director',
      approverLabel: 'ผู้อำนวยการสถานศึกษา',
      note: 'เสนอผู้อำนวยการสถานศึกษาพิจารณาตามสายงาน',
    };
  }

  if (rule.directorMaxApprovalDays === 0) {
    return {
      approverLevel: 'obec_area',
      approverLabel: 'ผู้อำนวยการ สพป. (ผ่าน ผอ.สถานศึกษา)',
      note: `${rule.canonicalType} (${submissionCalendarDays} วันต่อเนื่อง) ต้องเสนอผ่าน ผอ.สถานศึกษา ไปยัง ผอ.สพป. พิจารณาอนุญาต`,
    };
  }

  if (submissionCalendarDays > rule.directorMaxApprovalDays) {
    return {
      approverLevel: 'obec_area',
      approverLabel: 'ผู้อำนวยการ สพป. (ผ่าน ผอ.สถานศึกษา)',
      note: `วันลาต่อเนื่อง ${submissionCalendarDays} วัน เกินอำนาจ ผอ.สถานศึกษา (${rule.directorMaxApprovalDays} วัน) ต้องเสนอ ผอ.สพป. พิจารณา`,
    };
  }

  return {
    approverLevel: 'director',
    approverLabel: 'ผู้อำนวยการสถานศึกษา',
    note: `อยู่ในอำนาจ ผอ.สถานศึกษา (นับเพื่อเสนอใบลา ${submissionCalendarDays} วันต่อเนื่อง / ไม่เกิน ${rule.directorMaxApprovalDays} วัน)`,
  };
}

export interface LeaveRuleValidationParams {
  leaveType: LeaveType;
  requestedDays: number;
  usedDaysInFiscalYear: number;
  usedOccurrencesInRound: number;
  usedSickPersonalDaysInRound: number;
  isFirstYearAppointee?: boolean;
  isYearRoundStaff?: boolean;
  tenureMonths?: number;
  consecutiveSickDays?: number;
  deliveryDate?: string | Date;
  leaveStartDate?: string | Date;
}

export interface LeaveRuleValidationResult {
  isValid: boolean;
  maxQuota: number;
  remainingQuotaBefore: number;
  remainingQuotaAfter: number;
  requireMedicalCert: boolean;
  warnings: string[];
  errors: string[];
  isPromotionRisk: boolean;
}

/**
 * คำนวณจำนวนวันลาตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลา พ.ศ. 2555
 * (Wrapper over canonical calculateLeaveDuration for backward compatibility)
 */
export function calculateLeaveDays(
  startDate: string,
  endDate: string,
  leaveType: LeaveType | string,
  halfDay: HalfDayPeriod = 'full',
  holidays: readonly string[] = []
): number {
  return calculateLeaveDuration({
    leaveType,
    startDate,
    endDate,
    halfDayPeriod: halfDay,
    holidays,
  }).calculatedLeaveDays;
}

/**
 * ตรวจสอบโควตาและเงื่อนไขการลาตามกฎหมายราชการไทย พร้อมระบบเรดาร์เตือนเกณฑ์เลื่อนเงินเดือน ว15/2561
 */
export function validateLeaveQuotaAndRules(
  params: LeaveRuleValidationParams
): LeaveRuleValidationResult {
  const {
    leaveType,
    requestedDays,
    usedDaysInFiscalYear,
    usedOccurrencesInRound,
    usedSickPersonalDaysInRound,
    isFirstYearAppointee = false,
    isYearRoundStaff = false,
    tenureMonths = 0,
    consecutiveSickDays = 0,
    deliveryDate,
    leaveStartDate
  } = params;

  let maxQuota = 60;
  let requireMedicalCert = false;
  const warnings: string[] = [];
  const errors: string[] = [];
  let isPromotionRisk = false;

  // การขออนุญาตออกนอกบริเวณสถานศึกษา และการไปราชการ (ไม่นับเป็นวันลา ไม่ตัดโควตา ไม่กระทบเงินเดือน)
  if (isZeroDayLeaveType(leaveType)) {
    return {
      isValid: true,
      maxQuota: 0,
      remainingQuotaBefore: 0,
      remainingQuotaAfter: 0,
      requireMedicalCert: false,
      warnings: [],
      errors: [],
      isPromotionRisk: false,
    };
  }

  switch (leaveType) {
    case 'ลาป่วย': {
      maxQuota = 60; // 60 วันทำการต่อปีงบประมาณที่ได้รับเงินเดือนปกติ
      const totalConsecutive = requestedDays + consecutiveSickDays;

      if (totalConsecutive >= 30) {
        requireMedicalCert = true;
        warnings.push('การลาป่วยตั้งแต่ 30 วันขึ้นไป ต้องแนบใบรับรองแพทย์จากสถานพยาบาลที่ได้รับอนุญาต');
      } else if (totalConsecutive >= 3) {
        warnings.push('การลาป่วยติดต่อกันตั้งแต่ 3 วันทำการขึ้นไป ผู้บังคับบัญชาอาจสั่งให้แสดงใบรับรองแพทย์ตามดุลยพินิจ');
      }

      if (usedDaysInFiscalYear + requestedDays > maxQuota) {
        warnings.push(`วันลาป่วยสะสมเกิน 60 วันทำการต่อปีงบประมาณ (${usedDaysInFiscalYear + requestedDays}/${maxQuota} วัน) ซึ่งเกินสิทธิได้รับเงินเดือนตามระเบียบฯ เว้นแต่ได้รับอนุมัติเป็นกรณีพิเศษ`);
      }
      break;
    }

    case 'ลากิจส่วนตัว': {
      // ระเบียบฯ 2555 ข้อ 17: บรรจุใหม่ในปีงบประมาณแรก ลากิจส่วนตัวได้ไม่เกิน 15 วันทำการ
      maxQuota = isFirstYearAppointee ? 15 : 45;

      if (isFirstYearAppointee && (usedDaysInFiscalYear + requestedDays > maxQuota)) {
        errors.push(`ข้าราชการบรรจุใหม่ในปีงบประมาณปัจจุบัน ได้รับสิทธิลากิจส่วนตัวไม่เกิน 15 วันทำการ (ปัจจุบันขอใช้รวม ${usedDaysInFiscalYear + requestedDays} วัน)`);
      } else if (usedDaysInFiscalYear + requestedDays > maxQuota) {
        errors.push(`วันลากิจส่วนตัวเกินโควตาสูงสุด 45 วันทำการต่อปีงบประมาณ (ปัจจุบันขอใช้รวม ${usedDaysInFiscalYear + requestedDays} วัน)`);
      }
      break;
    }

    case 'ลาคลอดบุตร': {
      maxQuota = 90; // 90 วันปฏิทิน
      if (requestedDays > 90) {
        errors.push('การลาคลอดบุตรมีสิทธิลาได้ไม่เกิน 90 วันปฏิทินต่อครั้ง');
      }
      break;
    }

    case 'ลาไปช่วยเหลือภริยาที่คลอดบุตร': {
      maxQuota = 15; // 15 วันทำการ
      if (requestedDays > 15) {
        errors.push('การลาไปช่วยเหลือภริยาที่คลอดบุตรมีสิทธิลาได้ไม่เกิน 15 วันทำการติดต่อกัน');
      }

      if (deliveryDate && leaveStartDate) {
        const dDate = typeof deliveryDate === 'string' ? new Date(deliveryDate) : deliveryDate;
        const lDate = typeof leaveStartDate === 'string' ? new Date(leaveStartDate) : leaveStartDate;
        const diffDays = Math.floor((lDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 90) {
          errors.push('การลาไปช่วยเหลือภริยาที่คลอดบุตรต้องใช้สิทธิภายใน 90 วันนับแต่วันที่ภริยาคลอดบุตร');
        }
      }
      break;
    }

    case 'ลาพักผ่อน': {
      // ครูผู้สอนปกติไม่มีสิทธิลาพักผ่อนเพราะมีวันปิดภาคเรียนตามระเบียบ ข้อ 22
      if (!isYearRoundStaff) {
        errors.push('ข้าราชการครูผู้สอนไม่มีสิทธิลาพักผ่อนประจำปี เนื่องจากมีวันหยุดตามประเพณีและวันปิดภาคเรียนแล้ว (ยกเว้นผู้บริหารหรือเจ้าหน้าที่ที่ได้รับคำสั่งให้ปฏิบัติงานตลอดปี)');
        maxQuota = 0;
      } else if (tenureMonths < 6) {
        errors.push('ข้าราชการที่เริ่มบรรจุรับราชการยังไม่ครบ 6 เดือน ไม่มีสิทธิลาพักผ่อนประจำปี');
        maxQuota = 0;
      } else {
        // รับราชการ >= 10 ปี สะสมได้ไม่เกิน 30 วัน, น้อยกว่า 10 ปี สะสมไม่เกิน 20 วัน
        maxQuota = tenureMonths >= 120 ? 30 : 20;
        if (usedDaysInFiscalYear + requestedDays > maxQuota) {
          errors.push(`วันลาพักผ่อนสะสมเกินสิทธิสูงสุดตามอายุราชการ (${maxQuota} วันทำการ)`);
        }
      }
      break;
    }

    default:
      maxQuota = 999;
      break;
  }

  // --------------------------------------------------------------------------
  // เรดาร์เฝ้าระวังเกณฑ์การเลื่อนเงินเดือน (ก.ค.ศ. ว15/2561)
  // --------------------------------------------------------------------------
  if (leaveType === 'ลาป่วย' || leaveType === 'ลากิจส่วนตัว') {
    const newOccurrences = usedOccurrencesInRound + 1;
    const newSickPersonalDays = usedSickPersonalDaysInRound + requestedDays;

    if (newOccurrences > 6) {
      isPromotionRisk = true;
      warnings.push(`การลาครั้งนี้จะทำให้มีจำนวนครั้งการลาในรอบการประเมินปัจจุบันรวมเป็น ${newOccurrences} ครั้ง (เกิน 6 ครั้ง) เสี่ยงต่อการไม่ได้รับการพิจารณาเลื่อนเงินเดือนตามเกณฑ์ ก.ค.ศ. ว15/2561`);
    }

    if (newSickPersonalDays > 23) {
      isPromotionRisk = true;
      warnings.push(`การลาครั้งนี้จะทำให้มีวันลาป่วยและลากิจส่วนตัวรวมเป็น ${newSickPersonalDays} วันทำการ (เกิน 23 วันทำการ) เสี่ยงต่อการไม่ได้รับการพิจารณาเลื่อนเงินเดือนตามเกณฑ์ ก.ค.ศ. ว15/2561`);
    }
  }

  const remainingQuotaBefore = Math.max(0, maxQuota - usedDaysInFiscalYear);
  const remainingQuotaAfter = Math.max(0, remainingQuotaBefore - requestedDays);
  const isValid = errors.length === 0;

  return {
    isValid,
    maxQuota,
    remainingQuotaBefore,
    remainingQuotaAfter,
    requireMedicalCert,
    warnings,
    errors,
    isPromotionRisk
  };
}
