import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SCHOOL_GRADE_LEVELS,
  buildDefaultObecCurriculumPresets,
  calculatePrimaryHoursPerYear,
  calculateSecondaryCredits,
  evaluateRoomCurriculumCompliance,
  filterSchoolSubjects,
  getMissingCatalogSubjectsForRoom,
  getSubjectDedupeKey,
  resolveSubjectCodeForDisplay,
} from '../school-curriculum-presets';
import type { TimetableAllocation } from '@/lib/data/timetableTypes';

describe('Phase 11.1: School Curriculum Presets & Calculation Engine', () => {
  it('Test 1: buildDefaultObecCurriculumPresets covers อ.1–ม.3 across all 3 levels with unique dedupe keys & semester-split secondary cores', () => {
    const presets = buildDefaultObecCurriculumPresets();
    assert.ok(presets.length >= 100, `Expected full อ.1–ม.3 catalog, got ${presets.length}`);

    const levels = new Set(presets.map((p) => p.levelGroup));
    assert.deepEqual(
      Array.from(levels).sort(),
      ['kindergarten', 'primary', 'secondary']
    );

    // Every grade from อ.1 through ม.3 must be represented
    const coveredGrades = new Set(presets.flatMap((p) => p.gradeLevels));
    for (const grade of ALL_SCHOOL_GRADE_LEVELS) {
      assert.ok(coveredGrades.has(grade), `Missing grade ${grade} in default OBEC presets`);
    }

    // Zero internal duplicate dedupe keys
    const dedupeKeys = presets.map((p) => getSubjectDedupeKey(p));
    assert.equal(new Set(dedupeKeys).size, presets.length, 'Presets must have unique dedupe keys');

    // Secondary core subjects must be split into Semester 1 and Semester 2
    const m1Sem1Thai = presets.find(
      (p) => p.levelGroup === 'secondary' && p.gradeLevels.includes('ม.1') && p.subjectCode === 'ท21101'
    );
    const m1Sem2Thai = presets.find(
      (p) => p.levelGroup === 'secondary' && p.gradeLevels.includes('ม.1') && p.subjectCode === 'ท21102'
    );
    assert.ok(m1Sem1Thai, 'Expected ท21101 for ม.1 Semester 1');
    assert.equal(m1Sem1Thai?.semesterScope, '1');
    assert.equal(m1Sem1Thai?.credits, 1.5);
    assert.ok(m1Sem2Thai, 'Expected ท21102 for ม.1 Semester 2');
    assert.equal(m1Sem2Thai?.semesterScope, '2');
    assert.equal(m1Sem2Thai?.credits, 1.5);
  });

  it('Test 2: calculatePrimaryHoursPerYear & calculateSecondaryCredits compute exact OBEC conversions', () => {
    assert.equal(calculatePrimaryHoursPerYear(5), 200);
    assert.equal(calculatePrimaryHoursPerYear(3), 120);
    assert.equal(calculatePrimaryHoursPerYear(2.5), 100);
    assert.equal(calculatePrimaryHoursPerYear(0), 0);

    assert.equal(calculateSecondaryCredits(3), 1.5);
    assert.equal(calculateSecondaryCredits(2), 1.0);
    assert.equal(calculateSecondaryCredits(1), 0.5);
    assert.equal(calculateSecondaryCredits(0), 0);
  });

  it('Test 3: filterSchoolSubjects filters accurately by level, grade, semesterScope (both matches 1 & 2), group, search & activeOnly', () => {
    const presets = buildDefaultObecCurriculumPresets();
    const withInactive = presets.map((p, idx) =>
      idx === 0 ? { ...p, isActive: false } : p
    );

    // activeOnly excludes disabled subject
    const activeList = filterSchoolSubjects(withInactive, { activeOnly: true });
    assert.equal(activeList.length, presets.length - 1);

    // Filtering ม.1 Semester 1 includes Semester 1 cores + both-semester activities, excludes Semester 2 cores
    const m1Sem1 = filterSchoolSubjects(presets, {
      levelGroup: 'secondary',
      gradeLevel: 'ม.1',
      semesterScope: '1',
    });
    assert.ok(m1Sem1.some((s) => s.subjectCode === 'ท21101'));
    assert.ok(m1Sem1.some((s) => s.subjectName === 'แนะแนว' && s.semesterScope === 'both'));
    assert.ok(!m1Sem1.some((s) => s.subjectCode === 'ท21102'));

    // Search + Subject Group filter
    const p1Math = filterSchoolSubjects(presets, {
      levelGroup: 'primary',
      gradeLevel: 'ป.1',
      subjectGroup: 'คณิตศาสตร์',
      search: 'ค11101',
    });
    assert.equal(p1Math.length, 1);
    assert.equal(p1Math[0].subjectName, 'คณิตศาสตร์');
    assert.equal(p1Math[0].hoursPerYear, 200);
  });

  it('Test 4: getMissingCatalogSubjectsForRoom filters by (roomName, semester) & excludes allocated subjects by code or name', () => {
    const presets = buildDefaultObecCurriculumPresets();
    const existing: TimetableAllocation[] = [
      {
        id: 'A1',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        subjectCode: 'ท11101',
        subjectName: 'ภาษาไทย (ปรับชื่อ)',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-01',
        periodsPerWeek: 5,
        preferMorning: true,
        consecutivePeriods: 1,
      },
      {
        id: 'A2',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        subjectCode: '',
        subjectName: 'คณิตศาสตร์',
        subjectGroup: 'คณิตศาสตร์',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-01',
        periodsPerWeek: 5,
        preferMorning: true,
        consecutivePeriods: 1,
      },
    ];

    const missingP1 = getMissingCatalogSubjectsForRoom({
      catalogSubjects: presets,
      existingAllocations: existing,
      roomName: 'ป.1',
      semester: '1',
    });

    assert.ok(!missingP1.some((s) => s.subjectCode === 'ท11101'), 'Should exclude by subjectCode');
    assert.ok(!missingP1.some((s) => s.subjectName === 'คณิตศาสตร์'), 'Should exclude by subjectName');
    assert.ok(missingP1.some((s) => s.subjectCode === 'อ11101'), 'Should retain unallocated ป.1 subject');
    assert.ok(missingP1.every((s) => s.gradeLevels.includes('ป.1')));
  });

  it('Test 5: evaluateRoomCurriculumCompliance computes Primary (1,000 hrs/yr), Secondary (1,200 hrs/yr + credits) & exceeds_capacity', () => {
    const presets = buildDefaultObecCurriculumPresets();

    // Primary ป.1 meeting 25 learning hrs/week = 1,000 hrs/year
    const p1Allocs: TimetableAllocation[] = [
      {
        id: 'P1-1',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        subjectCode: 'ท11101',
        subjectName: 'ภาษาไทย',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-01',
        periodsPerWeek: 22,
        preferMorning: true,
        consecutivePeriods: 1,
      },
      {
        id: 'P1-2',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        subjectCode: '',
        subjectName: 'แนะแนว',
        subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
        subjectType: 'กิจกรรมพัฒนาผู้เรียน',
        teacherId: 'TCH-01',
        periodsPerWeek: 3,
        preferMorning: false,
        consecutivePeriods: 1,
      },
      {
        id: 'P1-3',
        academicYear: '2569',
        semester: '1',
        roomName: 'ป.1',
        subjectCode: '',
        subjectName: 'พบครูประจำชั้น',
        subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
        subjectType: 'ประจำชั้น',
        teacherId: 'TCH-01',
        periodsPerWeek: 5,
        preferMorning: false,
        consecutivePeriods: 1,
      },
    ];
    const p1Res = evaluateRoomCurriculumCompliance({
      roomName: 'ป.1',
      semester: '1',
      allocations: p1Allocs,
      catalogSubjects: presets,
    });
    assert.equal(p1Res.level, 'primary');
    assert.equal(p1Res.totalLearningHours, 25);
    assert.equal(p1Res.homeroomHours, 2.5);
    assert.equal(p1Res.estimatedAnnualHours, 1000);
    assert.equal(p1Res.status, 'meets_target');

    // Secondary ม.1 exceeding 30 learning hrs/week => exceeds_capacity + credits
    const m1Allocs: TimetableAllocation[] = [
      {
        id: 'M1-1',
        academicYear: '2569',
        semester: '1',
        roomName: 'ม.1',
        subjectCode: 'ท21101',
        subjectName: 'ภาษาไทย 1',
        subjectGroup: 'ภาษาไทย',
        subjectType: 'พื้นฐาน',
        teacherId: 'TCH-02',
        periodsPerWeek: 28,
        preferMorning: true,
        consecutivePeriods: 1,
      },
      {
        id: 'M1-2',
        academicYear: '2569',
        semester: '1',
        roomName: 'ม.1',
        subjectCode: '',
        subjectName: 'ชุมนุม',
        subjectGroup: 'กิจกรรมพัฒนาผู้เรียน',
        subjectType: 'กิจกรรมพัฒนาผู้เรียน',
        teacherId: 'TCH-02',
        periodsPerWeek: 4,
        preferMorning: false,
        consecutivePeriods: 1,
      },
    ];
    const m1Res = evaluateRoomCurriculumCompliance({
      roomName: 'ม.1',
      semester: '1',
      allocations: m1Allocs,
      catalogSubjects: presets,
    });
    assert.equal(m1Res.level, 'secondary');
    assert.equal(m1Res.estimatedSemesterCredits, 14);
    assert.equal(m1Res.obecTarget.minAnnualHours, 1200);
    assert.equal(m1Res.status, 'exceeds_capacity');
  });

  it('Test 6: resolveSubjectCodeForDisplay prefers explicit code and falls back cleanly to catalog lookup', () => {
    const presets = buildDefaultObecCurriculumPresets();

    assert.equal(
      resolveSubjectCodeForDisplay({
        subjectCode: 'CUSTOM01',
        subjectName: 'ภาษาไทย',
        roomName: 'ป.1',
        semester: '1',
        catalogSubjects: presets,
      }),
      'CUSTOM01'
    );

    assert.equal(
      resolveSubjectCodeForDisplay({
        subjectCode: '',
        subjectName: 'ภาษาไทย',
        roomName: 'ป.1',
        semester: '1',
        catalogSubjects: presets,
      }),
      'ท11101'
    );

    assert.equal(
      resolveSubjectCodeForDisplay({
        subjectCode: undefined,
        subjectName: 'ภาษาไทย 2',
        roomName: 'ม.1',
        semester: '2',
        catalogSubjects: presets,
      }),
      'ท21102'
    );
  });
});
