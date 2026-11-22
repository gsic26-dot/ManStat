/**
 * ============================================================================
 * ManStat: School Organization Structure & Governance Helpers
 * ============================================================================
 * Binds real personnel and school board data into the 4 administrative divisions:
 * 1. วิชาการ (Academic Affairs)
 * 2. งบประมาณ (Budget & Planning)
 * 3. บุคคล (Personnel Administration)
 * 4. ทั่วไป (General Administration)
 * ============================================================================
 */

import type { TeacherRecord } from '@/lib/data/schoolData';
import { formatAcademicStandingSubtext, getStaffBranch } from './staff-sorting';
import { formatStaffName } from './staff-formatting';

export type DivisionKey = 'academic' | 'budget' | 'personnel' | 'general';

export interface HeadInfo {
  name: string;
  position: string;
  positionFormatted: string;
  teacher?: TeacherRecord;
}

/**
 * Formats teacher position and academic standing cleanly without parentheses
 * - e.g. "ครูชำนาญการพิเศษ" + "ครูชำนาญการพิเศษ" -> "ครูชำนาญการพิเศษ · คศ. 3"
 * - e.g. "ครู คศ. 1" + "-" -> "ครู คศ. 1"
 * - e.g. "ครูผู้ช่วย" + "-" -> "ครูผู้ช่วย"
 */
export function formatStaffPositionAndStanding(teacher: TeacherRecord): string {
  const sub = formatAcademicStandingSubtext(teacher.position, teacher.academicStanding);
  return sub ? `${teacher.position} · ${sub}` : teacher.position;
}

/**
 * Resolves the division head dynamically from the current teacher records.
 * CRITICAL RULE: Division heads can ONLY be civil service teaching staff (สายการสอน).
 * Support staff (บุคลากรทางการศึกษา/ลูกจ้างประจำ เช่น นักการภารโรง, ธุรการ) must NEVER be assigned as division heads.
 */
export function findDivisionHead(
  teachers: TeacherRecord[],
  divisionKey: DivisionKey
): HeadInfo {
  // Strictly filter to teaching staff only (สายการสอน)
  const teachingStaff = teachers.filter((t) => getStaffBranch(t) === 'teaching');

  let matched: TeacherRecord | undefined;

  switch (divisionKey) {
    case 'academic':
      matched =
        teachingStaff.find((t) => t.division?.includes('หัวหน้าฝ่ายบริหารวิชาการ') || t.division?.includes('หัวหน้างานวิชาการ')) ||
        teachingStaff.find((t) => t.division?.includes('บริหารวิชาการ') && !t.division?.includes('เจ้าหน้าที่'));
      break;

    case 'budget':
      matched =
        teachingStaff.find((t) => t.division?.includes('หัวหน้าฝ่ายบริหารงบประมาณ') || t.division?.includes('หัวหน้างานงบประมาณ')) ||
        teachingStaff.find((t) => t.division?.includes('บริหารงบประมาณ') && !t.division?.includes('เจ้าหน้าที่'));
      break;

    case 'personnel':
      matched =
        teachingStaff.find((t) => t.division?.includes('หัวหน้าฝ่ายบริหารงานบุคคล') || t.division?.includes('หัวหน้างานบุคคล')) ||
        teachingStaff.find((t) => t.division?.includes('บริหารงานบุคคล') && !t.division?.includes('เจ้าหน้าที่'));
      break;

    case 'general':
      matched =
        teachingStaff.find((t) => t.division?.includes('หัวหน้าฝ่ายบริหารทั่วไป') || t.division?.includes('หัวหน้างานบริหารทั่วไป')) ||
        teachingStaff.find((t) => t.division?.includes('บริหารทั่วไป') && !t.division?.includes('เจ้าหน้าที่'));
      break;
  }

  if (matched) {
    return {
      name: formatStaffName(matched),
      position: matched.position,
      positionFormatted: formatStaffPositionAndStanding(matched),
      teacher: matched,
    };
  }

  return {
    name: 'ยังไม่ได้แต่งตั้ง',
    position: 'ครูผู้สอน',
    positionFormatted: 'ครูผู้สอน',
  };
}

/**
 * Resolves the school director information from real teacher records
 */
export function getDirectorInfo(
  teachers: TeacherRecord[],
  fallbackName: string = 'ผู้อำนวยการสถานศึกษา',
  fallbackPosition: string = 'ผู้อำนวยการสถานศึกษา'
): { name: string; positionFormatted: string } {
  const director = teachers.find(
    (t) =>
      t.id.startsWith('EXE') ||
      t.position.includes('ผู้อำนวยการ') ||
      t.position.includes('ผอ.')
  );

  if (director) {
    const sub = formatAcademicStandingSubtext(director.position, director.academicStanding);
    const pos = director.position.replace('ผู้อำนวยการโรงเรียนชุมชนบ้านตะขบ', 'ผู้อำนวยการสถานศึกษา')
      .replace('ผู้อำนวยการโรงเรียน', 'ผู้อำนวยการสถานศึกษา');
    return {
      name: formatStaffName(director),
      positionFormatted: sub ? `${pos} · ${sub}` : pos,
    };
  }

  return {
    name: formatStaffName(fallbackName),
    positionFormatted: fallbackPosition,
  };
}
