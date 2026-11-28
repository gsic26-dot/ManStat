import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRolloverWorkloads,
  ADHOC_PROJECT_WORKLOAD_CATEGORY,
} from '../workload-rollover';
import { WORKLOAD_ADMIN_CATEGORY } from '@/lib/staffDivisions';
import type { WorkloadItem } from '@/lib/data/schoolData';

const ACTIVE_TEACHERS = [
  { id: 'TCH-001' },
  { id: 'TCH-002' },
  { id: 'TCH-003' },
];

const SAMPLE_WORKLOADS: WorkloadItem[] = [
  {
    id: 'WL-01',
    teacherId: 'TCH-001',
    category: WORKLOAD_ADMIN_CATEGORY,
    title: 'งานสารสนเทศ ข้อมูลนักเรียนรายบุคคล และเทคโนโลยี',
    subGroupOrLevel: 'ฝ่ายบริหารทั่วไป',
    hoursPerWeek: 3,
    roleInTask: 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่',
    orderOrRef: 'คำสั่ง รร. ที่ 15/2569',
    status: 'ดำเนินการแล้วเสร็จ',
    academicYear: '2569',
    scopeDescription: 'จัดเก็บและยืนยันข้อมูล DMC',
    obecSystems: ['DMC', 'EMIS'],
    coResponsibleIds: ['TCH-002', 'TCH-999'],
  },
  {
    id: 'WL-02',
    teacherId: 'TCH-002',
    category: ADHOC_PROJECT_WORKLOAD_CATEGORY,
    title: 'คณะกรรมการตรวจรับพัสดุและตรวจนับพัสดุประจำปี',
    subGroupOrLevel: 'งานพัสดุและสินทรัพย์',
    hoursPerWeek: 2,
    roleInTask: 'กรรมการ / ผู้ปฏิบัติงาน',
    orderOrRef: 'คำสั่ง รร. ที่ 20/2569',
    status: 'เสร็จสิ้นแล้ว',
    academicYear: '2569',
    scopeDescription: 'ตรวจรับพัสดุประจำปี',
    obecSystems: ['e-GP'],
    coResponsibleIds: ['TCH-003'],
  },
  {
    id: 'WL-03',
    teacherId: 'TCH-001',
    category: 'งานสอนและการจัดการเรียนรู้',
    title: 'คณิตศาสตร์ ป.6',
    subGroupOrLevel: 'ป.6',
    hoursPerWeek: 12,
    roleInTask: 'ผู้สอน',
    orderOrRef: 'ตารางสอน 1/2569',
    status: 'กำลังดำเนินการ',
    academicYear: '2569',
  },
  {
    id: 'WL-04',
    teacherId: 'TCH-RETIRED',
    category: WORKLOAD_ADMIN_CATEGORY,
    title: 'งานห้องสมุดและแหล่งเรียนรู้',
    subGroupOrLevel: 'ฝ่ายบริหารวิชาการ',
    hoursPerWeek: 2,
    roleInTask: 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่',
    orderOrRef: 'คำสั่ง รร. ที่ 10/2569',
    status: 'กำลังดำเนินการ',
    academicYear: '2569',
    scopeDescription: 'ดูแลห้องสมุดโรงเรียน',
    obecSystems: [],
    coResponsibleIds: [],
  },
];

