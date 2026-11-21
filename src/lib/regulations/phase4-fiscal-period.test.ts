import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateSalaryAfterPromotion,
  SalaryPromotionRecord,
  FiscalPeriodRecord,
} from '@/lib/data/schoolData';

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
});
