import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTeacherDeliverableRows,
  exportDeliverablesCsv,
} from '../academic-deliverables-utils';
import { buildDefaultObecCurriculumPresets } from '../school-curriculum-presets';
import { TIMETABLE_SEED_2569_2_SLOTS } from '@/lib/data/timetableSeed2569_2';
import type { TeacherRecord } from '@/lib/data/schoolData';
import type {
  AcademicDeliverableRecord,
  TimetableSlot,
} from '@/lib/data/timetableTypes';

function buildTestSlots(): TimetableSlot[] {
  return TIMETABLE_SEED_2569_2_SLOTS.map((s, idx) => ({
    id: `SLOT-${idx + 1}`,
    academicYear: '2569',
    semester: '2',
    roomName: s.roomName,
    dayOfWeek: s.dayOfWeek,
    periodNo: s.periodNo,
    subjectCode: '',
    subjectName: s.subjectName,
    subjectGroup: s.subjectGroup,
    subjectType: s.subjectType,
    teacherId: s.teacherFirstName,
    coTeacherId: s.coTeacherFirstName,
    isLocked: s.isLocked,
  }));
}

function makeTeacher(id: string, name: string): TeacherRecord {
  return {
    id,
    employeeCode: id,
    name,
    prefix: '',
    firstName: id,
    lastName: '',
    position: 'ครู',
    academicStanding: '-',
    department: 'สายงานการสอน',
    classLevel: '-',
    dutyDay: '-',
    accessLevel: 'User',
    role: 'teacher',
    startDate: '2020-05-01',
    email: `${id}@school.ac.th`,
    phone: '0810000000',
    maskedCitizenId: '1-xxxx-xxxxx-xx-x',
    idCard: '1100100100100',
    positionNo: '-',
    memberId: '-',
    highestScout: 'ไม่มีวุฒิลูกเสือ',
    scoutCertNo: '',
    teachingHours: 18,
    taHours: 0,
    sickUsed: 0,
    personalUsed: 0,
    vacationUsed: 0,
    division: '',
    licenses: [],
    standings: [],
    educations: [],
  };
}

