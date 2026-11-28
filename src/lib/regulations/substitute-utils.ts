/**
 * ============================================================================
 * ManStat: Leave-to-Substitute Teacher Bridge Engine (จัดสอนแทนรายวัน)
 * ============================================================================
 * Phase 9.4:
 * - Connects Leave Requests (`LeaveRequestRecord`) with Timetable Slots &
 *   Kindergarten Schedules (`อ.1–อ.3`) for any selected date (`YYYY-MM-DD`).
 * - Handles full-day, morning half-day (Hours 1–3), and afternoon half-day (Hours 4–7).
 * - Filters `availableSubstitutes` strictly:
 *   1. Eligible for teaching (`isEligibleForTeaching` — excludes janitors)
 *   2. NOT on leave at that date/half-day
 *   3. NOT teaching in any room (`timetable_slots` or `kindergarten_schedules`) at that hour
 *   4. NOT already assigned as a substitute in another room at that `(dateStr, periodNo)`
 * - Formats clean, zero-emoji Thai LINE notification text.
 * ============================================================================
 */

import type { LeaveRequestRecord, TeacherRecord } from '@/lib/data/schoolData';
import type {
  KindergartenSchedule,
  PeriodConfigItem,
  TeachingSubstitution,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import {
  DEFAULT_PERIODS_CONFIG,
  isEligibleForTeaching,
} from '@/lib/regulations/timetable-utils';
import { formatStaffName } from '@/lib/regulations/staff-formatting';

export type LeaveDayScope = 'full' | 'morning' | 'afternoon';

export interface AvailableSubstituteCandidate {
  teacherId: string;
  name: string;
  dailyTeachingCount: number;
  isPresentCoTeacher: boolean;
}

export interface AffectedTeachingItem {
  key: string; // `${roomName}-${periodNo}`
  roomName: string;
  dayOfWeek: number;
  periodNo: number; // 1..7 or 0 for full-day kindergarten
  subjectName: string;
  absentTeacherId: string;
  leaveId: string;
  leaveTypeName: string;
  isCoTeacherRole: boolean;
  presentCoTeacherId?: string;
  currentSubstitution?: TeachingSubstitution;
  availableSubstitutes: AvailableSubstituteCandidate[];
}

export interface AffectedSlotsForDateResult {
  dateStr: string;
  dayOfWeek: number; // 1..5 (0/6 for weekend)
  isWeekend: boolean;
  absentTeachers: Array<{
    teacherId: string;
    leaveId: string;
    leaveTypeName: string;
    scope: LeaveDayScope;
  }>;
  affectedItems: AffectedTeachingItem[];
}

/**
 * Parses YYYY-MM-DD safely without timezone drift and returns ISO dayOfWeek (1=Mon..5=Fri, 6=Sat, 7=Sun).
 */
export function getIsoDayOfWeekFromDateStr(dateStr: string): number {
  const parts = (dateStr || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0;
  const [y, m, d] = parts;
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Detects whether a leave covers full day, morning half-day (Hours 1–3), or afternoon half-day (Hours 4–7).
 */
export function detectLeaveHalfDayScope(leave: LeaveRequestRecord): LeaveDayScope {
  const startTime = (leave.startTime || '').trim();
  const endTime = (leave.endTime || '').trim();
  const combinedText = `${leave.leaveTypeName || ''} ${leave.reason || ''}`;

  if (startTime || endTime) {
    const startHour = Number(startTime.split(':')[0] || startTime.split('.')[0]);
    const endHour = Number(endTime.split(':')[0] || endTime.split('.')[0]);
    if (!Number.isNaN(endHour) && endHour > 0 && endHour <= 12) return 'morning';
    if (!Number.isNaN(startHour) && startHour >= 12) return 'afternoon';
  }

  if (Number(leave.totalDays) > 0 && Number(leave.totalDays) < 1) {
    if (combinedText.includes('บ่าย')) return 'afternoon';
    if (combinedText.includes('เช้า')) return 'morning';
    return 'morning';
  }

  return 'full';
}

function isPeriodCoveredByLeaveScope(periodNo: number, scope: LeaveDayScope): boolean {
  if (scope === 'full') return true;
  if (periodNo === 0) return true; // Kindergarten full-day homeroom affected by any half-day leave
  if (scope === 'morning') return periodNo >= 1 && periodNo <= 3;
  return periodNo >= 4 && periodNo <= 7;
}

function isLeaveActiveOnDate(leave: LeaveRequestRecord, dateStr: string): boolean {
  const status = String(leave.status || '').toLowerCase();
  if (status === 'rejected' || status === 'cancelled' || status === 'ยกเลิก') {
    return false;
  }
  const start = (leave.startDate || '').slice(0, 10);
  const end = (leave.endDate || start).slice(0, 10);
  if (!start) return false;
  return dateStr >= start && dateStr <= end;
}

export function getAffectedSlotsForDate(params: {
  dateStr: string;
  leaves: readonly LeaveRequestRecord[];
  slots: readonly TimetableSlot[];
  kindergartenSchedules: readonly KindergartenSchedule[];
  teachers: readonly TeacherRecord[];
  existingSubstitutions: readonly TeachingSubstitution[];
}): AffectedSlotsForDateResult {
  const { dateStr, leaves, slots, kindergartenSchedules, teachers, existingSubstitutions } = params;
  const dayOfWeek = getIsoDayOfWeekFromDateStr(dateStr);
  const isWeekend = dayOfWeek < 1 || dayOfWeek > 5;

  if (isWeekend) {
    return {
      dateStr,
      dayOfWeek,
      isWeekend: true,
      absentTeachers: [],
      affectedItems: [],
    };
  }

  // Resolve teacherId cleanly (supporting id or employeeCode)
  const teacherIdLookup = new Map<string, string>();
  const eligibleTeachers: TeacherRecord[] = [];
  for (const t of teachers) {
    teacherIdLookup.set(t.id, t.id);
    if (t.employeeCode) teacherIdLookup.set(t.employeeCode, t.id);
    if (isEligibleForTeaching(t)) eligibleTeachers.push(t);
  }

  // 1. Collect absent teachers on dateStr
  const absentMap = new Map<
    string,
    { teacherId: string; leaveId: string; leaveTypeName: string; scope: LeaveDayScope }
  >();

  for (const leave of leaves) {
    if (!isLeaveActiveOnDate(leave, dateStr)) continue;
    const resolvedId = teacherIdLookup.get(leave.teacherId) || leave.teacherId;
    const scope = detectLeaveHalfDayScope(leave);
    const existing = absentMap.get(resolvedId);
    if (!existing || scope === 'full') {
      absentMap.set(resolvedId, {
        teacherId: resolvedId,
        leaveId: leave.id,
        leaveTypeName: leave.leaveTypeName || leave.leaveType || 'ลา',
        scope,
      });
    }
  }

  const absentTeachers = Array.from(absentMap.values());
  if (absentTeachers.length === 0) {
    return {
      dateStr,
      dayOfWeek,
      isWeekend: false,
      absentTeachers: [],
      affectedItems: [],
    };
  }

  // 2. Compute busy map & daily teaching counts for dayOfWeek
  const busyAtPeriod = new Map<string, Set<string>>(); // `${periodNo}` -> Set<teacherId>
  const dailyTeachingCount = new Map<string, number>();

  const markBusy = (teacherId: string | undefined, periodNo: number) => {
    const clean = (teacherId || '').trim();
    if (!clean) return;
    const key = String(periodNo);
    const set = busyAtPeriod.get(key) || new Set<string>();
    set.add(clean);
    busyAtPeriod.set(key, set);
    dailyTeachingCount.set(clean, (dailyTeachingCount.get(clean) || 0) + 1);
  };

  const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek);
  for (const s of daySlots) {
    markBusy(s.teacherId, s.periodNo);
    if (s.coTeacherId && s.coTeacherId !== s.teacherId) {
      markBusy(s.coTeacherId, s.periodNo);
    }
  }

  // Kindergarten homeroom teachers are busy all day (periods 0..7)
  const kgBusyTeachers = new Set<string>();
  for (const kg of kindergartenSchedules) {
    if (kg.homeroomTeacherId) {
      kgBusyTeachers.add(kg.homeroomTeacherId);
      dailyTeachingCount.set(
        kg.homeroomTeacherId,
        (dailyTeachingCount.get(kg.homeroomTeacherId) || 0) + 5
      );
    }
  }

  // Existing substitutions on this date
  const subsForDate = existingSubstitutions.filter((sub) => sub.subDate === dateStr);
  const subByRoomPeriod = new Map<string, TeachingSubstitution>();
  for (const sub of subsForDate) {
    subByRoomPeriod.set(`${sub.roomName}-${sub.periodNo}`, sub);
  }

  const buildAvailableCandidates = (
    roomName: string,
    periodNo: number,
    presentCoTeacherId?: string
  ): AvailableSubstituteCandidate[] => {
    const busySet = busyAtPeriod.get(String(periodNo)) || new Set<string>();
    // Substitutes already assigned to ANOTHER room at this same (dateStr, periodNo)
    const subBusyOtherRoom = new Set<string>();
    for (const sub of subsForDate) {
      if (sub.roomName !== roomName && (sub.periodNo === periodNo || sub.periodNo === 0 || periodNo === 0)) {
        subBusyOtherRoom.add(sub.substituteTeacherId);
      }
    }

    const candidates: AvailableSubstituteCandidate[] = [];
    for (const staff of eligibleTeachers) {
      // Exclude if absent at this period
      const abs = absentMap.get(staff.id);
      if (abs && isPeriodCoveredByLeaveScope(periodNo, abs.scope)) continue;

      // Present co-teacher is already in THIS room & period — always valid and prioritized!
      const isPresentCo = Boolean(presentCoTeacherId && staff.id === presentCoTeacherId);

      if (!isPresentCo) {
        if (periodNo === 0) {
          // Full-day kindergarten replacement: must not be teaching any slot or another KG room
          const teachesToday = daySlots.some(
            (s) => s.teacherId === staff.id || s.coTeacherId === staff.id
          );
          if (teachesToday || kgBusyTeachers.has(staff.id)) continue;
        } else {
          if (busySet.has(staff.id) || kgBusyTeachers.has(staff.id)) continue;
        }
        if (subBusyOtherRoom.has(staff.id)) continue;
      }

      candidates.push({
        teacherId: staff.id,
        name: formatStaffName(staff),
        dailyTeachingCount: dailyTeachingCount.get(staff.id) || 0,
        isPresentCoTeacher: isPresentCo,
      });
    }

    return candidates.sort((a, b) => {
      if (a.isPresentCoTeacher !== b.isPresentCoTeacher) {
        return a.isPresentCoTeacher ? -1 : 1;
      }
      if (a.dailyTeachingCount !== b.dailyTeachingCount) {
        return a.dailyTeachingCount - b.dailyTeachingCount;
      }
      return a.name.localeCompare(b.name, 'th');
    });
  };

  // 3. Gather affected regular slots (ป.1–ม.3)
  const affectedItems: AffectedTeachingItem[] = [];

  for (const slot of daySlots) {
    const primaryAbsent = absentMap.get(slot.teacherId);
    const coAbsent = slot.coTeacherId ? absentMap.get(slot.coTeacherId) : undefined;

    const isPrimaryHit = Boolean(
      primaryAbsent && isPeriodCoveredByLeaveScope(slot.periodNo, primaryAbsent.scope)
    );
    const isCoHit = Boolean(
      coAbsent && isPeriodCoveredByLeaveScope(slot.periodNo, coAbsent.scope)
    );

    if (!isPrimaryHit && !isCoHit) continue;

    const absentEntry = isPrimaryHit ? primaryAbsent! : coAbsent!;
    const presentCoTeacherId =
      isPrimaryHit && slot.coTeacherId && !isCoHit
        ? slot.coTeacherId
        : !isPrimaryHit && isCoHit
        ? slot.teacherId
        : undefined;

    const key = `${slot.roomName}-${slot.periodNo}`;
    affectedItems.push({
      key,
      roomName: slot.roomName,
      dayOfWeek,
      periodNo: slot.periodNo,
      subjectName: slot.subjectName,
      absentTeacherId: absentEntry.teacherId,
      leaveId: absentEntry.leaveId,
      leaveTypeName: absentEntry.leaveTypeName,
      isCoTeacherRole: !isPrimaryHit && isCoHit,
      presentCoTeacherId,
      currentSubstitution: subByRoomPeriod.get(key),
      availableSubstitutes: buildAvailableCandidates(
        slot.roomName,
        slot.periodNo,
        presentCoTeacherId
      ),
    });
  }

  // 4. Gather affected kindergarten schedules (อ.1–อ.3, periodNo = 0)
  for (const kg of kindergartenSchedules) {
    const kgAbsent = absentMap.get(kg.homeroomTeacherId);
    if (!kgAbsent) continue;

    const presentAssistant =
      kg.assistantTeacherId && !absentMap.has(kg.assistantTeacherId)
        ? kg.assistantTeacherId
        : undefined;

    const key = `${kg.roomName}-0`;
    affectedItems.push({
      key,
      roomName: kg.roomName,
      dayOfWeek,
      periodNo: 0,
      subjectName: 'กิจกรรมจัดประสบการณ์ปฐมวัย (ตลอดวัน)',
      absentTeacherId: kg.homeroomTeacherId,
      leaveId: kgAbsent.leaveId,
      leaveTypeName: kgAbsent.leaveTypeName,
      isCoTeacherRole: false,
      presentCoTeacherId: presentAssistant,
      currentSubstitution: subByRoomPeriod.get(key),
      availableSubstitutes: buildAvailableCandidates(kg.roomName, 0, presentAssistant),
    });
  }

  affectedItems.sort((a, b) => {
    if (a.periodNo !== b.periodNo) return a.periodNo - b.periodNo;
    return a.roomName.localeCompare(b.roomName, 'th');
  });

  return {
    dateStr,
    dayOfWeek,
    isWeekend: false,
    absentTeachers,
    affectedItems,
  };
}

function formatThaiDateLabel(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateStr;
  const [y, m, d] = parts;
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  return `${d} ${thaiMonths[m - 1] || m} ${y + 543}`;
}

/**
 * Generates clean, zero-emoji Thai LINE group summary for daily substitute assignments.
 */
export function formatSubstitutionLineSummary(params: {
  dateStr: string;
  affectedItems: readonly AffectedTeachingItem[];
  teachers: readonly TeacherRecord[];
  periodsConfig?: readonly PeriodConfigItem[];
}): string {
  const { dateStr, affectedItems, teachers } = params;
  const periodsCfg = params.periodsConfig || DEFAULT_PERIODS_CONFIG;
  const teacherMap = new Map(teachers.map((t) => [t.id, formatStaffName(t)]));
  const periodMap = new Map(periodsCfg.map((p) => [p.periodNo, p]));

  const nameOf = (id?: string) => (id ? teacherMap.get(id) || id : '-');

  const lines: string[] = [
    `แจ้งตารางจัดสอนแทน โรงเรียนชุมชนบ้านตะขบ`,
    `วันที่ ${formatThaiDateLabel(dateStr)}`,
    '--------------------------------',
  ];

  if (affectedItems.length === 0) {
    lines.push('ไม่มีรายการชั่วโมงสอนที่ได้รับผลกระทบในวันนี้');
    return lines.join('\n');
  }

  for (const item of affectedItems) {
    const pCfg = periodMap.get(item.periodNo);
    const timeLabel =
      item.periodNo === 0
        ? 'ตลอดวัน (ปฐมวัย)'
        : pCfg
        ? `${pCfg.label} (${pCfg.startTime}-${pCfg.endTime})`
        : `ชั่วโมงที่ ${item.periodNo}`;

    const subText = item.currentSubstitution
      ? `ผู้สอนแทน: ${nameOf(item.currentSubstitution.substituteTeacherId)}`
      : item.presentCoTeacherId
      ? `มีครูร่วมสอนปฏิบัติหน้าที่ (${nameOf(item.presentCoTeacherId)})`
      : 'ยังไม่ได้จัดผู้สอนแทน';

    lines.push(
      `- ห้อง ${item.roomName} | ${timeLabel} | วิชา${item.subjectName}`
    );
    lines.push(
      `  ครูที่ลา: ${nameOf(item.absentTeacherId)} -> ${subText}`
    );
  }

  return lines.join('\n');
}
