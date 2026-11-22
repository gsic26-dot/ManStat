/**
 * ============================================================================
 * ManStat: Hybrid Evaluation Unlock System & Strict Access Resolution Logic
 * ============================================================================
 * Implements 3-Mode Access Control according to Thai OBEC / ก.ค.ศ. regulations:
 * 1. Auto-Unlock Before Round End (default: 15 days before round end date)
 * 2. Global Manual Unlock All ('open') and Permanent Lock ('locked')
 * 3. Per-User Unlock Override (unlockedStaffIds)
 *
 * Strict Guardrails:
 * - ARABIC NUMERALS ONLY ON WEB UI (0-9)
 * - Strict Precedence: Per-User Override > Global Open > Global Lock > Auto Mode
 * ============================================================================
 */

import type { EvaluationRoundStatus } from '@/lib/data/schoolData';

export const THAI_MONTH_SHORT_ARABIC: Record<string, string> = {
  '01': 'ม.ค.',
  '02': 'ก.พ.',
  '03': 'มี.ค.',
  '04': 'เม.ย.',
  '05': 'พ.ค.',
  '06': 'มิ.ย.',
  '07': 'ก.ค.',
  '08': 'ส.ค.',
  '09': 'ก.ย.',
  '10': 'ต.ค.',
  '11': 'พ.ย.',
  '12': 'ธ.ค.',
};

/**
 * Returns current date string (YYYY-MM-DD) in Asia/Bangkok timezone.
 */
export function getBangkokDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Computes auto-unlock date string (YYYY-MM-DD) by subtracting lead days from evalEndDate.
 * Example: '2027-03-31' minus 15 days = '2027-03-16'.
 */
