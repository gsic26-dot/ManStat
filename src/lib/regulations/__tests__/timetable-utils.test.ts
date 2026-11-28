import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PERIODS_CONFIG,
  detectTimetableConflicts,
  calculateTeacherWeeklyLoads,
  isEligibleForTeaching,
} from '../timetable-utils';
import type { TimetableSlot } from '@/lib/data/timetableTypes';
import type { TeacherRecord } from '@/lib/data/schoolData';

const MOCK_TEACHERS: TeacherRecord[] = [
  {
    id: 'TCH-DIR',
    name: 'นายธีรศักดิ์ มโนธรรม',
    position: 'ผู้อำนวยการสถานศึกษา',
    department: 'สายงานบริหารสถานศึกษา',
    academicStanding: 'ชำนาญการพิเศษ',
    licenseNo: '1001',
    licenseExpiry: '2030-01-01',
    status: 'ปฏิบัติราชการ',
  } as unknown as TeacherRecord,
  {
    id: 'TCH-01',
    name: 'นางสาวอภิชญา พุสดีดอน',
    position: 'ครู',
    department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
    academicStanding: 'ชำนาญการ',
    licenseNo: '1002',
    licenseExpiry: '2030-01-01',
    status: 'ปฏิบัติราชการ',
  } as unknown as TeacherRecord,
  {
    id: 'TCH-02',
    name: 'นายสมชาย ใจดี',
    position: 'ครู',
    department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    academicStanding: 'ไม่มีวิทยฐานะ',
    licenseNo: '1003',
    licenseExpiry: '2030-01-01',
    status: 'ปฏิบัติราชการ',
  } as unknown as TeacherRecord,
];

