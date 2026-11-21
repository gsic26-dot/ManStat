/**
 * ============================================================================
 * ManStat: License Grouping & Aggregation Engine (license-grouping.ts)
 * ============================================================================
 * - Groups teaching and administrative licenses strictly by person (1 row = 1 staff)
 * - Identifies nearest expiration date and most urgent status across held licenses
 * - Formats concise license names without parentheses
 * - Incorporates eligible staff (Management & Teaching) missing license records
 * - Excludes support staff without licenses
 * ============================================================================
 */

import type { TeacherRecord } from '@/lib/data/schoolData';
import { evaluateLicenseHealth } from '@/lib/regulations/khurusapha-and-pa';
import {
  getStaffBranch,
  groupAndSortTeachers,
  type StaffBranchCategory,
} from '@/lib/regulations/staff-sorting';

export type PersonLicenseHealth = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';

export interface EvaluatedLicense {
  category: string;
  type: string;
  shortType: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  daysRemaining: number;
  health: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
}

export interface PersonLicenseRecord {
  id: string;
  employeeCode: string;
  name: string;
  position: string;
  department: string;
  branch: StaffBranchCategory;
  licenses: EvaluatedLicense[];
  licensesCount: number;
  licensesDisplay: string;
  nearestExpiryDate: string | null;
  minDaysRemaining: number | null;
  overallHealth: PersonLicenseHealth;
}

export interface PersonLicenseGroup {
  category: StaffBranchCategory;
  title: string;
  members: PersonLicenseRecord[];
}

export interface LicenseStats {
  totalLicenses: number;
  validLicenses: number;
  expiringSoonLicenses: number;
  expiredLicenses: number;
  missingStaffCount: number;
}

/**
 * Converts long regulatory license names into concise, professional labels without parentheses.
 */
