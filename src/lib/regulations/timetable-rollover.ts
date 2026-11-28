/**
 * ============================================================================
 * ManStat: Cross-Term Timetable Rollover (2 Modes) & Legacy Category 1 Mapper
 * ============================================================================
 * Phase 9.3:
 * - Pure, deterministic rollover helper supporting:
 *   1. mode = 'all'        (recommended for Semester 1 -> Semester 2)
 *   2. mode = 'fixed_only' (recommended for new Academic Year)
 * - Non-destructive, active-staff pruned, allocationId remapped, idempotent.
 * - Pure legacy Category 1 workload -> TimetableAllocation mapper.
 * ============================================================================
 */

import type { TeacherRecord, WorkloadItem } from '@/lib/data/schoolData';
import type {
  KindergartenSchedule,
  TimetableAllocation,
  TimetableBundle,
  TimetableSemester,
  TimetableSettings,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import {
  COMMON_SUBJECT_PRESETS,
  STANDARD_ROOMS,
  STANDARD_SUBJECT_GROUPS,
} from '@/lib/regulations/timetable-utils';

export type TimetableRolloverMode = 'all' | 'fixed_only';

export interface TimetableRolloverParams {
  sourceYear: string;
  sourceSemester: TimetableSemester;
  targetYear: string;
  targetSemester: TimetableSemester;
  mode: TimetableRolloverMode;
  sourceBundle: TimetableBundle;
  targetBundle: TimetableBundle;
  activeTeachers: readonly Pick<TeacherRecord, 'id'>[];
}

export interface TimetableRolloverResult {
  settingsToUpsert: TimetableSettings | null;
  allocationsToCreate: TimetableAllocation[];
  slotsToCreate: TimetableSlot[];
  kindergartenToCreate: KindergartenSchedule[];
  skippedDuplicates: number;
  skippedInactiveStaff: number;
}

const ROUTINE_SLOT_KEYWORDS = ['ชุมนุม', 'ลูกเสือ', 'สวดมนต์', 'พบครูประจำชั้น'];

function isRoutineSlot(slot: TimetableSlot): boolean {
  if (slot.isLocked) return true;
  if (slot.subjectType === 'ประจำชั้น') return true;
  const name = (slot.subjectName || '').trim();
  return ROUTINE_SLOT_KEYWORDS.some((kw) => name.includes(kw));
}

function makeAllocDedupKey(a: Pick<TimetableAllocation, 'roomName' | 'subjectName' | 'teacherId'>): string {
  return `${a.roomName}::${(a.subjectName || '').trim().toLowerCase()}::${a.teacherId}`;
}

function makeSlotDedupKey(s: Pick<TimetableSlot, 'roomName' | 'dayOfWeek' | 'periodNo'>): string {
  return `${s.roomName}::${s.dayOfWeek}::${s.periodNo}`;
}

export function buildTimetableRollover(params: TimetableRolloverParams): TimetableRolloverResult {
  const {
    sourceYear,
    sourceSemester,
    targetYear,
    targetSemester,
    mode,
    sourceBundle,
    targetBundle,
    activeTeachers,
  } = params;

  if (
    !sourceYear.trim() ||
    !targetYear.trim() ||
    (sourceYear.trim() === targetYear.trim() && sourceSemester === targetSemester)
  ) {
    return {
      settingsToUpsert: null,
      allocationsToCreate: [],
      slotsToCreate: [],
      kindergartenToCreate: [],
      skippedDuplicates: 0,
      skippedInactiveStaff: 0,
    };
  }

  const activeStaffIds = new Set(activeTeachers.map((t) => t.id));
  let skippedDuplicates = 0;
  let skippedInactiveStaff = 0;

  // 1. Settings (always copy period structure & footer note cleanly to target term)
  const settingsToUpsert: TimetableSettings = {
    id: `${targetYear}-${targetSemester}`,
    academicYear: targetYear,
    semester: targetSemester,
    periodsConfig: sourceBundle.settings.periodsConfig.map((p) => ({ ...p })),
    fixedSlotsConfig: (sourceBundle.settings.fixedSlotsConfig || []).map((f) => ({ ...f })),
    footerNote: sourceBundle.settings.footerNote || '',
  };

  const targetAllocKeys = new Set(targetBundle.allocations.map(makeAllocDedupKey));
  const targetSlotKeys = new Set(targetBundle.slots.map(makeSlotDedupKey));
  const targetKgRooms = new Set(targetBundle.kindergartenSchedules.map((k) => k.roomName));

  const allocationsToCreate: TimetableAllocation[] = [];
  const slotsToCreate: TimetableSlot[] = [];
  const kindergartenToCreate: KindergartenSchedule[] = [];

  // Map old allocationId -> new target allocationId so copied slots stay linked
  const allocIdRemap = new Map<string, string>();
  const batchStamp = Date.now().toString(36);

  // 2. Allocations (Mode 'all' only)
  if (mode === 'all') {
    for (const srcAlloc of sourceBundle.allocations) {
      if (!activeStaffIds.has(srcAlloc.teacherId)) {
        skippedInactiveStaff += 1;
        continue;
      }

      const key = makeAllocDedupKey(srcAlloc);
      if (targetAllocKeys.has(key)) {
        // Still record existing target allocation ID for slot remapping if present
        const existingTarget = targetBundle.allocations.find((t) => makeAllocDedupKey(t) === key);
        if (existingTarget) allocIdRemap.set(srcAlloc.id, existingTarget.id);
        skippedDuplicates += 1;
        continue;
      }

      const newId = `ALLOC-${targetYear}-${targetSemester}-${batchStamp}-${allocationsToCreate.length + 1}`;
      allocIdRemap.set(srcAlloc.id, newId);
      targetAllocKeys.add(key);

      const cleanCoTeacher =
        srcAlloc.coTeacherId &&
        srcAlloc.coTeacherId !== srcAlloc.teacherId &&
        activeStaffIds.has(srcAlloc.coTeacherId)
          ? srcAlloc.coTeacherId
          : '';

      allocationsToCreate.push({
        ...srcAlloc,
        id: newId,
        academicYear: targetYear,
        semester: targetSemester,
        coTeacherId: cleanCoTeacher,
      });
    }
  }

  // 3. Slots (Mode 'all' copies all active slots; Mode 'fixed_only' copies ONLY locked/routine slots)
  for (const srcSlot of sourceBundle.slots) {
    if (mode === 'fixed_only' && !isRoutineSlot(srcSlot)) {
      continue;
    }

    if (!activeStaffIds.has(srcSlot.teacherId)) {
      skippedInactiveStaff += 1;
      continue;
    }

    const slotKey = makeSlotDedupKey(srcSlot);
    if (targetSlotKeys.has(slotKey)) {
      skippedDuplicates += 1;
      continue;
    }

    const cleanCoTeacher =
      srcSlot.coTeacherId &&
      srcSlot.coTeacherId !== srcSlot.teacherId &&
      activeStaffIds.has(srcSlot.coTeacherId)
        ? srcSlot.coTeacherId
        : '';

    const remappedAllocId =
      mode === 'all' && srcSlot.allocationId
        ? allocIdRemap.get(srcSlot.allocationId) || ''
        : '';

    targetSlotKeys.add(slotKey);
    slotsToCreate.push({
      ...srcSlot,
      id: `SLOT-${targetYear}-${targetSemester}-${srcSlot.roomName}-D${srcSlot.dayOfWeek}-P${srcSlot.periodNo}`,
      academicYear: targetYear,
      semester: targetSemester,
      allocationId: remappedAllocId,
      coTeacherId: cleanCoTeacher,
      isLocked: mode === 'fixed_only' ? true : Boolean(srcSlot.isLocked),
    });
  }

  // 4. Kindergarten Schedules (Mode 'all' only)
  if (mode === 'all') {
    for (const srcKg of sourceBundle.kindergartenSchedules) {
      if (!activeStaffIds.has(srcKg.homeroomTeacherId)) {
        skippedInactiveStaff += 1;
        continue;
      }

      if (targetKgRooms.has(srcKg.roomName)) {
        skippedDuplicates += 1;
        continue;
      }

      const cleanAssistant =
        srcKg.assistantTeacherId &&
        srcKg.assistantTeacherId !== srcKg.homeroomTeacherId &&
        activeStaffIds.has(srcKg.assistantTeacherId)
          ? srcKg.assistantTeacherId
          : '';

      targetKgRooms.add(srcKg.roomName);
      kindergartenToCreate.push({
        ...srcKg,
        id: `KG-${targetYear}-${targetSemester}-${srcKg.roomName}`,
        academicYear: targetYear,
        semester: targetSemester,
        assistantTeacherId: cleanAssistant,
        activitiesJson: Array.isArray(srcKg.activitiesJson)
          ? srcKg.activitiesJson.map((act) => ({ ...act }))
          : [],
      });
    }
  }

  return {
    settingsToUpsert,
    allocationsToCreate,
    slotsToCreate,
    kindergartenToCreate,
    skippedDuplicates,
    skippedInactiveStaff,
  };
}

/**
 * Pure mapper converting a legacy Category 1 WorkloadItem into a draft TimetableAllocation.
 */
export function mapLegacyWorkloadToAllocation(
  workload: WorkloadItem,
  academicYear: string,
  semester: TimetableSemester
): TimetableAllocation {
  const rawSub = (workload.subGroupOrLevel || '').trim();
  const matchedRoom = (STANDARD_ROOMS as readonly string[]).find(
    (r) => rawSub.includes(r) || (workload.title || '').includes(r)
  );
  const roomName = matchedRoom || STANDARD_ROOMS[0];

  const cleanTitle = (workload.title || '').trim() || 'รายวิชาเดิม';
  const matchedPreset = COMMON_SUBJECT_PRESETS.find((p) => cleanTitle.includes(p.name));

  const periodsPerWeek = Math.max(1, Math.min(35, Math.round(Number(workload.hoursPerWeek) || 1)));

  return {
    id: `ALLOC-MIG-${academicYear}-${semester}-${workload.id}`,
    academicYear,
    semester,
    roomName,
    subjectCode: (workload.courseCode || '').trim(),
    subjectName: cleanTitle,
    subjectGroup: matchedPreset?.group || STANDARD_SUBJECT_GROUPS[0],
    subjectType: matchedPreset?.type || 'พื้นฐาน',
    teacherId: workload.teacherId,
    coTeacherId: '',
    periodsPerWeek,
    preferMorning: Boolean(matchedPreset?.defaultPreferMorning),
    consecutivePeriods: 1,
  };
}