describe('Phase 12.3: Automated Academic Deliverable Tracker Engine', () => {
  it('Test 1: derives per-teacher per-room subject rows from 2/2569 slots (including co-teaching, excluding homeroom) & merges saved statuses', () => {
    const slots = buildTestSlots();
    const presets = buildDefaultObecCurriculumPresets();
    const teachers = [
      makeTeacher('สุธิดา', 'นางสาวสุธิดา ใจดี'),
      makeTeacher('ธีรศักดิ์', 'นายธีรศักดิ์ ผู้อำนวยการ'),
    ];
    const savedRecords: AcademicDeliverableRecord[] = [
      {
        id: 'DEL-1',
        academicYear: '2569',
        semester: '2',
        teacherId: 'สุธิดา',
        roomName: 'ป.1',
        subjectName: 'ภาษาไทย',
        subjectCode: 'ท11101',
        lessonPlanStatus: 'submitted',
        gradebookStatus: 'reviewing',
        remarks: 'ส่งแผนครบแล้ว รอตรวจ ปพ.5',
      },
    ];

    const summary = buildTeacherDeliverableRows({
      academicYear: '2569',
      semester: '2',
      slots,
      teachers,
      catalogSubjects: presets,
      savedRecords,
    });

    assert.ok(summary.stats.totalAssignments > 50);
    // Must exclude พบครูประจำชั้น
    assert.ok(!summary.rows.some((r) => r.subjectName === 'พบครูประจำชั้น'));

    // Must include co-teaching rows for ผอ.ธีรศักดิ์ (ป.1, ป.2, ป.3 ภาษาไทย = 2 hrs each)
    const dirRows = summary.rows.filter((r) => r.teacherId === 'ธีรศักดิ์');
    assert.equal(dirRows.length, 3);
    assert.ok(dirRows.every((r) => r.isCoTeaching && r.weeklyHours === 2 && r.subjectName === 'ภาษาไทย'));

    // Must merge saved record accurately
    const suthidaP1Thai = summary.rows.find(
      (r) => r.teacherId === 'สุธิดา' && r.roomName === 'ป.1' && r.subjectName === 'ภาษาไทย'
    )!;
    assert.equal(suthidaP1Thai.subjectCode, 'ท11101');
    assert.equal(suthidaP1Thai.lessonPlanStatus, 'submitted');
    assert.equal(suthidaP1Thai.gradebookStatus, 'reviewing');
    assert.equal(suthidaP1Thai.remarks, 'ส่งแผนครบแล้ว รอตรวจ ปพ.5');
  });

  it('Test 2: computes accurate completion stats (0% pending -> 100% when both lessonPlan & gradebook submitted)', () => {
    const miniSlots: TimetableSlot[] = [
      {
        id: 'S1',
        academicYear: '2569',
        semester: '2',
        roomName: 'ป.1',
        dayOfWeek: 1,
        periodNo: 1,
        subjectCode: 'ท11101',
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'T1',
        isLocked: false,
      },
      {
        id: 'S2',
        academicYear: '2569',
        semester: '2',
        roomName: 'ป.1',
        dayOfWeek: 1,
        periodNo: 2,
        subjectCode: 'ค11101',
        subjectName: 'คณิตศาสตร์',
        subjectGroup: 'คณิตศาสตร์',
        subjectType: 'พื้นฐาน',
        teacherId: 'T1',
        isLocked: false,
      },
    ];
    const teachers = [makeTeacher('T1', 'นางสาวสมใจ รักเรียน')];

    const pendingRes = buildTeacherDeliverableRows({
      academicYear: '2569',
      semester: '2',
      slots: miniSlots,
      teachers,
      savedRecords: [],
    });
    assert.equal(pendingRes.stats.totalAssignments, 2);
    assert.equal(pendingRes.stats.fullyCompletedCount, 0);
    assert.equal(pendingRes.stats.completionRatePercent, 0);

    const completedRes = buildTeacherDeliverableRows({
      academicYear: '2569',
      semester: '2',
      slots: miniSlots,
      teachers,
      savedRecords: [
        {
          id: 'D1',
          academicYear: '2569',
          semester: '2',
          teacherId: 'T1',
          roomName: 'ป.1',
          subjectName: 'ภาษาไทย',
          subjectCode: 'ท11101',
          lessonPlanStatus: 'submitted',
          gradebookStatus: 'submitted',
          remarks: '',
        },
        {
          id: 'D2',
          academicYear: '2569',
          semester: '2',
          teacherId: 'T1',
          roomName: 'ป.1',
          subjectName: 'คณิตศาสตร์',
          subjectCode: 'ค11101',
          lessonPlanStatus: 'submitted',
          gradebookStatus: 'submitted',
          remarks: '',
        },
      ],
    });
    assert.equal(completedRes.stats.lessonPlanSubmitted, 2);
    assert.equal(completedRes.stats.gradebookSubmitted, 2);
    assert.equal(completedRes.stats.fullyCompletedCount, 2);
    assert.equal(completedRes.stats.completionRatePercent, 100);
  });

  it('Test 3: exportDeliverablesCsv emits UTF-8 BOM and RFC-4180 escaped cells', () => {
    const csv = exportDeliverablesCsv(
      [
        {
          key: 'T1|ป.1|ภาษาไทย',
          academicYear: '2569',
          semester: '2',
          teacherId: 'T1',
          teacherName: 'นางสาวสมใจ รักเรียน',
          roomName: 'ป.1',
          subjectName: 'ภาษาไทย',
          subjectCode: 'ท11101',
          weeklyHours: 5,
          isCoTeaching: false,
          lessonPlanStatus: 'submitted',
          gradebookStatus: 'pending',
          remarks: 'ตรวจแล้ว, "ครบถ้วน"',
        },
      ],
      '2569',
      '2'
    );

    assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
    const lines = csv.slice(1).split('\r\n');
    assert.equal(
      lines[0],
      'ลำดับ,ชื่อ-สกุล,ชั้นเรียน,รหัสวิชา,รายวิชา,ชม./สัปดาห์,สถานะแผนการสอน,สถานะ ปพ.5,หมายเหตุ'
    );
    assert.ok(lines[1].includes('"ตรวจแล้ว, ""ครบถ้วน"""'));
  });
});
