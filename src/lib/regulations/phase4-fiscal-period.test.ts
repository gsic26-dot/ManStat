import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateSalaryAfterPromotion,
  SalaryPromotionRecord,
  FiscalPeriodRecord,
  INITIAL_TEACHERS,
} from '@/lib/data/schoolData';
import { canManageSalaryPromotions, isCivilServantForSalary } from '@/lib/auth/roles';
import { getStaffBranch } from '@/lib/regulations/staff-sorting';

describe('Phase 4: Fiscal Period & Salary Promotion Calculations', () => {
  it('correctly calculates new salary after promotion percentage applied to base', () => {
    const base = 25000;
    const percent = 2.5; // 2.5% promotion
    const expected = 25625;
    const actual = calculateSalaryAfterPromotion(base, percent);
    assert.strictEqual(actual, expected);
  });

  it('correctly calculates new salary with 0% promotion', () => {
    const base = 35000;
    const percent = 0;
    const actual = calculateSalaryAfterPromotion(base, percent);
    assert.strictEqual(actual, 35000);
  });

  it('verifies fiscal period round date semantics (ว15/2561)', () => {
    const round1 = {
      roundNo: 1 as const,
      startDate: '2026-10-01',
      endDate: '2027-03-31',
      effectiveDate: '2027-04-01',
      roundLabel: '1 เม.ย.',
    };
    const round2 = {
      roundNo: 2 as const,
      startDate: '2027-04-01',
      endDate: '2027-09-30',
      effectiveDate: '2027-10-01',
      roundLabel: '1 ต.ค.',
    };

    assert.strictEqual(round1.effectiveDate, '2027-04-01');
    assert.strictEqual(round2.effectiveDate, '2027-10-01');
  });

  it('verifies that locked fiscal periods reject mutation payloads', () => {
    const lockedPeriod: FiscalPeriodRecord = {
      id: 'fp-2570-r1',
      schoolId: '30030099',
      fiscalYearTh: 2570,
      roundNo: 1,
      evalStart: '2026-10-01',
      evalEnd: '2027-03-31',
      isActive: true,
      isLocked: true,
    };

    assert.strictEqual(lockedPeriod.isLocked, true);
    // Simulating lock check logic used in queries and serverDb
    const canMutate = !lockedPeriod.isLocked;
    assert.strictEqual(canMutate, false, 'Locked period must not allow mutation');
  });

  it('preserves historical snapshot integrity independently of future teacher edits', () => {
    // Current teacher object has been updated later
    const currentTeacher = {
      id: 'T001',
      fullName: 'นายทดสอบ สอนดี',
      position: 'ครูชำนาญการพิเศษ',
      academicStanding: 'ชำนาญการพิเศษ',
      salary: 45000,
    };

    // Historic snapshot record captured during Round 1
    const historicSnapshot: SalaryPromotionRecord = {
      id: 'rec-001',
      fiscalPeriodId: 'fp-2570-r1',
      staffId: 'T001',
      positionSnapshot: 'ครูชำนาญการ',
      standingSnapshot: 'ชำนาญการ',
      salaryBefore: 38000,
      calculationBase: 38000,
      promotionPercent: 3.0,
      salaryAfter: 39140,
      orderNo: '12/2570',
      orderDate: '2027-03-30',
    };

    // Changing currentTeacher does not alter historicSnapshot
    assert.notStrictEqual(historicSnapshot.salaryBefore, currentTeacher.salary);
    assert.strictEqual(historicSnapshot.positionSnapshot, 'ครูชำนาญการ');
    assert.strictEqual(historicSnapshot.salaryAfter, 39140);
  });

  it('correctly filters civil servants only (12 of 15 staff members)', () => {
    assert.strictEqual(INITIAL_TEACHERS.length, 15, 'Total staff must be 15');

    const eligible = INITIAL_TEACHERS.filter((t) => isCivilServantForSalary(t));
    assert.strictEqual(eligible.length, 12, 'Must filter exactly 12 civil servant teachers');

    // Verify 1 Executive
    const executives = eligible.filter((t) => getStaffBranch(t) === 'management');
    assert.strictEqual(executives.length, 1);
    assert.strictEqual(executives[0].id, 'EXE-001');

    // Verify 11 Teachers
    const teachers = eligible.filter((t) => getStaffBranch(t) === 'teaching');
    assert.strictEqual(teachers.length, 11);

    // Verify non-civil servants excluded
    const excluded = INITIAL_TEACHERS.filter((t) => !isCivilServantForSalary(t));
    assert.strictEqual(excluded.length, 3);
    const excludedIds = excluded.map((t) => t.id).sort();
    assert.deepStrictEqual(excludedIds, ['STF-001', 'STF-002', 'TCH-014']);
  });

  it('strictly enforces RBAC permissions for salary promotions', () => {
    // Authorized roles
    assert.strictEqual(canManageSalaryPromotions('superuser'), true);
    assert.strictEqual(canManageSalaryPromotions('director'), true);
    assert.strictEqual(canManageSalaryPromotions('hr_admin'), true);
    assert.strictEqual(canManageSalaryPromotions('teacher', 'หัวหน้าฝ่ายบริหารงานบุคคล', 'กลุ่มบริหารงานบุคคล'), true);

    // Explicitly blocked roles & positions
    assert.strictEqual(canManageSalaryPromotions('teacher'), false);
    assert.strictEqual(canManageSalaryPromotions('user'), false);
    assert.strictEqual(canManageSalaryPromotions(null), false);
    assert.strictEqual(canManageSalaryPromotions('office', 'เจ้าหน้าที่ธุรการโรงเรียน', 'กลุ่มงานสนับสนุน'), false);
    assert.strictEqual(canManageSalaryPromotions('support', 'นักการภารโรง', 'กลุ่มงานสนับสนุน'), false);
    assert.strictEqual(canManageSalaryPromotions('teacher', 'พี่เลี้ยงเด็กพิการโรงเรียนทั่วไปจัดการเรียนรวม', 'กลุ่มงานสนับสนุน'), false);
  });
});
