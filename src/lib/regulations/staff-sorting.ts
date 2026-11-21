/**
 * ============================================================================
 * ManStat: Official Thai Civil Service Staff Sorting & Categorization
 * ============================================================================
 * Categorizes and sorts school personnel into 3 official branches:
 * 1. สายบริหาร (Management): ผู้อำนวยการ -> รองผู้อำนวยการ
 * 2. สายการสอน (Teaching): เรียงตามวิทยฐานะ คศ. 5 -> คศ. 4 -> คศ. 3 -> คศ. 2 -> คศ. 1 -> ครูผู้ช่วย -> อัตราจ้าง
 * 3. สายสนับสนุน (Support): เจ้าหน้าที่ธุรการ -> นักการภารโรง -> สายสนับสนุน/อัตราจ้างอื่นๆ
 * ============================================================================
 */

import type { TeacherRecord } from '@/lib/data/schoolData';

export type StaffBranchCategory = 'management' | 'teaching' | 'support';

export interface StaffBranchGroup {
  category: StaffBranchCategory;
  title: string;
  members: TeacherRecord[];
}

/**
 * Categorizes a staff member into one of three official branches:
 * 1. สายบริหาร (Management / Executive)
 * 2. สายการสอน (Teaching)
 * 3. สายสนับสนุน (Support Staff)
 */
export function getStaffBranch(teacher: TeacherRecord): StaffBranchCategory {
  const code = teacher.employeeCode || '';
  const pos = teacher.position || '';
  const dept = teacher.department || '';

  // 1. Management / Executive
  if (
    code.startsWith('EXE') ||
    pos.includes('ผู้อำนวยการ') ||
    pos.includes('ผอ.') ||
    pos.includes('รองผู้อำนวยการ') ||
    pos.includes('รอง ผอ.')
  ) {
    return 'management';
  }

  // 2. Support Staff
  if (
    code.startsWith('STF') ||
    pos.includes('ธุรการ') ||
    pos.includes('นักการ') ||
    pos.includes('ภารโรง') ||
    pos.includes('พี่เลี้ยง') ||
    pos.includes('จ้างเหมา') ||
    pos.includes('คนครัว') ||
    pos.includes('ยาม') ||
    pos.includes('ขับรถ') ||
    pos.includes('ลูกจ้าง') ||
    (dept.includes('สนับสนุน') && !pos.includes('ครู'))
  ) {
    return 'support';
  }

  // 3. Teaching Staff (Default for teachers)
  return 'teaching';
}

/**
 * Returns rank value for sorting within teaching staff (lower number = higher seniority/rank)
 * 1. เชี่ยวชาญพิเศษ / คศ. 5
 * 2. เชี่ยวชาญ / คศ. 4
 * 3. ชำนาญการพิเศษ / คศ. 3
 * 4. ชำนาญการ / คศ. 2
 * 5. ครู คศ. 1 (ครู)
 * 6. ครูผู้ช่วย
 * 7. ครูอัตราจ้าง / พนักงานราชการสอน / อื่นๆ
 */
export function getTeachingRank(teacher: TeacherRecord): number {
  const combined = `${teacher.academicStanding || ''} ${teacher.position || ''}`;
  if (combined.includes('เชี่ยวชาญพิเศษ') || combined.includes('คศ. 5') || combined.includes('คศ.5')) return 1;
  if (combined.includes('เชี่ยวชาญ') || combined.includes('คศ. 4') || combined.includes('คศ.4')) return 2;
  if (combined.includes('ชำนาญการพิเศษ') || combined.includes('คศ. 3') || combined.includes('คศ.3')) return 3;
  if (combined.includes('ชำนาญการ') || combined.includes('คศ. 2') || combined.includes('คศ.2')) return 4;
  if (
    combined.includes('ครู คศ. 1') ||
    combined.includes('คศ. 1') ||
    combined.includes('คศ.1') ||
    (teacher.position.includes('ครู') && !teacher.position.includes('ผู้ช่วย') && !teacher.position.includes('อัตราจ้าง'))
  ) {
    return 5;
  }
  if (combined.includes('ครูผู้ช่วย')) return 6;
  return 7;
}

/**
 * Returns rank value for sorting within support staff
 * 1. เจ้าหน้าที่ธุรการ
 * 2. นักการภารโรง
 * 3. สายสนับสนุน / อัตราจ้างอื่นๆ
 */
export function getSupportRank(teacher: TeacherRecord): number {
  const pos = teacher.position || '';
  if (pos.includes('ธุรการ')) return 1;
  if (pos.includes('นักการ') || pos.includes('ภารโรง')) return 2;
  return 3;
}

/**
 * Returns rank value for sorting within management
 * 1. ผู้อำนวยการ
 * 2. รองผู้อำนวยการ
 */
export function getManagementRank(teacher: TeacherRecord): number {
  const pos = teacher.position || '';
  if (pos.includes('รอง')) return 2;
  return 1;
}

