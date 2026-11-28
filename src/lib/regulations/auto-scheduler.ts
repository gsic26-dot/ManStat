/**
 * ============================================================================
 * ManStat: Deterministic Constraint-Based Auto-Scheduler & Smart Swap Engine
 * ============================================================================
 * Phase 9.2:
 * - Pure TypeScript constraint solver (zero external API cost, 100% deterministic)
 * - Hard constraints:
 *   1. Max 1 slot per room per (dayOfWeek, periodNo)
 *   2. Zero teacher & co-teacher double-booking across different rooms
 *   3. Double periods (consecutivePeriods === 2) stay within same half-day block
 *      (1-2, 2-3, 4-5, 5-6) — NEVER split across lunch break (3 -> 4)
 *   4. Locked slots (isLocked === true) are NEVER moved or overwritten
 * - Soft scoring heuristic:
 *   1. Morning priority (preferMorning -> Periods 1–4, highest in 1–3)
 *   2. Spread same subject across different days in the same room
 *   3. Penalize 4+ consecutive teaching periods for teacher fatigue reduction
 *   4. Even room workload distribution across Mon–Fri
 * ============================================================================
 */

import type {
  PeriodConfigItem,
  TimetableAllocation,
  TimetableSemester,
  TimetableSlot,
} from '@/lib/data/timetableTypes';
import {
  DEFAULT_PERIODS_CONFIG,
  detectTimetableConflicts,
} from '@/lib/regulations/timetable-utils';

export interface UnplacedAllocationItem {
  allocationId: string;
  roomName: string;
  subjectName: string;
  teacherId: string;
  coTeacherId?: string;
  remainingPeriods: number;
  reason: string;
}

export type AutoScheduleStrategy = 'balanced' | 'primary_morning_core';
export type PrimarySubjectWeight = 'core_heavy' | 'light_afternoon' | 'standard';

export interface AutoScheduleParams {
  academicYear: string;
  semester: TimetableSemester;
  allocations: readonly TimetableAllocation[];
  existingSlots: readonly TimetableSlot[];
  periodsConfig?: readonly PeriodConfigItem[];
  scopeRooms?: readonly string[];
  respectLockedSlots?: boolean;
  clearUnlockedFirst?: boolean;
  strategy?: AutoScheduleStrategy;
}

const CORE_HEAVY_KEYWORDS = [
  'ภาษาไทย',
  'ส่งเสริมอ่านเขียน',
  'คณิตศาสตร์',
  'วิทยาศาสตร์',
  'วิทยาการคำนวณ',
  'ปัญญาประดิษฐ์',
  'ภาษาอังกฤษ',
  'ภาษาต่างประเทศ',
];

const LIGHT_AFTERNOON_KEYWORDS = [
  'ศิลปะ',
  'ดนตรี',
  'สุขศึกษา',
  'พลศึกษา',
  'การงานอาชีพ',
  'กิจกรรมพัฒนาผู้เรียน',
  'แนะแนว',
  'ชุมนุม',
  'ลูกเสือ',
  'สวดมนต์',
];

/**
 * Classifies an allocation's cognitive weight for Primary School morning-core scheduling.
 */
export function classifyPrimarySubjectWeight(
  alloc: Pick<TimetableAllocation, 'subjectName' | 'subjectGroup' | 'subjectType'>
): PrimarySubjectWeight {
  if (alloc.subjectType === 'กิจกรรมพัฒนาผู้เรียน') return 'light_afternoon';
  const combined = `${alloc.subjectName || ''} ${alloc.subjectGroup || ''}`;
  if (LIGHT_AFTERNOON_KEYWORDS.some((kw) => combined.includes(kw))) {
    return 'light_afternoon';
  }
  if (CORE_HEAVY_KEYWORDS.some((kw) => combined.includes(kw))) {
    return 'core_heavy';
  }
  return 'standard';
}

export interface AutoScheduleResult {
  slots: TimetableSlot[];
  placedCount: number;
  lockedKeptCount: number;
  unplaced: UnplacedAllocationItem[];
  conflictsCount: number;
}

export type SmartSwapCellStatus = 'source' | 'locked' | 'valid' | 'conflict';

export interface SmartSwapCellEvaluation {
  dayOfWeek: number;
  periodNo: number;
  status: SmartSwapCellStatus;
  reason?: string;
}

export interface SlotCoord {
  dayOfWeek: number;
  periodNo: number;
}

