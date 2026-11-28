/**
 * ============================================================================
 * ManStat: Timetable Domain Rules, Conflict Detection & ว 9/2564 Calculator
 * ============================================================================
 * School defaults calibrated for โรงเรียนชุมชนบ้านตะขบ (ป.1–ม.3 + อนุบาล).
 * Pure, deterministic functions — zero side effects, 100% unit-testable.
 * ============================================================================
 */

import type { TeacherRecord } from '@/lib/data/schoolData';
import type {
  KindergartenActivityItem,
  KindergartenSchedule,
  LunchBreakConfig,
  PeriodConfigItem,
  TimetableSemester,
  TimetableSettings,
  TimetableSlot,
  TimetableSubjectType,
} from '@/lib/data/timetableTypes';
import { getStaffBranch } from '@/lib/regulations/staff-sorting';

export const KINDERGARTEN_ROOMS = ['อ.1', 'อ.2', 'อ.3'] as const;

export const DEFAULT_KINDERGARTEN_ACTIVITIES: readonly KindergartenActivityItem[] = [
  {
    timeRange: '08.30 - 09.00',
    activityName: 'กิจกรรมเคลื่อนไหวและจังหวะ',
    durationMinutes: 30,
    note: 'ฝึกทักษะการเคลื่อนไหวร่างกายตามจังหวะและเสียงเพลง',
  },
  {
    timeRange: '09.00 - 09.40',
    activityName: 'กิจกรรมเสริมประสบการณ์',
    durationMinutes: 40,
    note: 'เรียนรู้หน่วยการจัดประสบการณ์ สนทนา เล่านิทาน และทดลองง่ายๆ',
  },
  {
    timeRange: '09.40 - 10.20',
    activityName: 'กิจกรรมสร้างสรรค์',
    durationMinutes: 40,
    note: 'วาดภาพ ระบายสี ปั้น ฉีก ตัด ปะ และงานประดิษฐ์',
  },
  {
    timeRange: '10.20 - 11.00',
    activityName: 'กิจกรรมเสรี (เล่นตามมุม)',
    durationMinutes: 40,
    note: 'เลือกเล่นตามมุมประสบการณ์อย่างอิสระตามความสนใจ',
  },
  {
    timeRange: '11.00 - 11.30',
    activityName: 'กิจกรรมกลางแจ้ง',
    durationMinutes: 30,
    note: 'เล่นเครื่องเล่นสนาม เกมการละเล่นพื้นบ้าน และออกกำลังกาย',
  },
  {
    timeRange: '11.30 - 14.00',
    activityName: 'พักรับประทานอาหารกลางวัน / แปรงฟัน / นอนพักผ่อน',
    durationMinutes: 150,
    note: 'ฝึกสุขนิสัยและพักผ่อนกลางวัน',
    isBreak: true,
  },
  {
    timeRange: '14.00 - 14.40',
    activityName: 'เกมการศึกษา',
    durationMinutes: 40,
    note: 'จับคู่ เรียงลำดับ ต่อภาพ ฝึกทักษะการคิดและคณิตศาสตร์พื้นฐาน',
  },
  {
    timeRange: '14.40 - 15.30',
    activityName: 'เตรียมความพร้อม / ทบทวน / เตรียมกลับบ้าน',
    durationMinutes: 50,
    note: 'สรุปกิจกรรมประจำวัน เก็บของใช้ส่วนตัว และเตรียมตัวกลับบ้าน',
  },
];

export const STANDARD_ROOMS = [
  'ป.1',
  'ป.2',
  'ป.3',
  'ป.4',
  'ป.5',
  'ป.6',
  'ม.1',
  'ม.2',
  'ม.3',
] as const;

export const DAYS_OF_WEEK = [
  { dayOfWeek: 1, shortLabel: 'จ.', fullLabel: 'วันจันทร์' },
  { dayOfWeek: 2, shortLabel: 'อ.', fullLabel: 'วันอังคาร' },
  { dayOfWeek: 3, shortLabel: 'พ.', fullLabel: 'วันพุธ' },
  { dayOfWeek: 4, shortLabel: 'พฤ.', fullLabel: 'วันพฤหัสบดี' },
  { dayOfWeek: 5, shortLabel: 'ศ.', fullLabel: 'วันศุกร์' },
] as const;

