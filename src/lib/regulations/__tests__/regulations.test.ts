/**
 * ============================================================================
 * ManStat: Core Regulatory Engine Unit Tests
 * ============================================================================
 * Strict Verification of Thai Civil Service Laws & OBEC Standards
 * Location: /src/lib/regulations/__tests__/regulations.test.ts
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getFiscalYearBE,
  getEvalRound,
  calculateRetirementInfo,
  calculateTenure,
  calculateLeaveDays,
  calculateLeaveDuration,
  evaluateLeaveApprovalAuthority,
  getLeaveCountingRule,
  LEAVE_COUNTING_RULES_2555,
  validateLeaveQuotaAndRules,
  getLicenseValidityYears,
  evaluateLicenseHealth,
  evaluatePAWorkload,
  MASTER_LEAVE_TYPES,
  isZeroDayLeaveType,
  isSchoolExitPermit,
  isOfficialMission
} from '../index';

describe('1. Fiscal Year & Evaluation Rounds (ก.ค.ศ. ว15/2561 & ปฏิทินงบประมาณ)', () => {
  it('should return next fiscal year BE on 1 October', () => {
    // 1 October 2026 -> Fiscal Year 2570
    const fy = getFiscalYearBE('2026-10-01');
    assert.equal(fy, 2570);
  });

  it('should return current fiscal year BE on 30 September', () => {
    // 30 September 2026 -> Fiscal Year 2569
    const fy = getFiscalYearBE('2026-09-30');
    assert.equal(fy, 2569);
  });

  it('should return Round 1 for dates between 1 Oct and 31 Mar', () => {
    assert.equal(getEvalRound('2026-10-01'), 1);
    assert.equal(getEvalRound('2026-12-15'), 1);
    assert.equal(getEvalRound('2027-03-31'), 1);
  });

  it('should return Round 2 for dates between 1 Apr and 30 Sep', () => {
    assert.equal(getEvalRound('2027-04-01'), 2);
    assert.equal(getEvalRound('2027-07-20'), 2);
    assert.equal(getEvalRound('2027-09-30'), 2);
  });
});

describe('2. Civil Service Retirement (พ.ร.บ. บำเหน็จบำนาญข้าราชการ พ.ศ. 2494 ม.19)', () => {
  it('should retire in fiscal year turning 60 for officer born on 30 September (30 ก.ย.)', () => {
    // Born 30 September 1966 (2509) -> Retires in fiscal year 2569 (2026-09-30)
    const result = calculateRetirementInfo('1966-09-30');
    assert.equal(result.retireFiscalYearBE, 2569);
    assert.equal(result.retireFiscalYearCE, 2026);
    assert.equal(result.retireDateCE, '2026-09-30');
    assert.equal(result.isRetireExtended, false);
  });

  it('CRITICAL: should retire in fiscal year turning 60 for officer born on 1 October (1 ต.ค.) - DO NOT ADD +1', () => {
    // Born 1 October 1966 (2509)
    // Section 19: Reaches 60 on 30 September 2026, so MUST retire in FY 2569 without +1 extension!
    const result = calculateRetirementInfo('1966-10-01');
    assert.equal(result.retireFiscalYearBE, 2569);
    assert.equal(result.retireFiscalYearCE, 2026);
    assert.equal(result.retireDateCE, '2026-09-30');
    assert.equal(result.isRetireExtended, false);
  });

  it('CRITICAL: should extend retirement by +1 fiscal year for officer born on 2 October (2 ต.ค.)', () => {
    // Born 2 October 1966 (2509)
    // Reaches 60 after 30 September, extends to fiscal year 2570 (2027-09-30)
    const result = calculateRetirementInfo('1966-10-02');
    assert.equal(result.retireFiscalYearBE, 2570);
    assert.equal(result.retireFiscalYearCE, 2027);
    assert.equal(result.retireDateCE, '2027-09-30');
    assert.equal(result.isRetireExtended, true);
  });

  it('should extend retirement by +1 fiscal year for officer born in November or December', () => {
    const novResult = calculateRetirementInfo('1966-11-15');
    assert.equal(novResult.retireFiscalYearBE, 2570);
    assert.equal(novResult.isRetireExtended, true);

    const decResult = calculateRetirementInfo('1966-12-31');
    assert.equal(decResult.retireFiscalYearBE, 2570);
    assert.equal(decResult.isRetireExtended, true);
  });
});

describe('3. Civil Service Tenure Calculation', () => {
  it('should calculate exact tenure in years, months, and days', () => {
    // Appointed 2020-05-16, Reference 2026-11-16 -> Exactly 6 years, 6 months, 0 days
    const tenure = calculateTenure('2020-05-16', '2026-11-16');
    assert.equal(tenure.years, 6);
    assert.equal(tenure.months, 6);
    assert.equal(tenure.days, 0);
    assert.equal(tenure.formattedText, '6 ปี 6 เดือน 0 วัน');
  });
});

describe('4. Leave Calculation & Working Days (ระเบียบสำนักนายกฯ 2555)', () => {
  it('should calculate 0.5 days for morning or afternoon half-day leave on the same date', () => {
    const morning = calculateLeaveDays('2026-11-02', '2026-11-02', 'ลาป่วย', 'morning');
    assert.equal(morning, 0.5);

    const afternoon = calculateLeaveDays('2026-11-02', '2026-11-02', 'ลากิจส่วนตัว', 'afternoon');
    assert.equal(afternoon, 0.5);
  });

  it('should calculate working days excluding weekends and holidays array for sick/personal leave', () => {
    // 2026-11-02 (Mon) to 2026-11-06 (Fri) = 5 days
    // 2026-11-04 is a holiday -> should equal 4 working days
    const days = calculateLeaveDays(
      '2026-11-02',
      '2026-11-06',
      'ลาป่วย',
      'full',
      ['2026-11-04']
    );
    assert.equal(days, 4);
  });

  it('should count continuous calendar days for maternity leave', () => {
    // 2026-11-02 (Mon) to 2026-11-08 (Sun) = 7 calendar days
    const days = calculateLeaveDays('2026-11-02', '2026-11-08', 'ลาคลอดบุตร', 'full');
    assert.equal(days, 7);
  });

  it('CRITICAL: should calculate 0 days for school exit permission (<= 3h) and official mission', () => {
    const exitDays = calculateLeaveDays('2026-11-02', '2026-11-02', 'ขออนุญาตออกนอกบริเวณโรงเรียน', 'full');
    assert.equal(exitDays, 0);

    const missionDays = calculateLeaveDays('2026-11-02', '2026-11-04', 'ขออนุญาตไปราชการ', 'full');
    assert.equal(missionDays, 0);
  });
});

describe('5. Leave Quota & Regulatory Rules Validation', () => {
  it('CRITICAL: should cap personal leave at 15 days for first-year appointees', () => {
    // First-year appointee requesting 10 days (under 15) -> VALID
    const validCheck = validateLeaveQuotaAndRules({
      leaveType: 'ลากิจส่วนตัว',
      requestedDays: 10,
      usedDaysInFiscalYear: 0,
      usedOccurrencesInRound: 0,
      usedSickPersonalDaysInRound: 0,
      isFirstYearAppointee: true
    });
    assert.equal(validCheck.isValid, true);
    assert.equal(validCheck.maxQuota, 15);
    assert.equal(validCheck.remainingQuotaAfter, 5);

    // First-year appointee requesting 16 days (exceeds 15) -> INVALID with Error
    const invalidCheck = validateLeaveQuotaAndRules({
      leaveType: 'ลากิจส่วนตัว',
      requestedDays: 16,
      usedDaysInFiscalYear: 0,
      usedOccurrencesInRound: 0,
      usedSickPersonalDaysInRound: 0,
      isFirstYearAppointee: true
    });
    assert.equal(invalidCheck.isValid, false);
    assert.equal(invalidCheck.errors.length > 0, true);
  });

  it('should require medical certificate for sick leave >= 30 days and warn for >= 3 days', () => {
    const cert30 = validateLeaveQuotaAndRules({
      leaveType: 'ลาป่วย',
      requestedDays: 30,
      usedDaysInFiscalYear: 0,
      usedOccurrencesInRound: 0,
      usedSickPersonalDaysInRound: 0
    });
    assert.equal(cert30.requireMedicalCert, true);

    const warn3 = validateLeaveQuotaAndRules({
      leaveType: 'ลาป่วย',
      requestedDays: 3,
      usedDaysInFiscalYear: 0,
      usedOccurrencesInRound: 0,
      usedSickPersonalDaysInRound: 0
    });
    assert.equal(warn3.requireMedicalCert, false);
    assert.equal(warn3.warnings.some(w => w.includes('3 วันทำการขึ้นไป')), true);
  });

  it('should disallow vacation leave for regular teaching staff', () => {
    const regularTeacher = validateLeaveQuotaAndRules({
      leaveType: 'ลาพักผ่อน',
      requestedDays: 5,
      usedDaysInFiscalYear: 0,
      usedOccurrencesInRound: 0,
      usedSickPersonalDaysInRound: 0,
      isYearRoundStaff: false
    });
    assert.equal(regularTeacher.isValid, false);
    assert.equal(regularTeacher.errors.some(e => e.includes('ไม่มีสิทธิลาพักผ่อน')), true);
  });

  it('should trigger merit radar warning when occurrences > 6 or days > 23 (ก.ค.ศ. ว15/2561)', () => {
    // Current occurrences = 6, adding 1 -> 7 (exceeds 6)
    const occExceeded = validateLeaveQuotaAndRules({
      leaveType: 'ลาป่วย',
      requestedDays: 1,
      usedDaysInFiscalYear: 5,
      usedOccurrencesInRound: 6,
      usedSickPersonalDaysInRound: 5
    });
    assert.equal(occExceeded.isPromotionRisk, true);
    assert.equal(occExceeded.warnings.some(w => w.includes('เกิน 6 ครั้ง')), true);

    // Current days = 22, adding 2 -> 24 (exceeds 23)
    const daysExceeded = validateLeaveQuotaAndRules({
      leaveType: 'ลากิจส่วนตัว',
      requestedDays: 2,
      usedDaysInFiscalYear: 22,
      usedOccurrencesInRound: 3,
      usedSickPersonalDaysInRound: 22
    });
    assert.equal(daysExceeded.isPromotionRisk, true);
    assert.equal(daysExceeded.warnings.some(w => w.includes('เกิน 23 วันทำการ')), true);
  });
});

describe('6. Khurusapha Licenses & PA Workload Evaluation (ว9/2564 & ว21/2564)', () => {
  it('should return correct license validity years for all types', () => {
    assert.equal(getLicenseValidityYears('P-License'), 2);
    assert.equal(getLicenseValidityYears('B-License'), 5);
    assert.equal(getLicenseValidityYears('A-License'), 7);
    assert.equal(getLicenseValidityYears('ผู้บริหารสถานศึกษา'), 5);
    assert.equal(getLicenseValidityYears('ผู้บริหารการศึกษา'), 5);
    assert.equal(getLicenseValidityYears('ศึกษานิเทศก์'), 5);
  });

  it('should evaluate license health accurately: VALID, EXPIRING_SOON, EXPIRED', () => {
    // Remaining > 90 days
    const valid = evaluateLicenseHealth('2028-11-16', '2026-11-16');
    assert.equal(valid.health, 'VALID');
    assert.equal(valid.statusColor, 'green');

    // Remaining <= 90 days (60 days)
    const soon = evaluateLicenseHealth('2027-01-15', '2026-11-16');
    assert.equal(soon.health, 'EXPIRING_SOON');
    assert.equal(soon.statusColor, 'yellow');

    // Expired
    const expired = evaluateLicenseHealth('2025-10-01', '2026-11-16');
    assert.equal(expired.health, 'EXPIRED');
    assert.equal(expired.statusColor, 'red');
  });

  it('should evaluate PA Workload criteria: total >= 20 hrs, teaching >= 12 hrs for teachers', () => {
    // Passed workload
    const passed = evaluatePAWorkload({
      teachingHours: 14,
      supportHours: 4,
      developmentHours: 2,
      policyHours: 2,
      isAdministrator: false
    });
    assert.equal(passed.isAllPassed, true);
    assert.equal(passed.totalHours, 22);

    // Failed teaching hours (< 12 hrs)
    const failedTeaching = evaluatePAWorkload({
      teachingHours: 10,
      supportHours: 6,
      developmentHours: 3,
      policyHours: 3,
      isAdministrator: false
    });
    assert.equal(failedTeaching.isTeachingHoursPassed, false);
    assert.equal(failedTeaching.isAllPassed, false);
  });
});

describe('7. Master 13 Leave Types & School Exit / Official Mission (สพฐ. Standards)', () => {
  it('should define exactly 13 leave types partitioned into 2 distinct groups', () => {
    assert.equal(MASTER_LEAVE_TYPES.length, 13);
    const statutory = MASTER_LEAVE_TYPES.filter(t => t.category === 'statutory');
    const permissions = MASTER_LEAVE_TYPES.filter(t => t.category === 'special_permission');

    assert.equal(statutory.length, 11);
    assert.equal(permissions.length, 2);
  });

  it('should identify zero-day leave types correctly', () => {
    assert.equal(isZeroDayLeaveType('ขออนุญาตออกนอกบริเวณโรงเรียน'), true);
    assert.equal(isZeroDayLeaveType('ขออนุญาตไปราชการ'), true);
    assert.equal(isZeroDayLeaveType('ลาป่วย'), false);
    assert.equal(isZeroDayLeaveType('ลากิจส่วนตัว'), false);
  });

  it('should validate school exit permit and official mission as 0 days without quota deduction or promotion risk', () => {
    const exitValidation = validateLeaveQuotaAndRules({
      leaveType: 'ขออนุญาตออกนอกบริเวณโรงเรียน',
      requestedDays: 0,
      usedDaysInFiscalYear: 10,
      usedOccurrencesInRound: 6,
      usedSickPersonalDaysInRound: 23,
    });
    assert.equal(exitValidation.isValid, true);
    assert.equal(exitValidation.isPromotionRisk, false);
    assert.equal(exitValidation.errors.length, 0);

    const missionValidation = validateLeaveQuotaAndRules({
      leaveType: 'ขออนุญาตไปราชการ',
      requestedDays: 0,
      usedDaysInFiscalYear: 10,
      usedOccurrencesInRound: 6,
      usedSickPersonalDaysInRound: 23,
    });
    assert.equal(missionValidation.isValid, true);
    assert.equal(missionValidation.isPromotionRisk, false);
    assert.equal(missionValidation.errors.length, 0);
  });
});

describe('8. Phase 12.5: Official 2555 Leave Day Counting Matrix (All 11 Leave Types)', () => {
  // Range: Thu 2026-04-02 -> Tue 2026-04-07
  // Calendar days = 6 (Thu, Fri, Sat, Sun, Mon [Chakri Day holiday], Tue)
  // Working days  = 3 (Thu 02, Fri 03, Tue 07)
  // Excluded      = 3 (Sat 04, Sun 05, Mon 06 holiday)
  const START = '2026-04-02';
  const END = '2026-04-07';
  const HOLIDAYS = ['2026-04-06'];

  const WORKING_DAYS_ONLY_TYPES = [
    'ลาป่วย',
    'ลาไปช่วยเหลือภริยาที่คลอดบุตร',
    'ลากิจส่วนตัว',
    'ลาพักผ่อน',
  ] as const;

  const CONTINUOUS_CALENDAR_TYPES = [
    'ลาคลอดบุตร',
    'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์',
    'ลาเข้ารับการตรวจเลือกหรือเข้ารับการเตรียมพล',
    'ลาไปศึกษา ฝึกอบรม ปฏิบัติการวิจัย หรือดูงาน',
    'ลาไปปฏิบัติงานในองค์การระหว่างประเทศ',
    'ลาติดตามคู่สมรส',
    'ลาไปฟื้นฟูสมรรถภาพด้านอาชีพ',
  ] as const;

  it('defines all 11 statutory leave types in LEAVE_COUNTING_RULES_2555 (4 working-days, 7 continuous)', () => {
    const keys = Object.keys(LEAVE_COUNTING_RULES_2555);
    assert.equal(keys.length, 11);
    const workingCount = Object.values(LEAVE_COUNTING_RULES_2555).filter(
      (r) => r.calculationCountingMode === 'working_days_only'
    ).length;
    const continuousCount = Object.values(LEAVE_COUNTING_RULES_2555).filter(
      (r) => r.calculationCountingMode === 'continuous'
    ).length;
    assert.equal(workingCount, 4);
    assert.equal(continuousCount, 7);
    assert.equal(
      Object.values(LEAVE_COUNTING_RULES_2555).every((r) => r.submissionCountingMode === 'continuous'),
      true
    );
  });

  it('counts WORKING DAYS ONLY (3) for all 4 working-day leave types while submissionCalendarDays = 6', () => {
    for (const leaveType of WORKING_DAYS_ONLY_TYPES) {
      const res = calculateLeaveDuration({
        leaveType,
        startDate: START,
        endDate: END,
        holidays: HOLIDAYS,
      });
      assert.equal(res.calculationCountingMode, 'working_days_only', `${leaveType} mode`);
      assert.equal(res.calculatedLeaveDays, 3, `${leaveType} calculatedLeaveDays`);
      assert.equal(res.submissionCalendarDays, 6, `${leaveType} submissionCalendarDays`);
      assert.equal(res.workingDaysCount, 3, `${leaveType} workingDaysCount`);
      assert.equal(res.excludedWeekendOrHolidayCount, 3, `${leaveType} excluded`);
    }
  });

  it('counts CONTINUOUS CALENDAR DAYS (6) for all 7 continuous leave types including intl_org, spouse & rehab', () => {
    for (const leaveType of CONTINUOUS_CALENDAR_TYPES) {
      const res = calculateLeaveDuration({
        leaveType,
        startDate: START,
        endDate: END,
        holidays: HOLIDAYS,
      });
      assert.equal(res.calculationCountingMode, 'continuous', `${leaveType} mode`);
      assert.equal(res.calculatedLeaveDays, 6, `${leaveType} calculatedLeaveDays`);
      assert.equal(res.submissionCalendarDays, 6, `${leaveType} submissionCalendarDays`);
      assert.equal(res.allowHalfDay, false, `${leaveType} allowHalfDay`);
    }
  });

  it('handles half-day leave, single-day holiday, reversed dates, and suffixed/code-key lookups safely', () => {
    // Half-day on working day -> 0.5
    const halfSick = calculateLeaveDuration({
      leaveType: 'ลาป่วย',
      startDate: '2026-04-02',
      endDate: '2026-04-02',
      halfDayPeriod: 'morning',
      holidays: HOLIDAYS,
    });
    assert.equal(halfSick.calculatedLeaveDays, 0.5);
    assert.equal(halfSick.submissionCalendarDays, 1);

    const halfVacation = calculateLeaveDuration({
      leaveType: 'ลาพักผ่อน',
      startDate: '2026-04-02',
      endDate: '2026-04-02',
      halfDayPeriod: 'afternoon',
      holidays: HOLIDAYS,
    });
    assert.equal(halfVacation.calculatedLeaveDays, 0.5);

    // Half-day on a Thai public holiday -> 0 (not 0.5!)
    const halfOnHoliday = calculateLeaveDuration({
      leaveType: 'ลาป่วย',
      startDate: '2026-04-06',
      endDate: '2026-04-06',
      halfDayPeriod: 'morning',
      holidays: HOLIDAYS,
    });
    assert.equal(halfOnHoliday.calculatedLeaveDays, 0);
    assert.equal(halfOnHoliday.submissionCalendarDays, 1);

    // Single-day leave on holiday: 0 for working-day type, 1 for continuous type
    assert.equal(
      calculateLeaveDuration({
        leaveType: 'ลากิจส่วนตัว',
        startDate: '2026-04-06',
        endDate: '2026-04-06',
        holidays: HOLIDAYS,
      }).calculatedLeaveDays,
      0
    );
    assert.equal(
      calculateLeaveDuration({
        leaveType: 'ลาติดตามคู่สมรส',
        startDate: '2026-04-06',
        endDate: '2026-04-06',
        holidays: HOLIDAYS,
      }).calculatedLeaveDays,
      1
    );

    // Reversed date range -> 0 safely
    const reversed = calculateLeaveDuration({
      leaveType: 'ลาป่วย',
      startDate: '2026-04-07',
      endDate: '2026-04-02',
      holidays: HOLIDAYS,
    });
    assert.equal(reversed.calculatedLeaveDays, 0);
    assert.equal(reversed.submissionCalendarDays, 0);

    // Lookup by code key and retroactive suffix
    assert.equal(getLeaveCountingRule('spouse')?.calculationCountingMode, 'continuous');
    assert.equal(getLeaveCountingRule('rehab')?.calculationCountingMode, 'continuous');
    assert.equal(getLeaveCountingRule('intl_org')?.calculationCountingMode, 'continuous');
    assert.equal(
      getLeaveCountingRule('ลาติดตามคู่สมรส (บันทึกย้อนหลัง)')?.calculationCountingMode,
      'continuous'
    );
  });

  it('routes approval authority using submissionCalendarDays (continuous calendar days)', () => {
    const withinDirector = evaluateLeaveApprovalAuthority({
      leaveType: 'ลากิจส่วนตัว',
      submissionCalendarDays: 30,
    });
    assert.equal(withinDirector.approverLevel, 'director');

    const escalateObec = evaluateLeaveApprovalAuthority({
      leaveType: 'ลากิจส่วนตัว',
      submissionCalendarDays: 31,
    });
    assert.equal(escalateObec.approverLevel, 'obec_area');

    const ordinationObec = evaluateLeaveApprovalAuthority({
      leaveType: 'ลาอุปสมบทหรือการลาไปประกอบพิธีฮัจย์',
      submissionCalendarDays: 15,
    });
    assert.equal(ordinationObec.approverLevel, 'obec_area');
  });
});