const VALID_DOUBLE_PAIRS: readonly [number, number][] = [
  [1, 2],
  [2, 3],
  [4, 5],
  [5, 6],
];

const TEACHING_PERIODS = [1, 2, 3, 4, 5, 6] as const;
const DAYS = [1, 2, 3, 4, 5] as const;

function makeRoomKey(roomName: string, day: number, period: number): string {
  return `${roomName}::${day}::${period}`;
}

function makeTeacherKey(staffId: string, day: number, period: number): string {
  return `${staffId}::${day}::${period}`;
}

function makeSlotId(
  academicYear: string,
  semester: TimetableSemester,
  roomName: string,
  day: number,
  period: number
): string {
  return `SLOT-${academicYear}-${semester}-${roomName}-D${day}-P${period}`;
}

function normalizeSubjectKey(name: string): string {
  return (name || '').trim().toLowerCase();
}

function computeMaxStreak(existingPeriods: ReadonlySet<number> | undefined, added: readonly number[]): number {
  const combined = new Set<number>(existingPeriods ? Array.from(existingPeriods) : []);
  for (const p of added) {
    if (p >= 1 && p <= 6) combined.add(p);
  }
  let maxStreak = 0;
  let current = 0;
  for (let p = 1; p <= 6; p++) {
    if (combined.has(p)) {
      current += 1;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 0;
    }
  }
  return maxStreak;
}

/**
 * Deterministic constraint-based timetable auto-scheduler.
 */