/**
 * Sorts and groups teachers according to official Thai civil service hierarchy:
 * Group 1: สายบริหาร (ผู้อำนวยการ -> รองผู้อำนวยการ)
 * Group 2: สายการสอน (เรียงตามวิทยฐานะ คศ.5 -> คศ.4 -> คศ.3 -> คศ.2 -> คศ.1 -> ครูผู้ช่วย -> อัตราจ้าง)
 * Group 3: สายสนับสนุน (ธุรการ -> นักการภารโรง -> สนับสนุนอื่นๆ)
 * Within each rank/tier, sorted by employeeCode ascending.
 */
export function groupAndSortTeachers(teachers: TeacherRecord[]): StaffBranchGroup[] {
  const management: TeacherRecord[] = [];
  const teaching: TeacherRecord[] = [];
  const support: TeacherRecord[] = [];

  for (const t of teachers) {
    const branch = getStaffBranch(t);
    if (branch === 'management') management.push(t);
    else if (branch === 'support') support.push(t);
    else teaching.push(t);
  }

  management.sort((a, b) => {
    const rankDiff = getManagementRank(a) - getManagementRank(b);
    if (rankDiff !== 0) return rankDiff;
    return (a.employeeCode || '').localeCompare(b.employeeCode || '', undefined, { numeric: true });
  });

  teaching.sort((a, b) => {
    const rankDiff = getTeachingRank(a) - getTeachingRank(b);
    if (rankDiff !== 0) return rankDiff;
    return (a.employeeCode || '').localeCompare(b.employeeCode || '', undefined, { numeric: true });
  });

  support.sort((a, b) => {
    const rankDiff = getSupportRank(a) - getSupportRank(b);
    if (rankDiff !== 0) return rankDiff;
    return (a.employeeCode || '').localeCompare(b.employeeCode || '', undefined, { numeric: true });
  });

  const result: StaffBranchGroup[] = [];
  if (management.length > 0) {
    result.push({
      category: 'management',
      title: `สายบริหาร · ${management.length}`,
      members: management,
    });
  }
  if (teaching.length > 0) {
    result.push({
      category: 'teaching',
      title: `สายการสอน · ${teaching.length}`,
      members: teaching,
    });
  }
  if (support.length > 0) {
    result.push({
      category: 'support',
      title: `สายสนับสนุน · ${support.length}`,
      members: support,
    });
  }

  return result;
}

/**
 * Returns a flat sorted list of teachers following the 3-tier branch hierarchy
 */
export function sortTeachersByBranch(teachers: TeacherRecord[]): TeacherRecord[] {
  const groups = groupAndSortTeachers(teachers);
  return groups.flatMap((g) => g.members);
}

/**
 * Helper to clean and format academic standing for subtitle display
 * - If standing is '-' or empty or 'ไม่มีวิทยฐานะ' -> returns null (hide line 2)
 * - If standing is redundant with position (e.g. pos: "ครูชำนาญการพิเศษ", standing: "ครูชำนาญการพิเศษ") -> "คศ. 3"
 * - If Director with standing -> "ชำนาญการพิเศษ · คศ. 3"
 */
export function formatAcademicStandingSubtext(
  position: string,
  academicStanding?: string
): string | null {
  if (
    !academicStanding ||
    academicStanding === '-' ||
    academicStanding.trim() === '' ||
    academicStanding === 'ไม่มีวิทยฐานะ'
  ) {
    return null;
  }

  const cleanStanding = academicStanding.trim();

  // If standing or position already specifies rank
  if (position.includes('ชำนาญการพิเศษ') || cleanStanding === 'ครูชำนาญการพิเศษ') {
    return 'คศ. 3';
  }
  if (position.includes('เชี่ยวชาญพิเศษ') || cleanStanding === 'ครูเชี่ยวชาญพิเศษ') {
    return 'คศ. 5';
  }
  if (position.includes('เชี่ยวชาญ') || cleanStanding === 'ครูเชี่ยวชาญ') {
    return 'คศ. 4';
  }
  if (position.includes('ชำนาญการ') || cleanStanding === 'ครูชำนาญการ') {
    return 'คศ. 2';
  }
  if (position.includes('คศ. 1') || cleanStanding === 'ครู คศ. 1' || cleanStanding === 'คศ. 1') {
    return null;
  }

  // Remove redundant "ครู" prefix from standing
  const stripped = cleanStanding.replace(/^ครู\s*/, '').replace(/[()]/g, '').trim();

  if (position.includes('ผอ.') || position.includes('ผู้อำนวยการ')) {
    if (stripped.includes('ชำนาญการพิเศษ')) return 'ชำนาญการพิเศษ · คศ. 3';
    if (stripped.includes('เชี่ยวชาญพิเศษ')) return 'เชี่ยวชาญพิเศษ · คศ. 5';
    if (stripped.includes('เชี่ยวชาญ')) return 'เชี่ยวชาญ · คศ. 4';
  }

  return stripped || null;
}
