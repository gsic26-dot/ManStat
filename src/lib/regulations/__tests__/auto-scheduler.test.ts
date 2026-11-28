import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAutoSchedule,
  evaluateSmartSwapTargets,
  applySmartSwap,
} from '../auto-scheduler';
import {
  STANDARD_ROOMS,
  DEFAULT_PERIODS_CONFIG,
  detectTimetableConflicts,
} from '../timetable-utils';
import type { TimetableAllocation, TimetableSlot } from '@/lib/data/timetableTypes';

describe('Deterministic Auto-Scheduler & Smart Swap Engine (auto-scheduler.ts)', () => {
  it('Test 1: schedules a 9-room school (ป.1–ม.3) with roving specialists, co-teaching & locked slots at 0 conflicts', () => {
    const allocations: TimetableAllocation[] = [];
    const lockedSlots: TimetableSlot[] = [];

    STANDARD_ROOMS.forEach((room, idx) => {
      const homeroomTeacher = `TCH-HR-${idx + 1}`;

      // Homeroom Period 7 (locked on Mon-Fri)
      for (let day = 1; day <= 5; day++) {
        lockedSlots.push({
          id: `LOCK-HR-${room}-${day}`,
          academicYear: '2569',
          semester: '1',
          roomName: room,
          dayOfWeek: day,
          periodNo: 7,
          subjectName: 'พบครูประจำชั้น',
          subjectGroup: 'เพิ่มเติม / ประจำชั้น',
          subjectType: 'ประจำชั้น',
          teacherId: homeroomTeacher,
          isLocked: true,
        });
      }

      // Locked Scout/Club activity on Wednesday Period 6
      lockedSlots.push({
        id: `LOCK-ACT-${room}`,
        academicYear: '2569',
        semester: '1',
        roomName: room,
        dayOfWeek: 3,
        periodNo: 6,
        subjectName: 'ลูกเสือสามัญ',
        subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
        subjectType: 'กิจกรรมพัฒนาผู้เรียน',
        teacherId: homeroomTeacher,
        isLocked: true,
      });

      // Thai (co-taught by Director in ป.1–ป.3)
      allocations.push({
        id: `ALLOC-TH-${room}`,
        academicYear: '2569',
        semester: '1',
        roomName: room,
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: homeroomTeacher,
        coTeacherId: idx < 3 ? 'TCH-DIR' : '',
        periodsPerWeek: 3,
        preferMorning: true,
        consecutivePeriods: 1,
      });

      // Roving Science specialist across all 9 rooms (2 periods/room = 18/30 slots)
      allocations.push({
        id: `ALLOC-SCI-${room}`,
        academicYear: '2569',
        semester: '1',
        roomName: room,
        subjectName: 'วิทยาศาสตร์',
        subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-SPEC-SCI',
        periodsPerWeek: 2,
        preferMorning: true,
        consecutivePeriods: 1,
      });

      // Roving English specialist across all 9 rooms (2 periods/room = 18/30 slots)
      allocations.push({
        id: `ALLOC-ENG-${room}`,
        academicYear: '2569',
        semester: '1',
        roomName: room,
        subjectName: 'ภาษาอังกฤษ',
        subjectGroup: 'ภาษาต่างประเทศ',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-SPEC-ENG',
        periodsPerWeek: 2,
        preferMorning: false,
        consecutivePeriods: 1,
      });
    });

    const result = generateAutoSchedule({
      academicYear: '2569',
      semester: '1',
      allocations,
      existingSlots: lockedSlots,
      periodsConfig: DEFAULT_PERIODS_CONFIG,
      respectLockedSlots: true,
      clearUnlockedFirst: true,
    });

    assert.equal(result.conflictsCount, 0);
    assert.equal(detectTimetableConflicts(result.slots).conflicts.length, 0);
    assert.equal(result.lockedKeptCount, lockedSlots.length);
    assert.equal(result.placedCount, 9 * (3 + 2 + 2));
    assert.equal(result.unplaced.length, 0);

    // Verify every locked slot is still untouched at exact coordinates
    for (const locked of lockedSlots) {
      const found = result.slots.find((s) => s.id === locked.id);
      assert.ok(found, `Locked slot ${locked.id} must be preserved`);
      assert.equal(found.dayOfWeek, locked.dayOfWeek);
      assert.equal(found.periodNo, locked.periodNo);
    }
  });

  it('Test 2: double periods (consecutivePeriods === 2) stay in same half-day block and never split across lunch (3 -> 4)', () => {
    const allocations: TimetableAllocation[] = [
      {
        id: 'ALLOC-ART-DBL',
        academicYear: '2569',
        semester: '1',
        roomName: 'ม.1',
        subjectName: 'การงานอาชีพ',
        subjectGroup: 'การงานอาชีพ',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-WORK',
        periodsPerWeek: 4, // 2 double-period blocks
        preferMorning: false,
        consecutivePeriods: 2,
      },
    ];

    const result = generateAutoSchedule({
      academicYear: '2569',
      semester: '1',
      allocations,
      existingSlots: [],
    });

    assert.equal(result.placedCount, 4);
    assert.equal(result.unplaced.length, 0);

    // Group placed slots by day and verify each pair is strictly adjacent inside (1-3) or (4-6)
    const byDay = new Map<number, number[]>();
    for (const s of result.slots) {
      const arr = byDay.get(s.dayOfWeek) || [];
      arr.push(s.periodNo);
      byDay.set(s.dayOfWeek, arr);
    }
    for (const [, periods] of byDay.entries()) {
      periods.sort((a, b) => a - b);
      assert.equal(periods.length, 2);
      assert.equal(periods[1] - periods[0], 1, 'Double period must be consecutive');
      assert.ok(
        !(periods[0] === 3 && periods[1] === 4),
        'Double period must NEVER split across lunch break (Period 3 -> Period 4)'
      );
    }
  });

  it('Test 3: places preferMorning subjects in Periods 1–4 and spreads across different days', () => {
    const allocations: TimetableAllocation[] = [
      {
        id: 'ALLOC-MATH-MORN',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.4',
        subjectName: 'คณิตศาสตร์',
        subjectGroup: 'คณิตศาสตร์',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-MATH',
        periodsPerWeek: 4,
        preferMorning: true,
        consecutivePeriods: 1,
      },
    ];

    const result = generateAutoSchedule({
      academicYear: '2569',
      semester: '1',
      allocations,
      existingSlots: [],
    });

    assert.equal(result.placedCount, 4);
    const distinctDays = new Set(result.slots.map((s) => s.dayOfWeek));
    assert.equal(distinctDays.size, 4, 'Single-period subject should spread across 4 distinct days');
    for (const slot of result.slots) {
      assert.ok(slot.periodNo <= 4, `Expected morning period 1-4, got period ${slot.periodNo}`);
    }
  });

  it('Test 4: gracefully populates unplaced queue with Thai diagnostic when teacher has no free slots', () => {
    // Lock TCH-BUSY in room ป.2 across ALL 30 teaching slots (days 1-5, periods 1-6)
    const lockedElsewhere: TimetableSlot[] = [];
    for (let day = 1; day <= 5; day++) {
      for (let period = 1; period <= 6; period++) {
        lockedElsewhere.push({
          id: `BUSY-D${day}-P${period}`,
          academicYear: '2569',
          semester: '1',
          roomName: 'ป.2',
          dayOfWeek: day,
          periodNo: period,
          subjectName: 'วิชาประจำ',
          subjectGroup: 'ภาษาไทย',
          subjectType: 'พื้นฐาน',
          teacherId: 'TCH-BUSY',
          isLocked: true,
        });
      }
    }

    const allocations: TimetableAllocation[] = [
      {
        id: 'ALLOC-IMPOSSIBLE',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        subjectName: 'คณิตศาสตร์',
        subjectGroup: 'คณิตศาสตร์',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-BUSY',
        periodsPerWeek: 3,
        preferMorning: true,
        consecutivePeriods: 1,
      },
    ];

    const result = generateAutoSchedule({
      academicYear: '2569',
      semester: '1',
      allocations,
      existingSlots: lockedElsewhere,
      scopeRooms: ['ป.1'],
    });

    assert.equal(result.placedCount, 0);
    assert.equal(result.conflictsCount, 0);
    assert.equal(result.unplaced.length, 1);
    assert.equal(result.unplaced[0].remainingPeriods, 3);
    assert.ok(result.unplaced[0].reason.includes('ครูผู้สอนไม่มีคาบว่าง'));
  });

  it('Test 5: Smart Swap distinguishes valid, locked, and conflict targets and swaps cleanly', () => {
    const slots: TimetableSlot[] = [
      {
        id: 'S-P1-D1P1',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        dayOfWeek: 1,
        periodNo: 1,
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-A',
        isLocked: false,
      },
      {
        id: 'S-P1-D1P2',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        dayOfWeek: 1,
        periodNo: 2,
        subjectName: 'คณิตศาสตร์',
        subjectGroup: 'คณิตศาสตร์',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-B',
        isLocked: false,
      },
      {
        id: 'S-P1-D1P3',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        dayOfWeek: 1,
        periodNo: 3,
        subjectName: 'ลูกเสือ',
        subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
        subjectType: 'กิจกรรมพัฒนาผู้เรียน',
        teacherId: 'TCH-C',
        isLocked: true,
      },
      // TCH-A is busy in room ป.2 on Day 2 Period 1
      {
        id: 'S-P2-D2P1',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.2',
        dayOfWeek: 2,
        periodNo: 1,
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-A',
        isLocked: false,
      },
    ];

    const names = new Map([
      ['TCH-A', 'ครูสุนิสา'],
      ['TCH-B', 'ครูสมชาย'],
    ]);

    const evalMap = evaluateSmartSwapTargets({
      roomName: 'ป.1',
      source: { dayOfWeek: 1, periodNo: 1 },
      slots,
      teacherNames: names,
    });

    assert.equal(evalMap.get('1-1')?.status, 'source');
    assert.equal(evalMap.get('1-2')?.status, 'valid');
    assert.equal(evalMap.get('1-3')?.status, 'locked');
    assert.equal(evalMap.get('2-1')?.status, 'conflict');
    assert.ok(evalMap.get('2-1')?.reason?.includes('ครูสุนิสา'));
    assert.ok(evalMap.get('2-1')?.reason?.includes('ป.2'));

    // Execute valid swap (1-1 <-> 1-2)
    const swapped = applySmartSwap(
      slots,
      'ป.1',
      { dayOfWeek: 1, periodNo: 1 },
      { dayOfWeek: 1, periodNo: 2 }
    );
    assert.equal(detectTimetableConflicts(swapped).conflicts.length, 0);
    const nowAtD1P1 = swapped.find((s) => s.roomName === 'ป.1' && s.dayOfWeek === 1 && s.periodNo === 1);
    const nowAtD1P2 = swapped.find((s) => s.roomName === 'ป.1' && s.dayOfWeek === 1 && s.periodNo === 2);
    assert.equal(nowAtD1P1?.subjectName, 'คณิตศาสตร์');
    assert.equal(nowAtD1P2?.subjectName, 'ภาษาไทย');
  });

  it('Test 6: primary_morning_core strategy places core subjects in morning Hours 1–3 and light subjects in afternoon Hours 4–6', () => {
    const allocations: TimetableAllocation[] = [
      {
        id: 'A-ART',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.3',
        subjectName: 'ศิลปะ/ดนตรี',
        subjectGroup: 'ศิลปะ',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-ART',
        periodsPerWeek: 2,
        preferMorning: false,
        consecutivePeriods: 1,
      },
      {
        id: 'A-PE',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.3',
        subjectName: 'พลศึกษา',
        subjectGroup: 'สุขศึกษาและพลศึกษา',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-PE',
        periodsPerWeek: 2,
        preferMorning: false,
        consecutivePeriods: 1,
      },
      {
        id: 'A-TH',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.3',
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-HR',
        periodsPerWeek: 3,
        preferMorning: false,
        consecutivePeriods: 1,
      },
      {
        id: 'A-MATH',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.3',
        subjectName: 'คณิตศาสตร์',
        subjectGroup: 'คณิตศาสตร์',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-HR',
        periodsPerWeek: 3,
        preferMorning: false,
        consecutivePeriods: 1,
      },
      {
        id: 'A-SCI',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.3',
        subjectName: 'วิทยาศาสตร์',
        subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-SCI',
        periodsPerWeek: 2,
        preferMorning: false,
        consecutivePeriods: 1,
      },
      {
        id: 'A-ENG',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.3',
        subjectName: 'ภาษาอังกฤษ',
        subjectGroup: 'ภาษาต่างประเทศ',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-ENG',
        periodsPerWeek: 2,
        preferMorning: false,
        consecutivePeriods: 1,
      },
    ];

    const result = generateAutoSchedule({
      academicYear: '2569',
      semester: '1',
      allocations,
      existingSlots: [],
      strategy: 'primary_morning_core',
    });

    assert.equal(result.conflictsCount, 0);
    assert.equal(result.unplaced.length, 0);

    const coreSlots = result.slots.filter((s) =>
      ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ'].includes(s.subjectName)
    );
    const lightSlots = result.slots.filter((s) =>
      ['ศิลปะ/ดนตรี', 'พลศึกษา'].includes(s.subjectName)
    );

    assert.equal(coreSlots.length, 10);
    assert.equal(lightSlots.length, 4);
    for (const s of coreSlots) {
      assert.ok(s.periodNo <= 3, `Core subject ${s.subjectName} should be in morning 1-3, got ${s.periodNo}`);
    }
    for (const s of lightSlots) {
      assert.ok(s.periodNo >= 4, `Light subject ${s.subjectName} should be in afternoon 4-6, got ${s.periodNo}`);
    }
  });
});
