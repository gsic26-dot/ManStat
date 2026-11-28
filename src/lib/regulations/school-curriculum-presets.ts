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
  // 2. PRIMARY (ประถมศึกษา ป.1–ป.6) — Official Ban Takhop Curriculum (1,120 ชม./ปี)
  //    พื้นฐาน 840 + เพิ่มเติม 160 + กิจกรรมพัฒนาผู้เรียน 120 = 1,120 ชม./ปี
  // ==========================================================================
  const primaryLowerGrades = [
    { grade: 'ป.1', digit: 1, civCode: 'ส11231', engCode: 'อ11201', engName: 'ภาษาอังกฤษ 1' },
    { grade: 'ป.2', digit: 2, civCode: 'ส12232', engCode: 'อ12201', engName: 'ภาษาอังกฤษ 2' },
    { grade: 'ป.3', digit: 3, civCode: 'ส13233', engCode: 'อ13201', engName: 'ภาษาอังกฤษ 3' },
  ];

  for (const g of primaryLowerGrades) {
    const coreList: Array<{ code: string; name: string; group: string; hrs: number; preferMorning: boolean }> = [
      { code: `ท1${g.digit}101`, name: 'ภาษาไทย', group: 'ภาษาไทย', hrs: 5, preferMorning: true },
      { code: `ค1${g.digit}101`, name: 'คณิตศาสตร์', group: 'คณิตศาสตร์', hrs: 5, preferMorning: true },
      { code: `ว1${g.digit}101`, name: 'วิทยาศาสตร์และเทคโนโลยี', group: 'วิทยาศาสตร์และเทคโนโลยี', hrs: 2, preferMorning: true },
      { code: `ส1${g.digit}101`, name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 2, preferMorning: false },
      { code: `ส1${g.digit}102`, name: 'ประวัติศาสตร์', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 1, preferMorning: false },
      { code: `พ1${g.digit}101`, name: 'สุขศึกษาและพลศึกษา', group: 'สุขศึกษาและพลศึกษา', hrs: 1, preferMorning: false },
      { code: `ศ1${g.digit}101`, name: 'ศิลปะ', group: 'ศิลปะ', hrs: 1, preferMorning: false },
      { code: `ง1${g.digit}101`, name: 'การงานอาชีพ', group: 'การงานอาชีพ', hrs: 1, preferMorning: false },
      { code: `อ1${g.digit}101`, name: 'ภาษาอังกฤษ', group: 'ภาษาต่างประเทศ', hrs: 3, preferMorning: true },
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
        description: `รายวิชาพื้นฐานระดับชั้น ${g.grade} โรงเรียนชุมชนบ้านตะขบ`,
      });
    }

    const extraList: Array<{ code: string; name: string; group: string; hrs: number }> = [
      { code: g.civCode, name: 'หน้าที่พลเมือง', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 1 },
      { code: `ส1${g.digit}201`, name: 'การป้องกันการทุจริต', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 1 },
      { code: g.engCode, name: g.engName, group: 'ภาษาต่างประเทศ', hrs: 2 },
    ];

    for (const ex of extraList) {
      pushSubject({
        id: `SUB-P${g.digit}-${ex.code}`,
        subjectCode: ex.code,
        subjectName: ex.name,
        subjectGroup: ex.group,
        subjectType: 'เพิ่มเติม',
        levelGroup: 'primary',
        gradeLevels: [g.grade],
        semesterScope: 'both',
        defaultHoursPerWeek: ex.hrs,
        hoursPerYear: calculatePrimaryHoursPerYear(ex.hrs),
        credits: 0,
        preferMorning: false,
        defaultConsecutive: 1,
        description: `รายวิชาเพิ่มเติมระดับชั้น ${g.grade} โรงเรียนชุมชนบ้านตะขบ`,
      });
    }
  }

  const primaryUpperGrades = [
    { grade: 'ป.4', digit: 4, civCode: 'ส14234', extra3Code: 'อ14201', extra3Name: 'ภาษาอังกฤษ 4', extra3Group: 'ภาษาต่างประเทศ' },
    { grade: 'ป.5', digit: 5, civCode: 'ส15235', extra3Code: 'อ15201', extra3Name: 'ภาษาอังกฤษ 5', extra3Group: 'ภาษาต่างประเทศ' },
    { grade: 'ป.6', digit: 6, civCode: 'ส16236', extra3Code: 'ว16201', extra3Name: 'ปัญญาประดิษฐ์', extra3Group: 'วิทยาศาสตร์และเทคโนโลยี' },
  ];

  for (const g of primaryUpperGrades) {
    const coreList: Array<{ code: string; name: string; group: string; hrs: number; preferMorning: boolean }> = [
      { code: `ท1${g.digit}101`, name: 'ภาษาไทย', group: 'ภาษาไทย', hrs: 4, preferMorning: true },
      { code: `ค1${g.digit}101`, name: 'คณิตศาสตร์', group: 'คณิตศาสตร์', hrs: 4, preferMorning: true },
      { code: `ว1${g.digit}101`, name: 'วิทยาศาสตร์และเทคโนโลยี', group: 'วิทยาศาสตร์และเทคโนโลยี', hrs: 3, preferMorning: true },
      { code: `ส1${g.digit}101`, name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 2, preferMorning: false },
      { code: `ส1${g.digit}102`, name: 'ประวัติศาสตร์', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 1, preferMorning: false },
      { code: `พ1${g.digit}101`, name: 'สุขศึกษาและพลศึกษา', group: 'สุขศึกษาและพลศึกษา', hrs: 2, preferMorning: false },
      { code: `ศ1${g.digit}101`, name: 'ศิลปะ', group: 'ศิลปะ', hrs: 2, preferMorning: false },
      { code: `ง1${g.digit}101`, name: 'การงานอาชีพ', group: 'การงานอาชีพ', hrs: 1, preferMorning: false },
      { code: `อ1${g.digit}101`, name: 'ภาษาอังกฤษ', group: 'ภาษาต่างประเทศ', hrs: 2, preferMorning: true },
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
        description: `รายวิชาพื้นฐานระดับชั้น ${g.grade} โรงเรียนชุมชนบ้านตะขบ`,
      });
    }

    const extraList: Array<{ code: string; name: string; group: string; hrs: number }> = [
      { code: g.civCode, name: 'หน้าที่พลเมือง', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 1 },
      { code: `ส1${g.digit}201`, name: 'การป้องกันการทุจริต', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 1 },
      { code: g.extra3Code, name: g.extra3Name, group: g.extra3Group, hrs: 2 },
    ];

    for (const ex of extraList) {
      pushSubject({
        id: `SUB-P${g.digit}-${ex.code}`,
        subjectCode: ex.code,
        subjectName: ex.name,
        subjectGroup: ex.group,
        subjectType: 'เพิ่มเติม',
        levelGroup: 'primary',
        gradeLevels: [g.grade],
        semesterScope: 'both',
        defaultHoursPerWeek: ex.hrs,
        hoursPerYear: calculatePrimaryHoursPerYear(ex.hrs),
        credits: 0,
        preferMorning: false,
        defaultConsecutive: 1,
        description: `รายวิชาเพิ่มเติมระดับชั้น ${g.grade} โรงเรียนชุมชนบ้านตะขบ`,
      });
    }
  }

  // Primary shared activities (ป.1–ป.6): 120 ชม./ปี
  const primaryActivities: Array<{
    id: string;
    name: string;
    type: SchoolSubjectType;
    hrs: number;
    desc: string;
  }> = [
    {
      id: 'SUB-PRI-ACT-GUIDE',
      name: 'กิจกรรมแนะแนว',
      type: 'กิจกรรมพัฒนาผู้เรียน',
      hrs: 1,
      desc: 'กิจกรรมพัฒนาผู้เรียน 40 ชม./ปี',
    },
    {
      id: 'SUB-PRI-ACT-SCOUT',
      name: 'ลูกเสือ/เนตรนารี',
      type: 'กิจกรรมพัฒนาผู้เรียน',
      hrs: 1,
      desc: 'ลูกเสือ/เนตรนารี 30 ชม./ปี บูรณาการกิจกรรมเพื่อสังคมและสาธารณประโยชน์ 10 ชม./ปี (รวม 40 ชม./ปี)',
    },
    {
      id: 'SUB-PRI-ACT-CLUB',
      name: 'ชมรม/ชุมนุม',
      type: 'กิจกรรมพัฒนาผู้เรียน',
      hrs: 1,
      desc: 'กิจกรรมพัฒนาผู้เรียน 40 ชม./ปี',
    },
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
      description: act.desc,
    });
  }

  // ==========================================================================
  // 3. LOWER SECONDARY (มัธยมศึกษาตอนต้น ม.1–ม.3) — Official Ban Takhop Curriculum
  //    ภาคเรียนละ: พื้นฐาน 11.0 นก. (440 ชม.) + เพิ่มเติม 2.5 นก. (100 ชม.) + กิจกรรม 60 ชม. = 600 ชม.
  // ==========================================================================
  const secondaryGrades = [
    {
      grade: 'ม.1',
      digit: 1,
      sem1Extras: [
        { code: 'ส21231', name: 'หน้าที่พลเมือง 1', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'ว21201', name: 'วิทยาการคำนวณ 1', group: 'วิทยาศาสตร์และเทคโนโลยี' },
        { code: 'ส21201', name: 'การป้องกันการทุจริต 1', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'อ21201', name: 'อังกฤษเพื่อการสื่อสาร 1', group: 'ภาษาต่างประเทศ' },
        { code: 'ง21201', name: 'ขนมและเบเกอรี่ 1', group: 'การงานอาชีพ' },
      ],
      sem2Extras: [
        { code: 'ส21232', name: 'หน้าที่พลเมือง 2', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'ว21202', name: 'วิทยาการคำนวณ 2', group: 'วิทยาศาสตร์และเทคโนโลยี' },
        { code: 'ส21202', name: 'การป้องกันการทุจริต 2', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'อ21202', name: 'อังกฤษเพื่อการสื่อสาร 2', group: 'ภาษาต่างประเทศ' },
        { code: 'ง21202', name: 'การผูกผ้าประดับอาคาร', group: 'การงานอาชีพ' },
      ],
    },
    {
      grade: 'ม.2',
      digit: 2,
      sem1Extras: [
        { code: 'ส22233', name: 'หน้าที่พลเมือง 3', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'ว22201', name: 'วิทยาการคำนวณ 3', group: 'วิทยาศาสตร์และเทคโนโลยี' },
        { code: 'ส22201', name: 'การป้องกันการทุจริต 3', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'อ22201', name: 'อังกฤษเพื่อการสื่อสาร 3', group: 'ภาษาต่างประเทศ' },
        { code: 'ง22201', name: 'ขนมและเบเกอรี่ 2', group: 'การงานอาชีพ' },
      ],
      sem2Extras: [
        { code: 'ส22234', name: 'หน้าที่พลเมือง 4', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'ว22202', name: 'วิทยาการคำนวณ 4', group: 'วิทยาศาสตร์และเทคโนโลยี' },
        { code: 'ส22202', name: 'การป้องกันการทุจริต 4', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'อ22202', name: 'อังกฤษเพื่อการสื่อสาร 4', group: 'ภาษาต่างประเทศ' },
        { code: 'ง22202', name: 'การเลี้ยงปลาดุกในบ่อซีเมนต์', group: 'การงานอาชีพ' },
      ],
    },
    {
      grade: 'ม.3',
      digit: 3,
      sem1Extras: [
        { code: 'ส23235', name: 'หน้าที่พลเมือง 5', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'ว23203', name: 'ปัญญาประดิษฐ์ 1', group: 'วิทยาศาสตร์และเทคโนโลยี' },
        { code: 'ส23201', name: 'การป้องกันการทุจริต 5', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'อ23201', name: 'อังกฤษเพื่อการสื่อสาร 5', group: 'ภาษาต่างประเทศ' },
        { code: 'ง23201', name: 'ขนมและเบเกอรี่ 3', group: 'การงานอาชีพ' },
      ],
      sem2Extras: [
        { code: 'ส23236', name: 'หน้าที่พลเมือง 6', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'ว23204', name: 'ปัญญาประดิษฐ์ 2', group: 'วิทยาศาสตร์และเทคโนโลยี' },
        { code: 'ส23202', name: 'การป้องกันการทุจริต 6', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
        { code: 'อ23202', name: 'อังกฤษเพื่อการสื่อสาร 6', group: 'ภาษาต่างประเทศ' },
        { code: 'ง23202', name: 'ช่างเดินสายไฟในอาคาร', group: 'การงานอาชีพ' },
      ],
    },
  ];

  const secondaryCoreTemplates: Array<{
    prefix: string;
    sem1Suffix: string;
    sem2Suffix: string;
    name: string;
    group: string;
    hrs: number;
    preferMorning: boolean;
  }> = [
    { prefix: 'ท', sem1Suffix: '101', sem2Suffix: '102', name: 'ภาษาไทย', group: 'ภาษาไทย', hrs: 3, preferMorning: true },
    { prefix: 'ค', sem1Suffix: '101', sem2Suffix: '102', name: 'คณิตศาสตร์', group: 'คณิตศาสตร์', hrs: 3, preferMorning: true },
    { prefix: 'ว', sem1Suffix: '101', sem2Suffix: '102', name: 'วิทยาศาสตร์และเทคโนโลยี', group: 'วิทยาศาสตร์และเทคโนโลยี', hrs: 3, preferMorning: true },
    { prefix: 'ส', sem1Suffix: '101', sem2Suffix: '102', name: 'สังคมศึกษา ศาสนาและวัฒนธรรม', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 3, preferMorning: false },
    { prefix: 'ส', sem1Suffix: '103', sem2Suffix: '104', name: 'ประวัติศาสตร์', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', hrs: 1, preferMorning: false },
    { prefix: 'พ', sem1Suffix: '101', sem2Suffix: '102', name: 'สุขศึกษาและพลศึกษา', group: 'สุขศึกษาและพลศึกษา', hrs: 2, preferMorning: false },
    { prefix: 'ศ', sem1Suffix: '101', sem2Suffix: '102', name: 'ศิลปะ', group: 'ศิลปะ', hrs: 2, preferMorning: false },
    { prefix: 'ง', sem1Suffix: '101', sem2Suffix: '102', name: 'การงานอาชีพ', group: 'การงานอาชีพ', hrs: 2, preferMorning: false },
    { prefix: 'อ', sem1Suffix: '101', sem2Suffix: '102', name: 'ภาษาอังกฤษ', group: 'ภาษาต่างประเทศ', hrs: 3, preferMorning: true },
  ];

  for (const g of secondaryGrades) {
    for (const sem of ['1', '2'] as const) {
      const semNum = sem === '1' ? 1 : 2;
      const termOrdinal = (g.digit - 1) * 2 + semNum;

      // Core subjects (11.0 credits / 440 hrs per semester)
      for (const tpl of secondaryCoreTemplates) {
        const code = `${tpl.prefix}2${g.digit}${sem === '1' ? tpl.sem1Suffix : tpl.sem2Suffix}`;
        const credits = calculateSecondaryCredits(tpl.hrs);
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
          hoursPerYear: Math.round(tpl.hrs * 20),
          credits,
          preferMorning: tpl.preferMorning,
          defaultConsecutive: tpl.prefix === 'ง' ? 2 : 1,
          description: `รายวิชาพื้นฐานระดับชั้น ${g.grade} ภาคเรียนที่ ${sem} (${credits.toFixed(1)} หน่วยกิต)`,
        });
      }

      // Additional subjects (5 x 0.5 = 2.5 credits / 100 hrs per semester)
      const extras = sem === '1' ? g.sem1Extras : g.sem2Extras;
      for (const ex of extras) {
        pushSubject({
          id: `SUB-M${g.digit}-S${sem}-${ex.code}`,
          subjectCode: ex.code,
          subjectName: ex.name,
          subjectGroup: ex.group,
          subjectType: 'เพิ่มเติม',
          levelGroup: 'secondary',
          gradeLevels: [g.grade],
          semesterScope: sem,
          defaultHoursPerWeek: 1,
          hoursPerYear: 20,
          credits: 0.5,
          preferMorning: false,
          defaultConsecutive: 1,
          description: `รายวิชาเพิ่มเติมระดับชั้น ${g.grade} ภาคเรียนที่ ${sem} (0.5 หน่วยกิต)`,
        });
      }
    }
  }

  // Secondary shared activities (ม.1–ม.3): 60 ชม./เทอม
  const secondaryActivities: Array<{
    id: string;
    name: string;
    hrs: number;
    desc: string;
  }> = [
    {
      id: 'SUB-SEC-ACT-GUIDE',
      name: 'กิจกรรมแนะแนว',
      hrs: 1,
      desc: 'กิจกรรมพัฒนาผู้เรียน 20 ชม./ภาคเรียน',
    },
    {
      id: 'SUB-SEC-ACT-SCOUT',
      name: 'ลูกเสือ/เนตรนารี',
      hrs: 1,
      desc: 'เทอม 1: 12 ชม. + เพื่อสังคมฯ 8 ชม. / เทอม 2: 13 ชม. + เพื่อสังคมฯ 7 ชม. (รวม 20 ชม./ภาคเรียน)',
    },
    {
      id: 'SUB-SEC-ACT-CLUB',
      name: 'ชมรม/ชุมนุม',
      hrs: 1,
      desc: 'กิจกรรมพัฒนาผู้เรียน 20 ชม./ภาคเรียน',
    },
  ];

  for (const act of secondaryActivities) {
    pushSubject({
      id: act.id,
      subjectCode: '',
      subjectName: act.name,
      subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
      subjectType: 'กิจกรรมพัฒนาผู้เรียน',
      levelGroup: 'secondary',
      gradeLevels: ['ม.1', 'ม.2', 'ม.3'],
      semesterScope: 'both',
      defaultHoursPerWeek: act.hrs,
      hoursPerYear: 20,
      credits: 0,
      preferMorning: false,
      defaultConsecutive: 1,
      description: act.desc,
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

const TIMETABLE_SUBJECT_SYNONYMS: Readonly<Record<string, string>> = {
  วิทยาศาสตร์: 'วิทยาศาสตร์และเทคโนโลยี',
  สังคมศึกษา: 'สังคมศึกษา ศาสนาและวัฒนธรรม',
  'ศิลปะ/ดนตรี': 'ศิลปะ',
  สุขศึกษา: 'สุขศึกษาและพลศึกษา',
  พลศึกษา: 'สุขศึกษาและพลศึกษา',
  'สุขศึกษา/พละ': 'สุขศึกษาและพลศึกษา',
  ป้องกันการทุจริต: 'การป้องกันการทุจริต',
  ภาษาอังกฤษเพื่อการสื่อสาร: 'อังกฤษเพื่อการสื่อสาร',
  การเดินสายไฟภายในอาคาร: 'ช่างเดินสายไฟในอาคาร',
  ผูกผ้าประดับอาคาร: 'การผูกผ้าประดับอาคาร',
};

function stripTrailingNumber(name: string): string {
  return name.replace(/\s*\d+\s*$/, '').trim();
}

function normalizeForCodeMatch(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

let cachedDefaultPresets: SchoolSubject[] | null = null;
function getCachedDefaultPresets(): SchoolSubject[] {
  if (!cachedDefaultPresets) {
    cachedDefaultPresets = buildDefaultObecCurriculumPresets();
  }
  return cachedDefaultPresets;
}

/**
 * Returns explicit subjectCode if already present; otherwise performs smart
 * deterministic matching against catalogSubjects (and official presets fallback)
 * using exact name, base-name (stripping trailing semester digits), and verified
 * short-label synonyms.
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

  const cleanName = (params.subjectName || '').trim();
  const cleanRoom = (params.roomName || '').trim();
  if (!cleanName || !cleanRoom) return '';

  const findInPool = (pool: readonly SchoolSubject[]): string => {
    const roomPool = pool.filter(
      (s) =>
        (s.subjectCode || '').trim() !== '' &&
        s.gradeLevels.includes(cleanRoom) &&
        (s.semesterScope === 'both' || s.semesterScope === params.semester)
    );
    if (roomPool.length === 0) return '';

    const pickBest = (matches: SchoolSubject[]): string => {
      if (matches.length === 0) return '';
      const exactSem = matches.find((s) => s.isActive && s.semesterScope === params.semester);
      const activeAny = matches.find((s) => s.isActive);
      return (exactSem || activeAny || matches[0]).subjectCode.trim();
    };

    const normInput = normalizeForCodeMatch(cleanName);

    // 1. Exact normalized name match
    const exactMatches = roomPool.filter((s) => normalizeForCodeMatch(s.subjectName) === normInput);
    if (exactMatches.length > 0) return pickBest(exactMatches);

    // 2. Synonym resolution (exact or base without trailing digits)
    const inputBaseRaw = stripTrailingNumber(cleanName);
    const synonymTarget =
      TIMETABLE_SUBJECT_SYNONYMS[cleanName] || TIMETABLE_SUBJECT_SYNONYMS[inputBaseRaw];

    if (synonymTarget) {
      const normSyn = normalizeForCodeMatch(synonymTarget);
      const synMatches = roomPool.filter((s) => {
        const normCand = normalizeForCodeMatch(s.subjectName);
        const normCandBase = normalizeForCodeMatch(stripTrailingNumber(s.subjectName));
        return normCand === normSyn || normCandBase === normSyn;
      });
      if (synMatches.length > 0) return pickBest(synMatches);
    }

    // 3. Base-name match stripping trailing semester/level digits (e.g. 'ภาษาไทย' -> 'ภาษาไทย 6')
    const normInputBase = normalizeForCodeMatch(inputBaseRaw);
    if (normInputBase) {
      const baseMatches = roomPool.filter(
        (s) => normalizeForCodeMatch(stripTrailingNumber(s.subjectName)) === normInputBase
      );
      if (baseMatches.length > 0) return pickBest(baseMatches);
    }

    return '';
  };

  if (params.catalogSubjects && params.catalogSubjects.length > 0) {
    const fromCatalog = findInPool(params.catalogSubjects);
    if (fromCatalog) return fromCatalog;
  }

  return findInPool(getCachedDefaultPresets());
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
