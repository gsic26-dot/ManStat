import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import {
  getStaffBranch,
  getTeachingRank,
  getSupportRank,
  groupAndSortTeachers,
  sortTeachersByBranch,
  formatAcademicStandingSubtext,
} from '../staff-sorting';

describe('Staff Sorting & Branch Hierarchy (สายบริหาร -> สายการสอน -> สายสนับสนุน)', () => {
  it('correctly categorizes staff into 3 official branches', () => {
    const director = INITIAL_TEACHERS.find((t) => t.id === 'EXE-001')!;
    const teacherSpecial = INITIAL_TEACHERS.find((t) => t.id === 'TCH-003')!;
    const teacherAssistant = INITIAL_TEACHERS.find((t) => t.id === 'TCH-013')!;
    const clerk = INITIAL_TEACHERS.find((t) => t.id === 'STF-001')!;
    const janitor = INITIAL_TEACHERS.find((t) => t.id === 'STF-002')!;
    const aide = INITIAL_TEACHERS.find((t) => t.id === 'TCH-014')!; // พี่เลี้ยงเด็กพิการ

    assert.equal(getStaffBranch(director), 'management');
    assert.equal(getStaffBranch(teacherSpecial), 'teaching');
    assert.equal(getStaffBranch(teacherAssistant), 'teaching');
    assert.equal(getStaffBranch(clerk), 'support');
    assert.equal(getStaffBranch(janitor), 'support');
    assert.equal(getStaffBranch(aide), 'support');
  });

  it('correctly evaluates teaching seniority/rank order (คศ. 5 to assistant teacher)', () => {
    const expertSpecial = { position: 'ครูเชี่ยวชาญพิเศษ', academicStanding: 'คศ. 5' } as any;
    const expert = { position: 'ครูเชี่ยวชาญ', academicStanding: 'คศ. 4' } as any;
    const special = { position: 'ครูชำนาญการพิเศษ', academicStanding: 'ครูชำนาญการพิเศษ' } as any;
    const experienced = { position: 'ครูชำนาญการ', academicStanding: 'ครูชำนาญการ' } as any;
    const level1 = { position: 'ครู คศ. 1', academicStanding: '-' } as any;
    const assistant = { position: 'ครูผู้ช่วย', academicStanding: '-' } as any;
    const hired = { position: 'ครูอัตราจ้าง', academicStanding: '-' } as any;

    assert.equal(getTeachingRank(expertSpecial), 1);
    assert.equal(getTeachingRank(expert), 2);
    assert.equal(getTeachingRank(special), 3);
    assert.equal(getTeachingRank(experienced), 4);
    assert.equal(getTeachingRank(level1), 5);
    assert.equal(getTeachingRank(assistant), 6);
    assert.equal(getTeachingRank(hired), 7);
  });

  it('sorts and groups real INITIAL_TEACHERS with STF-001 and STF-002 placed strictly below all teachers', () => {
    const groups = groupAndSortTeachers(INITIAL_TEACHERS);

    // Verify 3 distinct groups
    assert.equal(groups.length, 3);
    assert.equal(groups[0].category, 'management');
    assert.equal(groups[1].category, 'teaching');
    assert.equal(groups[2].category, 'support');

    // Management has Director (EXE-001)
    assert.equal(groups[0].members[0].id, 'EXE-001');

    // Teaching has teachers sorted by rank (TCH-003 through TCH-013)
    const teachingIds = groups[1].members.map((m) => m.id);
    assert.ok(teachingIds.includes('TCH-003')); // ครูชำนาญการพิเศษ
    assert.ok(teachingIds.includes('TCH-013')); // ครูผู้ช่วย
    // TCH-003 (คศ. 3) must appear before TCH-008 (คศ. 1) and TCH-013 (ผู้ช่วย)
    assert.ok(teachingIds.indexOf('TCH-003') < teachingIds.indexOf('TCH-008'));
    assert.ok(teachingIds.indexOf('TCH-008') < teachingIds.indexOf('TCH-013'));

    // Support has STF-001 (clerk) first, STF-002 (janitor) second, TCH-014 (aide) third
    const supportIds = groups[2].members.map((m) => m.id);
    assert.deepEqual(supportIds, ['STF-001', 'STF-002', 'TCH-014']);

    // Flat sorted list verification
    const flatSorted = sortTeachersByBranch(INITIAL_TEACHERS);
    const lastTeacherIdx = flatSorted.findIndex((t) => t.id === 'TCH-013');
    const clerkIdx = flatSorted.findIndex((t) => t.id === 'STF-001');
    const janitorIdx = flatSorted.findIndex((t) => t.id === 'STF-002');

    // STF-001 and STF-002 must be strictly after the last teaching staff
    assert.ok(clerkIdx > lastTeacherIdx, 'STF-001 must be placed below all teaching staff');
    assert.ok(janitorIdx > lastTeacherIdx, 'STF-002 must be placed below all teaching staff');
  });

  describe('formatAcademicStandingSubtext (Minimal subtitle clean-up)', () => {
    it('returns null when standing is empty, dash, or ไม่มีวิทยฐานะ to hide subtitle', () => {
      assert.equal(formatAcademicStandingSubtext('ครู คศ. 1', '-'), null);
      assert.equal(formatAcademicStandingSubtext('ครูผู้ช่วย', ''), null);
      assert.equal(formatAcademicStandingSubtext('นักการภารโรง', 'ไม่มีวิทยฐานะ'), null);
      assert.equal(formatAcademicStandingSubtext('เจ้าหน้าที่ธุรการ', undefined), null);
    });

    it('returns clean คศ. 3 when position already contains ชำนาญการพิเศษ', () => {
      assert.equal(formatAcademicStandingSubtext('ครูชำนาญการพิเศษ', 'ครูชำนาญการพิเศษ'), 'คศ. 3');
      assert.equal(formatAcademicStandingSubtext('ครูชำนาญการพิเศษ', 'ชำนาญการพิเศษ'), 'คศ. 3');
    });

    it('returns clean rank for Director with standing', () => {
      assert.equal(
        formatAcademicStandingSubtext('ผอ.สถานศึกษา', 'ชำนาญการพิเศษ'),
        'ชำนาญการพิเศษ · คศ. 3'
      );
    });
  });
});
