/**
 * ============================================================================
 * ManStat: Automated Academic Deliverable Tracker Engine (Phase 12.3)
 * ============================================================================
 * Derives per-teacher per-room-subject deliverable assignments live from
 * actual `timetable_slots` (including co-teaching slots, excluding homeroom)
 * and merges with persisted แผนการจัดการเรียนรู้ / ปพ.5 statuses.
 * Pure, deterministic, 100% unit-testable, zero emojis.
 * ============================================================================
 */

import type { TeacherRecord } from '@/lib/data/schoolData';
import type {
  AcademicDeliverableRecord,
  DeliverableStatus,
  SchoolSubject,
  TimetableSemester,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import { resolveSubjectCodeForDisplay } from '@/lib/regulations/school-curriculum-presets';
import { escapeCsvCell } from '@/lib/regulations/pa-summary-utils';

export const DELIVERABLE_STATUS_LABELS: Readonly<Record<DeliverableStatus, string>> = {
  pending: 'ยังไม่ส่ง',
  reviewing: 'อยู่ระหว่างตรวจ',
  submitted: 'ส่งครบแล้ว',
};

export interface TeacherDeliverableRow {
  key: string;
  academicYear: string;
  semester: TimetableSemester;
  teacherId: string;
  teacherName: string;
  roomName: string;
  subjectName: string;
  subjectCode: string;
  weeklyHours: number;
  isCoTeaching: boolean;
  lessonPlanStatus: DeliverableStatus;
  gradebookStatus: DeliverableStatus;
  remarks: string;
  updatedAt?: string;
}

export interface AcademicDeliverableSummary {
  rows: TeacherDeliverableRow[];
  stats: {
    totalAssignments: number;
    lessonPlanSubmitted: number;
    gradebookSubmitted: number;
    fullyCompletedCount: number;
    completionRatePercent: number;
  };
}

function makeDeliverableKey(teacherId: string, roomName: string, subjectName: string): string {
  return `${teacherId.trim()}|${roomName.trim()}|${subjectName.trim().toLowerCase()}`;
}

/**
 * Derives live teaching assignments from `timetable_slots` and merges saved
 * แผนการจัดการเรียนรู้ & ปพ.5 statuses.
 */
export function buildTeacherDeliverableRows(params: {
  academicYear: string;
  semester: TimetableSemester;
  slots: readonly TimetableSlot[];
  teachers: readonly TeacherRecord[];
  catalogSubjects?: readonly SchoolSubject[];
  savedRecords?: readonly AcademicDeliverableRecord[];
}): AcademicDeliverableSummary {
  const { academicYear, semester, slots, teachers, catalogSubjects, savedRecords } = params;
  const teacherMap = new Map<string, TeacherRecord>(teachers.map((t) => [t.id, t]));
  const savedMap = new Map<string, AcademicDeliverableRecord>();

  for (const rec of savedRecords || []) {
    savedMap.set(makeDeliverableKey(rec.teacherId, rec.roomName, rec.subjectName), rec);
  }

  const accMap = new Map<
    string,
    {
      teacherId: string;
      roomName: string;
      subjectName: string;
      subjectCode: string;
      weeklyHours: number;
      isCoTeaching: boolean;
    }
  >();

  const registerAssignment = (
    teacherId: string | undefined,
    slot: TimetableSlot,
    isCo: boolean
  ) => {
    const cleanTeacherId = (teacherId || '').trim();
    const cleanSubject = (slot.subjectName || '').trim();
    const cleanRoom = (slot.roomName || '').trim();
    if (!cleanTeacherId || !cleanSubject || !cleanRoom) return;

    const key = makeDeliverableKey(cleanTeacherId, cleanRoom, cleanSubject);
    const existing = accMap.get(key);
    if (existing) {
      existing.weeklyHours += 1;
      if (!isCo) existing.isCoTeaching = false;
      if (!existing.subjectCode && slot.subjectCode) {
        existing.subjectCode = slot.subjectCode.trim();
      }
    } else {
      const resolvedCode = resolveSubjectCodeForDisplay({
        subjectCode: slot.subjectCode,
        subjectName: cleanSubject,
        roomName: cleanRoom,
        semester,
        catalogSubjects,
      });
      accMap.set(key, {
        teacherId: cleanTeacherId,
        roomName: cleanRoom,
        subjectName: cleanSubject,
        subjectCode: resolvedCode,
        weeklyHours: 1,
        isCoTeaching: isCo,
      });
    }
  };

  for (const slot of slots) {
    const cleanName = (slot.subjectName || '').trim();
    // Exclude homeroom check-in period (พบครูประจำชั้น) from subject deliverable tracking
    if (
      cleanName === 'พบครูประจำชั้น' ||
      slot.subjectType === 'ประจำชั้น' ||
      slot.periodNo === 7
    ) {
      continue;
    }

    registerAssignment(slot.teacherId, slot, false);
    if (slot.coTeacherId && slot.coTeacherId.trim() && slot.coTeacherId !== slot.teacherId) {
      registerAssignment(slot.coTeacherId, slot, true);
    }
  }

  const rows: TeacherDeliverableRow[] = Array.from(accMap.entries()).map(([key, item]) => {
    const teacher = teacherMap.get(item.teacherId);
    const teacherName = teacher ? formatStaffName(teacher) : item.teacherId;
    const saved = savedMap.get(key);

    return {
      key,
      academicYear,
      semester,
      teacherId: item.teacherId,
      teacherName,
      roomName: item.roomName,
      subjectName: item.subjectName,
      subjectCode: saved?.subjectCode || item.subjectCode || '',
      weeklyHours: item.weeklyHours,
      isCoTeaching: item.isCoTeaching,
      lessonPlanStatus: saved?.lessonPlanStatus || 'pending',
      gradebookStatus: saved?.gradebookStatus || 'pending',
      remarks: saved?.remarks || '',
      updatedAt: saved?.updatedAt,
    };
  });

  rows.sort((a, b) => {
    const nameCmp = a.teacherName.localeCompare(b.teacherName, 'th');
    if (nameCmp !== 0) return nameCmp;
    const roomCmp = a.roomName.localeCompare(b.roomName, 'th');
    if (roomCmp !== 0) return roomCmp;
    return a.subjectName.localeCompare(b.subjectName, 'th');
  });

  const totalAssignments = rows.length;
  const lessonPlanSubmitted = rows.filter((r) => r.lessonPlanStatus === 'submitted').length;
  const gradebookSubmitted = rows.filter((r) => r.gradebookStatus === 'submitted').length;
  const fullyCompletedCount = rows.filter(
    (r) => r.lessonPlanStatus === 'submitted' && r.gradebookStatus === 'submitted'
  ).length;
  const completionRatePercent =
    totalAssignments > 0 ? Math.round((fullyCompletedCount / totalAssignments) * 100) : 0;

  return {
    rows,
    stats: {
      totalAssignments,
      lessonPlanSubmitted,
      gradebookSubmitted,
      fullyCompletedCount,
      completionRatePercent,
    },
  };
}

/**
 * Exports Academic Deliverables as RFC-4180 UTF-8 BOM CSV for Microsoft Excel.
 */
export function exportDeliverablesCsv(
  rows: readonly TeacherDeliverableRow[],
  academicYear: string,
  semester: TimetableSemester
): string {
  const headers = [
    'ลำดับ',
    'ชื่อ-สกุล',
    'ชั้นเรียน',
    'รหัสวิชา',
    'รายวิชา',
    'ชม./สัปดาห์',
    'สถานะแผนการสอน',
    'สถานะ ปพ.5',
    'หมายเหตุ',
  ];

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r, idx) =>
      [
        idx + 1,
        r.teacherName,
        r.roomName,
        r.subjectCode || '-',
        r.isCoTeaching ? `${r.subjectName} (สอนร่วม)` : r.subjectName,
        r.weeklyHours,
        DELIVERABLE_STATUS_LABELS[r.lessonPlanStatus],
        DELIVERABLE_STATUS_LABELS[r.gradebookStatus],
        r.remarks || '-',
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  void academicYear;
  void semester;
  return `\uFEFF${lines.join('\r\n')}`;
}
