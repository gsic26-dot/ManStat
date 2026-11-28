import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildObecSystemDirectory,
  buildPaStaffSummary,
  escapeCsvCell,
  exportObecDirectoryCsv,
  exportPaSummaryCsv,
} from '../pa-summary-utils';
import { OBEC_SYSTEM_CATALOG } from '../obec-admin-roles';
import { DEFAULT_PERIODS_CONFIG } from '../timetable-utils';
import { WORKLOAD_ADMIN_CATEGORY } from '@/lib/staffDivisions';
import type { TeacherRecord, WorkloadItem } from '@/lib/data/schoolData';
import type {
  KindergartenSchedule,
  TeachingSubstitution,
  TimetableSlot,
} from '@/lib/data/timetableTypes';

const MOCK_TEACHERS: TeacherRecord[] = [
  {
    id: 'TCH-01',
    name: 'นางสาวอภิชญา พุสดีดอน',
    position: 'ครู',
    department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
  } as unknown as TeacherRecord,
  {
    id: 'TCH-KG',
    name: 'นางสาวกัลยา ปฐมวัย',
    position: 'ครู',
    department: 'กลุ่มสาระการศึกษาปฐมวัย',
  } as unknown as TeacherRecord,
  {
    id: 'TCH-JAN',
    name: 'นายประเสริฐ ภารโรง',
    position: 'นักการภารโรง',
    department: 'สายงานบริหารและสนับสนุนการศึกษา',
    employmentType: 'ลูกจ้างชั่วคราว',
  } as unknown as TeacherRecord,
];

const MOCK_WORKLOADS: WorkloadItem[] = [
  {
    id: 'WL-1',
    teacherId: 'TCH-01',
    category: WORKLOAD_ADMIN_CATEGORY,
    title: 'งานสารสนเทศ ข้อมูลนักเรียนรายบุคคล และเทคโนโลยี',
    subGroupOrLevel: 'ฝ่ายบริหารทั่วไป',
    hoursPerWeek: 3,
    roleInTask: 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่',
    status: 'กำลังดำเนินการ',
    academicYear: '2569',
    obecSystems: ['DMC', 'EMIS'],
    coResponsibleIds: ['TCH-KG'],
  },
  {
    id: 'WL-PRJ',
    teacherId: 'TCH-01',
    category: 'งานโครงการ กิจกรรม และงานที่ได้รับมอบหมายพิเศษ',
    title: 'คณะกรรมการตรวจรับพัสดุ, "ประจำปี"',
    subGroupOrLevel: 'งานพัสดุ',
    hoursPerWeek: 2,
    roleInTask: 'กรรมการ',
    status: 'กำลังดำเนินการ',
    academicYear: '2569',
    obecSystems: ['e-GP'],
    coResponsibleIds: [],
  },
];