export function formatLicenseShortName(type: string): string {
  if (!type) return '-';
  const t = type.trim();

  // 1. School & Educational Administrator
  if (
    t.includes('ผู้บริหารสถานศึกษา') ||
    t.includes('ผู้บริหารการศึกษา') ||
    t.includes('ผู้บริหาร')
  ) {
    return 'ใบอนุญาตผู้บริหาร';
  }

  // 2. Teaching B-License (ชั้นต้น)
  if (t.includes('B-License') || t.includes('B License') || t.includes('ชั้นต้น')) {
    return 'ครู B-License';
  }

  // 3. Teaching P-License (ปฏิบัติหน้าที่ครู)
  if (t.includes('P-License') || t.includes('P License') || t.includes('ปฏิบัติหน้าที่ครู')) {
    return 'ครู P-License';
  }

  // 4. Teaching A-License (ชั้นสูง)
  if (t.includes('A-License') || t.includes('A License') || t.includes('ชั้นสูง')) {
    return 'ครู A-License';
  }

  // 5. Education Supervisor
  if (t.includes('ศึกษานิเทศก์')) {
    return 'ใบอนุญาต ศน.';
  }

  // 6. Legacy / General Teaching
  if (t.includes('ครู')) {
    return 'ใบอนุญาตครู';
  }

  // Fallback: clean out any lingering parentheses
  return t.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Determines whether a staff member belongs to the teaching license monitoring base.
 * - Management & Teaching staff are always included (even with 0 licenses).
 * - Support staff are included ONLY IF they actually have a recorded license.
 */
export function isEligibleForLicenseRegistry(teacher: TeacherRecord): boolean {
  const branch = getStaffBranch(teacher);
  const hasLicenses = Array.isArray(teacher.licenses) && teacher.licenses.length > 0;
  if (branch === 'support' && !hasLicenses) {
    return false;
  }
  return true;
}

/**
 * Evaluates and aggregates all licenses for a single staff member into a PersonLicenseRecord.
 */
export function buildPersonLicenseRecord(
  teacher: TeacherRecord,
  referenceDate?: string | Date
): PersonLicenseRecord {
  const branch = getStaffBranch(teacher);
  const rawLicenses = Array.isArray(teacher.licenses) ? teacher.licenses : [];

  if (rawLicenses.length === 0) {
    return {
      id: teacher.id,
      employeeCode: teacher.employeeCode || '',
      name: teacher.name,
      position: teacher.position,
      department: teacher.department,
      branch,
      licenses: [],
      licensesCount: 0,
      licensesDisplay: '-',
      nearestExpiryDate: null,
      minDaysRemaining: null,
      overallHealth: 'MISSING',
    };
  }

  // Evaluate each license
  const evaluatedList: EvaluatedLicense[] = rawLicenses.map((lic) => {
    const healthResult = evaluateLicenseHealth(lic.expiryDate, referenceDate);
    return {
      category: lic.category,
      type: lic.type,
      shortType: formatLicenseShortName(lic.type),
      number: lic.number,
      issueDate: lic.issueDate,
      expiryDate: lic.expiryDate,
      daysRemaining: healthResult.daysRemaining,
      health: healthResult.health,
    };
  });

  // Sort licenses by daysRemaining ascending (nearest expiry first)
  evaluatedList.sort((a, b) => a.daysRemaining - b.daysRemaining);

  const nearestLic = evaluatedList[0];
  const distinctShortNames = Array.from(new Set(evaluatedList.map((l) => l.shortType)));
  const licensesDisplay = distinctShortNames.join(' · ');

  // Priority of urgency: EXPIRED > EXPIRING_SOON > VALID
  let overallHealth: PersonLicenseHealth = 'VALID';
  if (evaluatedList.some((l) => l.health === 'EXPIRED')) {
    overallHealth = 'EXPIRED';
  } else if (evaluatedList.some((l) => l.health === 'EXPIRING_SOON')) {
    overallHealth = 'EXPIRING_SOON';
  }

  return {
    id: teacher.id,
    employeeCode: teacher.employeeCode || '',
    name: teacher.name,
    position: teacher.position,
    department: teacher.department,
    branch,
    licenses: evaluatedList,
    licensesCount: evaluatedList.length,
    licensesDisplay,
    nearestExpiryDate: nearestLic.expiryDate,
    minDaysRemaining: nearestLic.daysRemaining,
    overallHealth,
  };
}

/**
 * Groups and sorts all eligible staff members into 3 official branches.
 */
export function groupAndSortLicenseRegistry(
  teachers: TeacherRecord[],
  referenceDate?: string | Date
): {
  groups: PersonLicenseGroup[];
  allEligiblePersons: PersonLicenseRecord[];
  stats: LicenseStats;
} {
  // 1. Filter eligible staff
  const eligibleTeachers = teachers.filter(isEligibleForLicenseRegistry);

  // 2. Sort according to official Thai civil service hierarchy
  const branchGroups = groupAndSortTeachers(eligibleTeachers);

  // 3. Transform to PersonLicenseRecord
  const allEligiblePersons: PersonLicenseRecord[] = [];
  const groups: PersonLicenseGroup[] = [];

  let totalLicenses = 0;
  let validLicenses = 0;
  let expiringSoonLicenses = 0;
  let expiredLicenses = 0;
  let missingStaffCount = 0;

  for (const bg of branchGroups) {
    const members: PersonLicenseRecord[] = [];
    for (const t of bg.members) {
      const personRecord = buildPersonLicenseRecord(t, referenceDate);
      members.push(personRecord);
      allEligiblePersons.push(personRecord);

      if (personRecord.overallHealth === 'MISSING') {
        missingStaffCount++;
      }

      for (const lic of personRecord.licenses) {
        totalLicenses++;
        if (lic.health === 'VALID') validLicenses++;
        else if (lic.health === 'EXPIRING_SOON') expiringSoonLicenses++;
        else if (lic.health === 'EXPIRED') expiredLicenses++;
      }
    }

    if (members.length > 0) {
      groups.push({
        category: bg.category,
        title: `${bg.category === 'management' ? 'สายบริหาร' : bg.category === 'teaching' ? 'สายการสอน' : 'สายสนับสนุน'} · ${members.length}`,
        members,
      });
    }
  }

  return {
    groups,
    allEligiblePersons,
    stats: {
      totalLicenses,
      validLicenses,
      expiringSoonLicenses,
      expiredLicenses,
      missingStaffCount,
    },
  };
}

/**
 * Checks whether a person record matches the selected filter status card.
 */
export function matchesHealthFilter(
  person: PersonLicenseRecord,
  filter: 'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING'
): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'MISSING') return person.overallHealth === 'MISSING';
  return person.licenses.some((lic) => lic.health === filter);
}
