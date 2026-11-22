import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canViewSensitiveData,
  maskPhoneNumber,
  formatPDPAProtectedLeaveReason,
} from '@/lib/auth/roles';
import { INITIAL_TEACHERS } from '@/lib/data/schoolData';
import { translateAuditAction } from '@/lib/regulations/audit-translation';

describe('PDPA Sensitive Data Protection & Permission Matrix', () => {
  const targetStaff = {
    id: 'staff-123',
    employeeCode: 'TCH-005',
    email: 'somchai@school.ac.th',
    name: 'นายสมชาย ใจดี',
  };

  describe('1. canViewSensitiveData Permission Matrix', () => {
    it('allows Data Owner (isSelf) by ID match', () => {
      const user = { id: 'staff-123', role: 'teacher' };
      const res = canViewSensitiveData(user, targetStaff);
      assert.equal(res.allowed, true);
      assert.equal(res.isSelf, true);
    });

    it('allows Data Owner (isSelf) by employeeCode match', () => {
      const user = { id: 'other-id', employeeCode: 'TCH-005', role: 'teacher' };
      const res = canViewSensitiveData(user, targetStaff);
      assert.equal(res.allowed, true);
      assert.equal(res.isSelf, true);
    });

    it('allows Data Owner (isSelf) by email match', () => {
      const user = { id: 'other-id', email: 'somchai@school.ac.th', role: 'teacher' };
      const res = canViewSensitiveData(user, targetStaff);
      assert.equal(res.allowed, true);
      assert.equal(res.isSelf, true);
    });

    it('allows Authorized Roles to view any staff (superuser, director, hr_admin)', () => {
      const superuser = { id: 'admin-1', role: 'superuser' };
      const director = { id: 'dir-1', role: 'director' };
      const hrAdmin = { id: 'hr-1', role: 'hr_admin' };

      assert.equal(canViewSensitiveData(superuser, targetStaff).allowed, true);
      assert.equal(canViewSensitiveData(director, targetStaff).allowed, true);
      assert.equal(canViewSensitiveData(hrAdmin, targetStaff).allowed, true);
    });

    it('allows Authorized Roles with case-insensitive and legacy accessLevel format', () => {
      const legacySuper = { id: 'u1', accessLevel: 'Superuser' };
      const legacyAdmin = { id: 'u2', accessLevel: 'Admin' };
      const legacyDirector = { id: 'u3', accessLevel: 'Director' };

      assert.equal(canViewSensitiveData(legacySuper, targetStaff).allowed, true);
      assert.equal(canViewSensitiveData(legacyAdmin, targetStaff).allowed, true);
      assert.equal(canViewSensitiveData(legacyDirector, targetStaff).allowed, true);
    });

    it('STRICTLY BLOCKS unauthorized third-party users from viewing other staff data', () => {
      const otherTeacher = { id: 'staff-999', employeeCode: 'TCH-099', email: 'other@school.ac.th', role: 'teacher' };
      assert.equal(canViewSensitiveData(otherTeacher, targetStaff).allowed, false);

      const guestUser = { id: 'guest-1', role: 'user' };
      assert.equal(canViewSensitiveData(guestUser, targetStaff).allowed, false);

      assert.equal(canViewSensitiveData(null, targetStaff).allowed, false);
      assert.equal(canViewSensitiveData(undefined, targetStaff).allowed, false);
    });
  });

  describe('2. Phone Number Masking (maskPhoneNumber)', () => {
    it('masks 10-digit phone number correctly as 0xx-***-xxxx', () => {
      assert.equal(maskPhoneNumber('0812345678'), '081-***-5678');
      assert.equal(maskPhoneNumber('0991234567'), '099-***-4567');
    });

    it('handles phone numbers already containing dashes', () => {
      assert.equal(maskPhoneNumber('081-234-5678'), '081-***-5678');
    });

    it('handles 9-digit landline numbers safely', () => {
      assert.equal(maskPhoneNumber('021234567'), '02-***-4567');
    });

    it('handles empty, null, or undefined phone values gracefully', () => {
      assert.equal(maskPhoneNumber(''), '-');
      assert.equal(maskPhoneNumber(null as any), '-');
      assert.equal(maskPhoneNumber(undefined as any), '-');
    });
  });

  describe('3. PDPA Section 26: Sick Leave Medical Reason Masking (formatPDPAProtectedLeaveReason)', () => {
    const sickLeaveReq = {
      id: 'req-001',
      staffId: 'staff-123',
      leave_type: 'ลาป่วย',
      reason: 'มีอาการไข้หวัดใหญ่ สายพันธุ์ A แพทย์สั่งพักฟื้น 3 วัน',
    };

    const personalLeaveReq = {
      id: 'req-002',
      staffId: 'staff-123',
      leave_type: 'ลากิจส่วนตัว',
      reason: 'ไปติดต่อธุรกรรมราชการที่สำนักงานที่ดิน',
    };

    it('preserves non-sick leave reasons for all users (not health data)', () => {
      const normalUser = { id: 'staff-999', role: 'teacher' };
      const formatted = formatPDPAProtectedLeaveReason(personalLeaveReq, normalUser, 'teacher');
      assert.equal(formatted, 'ไปติดต่อธุรกรรมราชการที่สำนักงานที่ดิน');
    });

    it('masks sick leave reasons as "ข้อมูลส่วนบุคคล (PDPA)" for third parties', () => {
      const otherTeacher = { id: 'staff-999', role: 'teacher' };
      const formatted = formatPDPAProtectedLeaveReason(sickLeaveReq, otherTeacher, 'teacher');
      assert.equal(formatted, 'ข้อมูลส่วนบุคคล (PDPA)');
    });

    it('reveals plaintext sick leave reasons to Data Owner', () => {
      const owner = { id: 'staff-123', role: 'teacher' };
      const formatted = formatPDPAProtectedLeaveReason(sickLeaveReq, owner, 'teacher');
      assert.equal(formatted, 'มีอาการไข้หวัดใหญ่ สายพันธุ์ A แพทย์สั่งพักฟื้น 3 วัน');
    });

    it('reveals plaintext sick leave reasons to Authorized Approvers (Director, HR Admin, Superuser)', () => {
      const director = { id: 'dir-1', role: 'director' };
      assert.equal(
        formatPDPAProtectedLeaveReason(sickLeaveReq, director, 'director'),
        'มีอาการไข้หวัดใหญ่ สายพันธุ์ A แพทย์สั่งพักฟื้น 3 วัน'
      );

      const hrAdmin = { id: 'hr-1', role: 'hr_admin' };
      assert.equal(
        formatPDPAProtectedLeaveReason(sickLeaveReq, hrAdmin, 'hr_admin'),
        'มีอาการไข้หวัดใหญ่ สายพันธุ์ A แพทย์สั่งพักฟื้น 3 วัน'
      );

      const superuser = { id: 'super-1', role: 'superuser' };
      assert.equal(
        formatPDPAProtectedLeaveReason(sickLeaveReq, superuser, 'superuser'),
        'มีอาการไข้หวัดใหญ่ สายพันธุ์ A แพทย์สั่งพักฟื้น 3 วัน'
      );
    });
  });

  describe('4. Staff Directory 13-Digit Citizen ID Completeness', () => {
    it('verifies all 15 staff members in INITIAL_TEACHERS possess non-empty 13-digit idCard', () => {
      assert.equal(INITIAL_TEACHERS.length, 15);

      for (const staff of INITIAL_TEACHERS) {
        assert.ok(staff.idCard, `Staff ${staff.employeeCode} (${staff.name}) must have idCard`);
        const cleanDigits = staff.idCard.replace(/[^0-9]/g, '');
        assert.equal(
          cleanDigits.length,
          13,
          `Staff ${staff.employeeCode} (${staff.name}) idCard "${staff.idCard}" must be 13 digits`
        );
      }
    });
  });

  describe('5. Audit Action Categorization for PDPA Events', () => {
    it('classifies PDPA unmasking events under sensitive category', () => {
      const unmaskSelf = translateAuditAction('PDPA_UNMASK_SELF');
      assert.equal(unmaskSelf.category, 'sensitive');
      assert.equal(unmaskSelf.title, 'เปิดดูข้อมูลส่วนบุคคลตนเอง');

      const unmaskOther = translateAuditAction('PDPA_UNMASK_OTHER');
      assert.equal(unmaskOther.category, 'sensitive');
      assert.equal(unmaskOther.title, 'เปิดดูข้อมูลส่วนบุคคลผู้อื่น (งานบุคคล)');

      const viewSalary = translateAuditAction('VIEW_FINANCIAL_SALARY_DATA');
      assert.equal(viewSalary.category, 'sensitive');
      assert.equal(viewSalary.title, 'เปิดดูข้อมูลเงินเดือน (PDPA)');
    });
  });
});