describe('PA Assessment Summary & OBEC 38-System Directory (pa-summary-utils.ts)', () => {
  it('Test 1: outputs all 38 OBEC systems with assigned primary/co-staff and unassigned gaps', () => {
    const dir = buildObecSystemDirectory({
      workloads: MOCK_WORKLOADS,
      teachers: MOCK_TEACHERS,
      academicYear: '2569',
    });

    assert.equal(dir.totalSystems, OBEC_SYSTEM_CATALOG.length);
    assert.equal(dir.totalSystems, 38);
    assert.equal(dir.assignedCount, 3); // DMC, EMIS, e-GP
    assert.equal(dir.unassignedCount, 35);

    const dmc = dir.items.find((i) => i.code === 'DMC');
    assert.ok(dmc);
    assert.equal(dmc.isAssigned, true);
    assert.equal(dmc.primaryStaff[0]?.id, 'TCH-01');
    assert.equal(dmc.coStaff[0]?.id, 'TCH-KG');

    const dpa = dir.items.find((i) => i.code === 'DPA');
    assert.ok(dpa);
    assert.equal(dpa.isAssigned, false);
  });

  it('Test 2: combines ป.1–ม.3 hours, อ.1–อ.3 kindergarten hours, substitutions & admin roles cleanly', () => {
    const slots: TimetableSlot[] = [];
    for (let i = 0; i < 12; i++) {
      slots.push({
        id: `SL-${i}`,
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        dayOfWeek: (i % 5) + 1,
        periodNo: Math.floor(i / 5) + 1,
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-01',
        isLocked: false,
      });
    }

    const kgSchedules: KindergartenSchedule[] = [
      {
        id: 'KG-2569-1-อ.1',
        academicYear: '2569',
        semester: '1',
        roomName: 'อ.1',
        homeroomTeacherId: 'TCH-KG',
        weeklyHours: 25,
        activitiesJson: [],
      },
    ];

    const substitutions: TeachingSubstitution[] = [
      {
        id: 'SUB-1',
        academicYear: '2569',
        semester: '1',
        subDate: '2026-11-30',
        roomName: 'ป.2',
        dayOfWeek: 1,
        periodNo: 2,
        subjectName: 'คณิตศาสตร์',
        absentTeacherId: 'TCH-X',
        substituteTeacherId: 'TCH-01',
      },
      {
        id: 'SUB-2',
        academicYear: '2569',
        semester: '1',
        subDate: '2026-11-30',
        roomName: 'ป.2',
        dayOfWeek: 1,
        periodNo: 7,
        subjectName: 'พบครูประจำชั้น',
        absentTeacherId: 'TCH-X',
        substituteTeacherId: 'TCH-01',
      },
    ];

    const summary = buildPaStaffSummary({
      teachers: MOCK_TEACHERS,
      workloads: MOCK_WORKLOADS,
      slots,
      kindergartenSchedules: kgSchedules,
      substitutions,
      periodsConfig: DEFAULT_PERIODS_CONFIG,
      academicYear: '2569',
      semester: '1',
    });

    assert.equal(summary.stats.totalActiveStaff, 3);
    assert.equal(summary.stats.teachersPassingW9, 2);
    assert.equal(summary.stats.teachersBelowW9, 0);
    assert.equal(summary.stats.totalSubstituteHours, 1.5);

    const t1 = summary.rows.find((r) => r.teacherId === 'TCH-01');
    const kg = summary.rows.find((r) => r.teacherId === 'TCH-KG');
    const jan = summary.rows.find((r) => r.teacherId === 'TCH-JAN');

    assert.equal(t1?.w9StatusLabel, 'ผ่านเกณฑ์');
    assert.equal(t1?.teachingHoursExclHomeroom, 12);
    assert.equal(t1?.substituteHours, 1.5);
    assert.deepEqual(t1?.obecSystems, ['DMC', 'e-GP', 'EMIS']);

    assert.equal(kg?.w9StatusLabel, 'ผ่านเกณฑ์');
    assert.equal(kg?.kindergartenHours, 25);

    assert.equal(jan?.w9StatusLabel, 'สายสนับสนุน / บริการ');
    assert.equal(jan?.teachingHoursExclHomeroom, 0);
  });

  it('Test 3: exports UTF-8 BOM CSV with proper RFC-4180 escaping for commas, quotes & newlines', () => {
    assert.equal(escapeCsvCell('ธรรมดา'), 'ธรรมดา');
    assert.equal(escapeCsvCell('มี,ลูกน้ำ'), '"มี,ลูกน้ำ"');
    assert.equal(escapeCsvCell('มี"ฟันหนู"'), '"มี""ฟันหนู"""');
    assert.equal(escapeCsvCell('บรรทัด1\nบรรทัด2'), '"บรรทัด1\nบรรทัด2"');

    const dir = buildObecSystemDirectory({
      workloads: MOCK_WORKLOADS,
      teachers: MOCK_TEACHERS,
      academicYear: '2569',
    });
    const dirCsv = exportObecDirectoryCsv(dir, '2569');
    assert.ok(dirCsv.startsWith('\uFEFF'), 'OBEC CSV must start with UTF-8 BOM');
    assert.ok(dirCsv.includes('รหัสระบบ,ชื่อระบบรายงาน สพฐ.'));
    assert.ok(dirCsv.includes('DMC'));

    const summary = buildPaStaffSummary({
      teachers: MOCK_TEACHERS,
      workloads: MOCK_WORKLOADS,
      slots: [],
      kindergartenSchedules: [],
      substitutions: [],
      academicYear: '2569',
      semester: '1',
    });
    const paCsv = exportPaSummaryCsv(summary, '2569', '1');
    assert.ok(paCsv.startsWith('\uFEFF'), 'PA Summary CSV must start with UTF-8 BOM');
    assert.ok(paCsv.includes('ลำดับ,ชื่อ-สกุล,ตำแหน่ง,สถานะ ว 9/2564'));
    // Quoted project name containing comma & double quotes must be escaped properly
    assert.ok(paCsv.includes('"คณะกรรมการตรวจรับพัสดุ, ""ประจำปี"""'));
  });
});