export const LUNCH_BREAK_LABEL = 'พักกลางวัน';
export const LUNCH_BREAK_TIME = '11.30 - 12.30';

export const DEFAULT_LUNCH_CONFIG: LunchBreakConfig = {
  afterPeriod: 3,
  startTime: '11.30',
  endTime: '12.30',
  durationMinutes: 60,
};

/**
 * Strictly clamps any period or lunch break duration between 10 and 60 minutes.
 */
export function clampPeriodDurationMinutes(minutes: number): number {
  const num = Number(minutes);
  if (Number.isNaN(num) || !Number.isFinite(num)) return 60;
  return Math.max(10, Math.min(60, Math.round(num)));
}

export const DEFAULT_PERIODS_CONFIG: readonly PeriodConfigItem[] = [
  { periodNo: 1, label: 'ชั่วโมงที่ 1', startTime: '08.30', endTime: '09.30', durationMinutes: 60, durationHours: 1.0 },
  { periodNo: 2, label: 'ชั่วโมงที่ 2', startTime: '09.30', endTime: '10.30', durationMinutes: 60, durationHours: 1.0 },
  { periodNo: 3, label: 'ชั่วโมงที่ 3', startTime: '10.30', endTime: '11.30', durationMinutes: 60, durationHours: 1.0 },
  { periodNo: 4, label: 'ชั่วโมงที่ 4', startTime: '12.30', endTime: '13.30', durationMinutes: 60, durationHours: 1.0 },
  { periodNo: 5, label: 'ชั่วโมงที่ 5', startTime: '13.30', endTime: '14.30', durationMinutes: 60, durationHours: 1.0 },
  { periodNo: 6, label: 'ชั่วโมงที่ 6', startTime: '14.30', endTime: '15.30', durationMinutes: 60, durationHours: 1.0 },
  {
    periodNo: 7,
    label: 'พบครูประจำชั้น',
    startTime: '15.30',
    endTime: '16.00',
    durationMinutes: 30,
    durationHours: 0.5,
    isHomeroom: true,
  },
];

const NON_TEACHING_CUSTODIAL_KEYWORDS = [
  'นักการภารโรง',
  'ภารโรง',
  'พนักงานบริการ',
  'ยาม',
  'ลูกจ้างชั่วคราวภารโรง',
] as const;

/**
 * Determines whether a staff member is eligible for instructional/teaching assignment.
 * Excludes custodial/janitorial roles while keeping executives, teachers, and instructional support staff.
 */
export function isEligibleForTeaching(staff: Pick<TeacherRecord, 'position'>): boolean {
  const pos = (staff.position || '').trim();
  if (!pos) return true;
  return !NON_TEACHING_CUSTODIAL_KEYWORDS.some((kw) => pos.includes(kw));
}

export const DEFAULT_FOOTER_NOTE =
  'เวลา 07.00-08.05 น. กิจกรรม 5ส | เวลา 08.05-08.30 น. กิจกรรมหน้าเสาธง | เวลา 11.30-12.30 น. พักกลางวัน | เวลา 15.30-15.50 น. พบครูประจำชั้น (ท่องสูตรคูณ บทอาขยาน ทำความสะอาดห้องเรียน) | เวลา 15.30-16.00 น. ทุกวันพุธและวันพฤหัสบดี PLC | เวลา 15.50-16.00 น. เข้าแถวกลับบ้าน';

export const STANDARD_SUBJECT_GROUPS = [
  'ภาษาไทย',
  'คณิตศาสตร์',
  'วิทยาศาสตร์และเทคโนโลยี',
  'สังคมศึกษา ศาสนา และวัฒนธรรม',
  'สุขศึกษาและพลศึกษา',
  'ศิลปะ',
  'การงานอาชีพ',
  'ภาษาต่างประเทศ',
  'กิจกรรมพัฒนาผู้เรียน',
  'เพิ่มเติม / ประจำชั้น',
] as const;

export const SUBJECT_TYPES: readonly TimetableSubjectType[] = [
  'พื้นฐาน',
  'เพิ่มเติม',
  'กิจกรรมพัฒนาผู้เรียน',
  'ประจำชั้น',
];

export interface SubjectPreset {
  name: string;
  group: string;
  type: TimetableSubjectType;
  defaultPreferMorning?: boolean;
}

