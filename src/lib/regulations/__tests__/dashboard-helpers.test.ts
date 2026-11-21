import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveDashboardUser,
  isWeekendOrHoliday,
  calculateDutyMetric,
  getEvaluationRoundDateRange,
  calculateUserRoundLeaveStats,
  calculateUserFiscalLeaveQuota,
  getUserRecentLeaveRequests,
  isEligibleForVacation,
} from '../dashboard-helpers';
import { INITIAL_TEACHERS, type LeaveRequestRecord } from '@/lib/data/schoolData';
import type { HolidayRecord } from '@/lib/db/serverDb';

function createMockLeaveRequest(overrides: Partial<LeaveRequestRecord>): LeaveRequestRecord {
  return {
    id: overrides.id || `mock-${Math.random()}`,
    docNo: overrides.docNo || 'DOC-2570-001',
    teacherId: overrides.teacherId || 'TCH-008',
    teacherName: overrides.teacherName || 'นางสาวสุนิสา สุทธิวงศ์',
    position: overrides.position || 'ครู คศ. 1',
    department: overrides.department || 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    leaveType: overrides.leaveType || 'ลาป่วย',
    leaveTypeName: overrides.leaveTypeName || overrides.leaveType || 'ลาป่วย',
    startDate: overrides.startDate || '2026-11-01',
    endDate: overrides.endDate || '2026-11-01',
    totalDays: overrides.totalDays ?? 1,
    reason: overrides.reason || 'มีไข้หวัด',
    substituteTeacherName: overrides.substituteTeacherName || 'นายกิตติพณ พรหมทอง',
    status: overrides.status || 'approved',
    submittedAt: overrides.submittedAt || '2026-11-01T08:00:00Z',
    currentStep: overrides.currentStep ?? 3,
    ...overrides,
  };
}

