import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTimetableRollover,
  mapLegacyWorkloadToAllocation,
} from '../timetable-rollover';
import { getDefaultTimetableSettings } from '../timetable-utils';
import type { TimetableBundle } from '@/lib/data/timetableTypes';
import type { WorkloadItem } from '@/lib/data/schoolData';

const ACTIVE_TEACHERS = [{ id: 'TCH-01' }, { id: 'TCH-02' }];

const SOURCE_BUNDLE: TimetableBundle = {
  settings: getDefaultTimetableSettings('2569', '1'),
  allocations: [
    {
      id: 'ALLOC-SRC-1',
      academicYear: '2569',
      semester: '1',
      roomName: 'ป.1',
      subjectName: 'ภาษาไทย',
      subjectGroup: 'ภาษาไทย',
      subjectType: 'พื้นฐาน',
      teacherId: 'TCH-01',
      coTeacherId: 'TCH-INACTIVE',
      periodsPerWeek: 5,
      preferMorning: true,
      consecutivePeriods: 1,
    },
    {
      id: 'ALLOC-SRC-INACTIVE',
      academicYear: '2569',
      semester: '1',
      roomName: 'ป.2',
      subjectName: 'คณิตศาสตร์',
      subjectGroup: 'คณิตศาสตร์',
      subjectType: 'พื้นฐาน',
      teacherId: 'TCH-RETIRED',
      periodsPerWeek: 4,
      preferMorning: true,
      consecutivePeriods: 1,
    },
  ],
  slots: [
    {
      id: 'SLOT-SRC-1',
      academicYear: '2569',
      semester: '1',
      roomName: 'ป.1',
      dayOfWeek: 1,
      periodNo: 1,
      allocationId: 'ALLOC-SRC-1',
      subjectName: 'ภาษาไทย',
      subjectGroup: 'ภาษาไทย',
      subjectType: 'พื้นฐาน',
      teacherId: 'TCH-01',
      coTeacherId: 'TCH-INACTIVE',
      isLocked: false,
    },
    {
      id: 'SLOT-SRC-ROUTINE',
      academicYear: '2569',
      semester: '1',
      roomName: 'ป.1',
      dayOfWeek: 3,
      periodNo: 6,
      allocationId: '',
      subjectName: 'ลูกเสือสำรอง',
      subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
      subjectType: 'กิจกรรมพัฒนาผู้เรียน',
      teacherId: 'TCH-01',
      isLocked: true,
    },
  ],
  kindergartenSchedules: [
    {
      id: 'KG-2569-1-อ.1',
      academicYear: '2569',
      semester: '1',
      roomName: 'อ.1',
      homeroomTeacherId: 'TCH-02',
      assistantTeacherId: 'TCH-INACTIVE',
      weeklyHours: 25,
      activitiesJson: [{ timeRange: '08.30 - 09.00', activityName: 'กิจกรรมเคลื่อนไหวและจังหวะ' }],
    },
  ],
};

const EMPTY_TARGET_BUNDLE: TimetableBundle = {
  settings: getDefaultTimetableSettings('2569', '2'),
  allocations: [],
  slots: [],
  kindergartenSchedules: [],
};

describe('Cross-Term Timetable Rollover & Legacy Migration Mapper (timetable-rollover.ts)', () => {
  it('Mode "all": copies allocations, remaps slot allocationId, prunes inactive staff, copies kindergarten & deduplicates', () => {
    const result = buildTimetableRollover({
      sourceYear: '2569',
      sourceSemester: '1',
      targetYear: '2569',
      targetSemester: '2',
      mode: 'all',
      sourceBundle: SOURCE_BUNDLE,
      targetBundle: EMPTY_TARGET_BUNDLE,
      activeTeachers: ACTIVE_TEACHERS,
    });

    assert.equal(result.allocationsToCreate.length, 1);
    assert.equal(result.slotsToCreate.length, 2);
    assert.equal(result.kindergartenToCreate.length, 1);
    assert.equal(result.skippedInactiveStaff, 1);
    assert.equal(result.skippedDuplicates, 0);

    // allocationId on copied slot must point to newly created target allocation ID
    const newAllocId = result.allocationsToCreate[0].id;
    const copiedThaiSlot = result.slotsToCreate.find((s) => s.subjectName === 'ภาษาไทย');
    assert.ok(copiedThaiSlot);
    assert.equal(copiedThaiSlot.allocationId, newAllocId);
    assert.equal(copiedThaiSlot.coTeacherId, '');
    assert.equal(result.kindergartenToCreate[0].assistantTeacherId, '');

    // Re-running with populated target bundle must deduplicate 100%
    const secondRun = buildTimetableRollover({
      sourceYear: '2569',
      sourceSemester: '1',
      targetYear: '2569',
      targetSemester: '2',
      mode: 'all',
      sourceBundle: SOURCE_BUNDLE,
      targetBundle: {
        settings: result.settingsToUpsert!,
        allocations: result.allocationsToCreate,
        slots: result.slotsToCreate,
        kindergartenSchedules: result.kindergartenToCreate,
      },
      activeTeachers: ACTIVE_TEACHERS,
    });

    assert.equal(secondRun.allocationsToCreate.length, 0);
    assert.equal(secondRun.slotsToCreate.length, 0);
    assert.equal(secondRun.kindergartenToCreate.length, 0);
    assert.equal(secondRun.skippedDuplicates, 4);
  });

  it('Mode "fixed_only": copies ONLY locked/routine slots and skips subject allocations', () => {
    const result = buildTimetableRollover({
      sourceYear: '2569',
      sourceSemester: '1',
      targetYear: '2570',
      targetSemester: '1',
      mode: 'fixed_only',
      sourceBundle: SOURCE_BUNDLE,
      targetBundle: {
        settings: getDefaultTimetableSettings('2570', '1'),
        allocations: [],
        slots: [],
        kindergartenSchedules: [],
      },
      activeTeachers: ACTIVE_TEACHERS,
    });

    assert.equal(result.allocationsToCreate.length, 0);
    assert.equal(result.kindergartenToCreate.length, 0);
    assert.equal(result.slotsToCreate.length, 1);
    assert.equal(result.slotsToCreate[0].subjectName, 'ลูกเสือสำรอง');
    assert.equal(result.slotsToCreate[0].isLocked, true);
    assert.equal(result.slotsToCreate[0].academicYear, '2570');
  });

  it('maps legacy Category 1 teaching workload cleanly into a TimetableAllocation', () => {
    const legacy: WorkloadItem = {
      id: 'WL-OLD-1',
      teacherId: 'TCH-01',
      category: 'งานสอนและการจัดการเรียนรู้',
      title: 'คณิตศาสตร์ ป.5',
      subGroupOrLevel: 'ป.5',
      hoursPerWeek: 4,
      roleInTask: 'ผู้สอน',
      status: 'กำลังดำเนินการ',
      courseCode: 'ค15101',
    };

    const alloc = mapLegacyWorkloadToAllocation(legacy, '2569', '1');
    assert.equal(alloc.roomName, 'ป.5');
    assert.equal(alloc.subjectCode, 'ค15101');
    assert.equal(alloc.subjectGroup, 'คณิตศาสตร์');
    assert.equal(alloc.subjectType, 'พื้นฐาน');
    assert.equal(alloc.periodsPerWeek, 4);
    assert.equal(alloc.preferMorning, true);
  });
});