export function computeAutoUnlockDateStr(evalEndDateStr: string, autoUnlockDays: number = 15): string {
  if (!evalEndDateStr) return '';
  const parts = evalEndDateStr.split('-');
  if (parts.length !== 3) return '';
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  // Use UTC to avoid any DST or local timezone skew
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  date.setUTCDate(date.getUTCDate() - autoUnlockDays);

  const resY = date.getUTCFullYear();
  const resM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(date.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

/**
 * Formats a YYYY-MM-DD date into Thai text using Arabic numerals only (e.g. "16 มี.ค. 2570").
 */
export function formatThaiDateArabic(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const y = Number(parts[0]);
  const m = parts[1];
  const d = Number(parts[2]);

  const yearBE = y + 543;
  const monthName = THAI_MONTH_SHORT_ARABIC[m] || m;
  return `${d} ${monthName} ${yearBE}`;
}

/**
 * Checks whether an individual staff member is manually unlocked via per-user override.
 */
export function isStaffManuallyUnlocked(staffId: string, unlockedStaffIds?: string[]): boolean {
  if (!staffId || !unlockedStaffIds || !Array.isArray(unlockedStaffIds)) return false;
  return unlockedStaffIds.includes(staffId) || unlockedStaffIds.includes(staffId.trim());
}

export interface EvaluationAccessPeriod {
  id?: string;
  roundNo?: 1 | 2;
  fiscalYearTh?: number;
  evalEnd?: string;
  isLocked?: boolean;
  evaluationStatus?: EvaluationRoundStatus;
  autoUnlockDays?: number;
  unlockedStaffIds?: string[];
}

export interface EvaluationAccessContext {
  staffId: string;
  isTeacher: boolean;
  isAuthorizedManager: boolean;
  period?: EvaluationAccessPeriod | null;
  currentDate?: Date; // Optional override for testing
}

export interface EvaluationAccessResult {
  isUnlocked: boolean; // Can civil servant teacher edit self-evaluation?
  canEditForm: boolean; // Can current session user edit active form inputs?
  statusLabel: string; // Header/row status label (Arabic numerals only)
  tooltip: string; // Tooltip describing reason/time
  reason: 'per_user_override' | 'global_open' | 'global_locked' | 'auto_window' | 'auto_waiting';
  autoUnlockDateStr: string;
  formattedAutoUnlockDate: string;
  autoUnlockDays: number;
}

/**
 * Strict Access Resolution:
 * Priority 1: Per-User Manual Override (unlockedStaffIds) -> UNLOCKED
 * Priority 2: Global Force Open ('open') -> UNLOCKED for all
 * Priority 3: Global Permanent Lock ('locked') -> LOCKED for all
 * Priority 4: Auto Mode ('auto') -> UNLOCKED if today >= autoUnlockDate, else LOCKED
 */
export function resolveEvaluationAccess(context: EvaluationAccessContext): EvaluationAccessResult {
  const { staffId, isTeacher, isAuthorizedManager, period, currentDate } = context;

  const autoUnlockDays = period?.autoUnlockDays && period.autoUnlockDays >= 1 && period.autoUnlockDays <= 60
    ? period.autoUnlockDays
    : 15;

  // Determine round end date: fallback to standard dates if evalEnd is empty
  let evalEnd = period?.evalEnd || '';
  if (!evalEnd && period?.fiscalYearTh && period?.roundNo) {
    const ceYear = period.fiscalYearTh - 543;
    evalEnd = period.roundNo === 1 ? `${ceYear}-03-31` : `${ceYear}-09-30`;
  }

  const autoUnlockDateStr = computeAutoUnlockDateStr(evalEnd, autoUnlockDays);
  const formattedAutoUnlockDate = formatThaiDateArabic(autoUnlockDateStr);
  const todayStr = getBangkokDateString(currentDate || new Date());

  const isManuallyUnlocked = isStaffManuallyUnlocked(staffId, period?.unlockedStaffIds);
  const rawStatus = period?.evaluationStatus;
  const isGloballyLocked = Boolean(period?.isLocked) || rawStatus === 'locked';
  const isGloballyOpen = rawStatus === 'open' && !isGloballyLocked;

  // --------------------------------------------------------------------------
  // PRECEDENCE EVALUATION
  // --------------------------------------------------------------------------

  // Priority 1 — Per-User Manual Override
  if (isManuallyUnlocked) {
    const isUnlocked = true;
    const canEditForm = isAuthorizedManager ? !isGloballyLocked : isUnlocked;
    return {
      isUnlocked,
      canEditForm,
      statusLabel: 'เปิดให้ประเมินตนเอง',
      tooltip: 'ได้รับการปลดล็อกเฉพาะบุคคลโดยผู้บริหาร',
      reason: 'per_user_override',
      autoUnlockDateStr,
      formattedAutoUnlockDate,
      autoUnlockDays,
    };
  }

  // Priority 2 — Global Force Open ('open')
  if (isGloballyOpen) {
    const isUnlocked = true;
    const canEditForm = isUnlocked;
    return {
      isUnlocked,
      canEditForm,
      statusLabel: 'เปิดให้ประเมินตนเอง',
      tooltip: 'เปิดให้ประเมินตนเอง (ปลดล็อกทั้งหมด)',
      reason: 'global_open',
      autoUnlockDateStr,
      formattedAutoUnlockDate,
      autoUnlockDays,
    };
  }

  // Priority 3 — Global Permanent Lock ('locked')
  if (isGloballyLocked) {
    const isUnlocked = false;
    const canEditForm = false; // When locked, form inputs become read-only until unlocked
    return {
      isUnlocked,
      canEditForm,
      statusLabel: 'ปิดรอบประเมินแล้ว',
      tooltip: 'รอบนี้ถูกปิดถาวรแล้ว (อ่านอย่างเดียว / พิมพ์ A4 ได้)',
      reason: 'global_locked',
      autoUnlockDateStr,
      formattedAutoUnlockDate,
      autoUnlockDays,
    };
  }

  // Priority 4 — Auto Mode ('auto' or default)
  const isWithinWindow = Boolean(todayStr && autoUnlockDateStr && todayStr >= autoUnlockDateStr);

  if (isWithinWindow) {
    const isUnlocked = true;
    const canEditForm = isUnlocked;
    return {
      isUnlocked,
      canEditForm,
      statusLabel: 'เปิดให้ประเมินตนเอง',
      tooltip: `เปิดให้ประเมินตนเองตามกำหนดเวลาอัตโนมัติ (ตั้งแต่ ${formattedAutoUnlockDate})`,
      reason: 'auto_window',
      autoUnlockDateStr,
      formattedAutoUnlockDate,
      autoUnlockDays,
    };
  }

  // Auto waiting: before auto-unlock date
  const isUnlocked = false;
  // Director / HR Admin can view & pre-fill draft in auto mode, but teacher is waiting
  const canEditForm = isAuthorizedManager ? true : false;
  return {
    isUnlocked,
    canEditForm,
    statusLabel: `เปิดประเมินอัตโนมัติ ${formattedAutoUnlockDate}`,
    tooltip: `เปิดประเมินอัตโนมัติ ${formattedAutoUnlockDate} (ก่อนสิ้นรอบ ${autoUnlockDays} วัน)`,
    reason: 'auto_waiting',
    autoUnlockDateStr,
    formattedAutoUnlockDate,
    autoUnlockDays,
  };
}
