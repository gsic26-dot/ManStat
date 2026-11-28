import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SCHOOL_GRADE_LEVELS,
  buildDefaultObecCurriculumPresets,
  calculatePrimaryHoursPerYear,
  calculateSecondaryCredits,
  filterSchoolSubjects,
  getSubjectDedupeKey,
} from '../school-curriculum-presets';

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
});
