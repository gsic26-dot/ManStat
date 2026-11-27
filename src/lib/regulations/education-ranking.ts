/**
 * ============================================================================
 * ManStat: Education Qualification Ranking & Highest-Education Sync
 * ============================================================================
 * Pure helper for ranking structured ก.ค.ศ. education entries, hydrating legacy
 * primary education fields into `educations[]`, and syncing the highest
 * qualification back to `TeacherRecord` primary columns (`educationLevel`,
 * `educationProgramYears`, `educationDegree`, `major`, `educationInstitution`,
 * `educationGradYear`).
 *
 * Official Precedence (High -> Low):
 *   5. ปริญญาเอก
 *   4. ปริญญาโท
 *   3. ประกาศนียบัตรบัณฑิต (ป.บัณฑิต)
 *   2. ปริญญาตรี
 *   1. ต่ำกว่าปริญญาตรี
 * Tie-breaker: Latest graduation year (พ.ศ.) descending.
 * ============================================================================
 */

import type { TeacherRecord } from '@/lib/data/schoolData';

export interface EducationEntry {
  level?: string;
  programYears?: string;
  degree: string;
  major: string;
  institute: string;
  gradYear: string;
}

export interface PrimaryEducationFields {
  educationLevel: string;
  educationProgramYears: string;
  educationDegree: string;
  major: string;
  educationInstitution: string;
  educationGradYear: string;
}

/**
 * Infers standard ก.ค.ศ. education level from explicit `level` or legacy `degree` string.
 */
export function inferEducationLevel(entry: Pick<EducationEntry, 'level' | 'degree'>): string {
  const explicit = (entry.level || '').trim();
  if (explicit) return explicit;

  const deg = (entry.degree || '').trim();
  if (!deg) return '';
  if (deg.includes('ปริญญาเอก') || deg.includes('ดุษฎีบัณฑิต') || /ปร\.ด\.|ค\.ด\.|ศษ\.ด\.|กศ\.ด\.|วท\.ด\.|ค\.อ\.ด\.|พธ\.ด\./.test(deg)) {
    return 'ปริญญาเอก';
  }
  if (deg.includes('ปริญญาโท') || deg.includes('มหาบัณฑิต') || /ค\.ม\.|ศษ\.ม\.|กศ\.ม\.|วท\.ม\.|ศศ\.ม\.|บธ\.ม\.|รป\.ม\.|น\.ม\.|วศ\.ม\.|พธ\.ม\.|ศป\.ม\.|ค\.อ\.ม\./.test(deg)) {
    return 'ปริญญาโท';
  }
  if (deg.includes('ประกาศนียบัตรบัณฑิต') || deg.includes('ป.บัณฑิต')) {
    return 'ประกาศนียบัตรบัณฑิต (ป.บัณฑิต)';
  }
  if (deg.includes('ต่ำกว่าปริญญาตรี') || deg.includes('ม.6') || deg.includes('ปวช') || deg.includes('ปวส') || deg.includes('อนุปริญญา')) {
    return 'ต่ำกว่าปริญญาตรี';
  }
  if (deg.includes('ปริญญาตรี') || deg.includes('บัณฑิต') || /ค\.บ\.|ศษ\.บ\.|กศ\.บ\.|วท\.บ\.|ศศ\.บ\.|บธ\.บ\.|บช\.บ\.|ร\.บ\.|รป\.บ\.|น\.บ\.|วศ\.บ\.|ทล\.บ\.|พธ\.บ\.|พย\.บ\.|ส\.บ\.|ศ\.บ\.|ศป\.บ\.|ดศ\.บ\.|ค\.อ\.บ\./.test(deg)) {
    return 'ปริญญาตรี';
  }
  return '';
}

export function getEducationLevelScore(entry: Pick<EducationEntry, 'level' | 'degree'>): number {
  const level = inferEducationLevel(entry);
  if (level.includes('ปริญญาเอก')) return 5;
  if (level.includes('ปริญญาโท')) return 4;
  if (level.includes('ประกาศนียบัตรบัณฑิต') || level.includes('ป.บัณฑิต')) return 3;
  if (level.includes('ต่ำกว่าปริญญาตรี')) return 1;
  if (level.includes('ปริญญาตรี')) return 2;
  return 0;
}

function parseGradYearNumber(gradYear?: string | null): number {
  if (!gradYear) return 0;
  const digits = gradYear.replace(/\D/g, '');
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Sorts education entries from highest level down, breaking ties by latest graduation year.
 */
export function sortEducationsHighestFirst(entries: EducationEntry[]): EducationEntry[] {
  return [...entries].sort((a, b) => {
    const scoreDiff = getEducationLevelScore(b) - getEducationLevelScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return parseGradYearNumber(b.gradYear) - parseGradYearNumber(a.gradYear);
  });
}

/**
 * Hydrates legacy primary education fields into `educations[]` when `educations` is empty
 * so existing staff education data never appears blank or gets lost.
 */
export function hydrateEducationsList(
  staff: Pick<
    TeacherRecord,
    | 'educations'
    | 'educationLevel'
    | 'educationProgramYears'
    | 'educationDegree'
    | 'major'
    | 'educationInstitution'
    | 'educationGradYear'
  >
): EducationEntry[] {
  const existing = Array.isArray(staff.educations) ? staff.educations : [];
  if (existing.length > 0) {
    return sortEducationsHighestFirst(
      existing.map((e) => ({
        ...e,
        level: inferEducationLevel(e) || e.level || '',
      }))
    );
  }

  const hasLegacyPrimary = Boolean(
    (staff.educationLevel && staff.educationLevel.trim()) ||
      (staff.educationDegree && staff.educationDegree.trim()) ||
      (staff.major && staff.major.trim())
  );

  if (!hasLegacyPrimary) return [];

  return [
    {
      level: (staff.educationLevel || '').trim() || inferEducationLevel({ degree: staff.educationDegree || '' }),
      programYears: (staff.educationProgramYears || '').trim(),
      degree: (staff.educationDegree || '').trim(),
      major: (staff.major || '').trim(),
      institute: (staff.educationInstitution || '').trim(),
      gradYear: (staff.educationGradYear || '').trim(),
    },
  ];
}

/**
 * Resolves the highest education entry into TeacherRecord primary columns.
 */
export function resolveHighestEducation(entries: EducationEntry[]): PrimaryEducationFields {
  if (!entries || entries.length === 0) {
    return {
      educationLevel: '',
      educationProgramYears: '',
      educationDegree: '',
      major: '',
      educationInstitution: '',
      educationGradYear: '',
    };
  }

  const sorted = sortEducationsHighestFirst(entries);
  const top = sorted[0];
  return {
    educationLevel: inferEducationLevel(top) || (top.level || '').trim(),
    educationProgramYears: (top.programYears || '').trim(),
    educationDegree: (top.degree || '').trim(),
    major: (top.major || '').trim(),
    educationInstitution: (top.institute || '').trim(),
    educationGradYear: (top.gradYear || '').trim(),
  };
}
