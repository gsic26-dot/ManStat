/**
 * ============================================================================
 * ManStat: Timetable & Weekly Teaching Hours Types (Phase 9)
 * ============================================================================
 */

export type TimetableSemester = '1' | '2';

export type TimetableSubjectType =
  | 'พื้นฐาน'
  | 'เพิ่มเติม'
  | 'กิจกรรมพัฒนาผู้เรียน'
  | 'ประจำชั้น';

export interface PeriodConfigItem {
  periodNo: number; // 1..7
  label: string;
  startTime: string; // e.g. '08.30'
  endTime: string; // e.g. '09.30'
  durationMinutes: number; // 60 or 30
  durationHours: number; // 1.0 or 0.5
  isHomeroom?: boolean;
}

export interface FixedSlotConfigItem {
  dayOfWeek: number; // 1..5
  periodNo: number; // 1..7
  label: string;
  rooms?: string[];
}

export interface TimetableSettings {
  id: string; // `${academicYear}-${semester}`
  academicYear: string;
  semester: TimetableSemester;
  periodsConfig: PeriodConfigItem[];
  fixedSlotsConfig: FixedSlotConfigItem[];
  footerNote: string;
  updatedAt?: string;
}

export interface TimetableAllocation {
  id: string;
  academicYear: string;
  semester: TimetableSemester;
  roomName: string; // 'ป.1' .. 'ม.3'
  subjectCode?: string;
  subjectName: string;
  subjectGroup: string;
  subjectType: TimetableSubjectType;
  teacherId: string;
  coTeacherId?: string;
  periodsPerWeek: number;
  preferMorning: boolean;
  consecutivePeriods: 1 | 2;
  createdAt?: string;
}

export interface TimetableSlot {
  id: string;
  academicYear: string;
  semester: TimetableSemester;
  roomName: string;
  dayOfWeek: number; // 1 = จันทร์ .. 5 = ศุกร์
  periodNo: number; // 1..7
  allocationId?: string;
  subjectCode?: string;
  subjectName: string;
  subjectGroup: string;
  subjectType: TimetableSubjectType;
  teacherId: string;
  coTeacherId?: string;
  isLocked: boolean;
  updatedAt?: string;
}

export interface KindergartenSchedule {
  id: string;
  academicYear: string;
  semester: TimetableSemester;
  roomName: string; // 'อ.1' | 'อ.2' | 'อ.3'
  homeroomTeacherId: string;
  assistantTeacherId?: string;
  weeklyHours: number;
  activitiesJson: Array<Record<string, unknown>>;
  updatedAt?: string;
}

export interface TimetableBundle {
  settings: TimetableSettings;
  allocations: TimetableAllocation[];
  slots: TimetableSlot[];
}