export function generateAutoSchedule(params: AutoScheduleParams): AutoScheduleResult {
  const { academicYear, semester } = params;
  const respectLocked = params.respectLockedSlots ?? true;
  const clearUnlocked = params.clearUnlockedFirst ?? true;
  const strategy: AutoScheduleStrategy = params.strategy || 'balanced';
  const periodsCfg =
    params.periodsConfig && params.periodsConfig.length > 0
      ? params.periodsConfig
      : DEFAULT_PERIODS_CONFIG;

  const homeroomPeriodNo =
    periodsCfg.find((p) => p.isHomeroom)?.periodNo ?? 7;

  const targetRoomSet =
    params.scopeRooms && params.scopeRooms.length > 0
      ? new Set(params.scopeRooms)
      : new Set(params.allocations.map((a) => a.roomName));

  // State maps
  const roomOccupied = new Map<string, TimetableSlot>();
  const teacherBusy = new Map<string, Set<string>>();
  const roomDaySubjectCount = new Map<string, Map<string, number>>();
  const roomDayTotalCount = new Map<string, number>();
  const teacherDayPeriods = new Map<string, Set<number>>();

  const registerSlot = (slot: TimetableSlot) => {
    roomOccupied.set(makeRoomKey(slot.roomName, slot.dayOfWeek, slot.periodNo), slot);

    const addTeacher = (staffId?: string) => {
      const clean = (staffId || '').trim();
      if (!clean) return;
      const tKey = makeTeacherKey(clean, slot.dayOfWeek, slot.periodNo);
      const rooms = teacherBusy.get(tKey) || new Set<string>();
      rooms.add(slot.roomName);
      teacherBusy.set(tKey, rooms);

      if (slot.periodNo >= 1 && slot.periodNo <= 6) {
        const tdKey = `${clean}::${slot.dayOfWeek}`;
        const pSet = teacherDayPeriods.get(tdKey) || new Set<number>();
        pSet.add(slot.periodNo);
        teacherDayPeriods.set(tdKey, pSet);
      }
    };

    addTeacher(slot.teacherId);
    if (slot.coTeacherId && slot.coTeacherId !== slot.teacherId) {
      addTeacher(slot.coTeacherId);
    }

    const rdKey = `${slot.roomName}::${slot.dayOfWeek}`;
    const subjMap = roomDaySubjectCount.get(rdKey) || new Map<string, number>();
    const normSubj = normalizeSubjectKey(slot.subjectName);
    subjMap.set(normSubj, (subjMap.get(normSubj) || 0) + 1);
    roomDaySubjectCount.set(rdKey, subjMap);
    roomDayTotalCount.set(rdKey, (roomDayTotalCount.get(rdKey) || 0) + 1);
  };

  // Step 1: Preserve all out-of-scope slots + locked/kept in-scope slots
  const keptSlots: TimetableSlot[] = [];
  let lockedKeptCount = 0;

  for (const slot of params.existingSlots) {
    const inScope = targetRoomSet.has(slot.roomName);
    if (!inScope) {
      keptSlots.push(slot);
      registerSlot(slot);
    } else if ((respectLocked && slot.isLocked) || !clearUnlocked) {
      keptSlots.push(slot);
      registerSlot(slot);
      if (slot.isLocked) lockedKeptCount += 1;
    }
  }

  // Step 2: Filter scoped allocations & deduct already-kept periods
  const scopedAllocations = params.allocations.filter((a) => targetRoomSet.has(a.roomName));
  const remainingByAllocId = new Map<string, number>();

  for (const alloc of scopedAllocations) {
    const keptForAlloc = keptSlots.filter(
      (s) =>
        s.roomName === alloc.roomName &&
        (s.allocationId === alloc.id ||
          (!s.allocationId &&
            normalizeSubjectKey(s.subjectName) === normalizeSubjectKey(alloc.subjectName) &&
            s.teacherId === alloc.teacherId))
    ).length;

    remainingByAllocId.set(alloc.id, Math.max(0, alloc.periodsPerWeek - keptForAlloc));
  }

  // Step 3: Compute roving count per teacher (number of distinct rooms taught)
  const teacherRooms = new Map<string, Set<string>>();
  for (const alloc of scopedAllocations) {
    const set = teacherRooms.get(alloc.teacherId) || new Set<string>();
    set.add(alloc.roomName);
    teacherRooms.set(alloc.teacherId, set);
  }

  // Sort allocations: Most-Constrained-First (deterministic)
  const sortedAllocations = [...scopedAllocations].sort((a, b) => {
    // 1. Double periods first
    if (a.consecutivePeriods !== b.consecutivePeriods) {
      return b.consecutivePeriods - a.consecutivePeriods;
    }
    // 2. Roving specialists (most rooms) first
    const rovingA = teacherRooms.get(a.teacherId)?.size || 1;
    const rovingB = teacherRooms.get(b.teacherId)?.size || 1;
    if (rovingA !== rovingB) return rovingB - rovingA;

    // 3. Co-teaching allocations (2 teachers must be free simultaneously)
    const coA = a.coTeacherId ? 1 : 0;
    const coB = b.coTeacherId ? 1 : 0;
    if (coA !== coB) return coB - coA;

    // 4. Primary morning-core priority or morning preference
    if (strategy === 'primary_morning_core') {
      const rank = (w: PrimarySubjectWeight) =>
        w === 'core_heavy' ? 0 : w === 'standard' ? 1 : 2;
      const wA = rank(classifyPrimarySubjectWeight(a));
      const wB = rank(classifyPrimarySubjectWeight(b));
      if (wA !== wB) return wA - wB;
    }

    if (a.preferMorning !== b.preferMorning) {
      return a.preferMorning ? -1 : 1;
    }

    // 5. Higher remaining periods
    const remA = remainingByAllocId.get(a.id) || 0;
    const remB = remainingByAllocId.get(b.id) || 0;
    if (remA !== remB) return remB - remA;

    // 6. Stable deterministic tie-break
    const roomCmp = a.roomName.localeCompare(b.roomName, 'th');
    if (roomCmp !== 0) return roomCmp;
    return a.id.localeCompare(b.id, 'en');
  });

  const isTeacherFree = (staffId: string | undefined, day: number, period: number): boolean => {
    const clean = (staffId || '').trim();
    if (!clean) return true;
    return !teacherBusy.has(makeTeacherKey(clean, day, period));
  };

  const newlyPlacedSlots: TimetableSlot[] = [];
  const unplaced: UnplacedAllocationItem[] = [];

  const createSlotFromAlloc = (
    alloc: TimetableAllocation,
    day: number,
    period: number
  ): TimetableSlot => ({
    id: makeSlotId(academicYear, semester, alloc.roomName, day, period),
    academicYear,
    semester,
    roomName: alloc.roomName,
    dayOfWeek: day,
    periodNo: period,
    allocationId: alloc.id,
    subjectCode: alloc.subjectCode || '',
    subjectName: alloc.subjectName,
    subjectGroup: alloc.subjectGroup,
    subjectType: alloc.subjectType,
    teacherId: alloc.teacherId,
    coTeacherId: alloc.coTeacherId || '',
    isLocked: false,
  });

  // Step 4: Place each allocation
  for (const alloc of sortedAllocations) {
    let remaining = remainingByAllocId.get(alloc.id) || 0;
    if (remaining <= 0) continue;

    const isHomeroom = alloc.subjectType === 'ประจำชั้น';
    const normSubj = normalizeSubjectKey(alloc.subjectName);
    const subjectWeight =
      strategy === 'primary_morning_core' ? classifyPrimarySubjectWeight(alloc) : 'standard';

    // 4A. Double-period blocks (consecutivePeriods === 2)
    if (!isHomeroom && alloc.consecutivePeriods === 2) {
      while (remaining >= 2) {
        let bestCandidate: { day: number; p1: number; p2: number; score: number } | null = null;
        let hasAnyFreeRoomPair = false;

        for (const day of DAYS) {
          for (const [p1, p2] of VALID_DOUBLE_PAIRS) {
            if (
              roomOccupied.has(makeRoomKey(alloc.roomName, day, p1)) ||
              roomOccupied.has(makeRoomKey(alloc.roomName, day, p2))
            ) {
              continue;
            }
            hasAnyFreeRoomPair = true;

            if (
              !isTeacherFree(alloc.teacherId, day, p1) ||
              !isTeacherFree(alloc.teacherId, day, p2) ||
              !isTeacherFree(alloc.coTeacherId, day, p1) ||
              !isTeacherFree(alloc.coTeacherId, day, p2)
            ) {
              continue;
            }

            let score = 0;
            if (strategy === 'primary_morning_core') {
              if (subjectWeight === 'core_heavy') {
                score += p2 <= 3 ? 50 : -20;
              } else if (subjectWeight === 'light_afternoon') {
                score += p1 >= 4 ? 40 : -18;
              }
            } else if (alloc.preferMorning) {
              if (p2 <= 3) score += 40;
              else score -= 10;
            }

            const rdKey = `${alloc.roomName}::${day}`;
            const existingSameSubj = roomDaySubjectCount.get(rdKey)?.get(normSubj) || 0;
            if (existingSameSubj > 0) score -= 85 * existingSameSubj;

            const tStreak = computeMaxStreak(
              teacherDayPeriods.get(`${alloc.teacherId}::${day}`),
              [p1, p2]
            );
            if (tStreak >= 4) score -= 18;

            if (alloc.coTeacherId) {
              const coStreak = computeMaxStreak(
                teacherDayPeriods.get(`${alloc.coTeacherId}::${day}`),
                [p1, p2]
              );
              if (coStreak >= 4) score -= 12;
            }

            const dayLoad = roomDayTotalCount.get(rdKey) || 0;
            score -= dayLoad * 2;
            // Deterministic tie-breaker favoring balanced earlier spread
            score -= day * 0.1 + p1 * 0.01;

            if (!bestCandidate || score > bestCandidate.score) {
              bestCandidate = { day, p1, p2, score };
            }
          }
        }

        if (!bestCandidate) {
          unplaced.push({
            allocationId: alloc.id,
            roomName: alloc.roomName,
            subjectName: alloc.subjectName,
            teacherId: alloc.teacherId,
            coTeacherId: alloc.coTeacherId || undefined,
            remainingPeriods: remaining,
            reason: hasAnyFreeRoomPair
              ? 'ไม่พบ 2 คาบติดกันที่ว่างตรงกันระหว่างห้องเรียนและครูผู้สอน'
              : 'ห้องเรียนไม่มี 2 คาบติดกันว่างเหลือแล้ว',
          });
          remaining = 0;
          break;
        }

        const slot1 = createSlotFromAlloc(alloc, bestCandidate.day, bestCandidate.p1);
        const slot2 = createSlotFromAlloc(alloc, bestCandidate.day, bestCandidate.p2);
        registerSlot(slot1);
        registerSlot(slot2);
        newlyPlacedSlots.push(slot1, slot2);
        remaining -= 2;
      }
    }

    // 4B. Single-period placement (or odd remainder from double-period allocation)
    const validPeriods: readonly number[] = isHomeroom ? [homeroomPeriodNo] : TEACHING_PERIODS;

    while (remaining > 0) {
      let bestCandidate: { day: number; period: number; score: number } | null = null;
      let hasAnyFreeRoomSlot = false;

      for (const day of DAYS) {
        for (const period of validPeriods) {
          if (roomOccupied.has(makeRoomKey(alloc.roomName, day, period))) {
            continue;
          }
          hasAnyFreeRoomSlot = true;

          if (
            !isTeacherFree(alloc.teacherId, day, period) ||
            !isTeacherFree(alloc.coTeacherId, day, period)
          ) {
            continue;
          }

          let score = 0;
          if (!isHomeroom) {
            if (strategy === 'primary_morning_core') {
              if (subjectWeight === 'core_heavy') {
                if (period <= 3) score += 50;
                else if (period === 4) score += 10;
                else score -= 22;
              } else if (subjectWeight === 'light_afternoon') {
                if (period >= 4) score += 40;
                else score -= 18;
              } else if (alloc.preferMorning) {
                if (period <= 3) score += 25;
                else if (period === 4) score += 15;
              }
            } else if (alloc.preferMorning) {
              if (period <= 3) score += 40;
              else if (period === 4) score += 22;
              else score -= 12;
            } else {
              // Slight preference to leave morning slots open for morning-priority subjects
              if (period >= 4) score += 4;
            }
          }

          const rdKey = `${alloc.roomName}::${day}`;
          const existingSameSubj = roomDaySubjectCount.get(rdKey)?.get(normSubj) || 0;
          if (existingSameSubj > 0) score -= 95 * existingSameSubj;

          if (!isHomeroom) {
            const tStreak = computeMaxStreak(
              teacherDayPeriods.get(`${alloc.teacherId}::${day}`),
              [period]
            );
            if (tStreak >= 4) score -= 18;

            if (alloc.coTeacherId) {
              const coStreak = computeMaxStreak(
                teacherDayPeriods.get(`${alloc.coTeacherId}::${day}`),
                [period]
              );
              if (coStreak >= 4) score -= 12;
            }
          }

          const dayLoad = roomDayTotalCount.get(rdKey) || 0;
          score -= dayLoad * 2;
          score -= day * 0.1 + period * 0.01;

          if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = { day, period, score };
          }
        }
      }

      if (!bestCandidate) {
        unplaced.push({
          allocationId: alloc.id,
          roomName: alloc.roomName,
          subjectName: alloc.subjectName,
          teacherId: alloc.teacherId,
          coTeacherId: alloc.coTeacherId || undefined,
          remainingPeriods: remaining,
          reason: !hasAnyFreeRoomSlot
            ? 'ช่องคาบเรียนของห้องเต็มแล้ว'
            : alloc.coTeacherId
            ? 'ครูผู้สอนหลักและครูร่วมสอนไม่มีคาบว่างตรงกับห้องเรียนนี้'
            : 'ครูผู้สอนไม่มีคาบว่างตรงกับห้องเรียนนี้',
        });
        break;
      }

      const slot = createSlotFromAlloc(alloc, bestCandidate.day, bestCandidate.period);
      registerSlot(slot);
      newlyPlacedSlots.push(slot);
      remaining -= 1;
    }
  }

  const allSlots = [...keptSlots, ...newlyPlacedSlots];
  const conflictCheck = detectTimetableConflicts(allSlots);

  return {
    slots: allSlots,
    placedCount: newlyPlacedSlots.length,
    lockedKeptCount,
    unplaced,
    conflictsCount: conflictCheck.conflicts.length,
  };
}