describe('Dashboard Overhaul: Dynamic User Identity, Scoping & Regulations', () => {
  const currentFiscalYearBE = 2570;

  describe('1. User Identity Resolution & Switching (Dynamic currentUser)', () => {
    it('correctly resolves Director identity with prefix and full position', () => {
      const directorAuthUser = {
        id: 'EXE-001',
        employeeCode: 'EXE-001',
        name: 'นายธีรศักดิ์ มโนธรรม',
        role: 'superuser',
        position: 'ผู้อำนวยการโรงเรียน',
      };

      const identity = resolveDashboardUser(directorAuthUser, INITIAL_TEACHERS, currentFiscalYearBE);
      assert.equal(identity.id, 'EXE-001');
      assert.equal(identity.name, 'นายธีรศักดิ์ มโนธรรม');
      assert.equal(identity.position, 'ผู้อำนวยการโรงเรียน');
      assert.equal(identity.isApprover, true);
      assert.equal(identity.isEligibleForVacation, true);
      assert.equal(identity.isFirstYearAppointee, false);
    });

    it('correctly resolves Teacher identity when switching accounts (e.g. TCH-008)', () => {
      const teacherAuthUser = {
        id: 'TCH-008',
        employeeCode: 'TCH-008',
        name: 'นางสาวสุนิสา สุทธิวงศ์',
        role: 'teacher',
        position: 'ครู คศ. 1',
      };

      const identity = resolveDashboardUser(teacherAuthUser, INITIAL_TEACHERS, currentFiscalYearBE);
      assert.equal(identity.id, 'TCH-008');
      assert.equal(identity.name, 'นางสาวสุนิสา สุทธิวงศ์');
      assert.equal(identity.position, 'ครู คศ. 1');
      assert.equal(identity.isApprover, false);
      assert.equal(identity.isEligibleForVacation, false);
      assert.equal(identity.isFirstYearAppointee, false);
    });

    it('correctly identifies newly appointed staff in the first fiscal year (e.g. STF-002)', () => {
      const newStaffUser = {
        id: 'STF-002',
        employeeCode: 'STF-002',
        name: 'นายกำพล กักหมื่นไวย',
        role: 'teacher',
        position: 'นักการภารโรง',
      };

      const identity = resolveDashboardUser(newStaffUser, INITIAL_TEACHERS, currentFiscalYearBE);
      assert.equal(identity.id, 'STF-002');
      assert.equal(identity.name, 'นายกำพล กักหมื่นไวย');
      assert.equal(identity.position, 'นักการภารโรง');
      assert.equal(identity.isApprover, false);
      assert.equal(identity.isEligibleForVacation, true);
      assert.equal(identity.isFirstYearAppointee, true);
    });
  });

  describe('2. Weekend & Holiday Duty Metric Calculation', () => {
    const mockHolidays: HolidayRecord[] = [
      {
        id: 'h-1',
        date: '2026-10-23',
        name: 'วันปิยมหาราช',
        type: 'วันหยุดราชการประจำปี',
      },
    ];

    it('identifies Sunday as weekend holiday', () => {
      // 2026-10-25 is Sunday
      const sundayDate = new Date('2026-10-25T10:00:00Z');
      const status = isWeekendOrHoliday(sundayDate, mockHolidays);

      assert.equal(status.isHoliday, true);
      assert.equal(status.isWeekend, true);
      assert.equal(status.label, 'วันหยุดราชการ');
      assert.equal(status.reason, 'วันหยุดประจำสัปดาห์');

      const metric = calculateDutyMetric(15, 0, status);
      assert.equal(metric.value, 'วันหยุดราชการ');
      assert.equal(metric.unit, '');
      assert.equal(metric.subtext, 'วันหยุดประจำสัปดาห์');
      assert.equal(metric.isHoliday, true);
    });

    it('identifies Saturday as weekend holiday', () => {
      // 2026-10-24 is Saturday
      const satDate = new Date('2026-10-24T10:00:00Z');
      const status = isWeekendOrHoliday(satDate, mockHolidays);

      assert.equal(status.isHoliday, true);
      assert.equal(status.isWeekend, true);
      assert.equal(status.label, 'วันหยุดราชการ');
    });

    it('identifies official government holiday from holidays database on a weekday', () => {
      // 2026-10-23 is Friday (วันปิยมหาราช)
      const holidayDate = new Date('2026-10-23T10:00:00Z');
      const status = isWeekendOrHoliday(holidayDate, mockHolidays);

      assert.equal(status.isHoliday, true);
      assert.equal(status.isWeekend, false);
      assert.equal(status.reason, 'วันปิยมหาราช');
      assert.equal(status.label, 'วันหยุดราชการ');

      const metric = calculateDutyMetric(15, 2, status);
      assert.equal(metric.value, 'วันหยุดราชการ');
      assert.equal(metric.unit, '');
      assert.equal(metric.subtext, 'วันปิยมหาราช');
    });

    it('computes duty staff accurately on regular working days (total - onLeave)', () => {
      // 2026-10-26 is Monday
      const mondayDate = new Date('2026-10-26T10:00:00Z');
      const status = isWeekendOrHoliday(mondayDate, mockHolidays);

      assert.equal(status.isHoliday, false);
      assert.equal(status.isWeekend, false);

      const metricWithLeave = calculateDutyMetric(15, 2, status);
      assert.equal(metricWithLeave.value, 13);
      assert.equal(metricWithLeave.unit, 'คน');
      assert.equal(metricWithLeave.subtext, 'พร้อมปฏิบัติหน้าที่ในสถานศึกษา');

      const metricFull = calculateDutyMetric(15, 0, status);
      assert.equal(metricFull.value, 15);
      assert.equal(metricFull.subtext, 'มาปฏิบัติหน้าที่ครบทุกคน');
    });
  });

  describe('3. Role-Based Panel Switching (Approver vs Teacher)', () => {
    it('grants approver rights to superuser, hr_admin, and director', () => {
      const superuser = resolveDashboardUser({ id: 'u1', role: 'superuser' }, [], currentFiscalYearBE);
      const admin = resolveDashboardUser({ id: 'u2', role: 'hr_admin' }, [], currentFiscalYearBE);
      const director = resolveDashboardUser({ id: 'u3', role: 'director' }, [], currentFiscalYearBE);
      const teacher = resolveDashboardUser({ id: 'u4', role: 'teacher' }, [], currentFiscalYearBE);

      assert.equal(superuser.isApprover, true);
      assert.equal(admin.isApprover, true);
      assert.equal(director.isApprover, true);
      assert.equal(teacher.isApprover, false);
    });

    it('correctly filters recent leaves for current teacher user only', () => {
      const mockLeaves: LeaveRequestRecord[] = [
        createMockLeaveRequest({
          id: 'l-1',
          teacherId: 'TCH-008',
          teacherName: 'นางสาวสุนิสา สุทธิวงศ์',
          position: 'ครู คศ. 1',
          leaveType: 'ลาป่วย',
          leaveTypeName: 'ลาป่วย',
          startDate: '2026-11-01',
          endDate: '2026-11-02',
          totalDays: 2,
          status: 'approved',
          submittedAt: '2026-11-01T08:00:00Z',
        }),
        createMockLeaveRequest({
          id: 'l-2',
          teacherId: 'TCH-003',
          teacherName: 'นายธวัชชัย เหลืองโอฬาร',
          position: 'ครูชำนาญการพิเศษ',
          leaveType: 'ลากิจส่วนตัว',
          leaveTypeName: 'ลากิจส่วนตัว',
          startDate: '2026-11-05',
          endDate: '2026-11-05',
          totalDays: 1,
          status: 'pending',
          submittedAt: '2026-11-05T08:00:00Z',
        }),
        createMockLeaveRequest({
          id: 'l-3',
          teacherId: 'TCH-008',
          teacherName: 'นางสาวสุนิสา สุทธิวงศ์',
          position: 'ครู คศ. 1',
          leaveType: 'ลากิจส่วนตัว',
          leaveTypeName: 'ลากิจส่วนตัว',
          startDate: '2026-11-10',
          endDate: '2026-11-10',
          totalDays: 1,
          status: 'pending',
          submittedAt: '2026-11-10T08:00:00Z',
        }),
      ];

      const teacherLeaves = getUserRecentLeaveRequests(mockLeaves, { id: 'TCH-008' });
      assert.equal(teacherLeaves.length, 2);
      assert.equal(teacherLeaves[0].id, 'l-3'); // Newest first
      assert.equal(teacherLeaves[1].id, 'l-1');
    });
  });

  describe('4. Evaluation Round Scoping & Leave Quotas (ว15/2561 & ระเบียบฯ 2555)', () => {
    it('returns exact round date range for Round 1 and Round 2', () => {
      const round1 = getEvaluationRoundDateRange(2570, 1);
      assert.equal(round1.startDate, '2026-10-01');
      assert.equal(round1.endDate, '2027-03-31');

      const round2 = getEvaluationRoundDateRange(2570, 2);
      assert.equal(round2.startDate, '2027-04-01');
      assert.equal(round2.endDate, '2027-09-30');
    });

    it('scopes PromotionRadarCard only to approved sick/personal leaves in current round', () => {
      const mockLeaves: LeaveRequestRecord[] = [
        // Round 1 leaves (in range)
        createMockLeaveRequest({
          id: 'r1-1',
          teacherId: 'TCH-008',
          leaveType: 'ลาป่วย',
          startDate: '2026-11-01',
          endDate: '2026-11-02',
          totalDays: 2,
          status: 'approved',
        }),
        createMockLeaveRequest({
          id: 'r1-2',
          teacherId: 'TCH-008',
          leaveType: 'ลากิจส่วนตัว',
          startDate: '2026-12-15',
          endDate: '2026-12-15',
          totalDays: 1,
          status: 'approved',
        }),
        // Pending leaves should NOT count towards approved salary promotion metrics
        createMockLeaveRequest({
          id: 'r1-3',
          teacherId: 'TCH-008',
          leaveType: 'ลากิจส่วนตัว',
          startDate: '2027-01-10',
          endDate: '2027-01-10',
          totalDays: 1,
          status: 'pending',
        }),
        // Round 2 leave should NOT count towards Round 1
        createMockLeaveRequest({
          id: 'r2-1',
          teacherId: 'TCH-008',
          leaveType: 'ลาป่วย',
          startDate: '2027-05-10',
          endDate: '2027-05-12',
          totalDays: 3,
          status: 'approved',
        }),
        // Another teacher leave should NOT count
        createMockLeaveRequest({
          id: 'other-1',
          teacherId: 'TCH-003',
          leaveType: 'ลาป่วย',
          startDate: '2026-11-01',
          endDate: '2026-11-02',
          totalDays: 2,
          status: 'approved',
        }),
      ];

      const stats = calculateUserRoundLeaveStats(mockLeaves, { id: 'TCH-008' }, 2570, 1);
      assert.equal(stats.leaveCount, 2); // 2 approved leaves
      assert.equal(stats.sickPersonalDays, 3); // 2 + 1 days
      assert.equal(stats.isEligible, true);
    });

    it('flags ineligibility when leaveCount > 6 or days > 23 in round', () => {
      const excessiveLeaves: LeaveRequestRecord[] = Array.from({ length: 7 }, (_, i) =>
        createMockLeaveRequest({
          id: `ex-${i}`,
          teacherId: 'TCH-008',
          leaveType: 'ลาป่วย',
          startDate: `2026-11-${String(i + 1).padStart(2, '0')}`,
          endDate: `2026-11-${String(i + 1).padStart(2, '0')}`,
          totalDays: 1,
          status: 'approved',
        })
      );

      const stats = calculateUserRoundLeaveStats(excessiveLeaves, { id: 'TCH-008' }, 2570, 1);
      assert.equal(stats.leaveCount, 7);
      assert.equal(stats.sickPersonalDays, 7);
      assert.equal(stats.isEligible, false);
    });

    it('caps personal leave at 15 days for first-year appointee (STF-002) vs 45 days for senior', () => {
      const seniorQuota = calculateUserFiscalLeaveQuota([], { id: 'TCH-008' }, 2570, false, false);
      assert.equal(seniorQuota.personalLeaveMax, 45);
      assert.equal(seniorQuota.hasVacation, false);

      const firstYearQuota = calculateUserFiscalLeaveQuota([], { id: 'STF-002' }, 2570, true, true);
      assert.equal(firstYearQuota.personalLeaveMax, 15);
      assert.equal(firstYearQuota.hasVacation, true);
    });

    it('verifies vacation leave eligibility for Director and year-round staff', () => {
      assert.equal(isEligibleForVacation('ผู้อำนวยการโรงเรียน'), true);
      assert.equal(isEligibleForVacation('รองผู้อำนวยการสถานศึกษา'), true);
      assert.equal(isEligibleForVacation('เจ้าหน้าที่ธุรการโรงเรียน'), true);
      assert.equal(isEligibleForVacation('นักการภารโรง'), true);
      assert.equal(isEligibleForVacation('ครู คศ. 1'), false);
      assert.equal(isEligibleForVacation('ครูชำนาญการพิเศษ'), false);
      assert.equal(isEligibleForVacation('ครูผู้ช่วย'), false);
    });
  });
});
