/**
 * ============================================================================
 * ManStat-Modern: School Organization Structure & Governance Helpers
 * ============================================================================
 * Binds real personnel and school board data into the 4 administrative divisions:
 * 1. วิชาการ (Academic Affairs)
 * 2. งบประมาณ (Budget & Planning)
 * 3. บุคคล (Personnel Administration)
 * 4. ทั่วไป (General Administration)
 * ============================================================================
 */

import type { TeacherRecord } from '@/lib/data/schoolData';
import { formatAcademicStandingSubtext } from './staff-sorting';

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
 * Resolves the division head dynamically from the current teacher records
 */
export function findDivisionHead(
  teachers: TeacherRecord[],
  divisionKey: DivisionKey
): HeadInfo {
  let matched: TeacherRecord | undefined;

  switch (divisionKey) {
    case 'academic':
      matched =
        teachers.find((t) => t.division?.includes('หัวหน้าฝ่ายบริหารวิชาการ') || t.division?.includes('บริหารวิชาการ')) ||
        teachers.find((t) => t.id === 'TCH-004');
      break;

    case 'budget':
      matched =
        teachers.find((t) => t.division?.includes('หัวหน้าฝ่ายบริหารงบประมาณ') || t.division?.includes('บริหารงบประมาณ')) ||
        teachers.find((t) => t.id === 'TCH-008');
      break;

    case 'personnel':
      matched =
        teachers.find((t) => t.division?.includes('หัวหน้าฝ่ายบริหารงานบุคคล') || t.division?.includes('บริหารงานบุคคล')) ||
        teachers.find((t) => t.id === 'TCH-007');
      break;

    case 'general':
      matched =
        teachers.find((t) => t.division?.includes('หัวหน้าฝ่ายบริหารทั่วไป') || t.division?.includes('บริหารทั่วไป')) ||
        teachers.find((t) => t.id === 'TCH-003');
      break;
  }

  if (matched) {
    return {
      name: matched.name,
      position: matched.position,
      positionFormatted: formatStaffPositionAndStanding(matched),
      teacher: matched,
    };
  }

  return {
    name: 'ยังไม่ได้ระบุ',
    position: 'ครูผู้สอน',
    positionFormatted: 'ครูผู้สอน',
  };
}

/**
 * Resolves the school director information from real teacher records
 */
export function getDirectorInfo(
  teachers: TeacherRecord[],
  fallbackName: string = 'นายธีรศักดิ์ มโนธรรม',
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
      name: director.name,
      positionFormatted: sub ? `${pos} · ${sub}` : pos,
    };
  }

  return {
    name: fallbackName,
    positionFormatted: fallbackPosition,
  };
}