export interface EvaluateSmartSwapParams {
  roomName: string;
  source: SlotCoord;
  slots: readonly TimetableSlot[];
  teacherNames?: ReadonlyMap<string, string>;
}

/**
 * Evaluates every swappable cell in `roomName` for a selected `source` cell.
 * - Matches Period 1–6 with 1–6, or Period 7 with 7.
 * - Flags locked targets as 'locked', conflicting teacher/co-teacher targets as 'conflict'
 *   with a clear Thai reason, and conflict-free targets (occupied or empty) as 'valid'.
 */
export function evaluateSmartSwapTargets(
  params: EvaluateSmartSwapParams
): Map<string, SmartSwapCellEvaluation> {
  const { roomName, source, slots, teacherNames } = params;
  const result = new Map<string, SmartSwapCellEvaluation>();

  const sourceSlot = slots.find(
    (s) =>
      s.roomName === roomName &&
      s.dayOfWeek === source.dayOfWeek &&
      s.periodNo === source.periodNo
  );
  if (!sourceSlot || sourceSlot.isLocked) {
    return result;
  }

  const isHomeroomSource = source.periodNo === 7;
  const domainPeriods: readonly number[] = isHomeroomSource ? [7] : TEACHING_PERIODS;

  const formatName = (id: string) => teacherNames?.get(id) || id;

  // Map other-room occupancy: `${staffId}::${day}::${period}` -> roomName
  const otherRoomBusy = new Map<string, string>();
  const roomSlotMap = new Map<string, TimetableSlot>();

  for (const s of slots) {
    if (s.roomName === roomName) {
      roomSlotMap.set(`${s.dayOfWeek}-${s.periodNo}`, s);
    } else {
      if (s.teacherId) {
        otherRoomBusy.set(makeTeacherKey(s.teacherId, s.dayOfWeek, s.periodNo), s.roomName);
      }
      if (s.coTeacherId && s.coTeacherId !== s.teacherId) {
        otherRoomBusy.set(makeTeacherKey(s.coTeacherId, s.dayOfWeek, s.periodNo), s.roomName);
      }
    }
  }

  const findBusyConflict = (slot: TimetableSlot, day: number, period: number, labelSuffix: string): string | null => {
    const busyPrimary = otherRoomBusy.get(makeTeacherKey(slot.teacherId, day, period));
    if (busyPrimary) {
      return `${formatName(slot.teacherId)} สอนห้อง ${busyPrimary} อยู่${labelSuffix}`;
    }
    if (slot.coTeacherId && slot.coTeacherId !== slot.teacherId) {
      const busyCo = otherRoomBusy.get(makeTeacherKey(slot.coTeacherId, day, period));
      if (busyCo) {
        return `${formatName(slot.coTeacherId)} ร่วมสอนห้อง ${busyCo} อยู่${labelSuffix}`;
      }
    }
    return null;
  };

  for (const day of DAYS) {
    for (const period of domainPeriods) {
      const cellKey = `${day}-${period}`;

      if (day === source.dayOfWeek && period === source.periodNo) {
        result.set(cellKey, { dayOfWeek: day, periodNo: period, status: 'source' });
        continue;
      }

      const targetSlot = roomSlotMap.get(cellKey);
      if (targetSlot?.isLocked) {
        result.set(cellKey, {
          dayOfWeek: day,
          periodNo: period,
          status: 'locked',
          reason: 'คาบนี้ถูกล็อกอยู่',
        });
        continue;
      }

      // 1. Check moving source -> target
      const sourceConflict = findBusyConflict(sourceSlot, day, period, 'ในคาบนี้');
      if (sourceConflict) {
        result.set(cellKey, {
          dayOfWeek: day,
          periodNo: period,
          status: 'conflict',
          reason: sourceConflict,
        });
        continue;
      }

      // 2. If target is occupied, check moving target -> source
      if (targetSlot) {
        const targetConflict = findBusyConflict(
          targetSlot,
          source.dayOfWeek,
          source.periodNo,
          'ในคาบต้นทาง'
        );
        if (targetConflict) {
          result.set(cellKey, {
            dayOfWeek: day,
            periodNo: period,
            status: 'conflict',
            reason: targetConflict,
          });
          continue;
        }
      }

      result.set(cellKey, { dayOfWeek: day, periodNo: period, status: 'valid' });
    }
  }

  return result;
}

