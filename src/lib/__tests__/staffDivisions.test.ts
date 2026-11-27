import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStaffDivisions, getDivisionMembers, normalizeDivisionName } from '../staffDivisions';
import type { TeacherRecord, WorkloadItem } from '../data/schoolData';

describe('getStaffDivisions (Multi-Division Auto-Derivation from Workload Category 2)', () => {
  const director: Pick<TeacherRecord, 'id' | 'employeeCode' | 'position' | 'division'> = {
    id: 'EXE-001',
    employeeCode: 'EXE-001',
    position: 'ผู้อำนวยการสถานศึกษา',
    division: 'ผู้บริหารสถานศึกษา',
  };

  const teacherMulti: Pick<TeacherRecord, 'id' | 'employeeCode' | 'position' | 'division'> = {
    id: 'uuid-tch-002',
    employeeCode: 'TCH-002',
    position: 'ครู',
    division: 'ฝ่ายบริหารงานวิชาการ',
  };

  const teacherLegacyOnly: Pick<TeacherRecord, 'id' | 'employeeCode' | 'position' | 'division'> = {
    id: 'TCH-009',
    employeeCode: 'TCH-009',
    position: 'ครู',
    division: 'ฝ่ายบริหารงบประมาณ',
  };

  const sampleWorkloads: WorkloadItem[] = [
    {
      id: 'WL-1',
      teacherId: 'TCH-002',
      category: 'งานสอนและการจัดการเรียนรู้',
      title: 'ภาษาไทยพื้นฐาน',
      subGroupOrLevel: 'ป.5/1',
      hoursPerWeek: 5,
      roleInTask: 'ผู้สอน',
      status: 'กำลังดำเนินการ',
    },
    {
      id: 'WL-2',
      teacherId: 'TCH-002',
      category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
      title: 'งานบริหารวิชาการและเลขานุการฝ่าย',
      subGroupOrLevel: 'ฝ่ายบริหารวิชาการ',
      hoursPerWeek: 4,
      roleInTask: 'หัวหน้าฝ่าย',
      status: 'งานประจำต่อเนื่อง',
    },
    {
      id: 'WL-3',
      teacherId: 'uuid-tch-002',
      category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
      title: 'งานพัสดุและสินทรัพย์สถานศึกษา',
      subGroupOrLevel: 'งานพัสดุ',
      hoursPerWeek: 3,
      roleInTask: 'เจ้าหน้าที่พัสดุ',
      status: 'งานประจำต่อเนื่อง',
    },
    {
      id: 'WL-4',
      teacherId: 'TCH-002',
      category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
      title: 'งานเทคโนโลยีสารสนเทศ (ICT)',
      subGroupOrLevel: 'งาน ICT',
      hoursPerWeek: 3,
      roleInTask: 'ผู้ดูแลระบบเครือข่าย',
      status: 'งานประจำต่อเนื่อง',
    },
  ];

  it('returns ["ผู้บริหารสถานศึกษา"] automatically for the School Director', () => {
    assert.deepEqual(getStaffDivisions(director, sampleWorkloads), ['ผู้บริหารสถานศึกษา']);
  });

  it('derives multiple unique normalized divisions from Workload Category 2 (matching id & employeeCode)', () => {
    assert.deepEqual(getStaffDivisions(teacherMulti, sampleWorkloads), [
      'ฝ่ายบริหารวิชาการ',
      'ฝ่ายบริหารงบประมาณ',
      'ฝ่ายบริหารทั่วไป',
    ]);
  });

  it('gracefully falls back to legacy staff.division when no Category 2 workloads exist yet', () => {
    assert.deepEqual(getStaffDivisions(teacherLegacyOnly, sampleWorkloads), [
      'ฝ่ายบริหารงบประมาณ',
    ]);
  });

  it('returns empty array when neither Category 2 workloads nor legacy division exist', () => {
    assert.deepEqual(
      getStaffDivisions(
        { id: 'TCH-999', employeeCode: 'TCH-999', position: 'ครูผู้ช่วย', division: 'ครูผู้สอน' },
        sampleWorkloads
      ),
      []
    );
  });

  it('normalizes known sub-groups and preserves distinct custom division names', () => {
    assert.equal(normalizeDivisionName('งานการเงิน'), 'ฝ่ายบริหารงบประมาณ');
    assert.equal(normalizeDivisionName('งานวิทยฐานะ'), 'ฝ่ายบริหารงานบุคคล');
    assert.equal(normalizeDivisionName('ศูนย์นวัตกรรมท้องถิ่น'), 'ศูนย์นวัตกรรมท้องถิ่น');
  });

  it('includes a multi-division teacher in every division they serve via getDivisionMembers', () => {
    const teachers = [teacherMulti as TeacherRecord, teacherLegacyOnly as TeacherRecord];
    const academicMembers = getDivisionMembers(teachers, sampleWorkloads, 'academic');
    const budgetMembers = getDivisionMembers(teachers, sampleWorkloads, 'budget');
    const generalMembers = getDivisionMembers(teachers, sampleWorkloads, 'general');

    assert.equal(academicMembers.length, 1);
    assert.equal(academicMembers[0].employeeCode, 'TCH-002');
    assert.equal(budgetMembers.length, 2);
    assert.equal(generalMembers.length, 1);
    assert.equal(generalMembers[0].employeeCode, 'TCH-002');
  });

  it('derives single division accurately for a teacher assigned to 1 division', () => {
    const teacherSingle = {
      id: 'TCH-010',
      employeeCode: 'TCH-010',
      position: 'ครู',
      division: 'ฝ่ายบริหารทั่วไป',
    };
    const workloads: WorkloadItem[] = [
      {
        id: 'WL-SINGLE-1',
        teacherId: 'TCH-010',
        category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
        title: 'งานพัฒนาหลักสูตรสถานศึกษา',
        subGroupOrLevel: 'ฝ่ายบริหารวิชาการ',
        hoursPerWeek: 3,
        roleInTask: 'ผู้รับผิดชอบหลัก',
        status: 'งานประจำต่อเนื่อง',
      },
    ];
    // Category 2 workload overrides legacy staff.division cleanly
    assert.deepEqual(getStaffDivisions(teacherSingle, workloads), ['ฝ่ายบริหารวิชาการ']);
  });

  it('deduplicates and orders all 4 standard divisions when a teacher has multiple tasks including duplicates in the same division', () => {
    const teacherAllFour = {
      id: 'TCH-011',
      employeeCode: 'TCH-011',
      position: 'ครูชำนาญการ',
      division: '-',
    };
    const workloads: WorkloadItem[] = [
      {
        id: 'WL-4D-1',
        teacherId: 'TCH-011',
        category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
        title: 'งานอาคารสถานที่',
        subGroupOrLevel: 'ฝ่ายบริหารทั่วไป',
        hoursPerWeek: 2,
        roleInTask: 'ผู้รับผิดชอบหลัก',
        status: 'งานประจำต่อเนื่อง',
      },
      {
        id: 'WL-4D-2',
        teacherId: 'TCH-011',
        category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
        title: 'งานเทคโนโลยีสารสนเทศ',
        subGroupOrLevel: 'งาน ICT', // duplicate -> normalizes to ฝ่ายบริหารทั่วไป
        hoursPerWeek: 2,
        roleInTask: 'ผู้รับผิดชอบหลัก',
        status: 'งานประจำต่อเนื่อง',
      },
      {
        id: 'WL-4D-3',
        teacherId: 'TCH-011',
        category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
        title: 'งานวิทยฐานะ PA/DPA',
        subGroupOrLevel: 'ฝ่ายบริหารงานบุคคล',
        hoursPerWeek: 2,
        roleInTask: 'ผู้รับผิดชอบหลัก',
        status: 'งานประจำต่อเนื่อง',
      },
      {
        id: 'WL-4D-4',
        teacherId: 'TCH-011',
        category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
        title: 'งานพัสดุ',
        subGroupOrLevel: 'ฝ่ายบริหารงบประมาณ',
        hoursPerWeek: 2,
        roleInTask: 'เจ้าหน้าที่พัสดุ',
        status: 'งานประจำต่อเนื่อง',
      },
      {
        id: 'WL-4D-5',
        teacherId: 'TCH-011',
        category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
        title: 'งานการเงิน',
        subGroupOrLevel: 'ฝ่ายบริหารงบประมาณ', // duplicate exact standard name
        hoursPerWeek: 2,
        roleInTask: 'เจ้าหน้าที่การเงิน',
        status: 'งานประจำต่อเนื่อง',
      },
      {
        id: 'WL-4D-6',
        teacherId: 'TCH-011',
        category: 'งานบริหารและงานประจำฝ่าย/กลุ่มงาน',
        title: 'งานทะเบียนนักเรียน',
        subGroupOrLevel: 'ฝ่ายบริหารวิชาการ',
        hoursPerWeek: 2,
        roleInTask: 'นายทะเบียน',
        status: 'งานประจำต่อเนื่อง',
      },
    ];

    assert.deepEqual(getStaffDivisions(teacherAllFour, workloads), [
      'ฝ่ายบริหารวิชาการ',
      'ฝ่ายบริหารงบประมาณ',
      'ฝ่ายบริหารงานบุคคล',
      'ฝ่ายบริหารทั่วไป',
    ]);
  });
});
