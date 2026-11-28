import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAffectedSlotsForDate,
  formatSubstitutionLineSummary,
} from '../substitute-utils';
import type { LeaveRequestRecord, TeacherRecord } from '@/lib/data/schoolData';
import type { TimetableSlot, TeachingSubstitution } from '@/lib/data/timetableTypes';

const TEACHERS: TeacherRecord[] = [
  { id: 'TCH-ABS', name: 'นางสาวอภิชญา พุสดีดอน', position: 'ครู' } as unknown as TeacherRecord,
  { id: 'TCH-BUSY', name: 'นายสมชาย ใจดี', position: 'ครู' } as unknown as TeacherRecord,
  { id: 'TCH-FREE', name: 'นายธวัชชัย เหลืองโอฬาร', position: 'ครู' } as unknown as TeacherRecord,
  { id: 'TCH-CO', name: 'นายธีรศักดิ์ มโนธรรม', position: 'ผู้อำนวยการสถานศึกษา' } as unknown as TeacherRecord,
  { id: 'TCH-JAN', name: 'นายประเสริฐ ภารโรง', position: 'นักการภารโรง' } as unknown as TeacherRecord,
];

// 2026-11-30 is Monday (dayOfWeek = 1)
const MONDAY_DATE = '2026-11-30';

const SLOTS: TimetableSlot[] = [
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
    teacherId: 'TCH-ABS',
    coTeacherId: 'TCH-CO',
    isLocked: false,
  },
  {
    id: 'SL-2',
    academicYear: '2569',
    semester: '1',
    roomName: 'ป.1',
    dayOfWeek: 1,
    periodNo: 4,
    subjectName: 'คณิตศาสตร์',
    subjectGroup: 'คณิตศาสตร์',
    subjectType: 'พื้นฐาน',
    teacherId: 'TCH-ABS',
    isLocked: false,
  },
  {
    id: 'SL-BUSY',
    academicYear: '2569',
    semester: '1',
    roomName: 'ป.2',
    dayOfWeek: 1,
    periodNo: 1,
    subjectName: 'วิทยาศาสตร์',
    subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
    subjectType: 'พื้นฐาน',
    teacherId: 'TCH-BUSY',
    isLocked: false,
  },
];

describe('Leave-to-Substitute Teacher Bridge (substitute-utils.ts)', () => {
  it('handles morning half-day leave (Hours 1–3 only) and excludes janitor, absent, busy & already-assigned substitutes', () => {
    const halfDayMorningLeave: LeaveRequestRecord = {
      id: 'LV-1',
      docNo: '1/2569',
      teacherId: 'TCH-ABS',
      teacherName: 'นางสาวอภิชญา พุสดีดอน',
      position: 'ครู',
      department: 'ภาษาไทย',
      leaveType: 'personal',
      leaveTypeName: 'ลากิจส่วนตัว (ครึ่งวันเช้า)',
      startDate: MONDAY_DATE,
      endDate: MONDAY_DATE,
      totalDays: 0.5,
      startTime: '08:30',
      endTime: '12:00',
      reason: 'ติดธุระช่วงเช้า',
      substituteTeacherName: '',
      status: 'approved',
      submittedAt: MONDAY_DATE,
      currentStep: 3,
    };

    const existingSubs: TeachingSubstitution[] = [
      {
        id: 'SUB-OTHER',
        academicYear: '2569',
        semester: '1',
        subDate: MONDAY_DATE,
        roomName: 'ป.3',
        dayOfWeek: 1,
        periodNo: 1,
        subjectName: 'ภาษาอังกฤษ',
        absentTeacherId: 'TCH-X',
        substituteTeacherId: 'TCH-FREE',
      },
    ];

    const res = getAffectedSlotsForDate({
      dateStr: MONDAY_DATE,
      leaves: [halfDayMorningLeave],
      slots: SLOTS,
      kindergartenSchedules: [],
      teachers: TEACHERS,
      existingSubstitutions: existingSubs,
    });

    assert.equal(res.isWeekend, false);
    // Only Period 1 is affected (Period 4 is afternoon -> NOT affected by morning half-day leave)
    assert.equal(res.affectedItems.length, 1);
    const item = res.affectedItems[0];
    assert.equal(item.periodNo, 1);
    assert.equal(item.presentCoTeacherId, 'TCH-CO');

    const candidateIds = item.availableSubstitutes.map((c) => c.teacherId);
    assert.equal(candidateIds.includes('TCH-JAN'), false, 'Janitor must be excluded');
    assert.equal(candidateIds.includes('TCH-ABS'), false, 'Absent teacher must be excluded');
    assert.equal(candidateIds.includes('TCH-BUSY'), false, 'Busy teacher must be excluded');
    assert.equal(candidateIds.includes('TCH-FREE'), false, 'Already-assigned substitute in ป.3 must be excluded');
    assert.equal(candidateIds[0], 'TCH-CO', 'Present co-teacher should be highlighted first');
  });

  it('handles full-day leave across all hours and formats clean zero-emoji LINE summary', () => {
    const fullDayLeave: LeaveRequestRecord = {
      id: 'LV-2',
      docNo: '2/2569',
      teacherId: 'TCH-ABS',
      teacherName: 'นางสาวอภิชญา พุสดีดอน',
      position: 'ครู',
      department: 'ภาษาไทย',
      leaveType: 'sick',
      leaveTypeName: 'ลาป่วย',
      startDate: MONDAY_DATE,
      endDate: MONDAY_DATE,
      totalDays: 1,
      reason: 'ไข้หวัด',
      substituteTeacherName: '',
      status: 'approved',
      submittedAt: MONDAY_DATE,
      currentStep: 3,
    };

    const res = getAffectedSlotsForDate({
      dateStr: MONDAY_DATE,
      leaves: [fullDayLeave],
      slots: SLOTS,
      kindergartenSchedules: [],
      teachers: TEACHERS,
      existingSubstitutions: [
        {
          id: 'SUB-P4',
          academicYear: '2569',
          semester: '1',
          subDate: MONDAY_DATE,
          roomName: 'ป.1',
          dayOfWeek: 1,
          periodNo: 4,
          subjectName: 'คณิตศาสตร์',
          absentTeacherId: 'TCH-ABS',
          substituteTeacherId: 'TCH-FREE',
        },
      ],
    });

    assert.equal(res.affectedItems.length, 2);
    const summary = formatSubstitutionLineSummary({
      dateStr: MONDAY_DATE,
      affectedItems: res.affectedItems,
      teachers: TEACHERS,
    });

    assert.ok(summary.includes('โรงเรียนชุมชนบ้านตะขบ'));
    assert.ok(summary.includes('ป.1'));
    assert.ok(summary.includes('นายธวัชชัย เหลืองโอฬาร'));
    assert.ok(summary.includes('มีครูร่วมสอนปฏิบัติหน้าที่'));
  });
});
