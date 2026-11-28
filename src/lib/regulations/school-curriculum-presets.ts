/**
 * ============================================================================
 * ManStat: School Curriculum Presets & Calculation Engine (Phase 11.1)
 * ============================================================================
 * Thai OBEC Standard Curriculum (อ.1–ม.3):
 * - Kindergarten (อ.1–อ.3): 6 Core Experience Blocks (หลักสูตรการศึกษาปฐมวัย 2560)
 * - Primary (ป.1–ป.6): 8 Core Subject Groups + Activities (หลักสูตรแกนกลางฯ 2551/2560)
 * - Lower Secondary (ม.1–ม.3): Semester-split Core Subjects (เทอม 1 / เทอม 2) with Credits
 * Pure, deterministic helpers — zero side effects, 100% unit-testable.
 * ============================================================================
 */

import type {
  SchoolSubject,
  SchoolSubjectType,
  SubjectLevelGroup,
  SubjectSemesterScope,
  TimetableAllocation,
  TimetableSemester,
} from '@/lib/data/timetableTypes';

export const DEFAULT_CURRICULUM_VERSION = 'หลักสูตรสถานศึกษา 2555 (ปรับปรุงล่าสุด)';

export const SCHOOL_SUBJECT_GROUPS: readonly string[] = [
  'ภาษาไทย',
  'คณิตศาสตร์',
  'วิทยาศาสตร์และเทคโนโลยี',
  'สังคมศึกษา ศาสนา และวัฒนธรรม',
  'สุขศึกษาและพลศึกษา',
  'ศิลปะ',
  'การงานอาชีพ',
  'ภาษาต่างประเทศ',
  'กิจกรรมพัฒนาผู้เรียน',
  'ปฐมวัย',
  'วิชาเฉพาะโรงเรียน',
] as const;

export const SCHOOL_SUBJECT_TYPES: readonly SchoolSubjectType[] = [
  'พื้นฐาน',
  'เพิ่มเติม',
  'กิจกรรมพัฒนาผู้เรียน',
  'ประจำชั้น',
  'ประสบการณ์ปฐมวัย',
] as const;

export const GRADE_LEVELS_BY_GROUP: Record<SubjectLevelGroup, readonly string[]> = {
  kindergarten: ['อ.1', 'อ.2', 'อ.3'],
  primary: ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'],
  secondary: ['ม.1', 'ม.2', 'ม.3'],
};

export const ALL_SCHOOL_GRADE_LEVELS: readonly string[] = [
  ...GRADE_LEVELS_BY_GROUP.kindergarten,
  ...GRADE_LEVELS_BY_GROUP.primary,
  ...GRADE_LEVELS_BY_GROUP.secondary,
];

export const SUBJECT_LEVEL_LABELS: Record<SubjectLevelGroup, string> = {
  kindergarten: 'ปฐมวัย (อ.1–อ.3)',
  primary: 'ประถมศึกษา (ป.1–ป.6)',
  secondary: 'มัธยมศึกษาตอนต้น (ม.1–ม.3)',
};

export const SEMESTER_SCOPE_LABELS: Record<SubjectSemesterScope, string> = {
  both: 'ทั้งปีการศึกษา',
  '1': 'ภาคเรียนที่ 1',
  '2': 'ภาคเรียนที่ 2',
};

/**
 * Primary OBEC standard: 40 weeks/year => hoursPerWeek * 40.
 */
export function calculatePrimaryHoursPerYear(hoursPerWeek: number): number {
  const safe = Number.isFinite(hoursPerWeek) && hoursPerWeek > 0 ? hoursPerWeek : 0;
  return Math.round(safe * 40);
}

/**
 * Secondary OBEC standard: 20 weeks/semester, 40 hrs/semester = 1.0 credit
 * => 2 hrs/week = 1.0 credit => hoursPerWeek * 0.5.
 */
export function calculateSecondaryCredits(hoursPerWeek: number): number {
  const safe = Number.isFinite(hoursPerWeek) && hoursPerWeek > 0 ? hoursPerWeek : 0;
  return Math.round(safe * 0.5 * 10) / 10;
}