describe('Timetable Conflict Detection & ว 9/2564 Calculator (timetable-utils.ts)', () => {
  it('allows co-teaching in the same room and slot with zero conflicts', () => {
    const slots: TimetableSlot[] = [
      {
        id: 'SL-1',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        dayOfWeek: 1,
        periodNo: 1,
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-01',
        coTeacherId: 'TCH-DIR',
        isLocked: false,
      },
    ];

    const result = detectTimetableConflicts(slots);
    assert.equal(result.conflicts.length, 0);
    assert.equal(result.conflictingSlotIds.size, 0);
  });

  it('detects teacher double-booking across two different rooms (primary and co-teacher)', () => {
    const slots: TimetableSlot[] = [
      {
        id: 'SL-1',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        dayOfWeek: 2,
        periodNo: 3,
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-01',
        coTeacherId: 'TCH-DIR',
        isLocked: false,
      },
      {
        id: 'SL-2',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.2',
        dayOfWeek: 2,
        periodNo: 3,
        subjectName: 'ส่งเสริมอ่านเขียน',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'เพิ่มเติม',
        teacherId: 'TCH-DIR',
        coTeacherId: '',
        isLocked: false,
      },
    ];

    const result = detectTimetableConflicts(slots);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].teacherId, 'TCH-DIR');
    assert.deepEqual(result.conflicts[0].rooms, ['ป.1', 'ป.2']);
    assert.ok(result.conflictingSlotIds.has('SL-1'));
    assert.ok(result.conflictingSlotIds.has('SL-2'));
    assert.ok(result.conflicts[0].reason.includes('ป.1'));
    assert.ok(result.conflicts[0].reason.includes('ป.2'));
  });

  it('calculates ว 9/2564 weekly hours accurately (60-min periods = 1.0 hr, Period 7 homeroom = 0.5 hr)', () => {
    const slots: TimetableSlot[] = [];

    // Give TCH-01: 10 core/elective periods (10 hrs) + 2 activity periods (2 hrs) + 5 Period-7 homeroom (2.5 hrs)
    // Total excl. homeroom = 12.0 hrs (meets >= 12 threshold), total incl. homeroom = 14.5 hrs, 17 periods
    for (let i = 0; i < 10; i++) {
      slots.push({
        id: `SL-CORE-${i}`,
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        dayOfWeek: (i % 5) + 1,
        periodNo: Math.floor(i / 5) + 1,
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: i < 8 ? 'พื้นฐาน' : 'เพิ่มเติม',
        teacherId: 'TCH-01',
        coTeacherId: i === 0 ? 'TCH-DIR' : '',
        isLocked: false,
      });
    }

    for (let i = 0; i < 2; i++) {
      slots.push({
        id: `SL-ACT-${i}`,
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        dayOfWeek: i + 1,
        periodNo: 6,
        subjectName: i === 0 ? 'แนะแนว' : 'ลูกเสือสำรอง',
        subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
        subjectType: 'กิจกรรมพัฒนาผู้เรียน',
        teacherId: 'TCH-01',
        isLocked: false,
      });
    }

    for (let day = 1; day <= 5; day++) {
      slots.push({
        id: `SL-HR-${day}`,
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        dayOfWeek: day,
        periodNo: 7,
        subjectName: 'พบครูประจำชั้น',
        subjectGroup: 'เพิ่มเติม / ประจำชั้น',
        subjectType: 'ประจำชั้น',
        teacherId: 'TCH-01',
        isLocked: false,
      });
    }

    // Give TCH-02: only 5 core periods (5 hrs) -> below 12 hr threshold
    for (let day = 1; day <= 5; day++) {
      slots.push({
        id: `SL-T2-${day}`,
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.2',
        dayOfWeek: day,
        periodNo: 1,
        subjectName: 'คณิตศาสตร์',
        subjectGroup: 'คณิตศาสตร์',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-02',
        isLocked: false,
      });
    }

    const loads = calculateTeacherWeeklyLoads(slots, MOCK_TEACHERS, DEFAULT_PERIODS_CONFIG);
    const t1 = loads.find((l) => l.teacherId === 'TCH-01');
    const t2 = loads.find((l) => l.teacherId === 'TCH-02');
    const dir = loads.find((l) => l.teacherId === 'TCH-DIR');

    assert.ok(t1);
    assert.equal(t1.coreAndElectiveHours, 10);
    assert.equal(t1.activityHours, 2);
    assert.equal(t1.homeroomHours, 2.5);
    assert.equal(t1.totalPeriods, 17);
    assert.equal(t1.teachingHoursExclHomeroom, 12);
    assert.equal(t1.totalHoursInclHomeroom, 14.5);
    assert.equal(t1.meetsW9Threshold, true);

    assert.ok(t2);
    assert.equal(t2.teachingHoursExclHomeroom, 5);
    assert.equal(t2.meetsW9Threshold, false);

    // Co-teaching slot counted for Director too
    assert.ok(dir);
    assert.equal(dir.isDirector, true);
    assert.equal(dir.totalPeriods, 1);
    assert.equal(dir.coreAndElectiveHours, 1);
  });

  it('includes Kindergarten weekly experience hours in ว 9/2564 threshold evaluation', () => {
    const loads = calculateTeacherWeeklyLoads([], MOCK_TEACHERS, DEFAULT_PERIODS_CONFIG, [
      {
        id: 'KG-2569-1-อ.1',
        academicYear: '2569',
        semester: '1',
        roomName: 'อ.1',
        homeroomTeacherId: 'TCH-02',
        assistantTeacherId: 'TCH-01',
        weeklyHours: 25,
        activitiesJson: [],
      },
    ]);

    const kgTeacher = loads.find((l) => l.teacherId === 'TCH-02');
    assert.ok(kgTeacher);
    assert.equal(kgTeacher.kindergartenHours, 25);
    assert.equal(kgTeacher.teachingHoursExclHomeroom, 25);
    assert.equal(kgTeacher.totalHoursInclHomeroom, 25);
    assert.equal(kgTeacher.meetsW9Threshold, true);
    assert.equal(kgTeacher.w9StatusLabel, 'ผ่านเกณฑ์');
  });

  it('excludes janitor from teaching eligibility and separates Executive vs Support badges', () => {
    assert.equal(isEligibleForTeaching({ position: 'นักการภารโรง' }), false);
    assert.equal(isEligibleForTeaching({ position: 'พนักงานบริการ' }), false);
    assert.equal(isEligibleForTeaching({ position: 'ผู้อำนวยการสถานศึกษา' }), true);
    assert.equal(isEligibleForTeaching({ position: 'ครู' }), true);
    assert.equal(isEligibleForTeaching({ position: 'เจ้าหน้าที่ธุรการ' }), true);
    assert.equal(
      isEligibleForTeaching({ position: 'พี่เลี้ยงเด็กพิการโรงเรียนทั่วไปจัดการเรียนรวม' }),
      true
    );

    const mixedStaff: TeacherRecord[] = [
      ...MOCK_TEACHERS,
      {
        id: 'TCH-SUP',
        name: 'นางสาวสุภาวดี ธุรการ',
        position: 'เจ้าหน้าที่ธุรการ',
        department: 'สายงานบริหารและสนับสนุนการศึกษา',
        employmentType: 'ลูกจ้างชั่วคราว',
      } as unknown as TeacherRecord,
      {
        id: 'TCH-JAN',
        name: 'นายประเสริฐ ภารโรง',
        position: 'นักการภารโรง',
        department: 'สายงานบริหารและสนับสนุนการศึกษา',
        employmentType: 'ลูกจ้างชั่วคราว',
      } as unknown as TeacherRecord,
    ];

    const loads = calculateTeacherWeeklyLoads([], mixedStaff, DEFAULT_PERIODS_CONFIG);
    assert.equal(loads.some((l) => l.teacherId === 'TCH-JAN'), false);

    const dirLoad = loads.find((l) => l.teacherId === 'TCH-DIR');
    const supLoad = loads.find((l) => l.teacherId === 'TCH-SUP');
    const teacherLoad = loads.find((l) => l.teacherId === 'TCH-01');

    assert.equal(dirLoad?.w9StatusLabel, 'ผู้บริหารสถานศึกษา');
    assert.equal(supLoad?.w9StatusLabel, 'สายสนับสนุน');
    assert.equal(teacherLoad?.w9StatusLabel, 'ต่ำกว่าเกณฑ์');
  });
});
