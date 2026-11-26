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

// ============================================================================
// PRE-EVALUATION AGREEMENT & CONSENT TRIGGER LOGIC
// ============================================================================

export interface EvaluationAgreementCheckParams {
  /** True only when the logged-in user is opening their OWN evaluation */
  isSelfEvaluation: boolean;
  /** True only when the round is unlocked/editable for this user */
  canEditSelf: boolean;
  /** Current evaluation status ('draft' | 'self_submitted' | 'evaluated' | 'acknowledged' | 'locked') */
  status?: string | null;
  /** Recorded ISO timestamp from performance_evaluations.terms_accepted_at */
  termsAcceptedAt?: string | null;
}

/**
 * Determines whether the pre-evaluation agreement modal must be shown.
 * Shows ONLY when:
 * 1. User is opening their OWN evaluation (never forces Director/HR to accept for others)
 * 2. User has edit permission for this fiscal round (not read-only / locked)
 * 3. Evaluation is not already finalized ('evaluated' / 'acknowledged' / 'locked')
 * 4. terms_accepted_at has not yet been recorded for this fiscal round
 */
export function shouldRequireEvaluationAgreement(
  params: EvaluationAgreementCheckParams
): boolean {
  if (!params.isSelfEvaluation) return false;
  if (!params.canEditSelf) return false;
  if (
    params.status === 'evaluated' ||
    params.status === 'acknowledged' ||
    params.status === 'locked'
  ) {
    return false;
  }
  return !params.termsAcceptedAt;
}

// ============================================================================
// EVALUATION WORKFLOW STATUS & SEQUENTIAL ACTION LOCK RESOLUTION
// ============================================================================

export type EvaluationWorkflowStatusKey =
  | 'not_started'
  | 'draft'
  | 'self_submitted'
  | 'evaluated'
  | 'acknowledged';

export interface EvaluationWorkflowDisplay {
  statusKey: EvaluationWorkflowStatusKey;
  statusLabel: string;
  dotColorClass: string;
  textColorClass: string;
  actionLabel: string;
  actionVariant: 'primary' | 'secondary' | 'acknowledge' | 'disabled';
  isActionDisabled: boolean;
  actionTooltip: string;
}

export interface ResolveWorkflowDisplayParams {
  rawStatus?: string | null;
  isSelfRow: boolean;
  isRoundUnlocked: boolean;
  roundAccessTooltip?: string;
}

/**
 * Resolves the minimalist status indicator (dot + concise label) and
 * locked sequential action button for both Self rows and Director/HR rows.
 */
export function resolveEvaluationWorkflowDisplay(
  params: ResolveWorkflowDisplayParams
): EvaluationWorkflowDisplay {
  const { rawStatus, isSelfRow, isRoundUnlocked, roundAccessTooltip } = params;

  let statusKey: EvaluationWorkflowStatusKey = 'not_started';
  if (rawStatus === 'acknowledged') statusKey = 'acknowledged';
  else if (rawStatus === 'evaluated') statusKey = 'evaluated';
  else if (rawStatus === 'self_submitted') statusKey = 'self_submitted';
  else if (rawStatus === 'draft') statusKey = 'draft';

  const statusMeta: Record<
    EvaluationWorkflowStatusKey,
    { label: string; dot: string; text: string }
  > = {
    not_started: {
      label: 'ยังไม่ส่ง',
      dot: 'bg-slate-300 dark:bg-slate-600',
      text: 'text-slate-500 dark:text-slate-400',
    },
    draft: {
      label: 'กำลังร่าง',
      dot: 'bg-slate-400 dark:bg-slate-500',
      text: 'text-slate-600 dark:text-slate-300',
    },
    self_submitted: {
      label: 'รอ ผอ. ประเมิน',
      dot: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-300 font-medium',
    },
    evaluated: {
      label: 'รอครูรับทราบ',
      dot: 'bg-sky-500',
      text: 'text-sky-700 dark:text-sky-300 font-medium',
    },
    acknowledged: {
      label: 'เสร็จสมบูรณ์',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-300 font-medium',
    },
  };

  const meta = statusMeta[statusKey];

  // 1. User's own row (including Director's own row)
  if (isSelfRow) {
    if (statusKey === 'not_started' || statusKey === 'draft') {
      return {
        statusKey,
        statusLabel: meta.label,
        dotColorClass: meta.dot,
        textColorClass: meta.text,
        actionLabel: 'ประเมิน',
        actionVariant: isRoundUnlocked ? 'primary' : 'disabled',
        isActionDisabled: !isRoundUnlocked,
        actionTooltip: isRoundUnlocked
          ? 'เปิดแบบประเมินผลการปฏิบัติงานตนเอง'
          : roundAccessTooltip || 'ยังไม่ถึงกำหนดเปิดรอบประเมิน',
      };
    }

    if (statusKey === 'self_submitted') {
      return {
        statusKey,
        statusLabel: meta.label,
        dotColorClass: meta.dot,
        textColorClass: meta.text,
        actionLabel: 'ดูผล',
        actionVariant: 'secondary',
        isActionDisabled: false,
        actionTooltip: 'ส่งแบบประเมินตนเองแล้ว — รอผู้อำนวยการประเมิน',
      };
    }

    if (statusKey === 'evaluated') {
      return {
        statusKey,
        statusLabel: meta.label,
        dotColorClass: meta.dot,
        textColorClass: meta.text,
        actionLabel: 'รับทราบผล',
        actionVariant: 'acknowledge',
        isActionDisabled: false,
        actionTooltip: 'ตรวจสอบและลงนามรับทราบผลการประเมิน',
      };
    }

    return {
      statusKey,
      statusLabel: meta.label,
      dotColorClass: meta.dot,
      textColorClass: meta.text,
      actionLabel: 'ดูผล',
      actionVariant: 'secondary',
      isActionDisabled: false,
      actionTooltip: 'ดูผลการประเมินที่เสร็จสมบูรณ์แล้ว',
    };
  }

  // 2. Other staff rows (Director / Superuser / HR Admin view)
  if (statusKey === 'not_started' || statusKey === 'draft') {
    return {
      statusKey,
      statusLabel: meta.label,
      dotColorClass: meta.dot,
      textColorClass: meta.text,
      actionLabel: 'รอครูส่ง',
      actionVariant: 'disabled',
      isActionDisabled: true,
      actionTooltip: 'ล็อกไว้ชั่วคราว — ต้องรอผู้รับการประเมินส่งแบบประเมินตนเองก่อน',
    };
  }

  if (statusKey === 'self_submitted') {
    return {
      statusKey,
      statusLabel: meta.label,
      dotColorClass: meta.dot,
      textColorClass: meta.text,
      actionLabel: 'ประเมินผล',
      actionVariant: 'primary',
      isActionDisabled: false,
      actionTooltip: 'ผู้รับการประเมินส่งข้อมูลแล้ว — คลิกเพื่อพิจารณาประเมินผล',
    };
  }

  return {
    statusKey,
    statusLabel: meta.label,
    dotColorClass: meta.dot,
    textColorClass: meta.text,
    actionLabel: 'ดูผล',
    actionVariant: 'secondary',
    isActionDisabled: false,
    actionTooltip: 'ดูผลการประเมินและรายละเอียดคะแนน',
  };
}