/**
 * Purely swaps `source` and `target` cells inside `roomName` (or moves `source` into an empty `target`).
 */
export function applySmartSwap(
  slots: readonly TimetableSlot[],
  roomName: string,
  source: SlotCoord,
  target: SlotCoord
): TimetableSlot[] {
  const sourceSlot = slots.find(
    (s) =>
      s.roomName === roomName &&
      s.dayOfWeek === source.dayOfWeek &&
      s.periodNo === source.periodNo
  );
  if (!sourceSlot) return [...slots];

  const targetSlot = slots.find(
    (s) =>
      s.roomName === roomName &&
      s.dayOfWeek === target.dayOfWeek &&
      s.periodNo === target.periodNo
  );

  const untouched = slots.filter(
    (s) =>
      !(
        s.roomName === roomName &&
        ((s.dayOfWeek === source.dayOfWeek && s.periodNo === source.periodNo) ||
          (s.dayOfWeek === target.dayOfWeek && s.periodNo === target.periodNo))
      )
  );

  const movedSource: TimetableSlot = {
    ...sourceSlot,
    id: makeSlotId(
      sourceSlot.academicYear,
      sourceSlot.semester,
      roomName,
      target.dayOfWeek,
      target.periodNo
    ),
    dayOfWeek: target.dayOfWeek,
    periodNo: target.periodNo,
  };

  if (targetSlot) {
    const movedTarget: TimetableSlot = {
      ...targetSlot,
      id: makeSlotId(
        targetSlot.academicYear,
        targetSlot.semester,
        roomName,
        source.dayOfWeek,
        source.periodNo
      ),
      dayOfWeek: source.dayOfWeek,
      periodNo: source.periodNo,
    };
    return [...untouched, movedSource, movedTarget];
  }

  return [...untouched, movedSource];
}