/**
 * Deterministic deduplication key so re-seeding presets never creates duplicates.
 */
export function getSubjectDedupeKey(subject: {
  subjectCode?: string;
  subjectName: string;
  gradeLevels: readonly string[];
  semesterScope: SubjectSemesterScope;
}): string {
  const code = (subject.subjectCode || '').trim().toLowerCase();
  const name = (subject.subjectName || '').trim().toLowerCase();
  const grades = [...(subject.gradeLevels || [])]
    .map((g) => g.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'th'))
    .join(',');
  const sem = subject.semesterScope || 'both';
  return `${code}|${name}|${grades}|${sem}`;
}

export interface SchoolSubjectFilterOptions {
  search?: string;
  levelGroup?: SubjectLevelGroup | 'ALL';
  gradeLevel?: string | 'ALL';
  subjectGroup?: string | 'ALL';
  semesterScope?: SubjectSemesterScope | 'ALL';
  activeOnly?: boolean;
}

/**
 * Filters SchoolSubject list cleanly. Note: when filtering by semester `'1'` or `'2'`,
 * subjects with `semesterScope === 'both'` are also included because they run all year.
 */
export function filterSchoolSubjects(
  subjects: readonly SchoolSubject[],
  filters: SchoolSubjectFilterOptions
): SchoolSubject[] {
  const q = (filters.search || '').trim().toLowerCase();
  const level = filters.levelGroup && filters.levelGroup !== 'ALL' ? filters.levelGroup : null;
  const grade = filters.gradeLevel && filters.gradeLevel !== 'ALL' ? filters.gradeLevel : null;
  const group =
    filters.subjectGroup && filters.subjectGroup !== 'ALL' ? filters.subjectGroup : null;
  const sem =
    filters.semesterScope && filters.semesterScope !== 'ALL' ? filters.semesterScope : null;
  const activeOnly = Boolean(filters.activeOnly);

  return subjects.filter((s) => {
    if (activeOnly && !s.isActive) return false;
    if (level && s.levelGroup !== level) return false;
    if (grade && !s.gradeLevels.includes(grade)) return false;
    if (group && s.subjectGroup !== group) return false;
    if (sem) {
      if (sem === 'both') {
        if (s.semesterScope !== 'both') return false;
      } else if (s.semesterScope !== 'both' && s.semesterScope !== sem) {
        return false;
      }
    }
    if (q) {
      const hay = `${s.subjectCode} ${s.subjectName} ${s.subjectGroup} ${s.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Builds the complete Thai OBEC starter curriculum catalog covering อ.1–ม.3.
 */
export function buildDefaultObecCurriculumPresets(): SchoolSubject[] {
  const presets: SchoolSubject[] = [];
  let sortOrder = 10;

  const pushSubject = (
    input: Omit<SchoolSubject, 'sortOrder' | 'curriculumVersion' | 'isActive'> & {
      curriculumVersion?: string;
      isActive?: boolean;
    }
  ) => {
    presets.push({
      ...input,
      curriculumVersion: input.curriculumVersion || DEFAULT_CURRICULUM_VERSION,
      isActive: input.isActive ?? true,
      sortOrder,
    });
    sortOrder += 10;
  };

  // ==========================================================================
  // 1. KINDERGARTEN (ปฐมวัย อ.1–อ.3) — 6 Core Experience Blocks
  // ==========================================================================
  const kgActivities: Array<{ id: string; name: string; hoursPerWeek: number; desc: string }> = [
    {
      id: 'SUB-KG-01',
      name: 'กิจกรรมเคลื่อนไหวและจังหวะ',
      hoursPerWeek: 3,
      desc: 'พัฒนาการด้านร่างกาย การเคลื่อนไหวตามจังหวะและดนตรี',
    },
    {
      id: 'SUB-KG-02',
      name: 'กิจกรรมเสริมประสบการณ์',
      hoursPerWeek: 5,
      desc: 'เรียนรู้หน่วยประสบการณ์รอบตัว ภาษา คณิตศาสตร์ และทักษะชีวิตปฐมวัย',
    },
    {
      id: 'SUB-KG-03',
      name: 'กิจกรรมสร้างสรรค์',
      hoursPerWeek: 5,
      desc: 'ศิลปะ วาดภาพ ปั้น ฉีกตัดปะ เพื่อพัฒนากล้ามเนื้อมัดเล็กและจินตนาการ',
    },
    {
      id: 'SUB-KG-04',
      name: 'กิจกรรมเสรี (เล่นตามมุม)',
      hoursPerWeek: 5,
      desc: 'การเล่นอิสระตามมุมประสบการณ์ พัฒนาสังคมและอารมณ์',
    },
    {
      id: 'SUB-KG-05',
      name: 'กิจกรรมกลางแจ้ง',
      hoursPerWeek: 4,
      desc: 'เครื่องเล่นสนาม การละเล่นพื้นบ้าน พัฒนากล้ามเนื้อมัดใหญ่',
    },
    {
      id: 'SUB-KG-06',
      name: 'เกมการศึกษา',
      hoursPerWeek: 3,
      desc: 'เกมจับคู่ เรียงลำดับ จัดหมวดหมู่ พัฒนาสติปัญญาและการคิด',
    },
  ];

  for (const act of kgActivities) {
    pushSubject({
      id: act.id,
      subjectCode: '',
      subjectName: act.name,
      subjectGroup: 'ปฐมวัย',
      subjectType: 'ประสบการณ์ปฐมวัย',
      levelGroup: 'kindergarten',
      gradeLevels: ['อ.1', 'อ.2', 'อ.3'],
      semesterScope: 'both',
      defaultHoursPerWeek: act.hoursPerWeek,
      hoursPerYear: calculatePrimaryHoursPerYear(act.hoursPerWeek),
      credits: 0,
      preferMorning: act.id === 'SUB-KG-01' || act.id === 'SUB-KG-02',
      defaultConsecutive: 1,
      description: act.desc,
    });
  }

  // ==========================================================================
  // 2. PRIMARY (ประถมศึกษา ป.1–ป.6) — 8 OBEC Core Groups
  // ==========================================================================
  const primaryGrades = [
    { grade: 'ป.1', digit: 1, thaiHrs: 5, mathHrs: 5, sciHrs: 2, socHrs: 2, histHrs: 1, engHrs: 5 },
    { grade: 'ป.2', digit: 2, thaiHrs: 5, mathHrs: 5, sciHrs: 2, socHrs: 2, histHrs: 1, engHrs: 5 },
    { grade: 'ป.3', digit: 3, thaiHrs: 5, mathHrs: 5, sciHrs: 2, socHrs: 2, histHrs: 1, engHrs: 5 },
    { grade: 'ป.4', digit: 4, thaiHrs: 4, mathHrs: 4, sciHrs: 3, socHrs: 2, histHrs: 1, engHrs: 3 },
    { grade: 'ป.5', digit: 5, thaiHrs: 4, mathHrs: 4, sciHrs: 3, socHrs: 2, histHrs: 1, engHrs: 3 },
    { grade: 'ป.6', digit: 6, thaiHrs: 4, mathHrs: 4, sciHrs: 3, socHrs: 2, histHrs: 1, engHrs: 3 },
  ];

  for (const g of primaryGrades) {
    const coreList: Array<{
      code: string;
      name: string;
      group: string;
      hrs: number;
      preferMorning: boolean;
    }> = [
      { code: `ท1${g.digit}101`, name: 'ภาษาไทย', group: 'ภาษาไทย', hrs: g.thaiHrs, preferMorning: true },
      { code: `ค1${g.digit}101`, name: 'คณิตศาสตร์', group: 'คณิตศาสตร์', hrs: g.mathHrs, preferMorning: true },
      {
        code: `ว1${g.digit}101`,
        name: 'วิทยาศาสตร์และเทคโนโลยี',
        group: 'วิทยาศาสตร์และเทคโนโลยี',
        hrs: g.sciHrs,
        preferMorning: true,
      },
      {
        code: `ส1${g.digit}101`,
        name: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
        group: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
        hrs: g.socHrs,
        preferMorning: false,
      },
      {
        code: `ส1${g.digit}102`,
        name: 'ประวัติศาสตร์',
        group: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
        hrs: g.histHrs,
        preferMorning: false,
      },
      {
        code: `พ1${g.digit}101`,
        name: 'สุขศึกษาและพลศึกษา',
        group: 'สุขศึกษาและพลศึกษา',
        hrs: 2,
        preferMorning: false,
      },
      { code: `ศ1${g.digit}101`, name: 'ศิลปะ', group: 'ศิลปะ', hrs: 2, preferMorning: false },
      { code: `ง1${g.digit}101`, name: 'การงานอาชีพ', group: 'การงานอาชีพ', hrs: 1, preferMorning: false },
      {
        code: `อ1${g.digit}101`,
        name: 'ภาษาอังกฤษ',
        group: 'ภาษาต่างประเทศ',
        hrs: g.engHrs,
        preferMorning: true,
      },
    ];

    for (const c of coreList) {
      pushSubject({
        id: `SUB-P${g.digit}-${c.code}`,
        subjectCode: c.code,
        subjectName: c.name,
        subjectGroup: c.group,
        subjectType: 'พื้นฐาน',
        levelGroup: 'primary',
        gradeLevels: [g.grade],
        semesterScope: 'both',
        defaultHoursPerWeek: c.hrs,
        hoursPerYear: calculatePrimaryHoursPerYear(c.hrs),
        credits: 0,
        preferMorning: c.preferMorning,
        defaultConsecutive: 1,
        description: `รายวิชาพื้นฐานระดับชั้น ${g.grade} ตามโครงสร้างหลักสูตร สพฐ.`,
      });
    }
  }

  // Primary shared activities (ป.1–ป.6)
  const primaryActivities: Array<{
    id: string;
    name: string;
    type: SchoolSubjectType;
    hrs: number;
  }> = [
    { id: 'SUB-PRI-ACT-GUIDE', name: 'แนะแนว', type: 'กิจกรรมพัฒนาผู้เรียน', hrs: 1 },
    { id: 'SUB-PRI-ACT-SCOUT', name: 'ลูกเสือ-เนตรนารี', type: 'กิจกรรมพัฒนาผู้เรียน', hrs: 1 },
    { id: 'SUB-PRI-ACT-CLUB', name: 'ชุมนุม', type: 'กิจกรรมพัฒนาผู้เรียน', hrs: 1 },
    { id: 'SUB-PRI-ACT-HOME', name: 'พบครูประจำชั้น', type: 'ประจำชั้น', hrs: 2.5 },
  ];

  for (const act of primaryActivities) {
    pushSubject({
      id: act.id,
      subjectCode: '',
      subjectName: act.name,
      subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
      subjectType: act.type,
      levelGroup: 'primary',
      gradeLevels: ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'],
      semesterScope: 'both',
      defaultHoursPerWeek: act.hrs,
      hoursPerYear: calculatePrimaryHoursPerYear(act.hrs),
      credits: 0,
      preferMorning: false,
      defaultConsecutive: 1,
      description: 'กิจกรรมพัฒนาผู้เรียนระดับประถมศึกษา',
    });
  }

  // ==========================================================================
  // 3. LOWER SECONDARY (มัธยมศึกษาตอนต้น ม.1–ม.3) — Semester 1 & Semester 2
  // ==========================================================================
  const secondaryGrades = [
    { grade: 'ม.1', digit: 1 },
    { grade: 'ม.2', digit: 2 },
    { grade: 'ม.3', digit: 3 },
  ];

  const secondaryTemplates: Array<{
    prefix: string;
    codeOffset: number;
    name: string;
    group: string;
    hrs: number;
    preferMorning: boolean;
    consecutive: 1 | 2;
  }> = [
    { prefix: 'ท', codeOffset: 1, name: 'ภาษาไทย', group: 'ภาษาไทย', hrs: 3, preferMorning: true, consecutive: 1 },
    { prefix: 'ค', codeOffset: 1, name: 'คณิตศาสตร์', group: 'คณิตศาสตร์', hrs: 3, preferMorning: true, consecutive: 1 },
    {
      prefix: 'ว',
      codeOffset: 1,
      name: 'วิทยาศาสตร์และเทคโนโลยี',
      group: 'วิทยาศาสตร์และเทคโนโลยี',
      hrs: 3,
      preferMorning: true,
      consecutive: 1,
    },
    {
      prefix: 'ส',
      codeOffset: 1,
      name: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
      group: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
      hrs: 3,
      preferMorning: false,
      consecutive: 1,
    },
    {
      prefix: 'ส',
      codeOffset: 2,
      name: 'ประวัติศาสตร์',
      group: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
      hrs: 1,
      preferMorning: false,
      consecutive: 1,
    },
    {
      prefix: 'พ',
      codeOffset: 1,
      name: 'สุขศึกษาและพลศึกษา',
      group: 'สุขศึกษาและพลศึกษา',
      hrs: 2,
      preferMorning: false,
      consecutive: 1,
    },
    { prefix: 'ศ', codeOffset: 1, name: 'ศิลปะ', group: 'ศิลปะ', hrs: 2, preferMorning: false, consecutive: 1 },
    { prefix: 'ง', codeOffset: 1, name: 'การงานอาชีพ', group: 'การงานอาชีพ', hrs: 1, preferMorning: false, consecutive: 1 },
    {
      prefix: 'อ',
      codeOffset: 1,
      name: 'ภาษาอังกฤษ',
      group: 'ภาษาต่างประเทศ',
      hrs: 3,
      preferMorning: true,
      consecutive: 1,
    },
  ];

  for (const g of secondaryGrades) {
    for (const sem of ['1', '2'] as const) {
      const semNum = sem === '1' ? 1 : 2;
      for (const tpl of secondaryTemplates) {
        // Standard Thai OBEC secondary code:
        // Semester 1: e.g. ท21101, ส21101, ส21102 (ประวัติศาสตร์ เทอม 1)
        // Semester 2: e.g. ท21102, ส21103, ส21104 (ประวัติศาสตร์ เทอม 2)
        const suffixNum =
          tpl.prefix === 'ส'
            ? sem === '1'
              ? tpl.codeOffset
              : tpl.codeOffset + 2
            : semNum;
        const code = `${tpl.prefix}2${g.digit}10${suffixNum}`;
        const termOrdinal = (g.digit - 1) * 2 + semNum;

        pushSubject({
          id: `SUB-M${g.digit}-S${sem}-${code}`,
          subjectCode: code,
          subjectName: `${tpl.name} ${termOrdinal}`,
          subjectGroup: tpl.group,
          subjectType: 'พื้นฐาน',
          levelGroup: 'secondary',
          gradeLevels: [g.grade],
          semesterScope: sem,
          defaultHoursPerWeek: tpl.hrs,
          hoursPerYear: 0,
          credits: calculateSecondaryCredits(tpl.hrs),
          preferMorning: tpl.preferMorning,
          defaultConsecutive: tpl.consecutive,
          description: `รายวิชาพื้นฐานระดับชั้น ${g.grade} ภาคเรียนที่ ${sem} (${calculateSecondaryCredits(tpl.hrs)} หน่วยกิต)`,
        });
      }
    }
  }

  // Secondary shared activities (ม.1–ม.3)
  const secondaryActivities: Array<{
    id: string;
    name: string;
    type: SchoolSubjectType;
    hrs: number;
  }> = [
    { id: 'SUB-SEC-ACT-GUIDE', name: 'แนะแนว', type: 'กิจกรรมพัฒนาผู้เรียน', hrs: 1 },
    { id: 'SUB-SEC-ACT-SCOUT', name: 'ลูกเสือ-เนตรนารี', type: 'กิจกรรมพัฒนาผู้เรียน', hrs: 1 },
    { id: 'SUB-SEC-ACT-CLUB', name: 'ชุมนุม', type: 'กิจกรรมพัฒนาผู้เรียน', hrs: 1 },
    { id: 'SUB-SEC-ACT-HOME', name: 'พบครูประจำชั้น', type: 'ประจำชั้น', hrs: 2.5 },
  ];

  for (const act of secondaryActivities) {
    pushSubject({
      id: act.id,
      subjectCode: '',
      subjectName: act.name,
      subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
      subjectType: act.type,
      levelGroup: 'secondary',
      gradeLevels: ['ม.1', 'ม.2', 'ม.3'],
      semesterScope: 'both',
      defaultHoursPerWeek: act.hrs,
      hoursPerYear: 0,
      credits: 0,
      preferMorning: false,
      defaultConsecutive: 1,
      description: 'กิจกรรมพัฒนาผู้เรียนระดับมัธยมศึกษาตอนต้น',
    });
  }

  return presets;
}

// ============================================================================
// PHASE 11.2: ROOM CURRICULUM INTEGRATION & OBEC COMPLIANCE HELPERS
// ============================================================================

/**
 * Returns active catalog subjects matching (roomName, semester) that are NOT yet
 * allocated in that room (deduped by normalized subjectCode or subjectName).
 */
export function getMissingCatalogSubjectsForRoom(params: {
  catalogSubjects: readonly SchoolSubject[];
  existingAllocations: readonly TimetableAllocation[];
  roomName: string;
  semester: TimetableSemester;
}): SchoolSubject[] {
  const { catalogSubjects, existingAllocations, roomName, semester } = params;
  const cleanRoom = (roomName || '').trim();
  const roomAllocs = existingAllocations.filter((a) => (a.roomName || '').trim() === cleanRoom);

  const existingCodes = new Set<string>();
  const existingNames = new Set<string>();
  for (const a of roomAllocs) {
    const code = (a.subjectCode || '').trim().toLowerCase();
    const name = (a.subjectName || '').trim().toLowerCase();
    if (code) existingCodes.add(code);
    if (name) existingNames.add(name);
  }

  return catalogSubjects
    .filter((s) => {
      if (!s.isActive) return false;
      if (!s.gradeLevels.includes(cleanRoom)) return false;
      if (s.semesterScope !== 'both' && s.semesterScope !== semester) return false;

      const code = (s.subjectCode || '').trim().toLowerCase();
      const name = (s.subjectName || '').trim().toLowerCase();
      if (code && existingCodes.has(code)) return false;
      if (name && existingNames.has(name)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return (a.subjectCode || '').localeCompare(b.subjectCode || '', 'th');
    });
}

/**
 * Returns explicit subjectCode if already present; otherwise performs a deterministic
 * fallback lookup against catalogSubjects matching (subjectName, roomName, semester).
 */
export function resolveSubjectCodeForDisplay(params: {
  subjectCode?: string;
  subjectName: string;
  roomName: string;
  semester: TimetableSemester;
  catalogSubjects?: readonly SchoolSubject[];
}): string {
  const explicit = (params.subjectCode || '').trim();
  if (explicit) return explicit;

  const catalog = params.catalogSubjects;
  if (!catalog || catalog.length === 0) return '';

  const cleanName = (params.subjectName || '').trim().toLowerCase();
  const cleanRoom = (params.roomName || '').trim();
  if (!cleanName) return '';

  const candidates = catalog.filter(
    (s) =>
      (s.subjectCode || '').trim() !== '' &&
      (s.subjectName || '').trim().toLowerCase() === cleanName &&
      s.gradeLevels.includes(cleanRoom) &&
      (s.semesterScope === 'both' || s.semesterScope === params.semester)
  );

  if (candidates.length === 0) return '';
  const exactSem = candidates.find((s) => s.isActive && s.semesterScope === params.semester);
  const activeAny = candidates.find((s) => s.isActive);
  return (exactSem || activeAny || candidates[0]).subjectCode.trim();
}

export interface RoomCurriculumComplianceResult {
  roomName: string;
  level: 'primary' | 'secondary';
  coreHours: number;
  additionalHours: number;
  activityHours: number;
  homeroomHours: number;
  totalLearningHours: number;
  estimatedAnnualHours: number;
  estimatedSemesterCredits: number;
  obecTarget: {
    minAnnualHours: number;
    targetWeeklyHours: number;
    maxWeeklyHours: number;
    label: string;
  };
  status: 'meets_target' | 'below_target' | 'exceeds_capacity';
  catalogTotalForRoom: number;
  catalogAllocatedCount: number;
  missingCatalogSubjects: SchoolSubject[];
}

/**
 * Evaluates a room's course allocations against OBEC curriculum benchmarks
 * (ป.1–ป.6: >= 1,000 hrs/yr [25 hrs/wk]; ม.1–ม.3: >= 1,200 hrs/yr [30 hrs/wk]).
 */
export function evaluateRoomCurriculumCompliance(params: {
  roomName: string;
  semester: TimetableSemester;
  allocations: readonly TimetableAllocation[];
  catalogSubjects: readonly SchoolSubject[];
}): RoomCurriculumComplianceResult {
  const { roomName, semester, allocations, catalogSubjects } = params;
  const cleanRoom = (roomName || '').trim();
  const level: 'primary' | 'secondary' = cleanRoom.startsWith('ม.') ? 'secondary' : 'primary';

  const roomAllocs = allocations.filter((a) => (a.roomName || '').trim() === cleanRoom);

  let coreHours = 0;
  let additionalHours = 0;
  let activityHours = 0;
  let homeroomHours = 0;

  for (const a of roomAllocs) {
    const hrs = Number(a.periodsPerWeek) || 0;
    if (a.subjectType === 'พื้นฐาน') coreHours += hrs;
    else if (a.subjectType === 'เพิ่มเติม') additionalHours += hrs;
    else if (a.subjectType === 'กิจกรรมพัฒนาผู้เรียน') activityHours += hrs;
    else if (a.subjectType === 'ประจำชั้น') homeroomHours += hrs * 0.5;
  }

  const round1 = (v: number) => Math.round(v * 10) / 10;
  coreHours = round1(coreHours);
  additionalHours = round1(additionalHours);
  activityHours = round1(activityHours);
  homeroomHours = round1(homeroomHours);

  const totalLearningHours = round1(coreHours + additionalHours + activityHours);
  const estimatedAnnualHours =
    level === 'primary'
      ? calculatePrimaryHoursPerYear(totalLearningHours)
      : Math.round(totalLearningHours * 40);
  const estimatedSemesterCredits =
    level === 'secondary' ? calculateSecondaryCredits(coreHours + additionalHours) : 0;

  const obecTarget =
    level === 'secondary'
      ? {
          minAnnualHours: 1200,
          targetWeeklyHours: 30,
          maxWeeklyHours: 30,
          label: 'เกณฑ์ สพฐ. ม.ต้น (ไม่น้อยกว่า 1,200 ชม./ปี หรือ 30 ชม./สัปดาห์)',
        }
      : {
          minAnnualHours: 1000,
          targetWeeklyHours: 25,
          maxWeeklyHours: 30,
          label: 'เกณฑ์ สพฐ. ประถมศึกษา (ไม่น้อยกว่า 1,000 ชม./ปี หรือ 25 ชม./สัปดาห์)',
        };

  const status: RoomCurriculumComplianceResult['status'] =
    totalLearningHours > 30
      ? 'exceeds_capacity'
      : totalLearningHours >= obecTarget.targetWeeklyHours
        ? 'meets_target'
        : 'below_target';

  const activeCatalogForRoom = catalogSubjects.filter(
    (s) =>
      s.isActive &&
      s.gradeLevels.includes(cleanRoom) &&
      (s.semesterScope === 'both' || s.semesterScope === semester)
  );
  const missingCatalogSubjects = getMissingCatalogSubjectsForRoom({
    catalogSubjects,
    existingAllocations: roomAllocs,
    roomName: cleanRoom,
    semester,
  });

  return {
    roomName: cleanRoom,
    level,
    coreHours,
    additionalHours,
    activityHours,
    homeroomHours,
    totalLearningHours,
    estimatedAnnualHours,
    estimatedSemesterCredits,
    obecTarget,
    status,
    catalogTotalForRoom: activeCatalogForRoom.length,
    catalogAllocatedCount: Math.max(0, activeCatalogForRoom.length - missingCatalogSubjects.length),
    missingCatalogSubjects,
  };
}