export const COMMON_SUBJECT_PRESETS: readonly SubjectPreset[] = [
  { name: 'ภาษาไทย', group: 'ภาษาไทย', type: 'พื้นฐาน', defaultPreferMorning: true },
  { name: 'ส่งเสริมอ่านเขียน', group: 'ภาษาไทย', type: 'เพิ่มเติม', defaultPreferMorning: true },
  { name: 'คณิตศาสตร์', group: 'คณิตศาสตร์', type: 'พื้นฐาน', defaultPreferMorning: true },
  { name: 'วิทยาศาสตร์', group: 'วิทยาศาสตร์และเทคโนโลยี', type: 'พื้นฐาน', defaultPreferMorning: true },
  { name: 'วิทยาการคำนวณ', group: 'วิทยาศาสตร์และเทคโนโลยี', type: 'พื้นฐาน' },
  { name: 'ปัญญาประดิษฐ์', group: 'วิทยาศาสตร์และเทคโนโลยี', type: 'เพิ่มเติม' },
  { name: 'สังคมศึกษา', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', type: 'พื้นฐาน' },
  { name: 'ประวัติศาสตร์', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', type: 'พื้นฐาน' },
  { name: 'หน้าที่พลเมือง', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', type: 'เพิ่มเติม' },
  { name: 'ป้องกันการทุจริต', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', type: 'เพิ่มเติม' },
  { name: 'สุขศึกษา', group: 'สุขศึกษาและพลศึกษา', type: 'พื้นฐาน' },
  { name: 'พลศึกษา', group: 'สุขศึกษาและพลศึกษา', type: 'พื้นฐาน' },
  { name: 'ศิลปะ/ดนตรี', group: 'ศิลปะ', type: 'พื้นฐาน' },
  { name: 'การงานอาชีพ', group: 'การงานอาชีพ', type: 'พื้นฐาน' },
  { name: 'ภาษาอังกฤษ', group: 'ภาษาต่างประเทศ', type: 'พื้นฐาน', defaultPreferMorning: true },
  { name: 'ภาษาอังกฤษเพื่อการสื่อสาร', group: 'ภาษาต่างประเทศ', type: 'เพิ่มเติม' },
  { name: 'แนะแนว', group: 'กิจกรรมพัฒนาผู้เรียน', type: 'กิจกรรมพัฒนาผู้เรียน' },
  { name: 'ชุมนุม', group: 'กิจกรรมพัฒนาผู้เรียน', type: 'กิจกรรมพัฒนาผู้เรียน' },
  { name: 'ลูกเสือสำรอง', group: 'กิจกรรมพัฒนาผู้เรียน', type: 'กิจกรรมพัฒนาผู้เรียน' },
  { name: 'ลูกเสือสามัญ', group: 'กิจกรรมพัฒนาผู้เรียน', type: 'กิจกรรมพัฒนาผู้เรียน' },
  { name: 'ลูกเสือสามัญรุ่นใหญ่', group: 'กิจกรรมพัฒนาผู้เรียน', type: 'กิจกรรมพัฒนาผู้เรียน' },
  { name: 'สวดมนต์', group: 'กิจกรรมพัฒนาผู้เรียน', type: 'กิจกรรมพัฒนาผู้เรียน' },
  { name: 'พบครูประจำชั้น', group: 'เพิ่มเติม / ประจำชั้น', type: 'ประจำชั้น' },
];

export function getDefaultTimetableSettings(
  academicYear: string,
  semester: TimetableSemester
): TimetableSettings {
  return {
    id: `${academicYear}-${semester}`,
    academicYear,
    semester,
    periodsConfig: DEFAULT_PERIODS_CONFIG.map((p) => ({ ...p })),
    fixedSlotsConfig: [],
    footerNote: DEFAULT_FOOTER_NOTE,
    isLocked: false,
    lunchConfig: { ...DEFAULT_LUNCH_CONFIG },
  };
}

export interface TimetableConflict {
  teacherId: string;
  dayOfWeek: number;
  periodNo: number;
  rooms: string[];
  slotIds: string[];
  reason: string;
}

export interface ConflictDetectionResult {
  conflicts: TimetableConflict[];
  conflictingSlotIds: Set<string>;
  slotReasons: Map<string, string[]>;
}

/**
 * Detects teacher double-booking across DIFFERENT rooms at the same (dayOfWeek, periodNo).
 * Co-teaching (teacherId + coTeacherId in the SAME room & slot) is 100% valid and NOT a conflict.
 */
export function detectTimetableConflicts(
  slots: readonly TimetableSlot[]
): ConflictDetectionResult {
  // Key: `${teacherId}::${dayOfWeek}::${periodNo}` -> list of slots
  const occupancy = new Map<string, TimetableSlot[]>();

  const register = (staffId: string | undefined, slot: TimetableSlot) => {
    const cleanId = (staffId || '').trim();
    if (!cleanId) return;
    const key = `${cleanId}::${slot.dayOfWeek}::${slot.periodNo}`;
    const list = occupancy.get(key);
    if (list) {
      // Guard against duplicate entry if teacherId === coTeacherId on the same slot
      if (!list.some((existing) => existing.id === slot.id)) {
        list.push(slot);
      }
    } else {
      occupancy.set(key, [slot]);
    }
  };

  for (const slot of slots) {
    register(slot.teacherId, slot);
    if (slot.coTeacherId && slot.coTeacherId !== slot.teacherId) {
      register(slot.coTeacherId, slot);
    }
  }

  const conflicts: TimetableConflict[] = [];
  const conflictingSlotIds = new Set<string>();
  const slotReasons = new Map<string, string[]>();

  for (const [key, group] of occupancy.entries()) {
    const distinctRooms = Array.from(new Set(group.map((s) => s.roomName)));
    if (distinctRooms.length < 2) continue;

    const [teacherId, dayStr, periodStr] = key.split('::');
    const dayOfWeek = Number(dayStr);
    const periodNo = Number(periodStr);
    const reason = `ครูชนคาบ: สอนพร้อมกันที่ ${distinctRooms.join(' และ ')}`;
    const slotIds = group.map((s) => s.id);

    conflicts.push({
      teacherId,
      dayOfWeek,
      periodNo,
      rooms: distinctRooms,
      slotIds,
      reason,
    });

    for (const slotId of slotIds) {
      conflictingSlotIds.add(slotId);
      const existingReasons = slotReasons.get(slotId) || [];
      if (!existingReasons.includes(reason)) {
        existingReasons.push(reason);
        slotReasons.set(slotId, existingReasons);
      }
    }
  }

  return {
    conflicts,
    conflictingSlotIds,
    slotReasons,
  };
}

export type W9StatusLabel =
  | 'ผู้บริหารสถานศึกษา'
  | 'สายสนับสนุน'
  | 'ผ่านเกณฑ์'
  | 'ต่ำกว่าเกณฑ์';

export interface TeacherWeeklyLoadSummary {
  teacherId: string;
  isDirector: boolean;
  isSupport: boolean;
  w9StatusLabel: W9StatusLabel;
  coreAndElectiveHours: number;
  activityHours: number;
  homeroomHours: number;
  kindergartenHours: number;
  totalPeriods: number;
  teachingHoursExclHomeroom: number;
  totalHoursInclHomeroom: number;
  meetsW9Threshold: boolean;
}

function roundHours(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Calculates weekly teaching hours per teacher per ก.ค.ศ. ว 9/2564.
 * Counts slots where the staff member is either primary teacherId OR coTeacherId,
 * plus Kindergarten weekly experience hours for homeroom teachers (อ.1–อ.3).
 * Distinguishes 60-minute periods (1.0 hr) from Period 7 homeroom (0.5 hr).
 */
export function calculateTeacherWeeklyLoads(
  slots: readonly TimetableSlot[],
  teachers: readonly TeacherRecord[],
  periodsConfig: readonly PeriodConfigItem[] = DEFAULT_PERIODS_CONFIG,
  kindergartenSchedules: readonly KindergartenSchedule[] = []
): TeacherWeeklyLoadSummary[] {
  const periodMap = new Map<number, PeriodConfigItem>();
  for (const p of periodsConfig) {
    periodMap.set(p.periodNo, p);
  }

  const slotMapByTeacher = new Map<string, TimetableSlot[]>();
  const addForTeacher = (staffId: string | undefined, slot: TimetableSlot) => {
    const cleanId = (staffId || '').trim();
    if (!cleanId) return;
    const list = slotMapByTeacher.get(cleanId);
    if (list) {
      if (!list.some((s) => s.id === slot.id)) list.push(slot);
    } else {
      slotMapByTeacher.set(cleanId, [slot]);
    }
  };

  for (const slot of slots) {
    addForTeacher(slot.teacherId, slot);
    if (slot.coTeacherId && slot.coTeacherId !== slot.teacherId) {
      addForTeacher(slot.coTeacherId, slot);
    }
  }

  const kgHoursByTeacher = new Map<string, number>();
  for (const kg of kindergartenSchedules) {
    const homeroomId = (kg.homeroomTeacherId || '').trim();
    if (!homeroomId) continue;
    const hrs = Number(kg.weeklyHours) || 0;
    kgHoursByTeacher.set(homeroomId, (kgHoursByTeacher.get(homeroomId) || 0) + hrs);
  }

  return teachers
    .filter((teacher) => {
      if (isEligibleForTeaching(teacher)) return true;
      // Preserve data integrity if a legacy slot explicitly references an ineligible staff member
      return (
        (slotMapByTeacher.get(teacher.id)?.length || 0) > 0 ||
        (kgHoursByTeacher.get(teacher.id) || 0) > 0
      );
    })
    .map((teacher) => {
      const pos = teacher.position || '';
      const isDirector = pos.includes('ผู้อำนวยการ');
      const isSupport = !isDirector && getStaffBranch(teacher) === 'support';
      const teacherSlots = slotMapByTeacher.get(teacher.id) || [];

      let coreAndElectiveHours = 0;
      let activityHours = 0;
      let homeroomHours = 0;

      for (const slot of teacherSlots) {
        const pCfg = periodMap.get(slot.periodNo);
        const durationHours =
          pCfg !== undefined
            ? Number(pCfg.durationHours)
            : slot.periodNo === 7
            ? 0.5
            : 1.0;

        const isHomeroomSlot =
          slot.subjectType === 'ประจำชั้น' || Boolean(pCfg?.isHomeroom) || slot.periodNo === 7;

        if (isHomeroomSlot) {
          homeroomHours += durationHours;
        } else if (slot.subjectType === 'กิจกรรมพัฒนาผู้เรียน') {
          activityHours += durationHours;
        } else {
          coreAndElectiveHours += durationHours;
        }
      }

      const roundedCore = roundHours(coreAndElectiveHours);
      const roundedActivity = roundHours(activityHours);
      const roundedHomeroom = roundHours(homeroomHours);
      const roundedKg = roundHours(kgHoursByTeacher.get(teacher.id) || 0);
      const teachingHoursExclHomeroom = roundHours(roundedCore + roundedActivity + roundedKg);
      const totalHoursInclHomeroom = roundHours(teachingHoursExclHomeroom + roundedHomeroom);
      const meetsW9Threshold = teachingHoursExclHomeroom >= 12;

      const w9StatusLabel: W9StatusLabel = isDirector
        ? 'ผู้บริหารสถานศึกษา'
        : isSupport
        ? 'สายสนับสนุน'
        : meetsW9Threshold
        ? 'ผ่านเกณฑ์'
        : 'ต่ำกว่าเกณฑ์';

      return {
        teacherId: teacher.id,
        isDirector,
        isSupport,
        w9StatusLabel,
        coreAndElectiveHours: roundedCore,
        activityHours: roundedActivity,
        homeroomHours: roundedHomeroom,
        kindergartenHours: roundedKg,
        totalPeriods: teacherSlots.length,
        teachingHoursExclHomeroom,
        totalHoursInclHomeroom,
        meetsW9Threshold,
      };
    });
}

/**
 * Computes the current Thai OBEC academic year (B.E.) and semester from date:
 * - May 1 – Oct 31  => Semester '1' of current B.E. year
 * - Nov 1 – Dec 31  => Semester '2' of current B.E. year
 * - Jan 1 – Apr 30  => Semester '2' of (current B.E. year - 1)
 */
export function getCurrentThaiAcademicTerm(now: Date = new Date()): {
  academicYear: string;
  semester: TimetableSemester;
} {
  const beYear = now.getFullYear() + 543;
  const month = now.getMonth() + 1; // 1..12

  if (month >= 5 && month <= 10) {
    return { academicYear: String(beYear), semester: '1' };
  }
  if (month >= 11) {
    return { academicYear: String(beYear), semester: '2' };
  }
  return { academicYear: String(beYear - 1), semester: '2' };
}
