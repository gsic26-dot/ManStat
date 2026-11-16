/**
 * =========================================================================
 * MANSTAT MODERN - UNIT TESTS FOR THAI CIVIL SERVICE REGULATIONS
 * =========================================================================
 * Tests compliance with Iron Law 3:
 * 1. Sec. 19 Civil Service Pension Act (October 1 rule vs October 2 rule)
 * 2. Prime Minister's Office Leave Regulations 2555 (Quotas & Working Days)
 * 3. OPSC (ก.ค.ศ. ว15/2561) Promotion Radar Warnings
 * 4. Khurusapha Professional License Expiry Monitoring
 * =========================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCivilServiceRetirement,
  calculateWorkingDays,
  validateLeaveQuota,
  evaluatePromotionEligibility,
  getEvaluationRoundForDate,
  evaluateLicenseStatus
} from '../lib/regulations';

describe('1. Civil Service Retirement (ม.19 พ.ร.บ. บำเหน็จบำนาญฯ)', () => {
  it('should retire in fiscal year turning 60 for officer born on September 30', () => {
    // Born 30 September 1966 (2509)
    const result = calculateCivilServiceRetirement('1966-09-30');
    assert.equal(result.retireFiscalYearCE, 2026);
    assert.equal(result.retireFiscalYearBE, 2569);
    assert.equal(result.retireDateISO, '2026-09-30');
    assert.equal(result.isRetireExtended, false);
  });

  it('CRITICAL: should retire in fiscal year turning 60 for officer born on October 1', () => {
    // Born 1 October 1966 (2509)
    // Under Section 19, reaches age 60 exactly on 30 September of fiscal year 2026.
    // MUST NOT be extended to 2027!
    const result = calculateCivilServiceRetirement('1966-10-01');
    assert.equal(result.retireFiscalYearCE, 2026);
    assert.equal(result.retireFiscalYearBE, 2569);
    assert.equal(result.retireDateISO, '2026-09-30');
    assert.equal(result.isRetireExtended, false);
  });

  it('CRITICAL: should extend retirement by +1 fiscal year for officer born on October 2', () => {
    // Born 2 October 1966 (2509)
    // Reaches age 60 after 30 September, so extends to fiscal year 2027 (2570)
    const result = calculateCivilServiceRetirement('1966-10-02');
    assert.equal(result.retireFiscalYearCE, 2027);
    assert.equal(result.retireFiscalYearBE, 2570);
    assert.equal(result.retireDateISO, '2027-09-30');
    assert.equal(result.isRetireExtended, true);
  });

  it('should extend retirement by +1 fiscal year for officer born on December 31', () => {
    // Born 31 December 1966 (2509)
    const result = calculateCivilServiceRetirement('1966-12-31');
    assert.equal(result.retireFiscalYearCE, 2027);
    assert.equal(result.retireFiscalYearBE, 2570);
    assert.equal(result.isRetireExtended, true);
  });
});

describe('2. Civil Service Leave Regulations (ระเบียบสำนักนายกฯ 2555)', () => {
  it('should calculate working days correctly, excluding weekends and official holidays', () => {
    // 2026-11-02 (Monday) to 2026-11-06 (Friday) = 5 days
    // Add 2026-11-04 as a holiday -> should equal 4 working days
    const days = calculateWorkingDays({
      startDate: '2026-11-02',
      endDate: '2026-11-06',
      leaveType: 'ลาป่วย',
      holidaysList: ['2026-11-04']
    });
    assert.equal(days, 4);
  });

  it('should support half-day leave (0.5 days) for morning or afternoon', () => {
    const daysMorning = calculateWorkingDays({
      startDate: '2026-11-02',
      endDate: '2026-11-02',
      leaveType: 'ลากิจส่วนตัว',
      halfDayPeriod: 'MORNING'
    });
    assert.equal(daysMorning, 0.5);

    const daysAfternoon = calculateWorkingDays({
      startDate: '2026-11-02',
      endDate: '2026-11-02',
      leaveType: 'ลากิจส่วนตัว',
      halfDayPeriod: 'AFTERNOON'
    });
    assert.equal(daysAfternoon, 0.5);
  });

  it('should count continuous calendar days for maternity leave regardless of weekends', () => {
    // 2026-11-02 (Mon) to 2026-11-08 (Sun) = 7 full calendar days
    const days = calculateWorkingDays({
      startDate: '2026-11-02',
      endDate: '2026-11-08',
      leaveType: 'ลาคลอดบุตร'
    });
    assert.equal(days, 7);
  });

  it('should cap personal leave at 15 days for first-year appointees', () => {
    const checkValid = validateLeaveQuota({
      leaveType: 'ลากิจส่วนตัว',
      requestedDays: 5,
      usedDays: 10,
      isFirstYearAppointee: true
    });
    assert.equal(checkValid.isValid, true);
    assert.equal(checkValid.maxQuota, 15);
    assert.equal(checkValid.remainingAfter, 0);

    const checkExceeded = validateLeaveQuota({
      leaveType: 'ลากิจส่วนตัว',
      requestedDays: 6,
      usedDays: 10,
      isFirstYearAppointee: true
    });
    assert.equal(checkExceeded.isValid, false);
    assert.equal(checkExceeded.exceededDays, 1);
  });

  it('should flag medical certificate requirement when sick leave reaches 30 days', () => {
    const checkCert = validateLeaveQuota({
      leaveType: 'ลาป่วย',
      requestedDays: 30,
      usedDays: 0
    });
    assert.equal(checkCert.requiresMedicalCertificate, true);
    assert.equal(checkCert.warnings.length > 0, true);
  });
});

describe('3. Salary Evaluation & Merit Radar (ก.ค.ศ. ว15/2561)', () => {
  it('should correctly determine Round 1 and Round 2 fiscal periods', () => {
    // 15 November 2026 falls into Round 1 of fiscal year 2570 (starts 1 Oct 2026)
    const r1 = getEvaluationRoundForDate('2026-11-15');
    assert.equal(r1.evalRound, 1);
    assert.equal(r1.fiscalYear, 2570);

    // 15 May 2027 falls into Round 2 of fiscal year 2570
    const r2 = getEvaluationRoundForDate('2027-05-15');
    assert.equal(r2.evalRound, 2);
    assert.equal(r2.fiscalYear, 2570);
  });

  it('should flag warning when leave count exceeds 6 times', () => {
    const result = evaluatePromotionEligibility(7, 10, 2570, 1);
    assert.equal(result.isLeaveCountExceeded, true);
    assert.equal(result.isDaysExceeded, false);
    assert.equal(result.isDisqualifiedForMerit, true);
  });

  it('should flag warning when sick and personal leave days exceed 23 working days', () => {
    const result = evaluatePromotionEligibility(4, 24, 2570, 1);
    assert.equal(result.isLeaveCountExceeded, false);
    assert.equal(result.isDaysExceeded, true);
    assert.equal(result.isDisqualifiedForMerit, true);
  });

  it('should pass cleanly when within both limits', () => {
    const result = evaluatePromotionEligibility(5, 18, 2570, 1);
    assert.equal(result.isLeaveCountExceeded, false);
    assert.equal(result.isDaysExceeded, false);
    assert.equal(result.isDisqualifiedForMerit, false);
    assert.equal(result.warnings.length, 0);
  });
});

describe('4. Khurusapha Professional Licenses', () => {
  it('should show green when more than 90 days remaining', () => {
    const status = evaluateLicenseStatus(
      'B-License',
      '6510900000001',
      '2024-01-01',
      '2029-01-01',
      '2026-11-16'
    );
    assert.equal(status.statusColor, 'green');
    assert.equal(status.isExpired, false);
    assert.equal(status.isExpiringSoon, false);
  });

  it('should show yellow when expiring within 90 days', () => {
    const status = evaluateLicenseStatus(
      'B-License',
      '6510900000001',
      '2021-12-01',
      '2026-12-15',
      '2026-11-16'
    );
    assert.equal(status.statusColor, 'yellow');
    assert.equal(status.isExpiringSoon, true);
    assert.equal(status.isExpired, false);
  });

  it('should show red when expired', () => {
    const status = evaluateLicenseStatus(
      'P-License',
      '6410900000001',
      '2022-01-01',
      '2024-01-01',
      '2026-11-16'
    );
    assert.equal(status.statusColor, 'red');
    assert.equal(status.isExpired, true);
  });
});
