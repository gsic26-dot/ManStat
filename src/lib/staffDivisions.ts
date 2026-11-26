/**
 * ============================================================================
 * ManStat: Staff Multi-Division Derivation (Single Source of Truth)
 * ============================================================================
 * Automatically derives a staff member's administrative division(s) from
 * Workload Category 2 ("งานบริหารและงานประจำฝ่าย/กลุ่มงาน"), supporting
 * staff who serve across 1–4 divisions simultaneously.
 *
 * Rules:
 * 1. School Director -> ['ผู้บริหารสถานศึกษา']
 * 2. Teachers & Support Staff -> unique normalized divisions from Category 2
 *    workloads (matching both staff.id and staff.employeeCode).
 * 3. Graceful Transition Fallback -> legacy staff.division when no Category 2
 *    workloads have been recorded yet.
 * ============================================================================
 */

import type { TeacherRecord, WorkloadItem } from '@/lib/data/schoolData';
import type { DivisionKey } from '@/lib/regulations/org-chart';

export const WORKLOAD_ADMIN_CATEGORY = 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน';

export const STANDARD_DIVISIONS = [
  'ฝ่ายบริหารวิชาการ',
  'ฝ่ายบริหารงบประมาณ',
  'ฝ่ายบริหารงานบุคคล',
  'ฝ่ายบริหารทั่วไป',
] as const;

export type StandardDivisionName = (typeof STANDARD_DIVISIONS)[number];

const DIVISION_KEY_TO_STANDARD: Record<DivisionKey, StandardDivisionName> = {
  academic: 'ฝ่ายบริหารวิชาการ',
  budget: 'ฝ่ายบริหารงบประมาณ',
  personnel: 'ฝ่ายบริหารงานบุคคล',
  general: 'ฝ่ายบริหารทั่วไป',
};

/**
 * Normalizes a raw work area / subGroupOrLevel string into one of the
 * 4 standard สพฐ. divisions when recognizable, or preserves a clean custom name.
 */
export function normalizeDivisionName(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return null;

  const lower = trimmed.toLowerCase();

  // 1. ฝ่ายบริหารวิชาการ
  if (
    lower.includes('วิชาการ') ||
    lower.includes('หลักสูตร') ||
    lower.includes('ทะเบียน') ||
    lower.includes('วัดผล') ||
    lower.includes('ห้องสมุด') ||
    lower.includes('เรียนรวม') ||
    lower.includes('นิเทศ')
  ) {
    return 'ฝ่ายบริหารวิชาการ';
  }

  // 2. ฝ่ายบริหารงบประมาณ
  if (
    lower.includes('งบประมาณ') ||
    lower.includes('การเงิน') ||
    lower.includes('บัญชี') ||
    lower.includes('พัสดุ') ||
    lower.includes('e-gp') ||
    lower.includes('สวัสดิการ') ||
    lower.includes('อาหารกลางวัน')
  ) {
    return 'ฝ่ายบริหารงบประมาณ';
  }

  // 3. ฝ่ายบริหารงานบุคคล
  if (
    lower.includes('บุคคล') ||
    lower.includes('อัตรากำลัง') ||
    lower.includes('วิทยฐานะ') ||
    lower.includes('pa/dpa') ||
    lower.includes('สิทธิประโยชน์') ||
    lower.includes('วินัย')
  ) {
    return 'ฝ่ายบริหารงานบุคคล';
  }

  // 4. ฝ่ายบริหารทั่วไป
  if (
    lower.includes('ทั่วไป') ||
    lower.includes('สารบรรณ') ||
    lower.includes('ธุรการ') ||
    lower.includes('อาคารสถานที่') ||
    lower.includes('ict') ||
    lower.includes('เครือข่าย') ||
    lower.includes('ยานพาหนะ') ||
    lower.includes('ประชาสัมพันธ์') ||
    lower.includes('อนามัย') ||
    lower.includes('ประกันคุณภาพ') ||
    lower.includes('sar') ||
    lower.includes('ควบคุมภายใน') ||
    lower.includes('กิจการนักเรียน')
  ) {
    return 'ฝ่ายบริหารทั่วไป';
  }

  return trimmed;
}

export type StaffDivisionInput = Pick<
  TeacherRecord,
  'id' | 'employeeCode' | 'position' | 'division'
>;

/**
 * Derives unique administrative divisions for a staff member from Workload Category 2,
 * with automatic Director detection and graceful fallback to legacy staff.division.
 */
export function getStaffDivisions(
  staff: StaffDivisionInput | null | undefined,
  workloads: WorkloadItem[] = []
): string[] {
  if (!staff) return [];

  const pos = (staff.position || '').trim();
  if (
    pos.includes('ผู้อำนวยการ') ||
    pos.includes('ผอ.') ||
    staff.employeeCode === 'EXE-001'
  ) {
    return ['ผู้บริหารสถานศึกษา'];
  }

  const cat2Items = workloads.filter((w) => {
    if (w.category !== WORKLOAD_ADMIN_CATEGORY) return false;
    const matchId = Boolean(staff.id && w.teacherId === staff.id);
    const matchCode = Boolean(staff.employeeCode && w.teacherId === staff.employeeCode);
    return matchId || matchCode;
  });

  if (cat2Items.length > 0) {
    const uniqueSet = new Set<string>();
    for (const item of cat2Items) {
      const resolved =
        normalizeDivisionName(item.subGroupOrLevel) ||
        normalizeDivisionName(item.title);
      if (resolved) {
        uniqueSet.add(resolved);
      }
    }

    if (uniqueSet.size > 0) {
      const standardOrder = STANDARD_DIVISIONS.filter((d) => uniqueSet.has(d));
      const customOthers = Array.from(uniqueSet).filter(
        (d) => !(STANDARD_DIVISIONS as readonly string[]).includes(d)
      );
      return [...standardOrder, ...customOthers];
    }
  }

  // Graceful Transition Fallback: legacy staff.division when no Category 2 workload exists yet
  const legacyRaw = (staff.division || '').trim();
  if (legacyRaw && legacyRaw !== '-' && legacyRaw !== 'ครูผู้สอน') {
    const normalizedLegacy = normalizeDivisionName(legacyRaw);
    return normalizedLegacy ? [normalizedLegacy] : [legacyRaw];
  }

  return [];
}

/**
 * Returns all staff members serving under a specific standard division key
 * (academic / budget / personnel / general), supporting multi-division membership.
 */
export function getDivisionMembers(
  teachers: TeacherRecord[],
  workloads: WorkloadItem[],
  divisionKey: DivisionKey
): TeacherRecord[] {
  const targetDivision = DIVISION_KEY_TO_STANDARD[divisionKey];
  return teachers.filter((teacher) => {
    const divisions = getStaffDivisions(teacher, workloads);
    return divisions.includes(targetDivision);
  });
}
