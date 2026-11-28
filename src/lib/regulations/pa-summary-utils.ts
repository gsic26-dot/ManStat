/**
 * ============================================================================
 * ManStat: PA Assessment Summary & OBEC 38-System Directory Engine (Phase 10)
 * ============================================================================
 * Pure, deterministic aggregation & RFC-4180 UTF-8 BOM CSV export helpers:
 * - Combines 4-Division Admin Workloads (Phase 8), Timetable & Kindergarten
 *   Weekly Loads (Phases 9.1–9.3.1), and Daily Substitutions (Phase 9.4).
 * - Zero side effects, 100% unit-testable, zero emojis.
 * ============================================================================
 */

import type { TeacherRecord, WorkloadItem } from '@/lib/data/schoolData';
import type {
  KindergartenSchedule,
  PeriodConfigItem,
  TeachingSubstitution,
  TimetableSemester,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import { OBEC_SYSTEM_CATALOG } from '@/lib/regulations/obec-admin-roles';
import {
  DEFAULT_PERIODS_CONFIG,
  calculateTeacherWeeklyLoads,
  type W9StatusLabel,
} from '@/lib/regulations/timetable-utils';
import { formatStaffName } from '@/lib/regulations/staff-formatting';
import {
  WORKLOAD_ADMIN_CATEGORY,
  getStaffDivisions,
  normalizeDivisionName,
  type StandardDivisionName,
} from '@/lib/staffDivisions';

export interface StaffRef {
  id: string;
  name: string;
}

export interface ObecDirectoryItem {
  code: string;
  name: string;
  cycle: string;
  division: StandardDivisionName;
  primaryStaff: StaffRef[];
  coStaff: StaffRef[];
  roleTitles: string[];
  isAssigned: boolean;
}

export interface ObecSystemDirectoryResult {
  items: ObecDirectoryItem[];
  totalSystems: number;
  assignedCount: number;
  unassignedCount: number;
  coveragePercent: number;
}

const LEGACY_TEACHING_CATEGORY = 'งานสอนและการจัดการเรียนรู้';
const ADHOC_PROJECT_CATEGORY = 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ';

function filterWorkloadsByYear(
  workloads: readonly WorkloadItem[],
  academicYear: string
): WorkloadItem[] {
  const cleanYear = (academicYear || '').trim();
  return workloads.filter((w) => {
    if (w.category === LEGACY_TEACHING_CATEGORY) return false;
    if (!cleanYear || cleanYear === 'ALL') return true;
    return (w.academicYear || '').trim() === cleanYear;
  });
}

/**
 * Builds the 38-System OBEC Responsibility Directory for a given academic year.
 */
export function buildObecSystemDirectory(params: {
  workloads: readonly WorkloadItem[];
  teachers: readonly TeacherRecord[];
  academicYear: string;
}): ObecSystemDirectoryResult {
  const { workloads, teachers, academicYear } = params;
  const yearWorkloads = filterWorkloadsByYear(workloads, academicYear);
  const teacherMap = new Map<string, TeacherRecord>(teachers.map((t) => [t.id, t]));

  const items: ObecDirectoryItem[] = OBEC_SYSTEM_CATALOG.map((sys) => {
    const matched = yearWorkloads.filter(
      (w) => Array.isArray(w.obecSystems) && w.obecSystems.includes(sys.code)
    );

    const primaryMap = new Map<string, StaffRef>();
    const coMap = new Map<string, StaffRef>();
    const roleTitleSet = new Set<string>();

    for (const w of matched) {
      if (w.title && w.title.trim()) roleTitleSet.add(w.title.trim());

      const primaryStaff = teacherMap.get(w.teacherId);
      if (primaryStaff && !primaryMap.has(primaryStaff.id)) {
        primaryMap.set(primaryStaff.id, {
          id: primaryStaff.id,
          name: formatStaffName(primaryStaff),
        });
      }

      if (Array.isArray(w.coResponsibleIds)) {
        for (const coId of w.coResponsibleIds) {
          const coStaff = teacherMap.get(coId);
          if (coStaff && !primaryMap.has(coStaff.id) && !coMap.has(coStaff.id)) {
            coMap.set(coStaff.id, {
              id: coStaff.id,
              name: formatStaffName(coStaff),
            });
          }
        }
      }
    }

    // Remove anyone from coMap who was also added to primaryMap in a later workload
    for (const primaryId of primaryMap.keys()) {
      coMap.delete(primaryId);
    }

    const primaryStaff = Array.from(primaryMap.values());
    const coStaff = Array.from(coMap.values());

    return {
      code: sys.code,
      name: sys.name,
      cycle: sys.cycle,
      division: sys.division,
      primaryStaff,
      coStaff,
      roleTitles: Array.from(roleTitleSet),
      isAssigned: primaryStaff.length > 0,
    };
  });

  const totalSystems = items.length;
  const assignedCount = items.filter((i) => i.isAssigned).length;
  const unassignedCount = totalSystems - assignedCount;
  const coveragePercent =
    totalSystems > 0 ? Math.round((assignedCount / totalSystems) * 100) : 0;

  return {
    items,
    totalSystems,
    assignedCount,
    unassignedCount,
    coveragePercent,
  };
}

export type PaTeachingStatusLabel = W9StatusLabel | 'สายสนับสนุน / บริการ';

export interface PaStaffSummaryRow {
  teacherId: string;
  name: string;
  position: string;
  w9StatusLabel: PaTeachingStatusLabel;
  coreAndElectiveHours: number;
  activityHours: number;
  kindergartenHours: number;
  homeroomHours: number;
  teachingHoursExclHomeroom: number;
  totalHoursInclHomeroom: number;
  substituteCount: number;
  substituteHours: number;
  divisions: string[];
  adminRoles: string[];
  projects: string[];
  obecSystems: string[];
}

export interface PaSummaryStats {
  totalActiveStaff: number;
  teachersPassingW9: number;
  teachersBelowW9: number;
  totalSubstituteHours: number;
  totalObecAssigned: number;
  totalObecSystems: number;
}

export interface PaStaffSummaryResult {
  rows: PaStaffSummaryRow[];
  stats: PaSummaryStats;
}

function roundHours(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Builds the Unified PA Assessment Summary merging Timetable + Kindergarten +
 * Daily Substitutions + 4-Division Admin Roles + 38 OBEC Systems.
 */
export function buildPaStaffSummary(params: {
  teachers: readonly TeacherRecord[];
  workloads: readonly WorkloadItem[];
  slots: readonly TimetableSlot[];
  kindergartenSchedules: readonly KindergartenSchedule[];
  substitutions: readonly TeachingSubstitution[];
  periodsConfig?: readonly PeriodConfigItem[];
  academicYear: string;
  semester: TimetableSemester;
}): PaStaffSummaryResult {
  const {
    teachers,
    workloads,
    slots,
    kindergartenSchedules,
    substitutions,
    academicYear,
    semester,
  } = params;
  const periodsCfg =
    params.periodsConfig && params.periodsConfig.length > 0
      ? params.periodsConfig
      : DEFAULT_PERIODS_CONFIG;

  const yearWorkloads = filterWorkloadsByYear(workloads, academicYear);
  const weeklyLoads = calculateTeacherWeeklyLoads(
    slots,
    teachers,
    periodsCfg,
    kindergartenSchedules
  );
  const loadMap = new Map(weeklyLoads.map((l) => [l.teacherId, l]));

  const periodMap = new Map(periodsCfg.map((p) => [p.periodNo, p]));

  // Aggregate cumulative substitutions for the selected academicYear & semester
  const subCountMap = new Map<string, number>();
  const subHoursMap = new Map<string, number>();

  for (const sub of substitutions) {
    if (
      (academicYear && academicYear !== 'ALL' && sub.academicYear !== academicYear) ||
      sub.semester !== semester
    ) {
      continue;
    }
    const id = (sub.substituteTeacherId || '').trim();
    if (!id) continue;

    const hrs =
      sub.periodNo === 0
        ? 5.0
        : periodMap.get(sub.periodNo)?.durationHours ?? (sub.periodNo === 7 ? 0.5 : 1.0);

    subCountMap.set(id, (subCountMap.get(id) || 0) + 1);
    subHoursMap.set(id, (subHoursMap.get(id) || 0) + hrs);
  }

  let teachersPassingW9 = 0;
  let teachersBelowW9 = 0;
  let totalSubstituteHours = 0;

  const rows: PaStaffSummaryRow[] = teachers.map((teacher) => {
    const load = loadMap.get(teacher.id);
    const w9StatusLabel: PaTeachingStatusLabel = load
      ? load.w9StatusLabel
      : 'สายสนับสนุน / บริการ';

    if (w9StatusLabel === 'ผ่านเกณฑ์') teachersPassingW9 += 1;
    else if (w9StatusLabel === 'ต่ำกว่าเกณฑ์') teachersBelowW9 += 1;

    const subCount = subCountMap.get(teacher.id) || 0;
    const subHours = roundHours(subHoursMap.get(teacher.id) || 0);
    totalSubstituteHours += subHours;

    // Divisions for this academic year
    const staffAdminPrimary = yearWorkloads.filter(
      (w) => w.teacherId === teacher.id && w.category === WORKLOAD_ADMIN_CATEGORY
    );
    const staffAdminCo = yearWorkloads.filter(
      (w) =>
        w.teacherId !== teacher.id &&
        w.category === WORKLOAD_ADMIN_CATEGORY &&
        Array.isArray(w.coResponsibleIds) &&
        w.coResponsibleIds.includes(teacher.id)
    );

    const divisions =
      !academicYear || academicYear === 'ALL'
        ? getStaffDivisions(teacher, yearWorkloads)
        : Array.from(
            new Set(
              staffAdminPrimary
                .map((w) => normalizeDivisionName(w.subGroupOrLevel))
                .filter((d): d is StandardDivisionName => Boolean(d))
            )
          );

    const adminRoles = [
      ...staffAdminPrimary.map((w) => w.title),
      ...staffAdminCo.map((w) => `${w.title} (ร่วม)`),
    ].filter(Boolean);

    const staffProjectsPrimary = yearWorkloads.filter(
      (w) => w.teacherId === teacher.id && w.category === ADHOC_PROJECT_CATEGORY
    );
    const staffProjectsCo = yearWorkloads.filter(
      (w) =>
        w.teacherId !== teacher.id &&
        w.category === ADHOC_PROJECT_CATEGORY &&
        Array.isArray(w.coResponsibleIds) &&
        w.coResponsibleIds.includes(teacher.id)
    );
    const projects = [
      ...staffProjectsPrimary.map((w) => w.title),
      ...staffProjectsCo.map((w) => `${w.title} (ร่วม)`),
    ].filter(Boolean);

    const obecSystemSet = new Set<string>();
    for (const w of yearWorkloads) {
      const isInvolved =
        w.teacherId === teacher.id ||
        (Array.isArray(w.coResponsibleIds) && w.coResponsibleIds.includes(teacher.id));
      if (isInvolved && Array.isArray(w.obecSystems)) {
        for (const code of w.obecSystems) {
          if (code && code.trim()) obecSystemSet.add(code.trim());
        }
      }
    }

    return {
      teacherId: teacher.id,
      name: formatStaffName(teacher),
      position: teacher.position || '-',
      w9StatusLabel,
      coreAndElectiveHours: load?.coreAndElectiveHours ?? 0,
      activityHours: load?.activityHours ?? 0,
      kindergartenHours: load?.kindergartenHours ?? 0,
      homeroomHours: load?.homeroomHours ?? 0,
      teachingHoursExclHomeroom: load?.teachingHoursExclHomeroom ?? 0,
      totalHoursInclHomeroom: load?.totalHoursInclHomeroom ?? 0,
      substituteCount: subCount,
      substituteHours: subHours,
      divisions,
      adminRoles,
      projects,
      obecSystems: Array.from(obecSystemSet).sort((a, b) => a.localeCompare(b, 'en')),
    };
  });

  const directory = buildObecSystemDirectory({ workloads, teachers, academicYear });

  return {
    rows,
    stats: {
      totalActiveStaff: teachers.length,
      teachersPassingW9,
      teachersBelowW9,
      totalSubstituteHours: roundHours(totalSubstituteHours),
      totalObecAssigned: directory.assignedCount,
      totalObecSystems: directory.totalSystems,
    },
  };
}

/**
 * RFC-4180 compliant CSV cell escaper.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports OBEC 38-System Directory as UTF-8 BOM CSV for Microsoft Excel.
 */
export function exportObecDirectoryCsv(
  directory: ObecSystemDirectoryResult,
  academicYear: string
): string {
  const headers = [
    'รหัสระบบ',
    'ชื่อระบบรายงาน สพฐ.',
    'ฝ่ายที่เกี่ยวข้อง',
    'ผู้รับผิดชอบหลัก',
    'ผู้ร่วมรับผิดชอบ',
    'ตำแหน่ง/หน้าที่',
    'สถานะ',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];

  for (const item of directory.items) {
    const row = [
      item.code,
      item.name,
      item.division,
      item.primaryStaff.map((s) => s.name).join(' / ') || '-',
      item.coStaff.map((s) => s.name).join(' / ') || '-',
      item.roleTitles.join(' / ') || '-',
      item.isAssigned ? `มอบหมายแล้ว (${academicYear})` : 'ยังไม่มีผู้รับผิดชอบ',
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  }

  return `\uFEFF${lines.join('\r\n')}`;
}

/**
 * Exports Unified PA Assessment Summary as UTF-8 BOM CSV for Microsoft Excel.
 */
export function exportPaSummaryCsv(
  summary: PaStaffSummaryResult,
  academicYear: string,
  semester: TimetableSemester
): string {
  const headers = [
    'ลำดับ',
    'ชื่อ-สกุล',
    'ตำแหน่ง',
    'สถานะ ว 9/2564',
    'พื้นฐาน/เพิ่มเติม (ชม.)',
    'กิจกรรม (ชม.)',
    'ปฐมวัย (ชม.)',
    'ประจำชั้น (ชม.)',
    'ชั่วโมงสอน/สัปดาห์',
    'สอนแทนสะสม (ชม.)',
    'สังกัดฝ่ายงาน',
    'งานบริหารและหน้าที่ประจำ',
    'โครงการ/คณะกรรมการ',
    'ระบบรายงาน สพฐ.',
  ];

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...summary.rows.map((r, idx) =>
      [
        idx + 1,
        r.name,
        r.position,
        r.w9StatusLabel,
        r.coreAndElectiveHours,
        r.activityHours,
        r.kindergartenHours,
        r.homeroomHours,
        r.teachingHoursExclHomeroom,
        r.substituteHours,
        r.divisions.join(' / ') || '-',
        r.adminRoles.join(' ; ') || '-',
        r.projects.join(' ; ') || '-',
        r.obecSystems.join(', ') || '-',
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  // Keep academicYear & semester referenced cleanly in filename by caller; body is pure tabular CSV
  void academicYear;
  void semester;
  return `\uFEFF${lines.join('\r\n')}`;
}
