/**
 * ============================================================================
 * ManStat: School-Wide Curriculum vs. Actual Timetable Audit Engine (Phase 12.2)
 * ============================================================================
 * Compares the official school curriculum (school_subjects / Ban Takhop presets)
 * against actual scheduled timetable_slots across all 9 rooms (ป.1–ม.3).
 * - Pure, deterministic, zero side effects, 100% unit-testable.
 * - Includes RFC-4180 UTF-8 BOM CSV export for Microsoft Excel / SAR reporting.
 * ============================================================================
 */

import type {
  SchoolSubject,
  TimetableSemester,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import { STANDARD_ROOMS } from '@/lib/regulations/timetable-utils';
import {
  buildDefaultObecCurriculumPresets,
  resolveSubjectCodeForDisplay,
} from '@/lib/regulations/school-curriculum-presets';
import { escapeCsvCell } from '@/lib/regulations/pa-summary-utils';

export type AuditItemStatus = 'match' | 'under' | 'over' | 'missing';

export const AUDIT_STATUS_LABELS: Readonly<Record<AuditItemStatus, string>> = {
  match: 'ตรงเกณฑ์',
  under: 'ชั่วโมงไม่ครบ',
  over: 'ชั่วโมงเกินเกณฑ์',
  missing: 'ยังไม่ลงตาราง',
};

export interface CurriculumAuditSubjectRow {
  subjectCode: string;
  subjectName: string;
  subjectGroup: string;
  subjectType: string;
  requiredHoursPerWeek: number;
  scheduledHoursPerWeek: number;
  diffHours: number;
  status: AuditItemStatus;
}

export interface RoomCurriculumAudit {
  roomName: string;
  level: 'primary' | 'secondary';
  requiredTotalHours: number;
  scheduledCurriculumHours: number;
  enrichmentHours: number;
  homeroomHours: number;
  totalScheduledSlots: number;
  totalRequiredSubjects: number;
  matchedSubjectsCount: number;
  issueCount: number;
  compliancePercent: number;
  isCompliant: boolean;
  subjects: CurriculumAuditSubjectRow[];
  enrichmentItems: Array<{ subjectName: string; hoursPerWeek: number }>;
  unmatchedSlots: Array<{ subjectName: string; hoursPerWeek: number }>;
}

export interface SchoolCurriculumAuditReport {
  academicYear: string;
  semester: TimetableSemester;
  rooms: RoomCurriculumAudit[];
  stats: {
    totalRooms: number;
    compliantRooms: number;
    totalRequiredSubjects: number;
    totalMatchedSubjects: number;
    totalIssues: number;
    overallCompliancePercent: number;
  };
}

const ENRICHMENT_SUBJECT_NAMES = new Set(['ส่งเสริมอ่านเขียน', 'สวดมนต์']);

function normalizeActivityName(rawName: string): string {
  const n = (rawName || '').trim();
  if (n === 'แนะแนว' || n === 'กิจกรรมแนะแนว') return 'กิจกรรมแนะแนว';
  if (n.startsWith('ลูกเสือ') || n.startsWith('เนตรนารี')) return 'ลูกเสือ/เนตรนารี';
  if (n === 'ชุมนุม' || n === 'ชมรม' || n === 'ชมรม/ชุมนุม') return 'ชมรม/ชุมนุม';
  return n;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Audits all 9 rooms (ป.1–ม.3) comparing official curriculum subjects vs actual
 * scheduled timetable_slots for the selected (academicYear, semester).
 */
export function evaluateSchoolCurriculumAudit(params: {
  academicYear: string;
  semester: TimetableSemester;
  slots: readonly TimetableSlot[];
  catalogSubjects?: readonly SchoolSubject[];
}): SchoolCurriculumAuditReport {
  const { academicYear, semester, slots, catalogSubjects } = params;
  const fallbackPresets = buildDefaultObecCurriculumPresets();

  const rooms: RoomCurriculumAudit[] = STANDARD_ROOMS.map((roomName) => {
    const level: 'primary' | 'secondary' = roomName.startsWith('ม.') ? 'secondary' : 'primary';

    // Resolve active curriculum for (roomName, semester)
    const fromCatalog = (catalogSubjects || []).filter(
      (s) =>
        s.isActive &&
        s.gradeLevels.includes(roomName) &&
        (s.semesterScope === 'both' || s.semesterScope === semester)
    );
    const roomCurriculum =
      fromCatalog.length > 0
        ? fromCatalog
        : fallbackPresets.filter(
            (s) =>
              s.isActive &&
              s.gradeLevels.includes(roomName) &&
              (s.semesterScope === 'both' || s.semesterScope === semester)
          );

    // Map curriculum items to mutable accumulators
    const codeToIdx = new Map<string, number>();
    const activityNameToIdx = new Map<string, number>();

    const rows: CurriculumAuditSubjectRow[] = roomCurriculum.map((sub, idx) => {
      const code = (sub.subjectCode || '').trim();
      if (code) {
        codeToIdx.set(code, idx);
      } else {
        activityNameToIdx.set(normalizeActivityName(sub.subjectName), idx);
      }
      return {
        subjectCode: code,
        subjectName: sub.subjectName,
        subjectGroup: sub.subjectGroup,
        subjectType: sub.subjectType,
        requiredHoursPerWeek: Number(sub.defaultHoursPerWeek) || 1,
        scheduledHoursPerWeek: 0,
        diffHours: 0,
        status: 'missing',
      };
    });

    const roomSlots = slots.filter((s) => s.roomName === roomName);
    let homeroomHours = 0;
    const enrichmentMap = new Map<string, number>();
    const unmatchedMap = new Map<string, number>();

    for (const slot of roomSlots) {
      const cleanName = (slot.subjectName || '').trim();
      if (
        cleanName === 'พบครูประจำชั้น' ||
        slot.subjectType === 'ประจำชั้น' ||
        slot.periodNo === 7
      ) {
        homeroomHours += 0.5;
        continue;
      }

      if (ENRICHMENT_SUBJECT_NAMES.has(cleanName)) {
        enrichmentMap.set(cleanName, (enrichmentMap.get(cleanName) || 0) + 1);
        continue;
      }

      // 1. Try matching by resolved OBEC subject code
      const resolvedCode = resolveSubjectCodeForDisplay({
        subjectCode: slot.subjectCode,
        subjectName: cleanName,
        roomName,
        semester,
        catalogSubjects: roomCurriculum,
      });

      if (resolvedCode && codeToIdx.has(resolvedCode)) {
        const idx = codeToIdx.get(resolvedCode)!;
        rows[idx].scheduledHoursPerWeek += 1;
        continue;
      }

      // 2. Try matching standard activities
      const normAct = normalizeActivityName(cleanName);
      if (activityNameToIdx.has(normAct)) {
        const idx = activityNameToIdx.get(normAct)!;
        rows[idx].scheduledHoursPerWeek += 1;
        continue;
      }

      // 3. Track any unmatched slot transparently
      unmatchedMap.set(cleanName || 'ไม่ระบุชื่อวิชา', (unmatchedMap.get(cleanName || 'ไม่ระบุชื่อวิชา') || 0) + 1);
    }

    let requiredTotalHours = 0;
    let scheduledCurriculumHours = 0;
    let matchedSubjectsCount = 0;
    let issueCount = 0;

    for (const row of rows) {
      row.scheduledHoursPerWeek = round1(row.scheduledHoursPerWeek);
      row.diffHours = round1(row.scheduledHoursPerWeek - row.requiredHoursPerWeek);
      requiredTotalHours += row.requiredHoursPerWeek;
      scheduledCurriculumHours += row.scheduledHoursPerWeek;

      if (row.scheduledHoursPerWeek === 0) {
        row.status = 'missing';
        issueCount += 1;
      } else if (row.scheduledHoursPerWeek === row.requiredHoursPerWeek) {
        row.status = 'match';
        matchedSubjectsCount += 1;
      } else if (row.scheduledHoursPerWeek < row.requiredHoursPerWeek) {
        row.status = 'under';
        issueCount += 1;
      } else {
        row.status = 'over';
        issueCount += 1;
      }
    }

    const enrichmentItems = Array.from(enrichmentMap.entries()).map(([subjectName, hoursPerWeek]) => ({
      subjectName,
      hoursPerWeek,
    }));
    const unmatchedSlots = Array.from(unmatchedMap.entries()).map(([subjectName, hoursPerWeek]) => ({
      subjectName,
      hoursPerWeek,
    }));

    const enrichmentHours = round1(
      enrichmentItems.reduce((sum, item) => sum + item.hoursPerWeek, 0)
    );
    const totalRequiredSubjects = rows.length;
    const compliancePercent =
      totalRequiredSubjects > 0
        ? Math.round((matchedSubjectsCount / totalRequiredSubjects) * 100)
        : 0;
    const isCompliant =
      totalRequiredSubjects > 0 && issueCount === 0 && unmatchedSlots.length === 0;

    return {
      roomName,
      level,
      requiredTotalHours: round1(requiredTotalHours),
      scheduledCurriculumHours: round1(scheduledCurriculumHours),
      enrichmentHours,
      homeroomHours: round1(homeroomHours),
      totalScheduledSlots: roomSlots.length,
      totalRequiredSubjects,
      matchedSubjectsCount,
      issueCount,
      compliancePercent,
      isCompliant,
      subjects: rows,
      enrichmentItems,
      unmatchedSlots,
    };
  });

  const totalRooms = rooms.length;
  const compliantRooms = rooms.filter((r) => r.isCompliant).length;
  const totalRequiredSubjects = rooms.reduce((sum, r) => sum + r.totalRequiredSubjects, 0);
  const totalMatchedSubjects = rooms.reduce((sum, r) => sum + r.matchedSubjectsCount, 0);
  const totalIssues = rooms.reduce(
    (sum, r) => sum + r.issueCount + r.unmatchedSlots.length,
    0
  );
  const overallCompliancePercent =
    totalRequiredSubjects > 0
      ? Math.round((totalMatchedSubjects / totalRequiredSubjects) * 100)
      : 0;

  return {
    academicYear,
    semester,
    rooms,
    stats: {
      totalRooms,
      compliantRooms,
      totalRequiredSubjects,
      totalMatchedSubjects,
      totalIssues,
      overallCompliancePercent,
    },
  };
}

/**
 * Exports the School-Wide Curriculum Audit Matrix as RFC-4180 UTF-8 BOM CSV for Excel.
 */
export function exportCurriculumAuditCsv(report: SchoolCurriculumAuditReport): string {
  const headers = [
    'ห้องเรียน',
    'รหัสวิชา',
    'ชื่อรายวิชา',
    'กลุ่มสาระ',
    'ประเภท',
    'เกณฑ์หลักสูตร (ชม./สัปดาห์)',
    'จัดในตารางจริง (ชม./สัปดาห์)',
    'ส่วนต่าง (ชม.)',
    'สถานะ',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];

  for (const room of report.rooms) {
    for (const sub of room.subjects) {
      const diffText = sub.diffHours > 0 ? `+${sub.diffHours}` : String(sub.diffHours);
      const row = [
        room.roomName,
        sub.subjectCode || '-',
        sub.subjectName,
        sub.subjectGroup,
        sub.subjectType,
        sub.requiredHoursPerWeek,
        sub.scheduledHoursPerWeek,
        diffText,
        AUDIT_STATUS_LABELS[sub.status],
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }
  }

  return `\uFEFF${lines.join('\r\n')}`;
}