describe('Smart Academic Year Rollover (workload-rollover.ts)', () => {
  it('copies Type 1 admin roles only by default and never copies legacy teaching records', () => {
    const result = buildRolloverWorkloads({
      sourceYear: '2569',
      targetYear: '2570',
      existingWorkloads: SAMPLE_WORKLOADS,
      activeTeachers: ACTIVE_TEACHERS,
      idGenerator: (idx) => `WL-2570-${idx + 1}`,
    });

    assert.equal(result.recordsToCreate.length, 1);
    assert.equal(result.skippedInactiveStaff, 1);
    assert.equal(result.skippedDuplicates, 0);

    const copied = result.recordsToCreate[0];
    assert.equal(copied.id, 'WL-2570-1');
    assert.equal(copied.academicYear, '2570');
    assert.equal(copied.category, WORKLOAD_ADMIN_CATEGORY);
    assert.equal(copied.orderOrRef, '');
    assert.equal(copied.status, 'กำลังดำเนินการ');
    assert.deepEqual(copied.obecSystems, ['DMC', 'EMIS']);
    // Inactive co-responsible TCH-999 must be pruned
    assert.deepEqual(copied.coResponsibleIds, ['TCH-002']);
    // Source record must remain untouched
    assert.equal(SAMPLE_WORKLOADS[0].orderOrRef, 'คำสั่ง รร. ที่ 15/2569');
    assert.equal(SAMPLE_WORKLOADS[0].status, 'ดำเนินการแล้วเสร็จ');
  });

  it('includes Type 2 ad-hoc projects when includeAdhocProjects is true, still excluding teaching records', () => {
    const result = buildRolloverWorkloads({
      sourceYear: '2569',
      targetYear: '2570',
      existingWorkloads: SAMPLE_WORKLOADS,
      activeTeachers: ACTIVE_TEACHERS,
      includeAdminRoles: true,
      includeAdhocProjects: true,
      idGenerator: (idx) => `WL-2570-${idx + 1}`,
    });

    assert.equal(result.recordsToCreate.length, 2);
    assert.equal(
      result.recordsToCreate.some((r) => r.category === 'งานสอนและการจัดการเรียนรู้'),
      false
    );
    const adhoc = result.recordsToCreate.find((r) => r.category === ADHOC_PROJECT_WORKLOAD_CATEGORY);
    assert.ok(adhoc);
    assert.equal(adhoc.orderOrRef, '');
    assert.equal(adhoc.status, 'กำลังดำเนินการ');
    assert.equal(adhoc.academicYear, '2570');
  });

  it('deduplicates idempotently when target year already contains matching roles', () => {
    const existingWithTarget: WorkloadItem[] = [
      ...SAMPLE_WORKLOADS,
      {
        id: 'WL-EXISTING-2570',
        teacherId: 'TCH-001',
        category: WORKLOAD_ADMIN_CATEGORY,
        title: 'งานสารสนเทศ ข้อมูลนักเรียนรายบุคคล และเทคโนโลยี',
        subGroupOrLevel: 'ฝ่ายบริหารทั่วไป',
        hoursPerWeek: 3,
        roleInTask: 'ผู้รับผิดชอบหลัก / เจ้าหน้าที่',
        orderOrRef: '',
        status: 'กำลังดำเนินการ',
        academicYear: '2570',
      },
    ];

    const result = buildRolloverWorkloads({
      sourceYear: '2569',
      targetYear: '2570',
      existingWorkloads: existingWithTarget,
      activeTeachers: ACTIVE_TEACHERS,
      includeAdminRoles: true,
      includeAdhocProjects: true,
    });

    // WL-01 is skipped as duplicate; WL-02 is created; WL-04 is skipped as inactive staff
    assert.equal(result.skippedDuplicates, 1);
    assert.equal(result.skippedInactiveStaff, 1);
    assert.equal(result.recordsToCreate.length, 1);
    assert.equal(result.recordsToCreate[0].category, ADHOC_PROJECT_WORKLOAD_CATEGORY);
  });

  it('returns empty result safely when sourceYear equals targetYear', () => {
    const result = buildRolloverWorkloads({
      sourceYear: '2569',
      targetYear: '2569',
      existingWorkloads: SAMPLE_WORKLOADS,
      activeTeachers: ACTIVE_TEACHERS,
    });

    assert.equal(result.recordsToCreate.length, 0);
    assert.equal(result.skippedDuplicates, 0);
    assert.equal(result.skippedInactiveStaff, 0);
  });
});
