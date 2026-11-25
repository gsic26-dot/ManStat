import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mapAccessLevelToRole,
  isAdminRole,
  formatRoleTitle,
  getRoleBadgeConfig,
  sanitizeStaffForViewer,
  sanitizeLeaveForViewer,
} from '../roles';

describe('8. Role-Based Access Control (RBAC) Mapping & Security Standards', () => {
  it('should map Superuser to superuser', () => {
    assert.strictEqual(mapAccessLevelToRole('Superuser'), 'superuser');
    assert.strictEqual(mapAccessLevelToRole('superuser'), 'superuser');
    assert.strictEqual(mapAccessLevelToRole('Root'), 'superuser');
  });

  it('should map Admin to hr_admin', () => {
    assert.strictEqual(mapAccessLevelToRole('Admin'), 'hr_admin');
    assert.strictEqual(mapAccessLevelToRole('admin'), 'hr_admin');
    assert.strictEqual(mapAccessLevelToRole('HR_Admin'), 'hr_admin');
  });

  it('should map Director to director', () => {
    assert.strictEqual(mapAccessLevelToRole('Director'), 'director');
    assert.strictEqual(mapAccessLevelToRole('ผู้อำนวยการสถานศึกษา'), 'director');
  });

  it('CRITICAL SECURITY: should default User, empty, or unknown strings to teacher (NEVER superuser)', () => {
    assert.strictEqual(mapAccessLevelToRole('User'), 'teacher');
    assert.strictEqual(mapAccessLevelToRole(''), 'teacher');
    assert.strictEqual(mapAccessLevelToRole(null), 'teacher');
    assert.strictEqual(mapAccessLevelToRole(undefined), 'teacher');
    assert.strictEqual(mapAccessLevelToRole('Guest'), 'teacher');
    assert.strictEqual(mapAccessLevelToRole('RandomRole'), 'teacher');
  });

  it('should identify admin roles correctly', () => {
    assert.strictEqual(isAdminRole('superuser'), true);
    assert.strictEqual(isAdminRole('hr_admin'), true);
    assert.strictEqual(isAdminRole('director'), true);

    // Non-admin roles
    assert.strictEqual(isAdminRole('teacher'), false);
    assert.strictEqual(isAdminRole('user'), false);
    assert.strictEqual(isAdminRole(''), false);
    assert.strictEqual(isAdminRole(null), false);
    assert.strictEqual(isAdminRole(undefined), false);
  });

  it('should return appropriate visual badges', () => {
    const superBadge = getRoleBadgeConfig('superuser');
    assert.strictEqual(superBadge.shortLabel, 'ROOT');
    assert.strictEqual(superBadge.initial, 'S');

    const adminBadge = getRoleBadgeConfig('hr_admin');
    assert.strictEqual(adminBadge.shortLabel, 'ADMIN');

    const teacherBadge = getRoleBadgeConfig('teacher');
    assert.strictEqual(teacherBadge.shortLabel, 'USER');
  });

  it('Server-Side PDPA Sanitizer: strips 13-digit idCard, memberId, salary and masks phone for unauthorized viewers', () => {
    const sampleTeacher = {
      id: 'TCH-003',
      employeeCode: 'TCH-003',
      name: 'นายธวัชชัย เหลืองโอฬาร',
      position: 'ครูชำนาญการพิเศษ',
      idCard: '5310190033680',
      memberId: '5310190033680',
      maskedCitizenId: '5-3101-*****-**-0',
      phone: '06-2032-9458',
      salary: 42500,
    };

    // 1. Unauthenticated viewer -> must strip PII
    const unauthView = sanitizeStaffForViewer(sampleTeacher, null);
    assert.strictEqual(unauthView.idCard, '');
    assert.strictEqual(unauthView.memberId, '');
    assert.strictEqual(unauthView.phone, '062-***-9458');
    assert.strictEqual('salary' in unauthView, false);
    assert.strictEqual(unauthView.maskedCitizenId, '5-3101-*****-**-0');

    // 2. Another regular teacher -> must strip PII
    const otherTeacherView = sanitizeStaffForViewer(sampleTeacher, {
      id: 'TCH-008',
      employeeCode: 'TCH-008',
      role: 'teacher',
      accessLevel: 'User',
    });
    assert.strictEqual(otherTeacherView.idCard, '');
    assert.strictEqual(otherTeacherView.phone, '062-***-9458');

    // 3. Data Owner (Self) -> allowed full record
    const selfView = sanitizeStaffForViewer(sampleTeacher, {
      id: 'TCH-003',
      employeeCode: 'TCH-003',
      role: 'teacher',
      accessLevel: 'User',
    });
    assert.strictEqual(selfView.idCard, '5310190033680');
    assert.strictEqual(selfView.phone, '06-2032-9458');

    // 4. Authorized Admin / Director -> allowed full record
    const directorView = sanitizeStaffForViewer(sampleTeacher, {
      id: 'EXE-001',
      role: 'director',
      accessLevel: 'Director',
    });
    assert.strictEqual(directorView.idCard, '5310190033680');
  });

  it('Server-Side PDPA Sanitizer: masks sick leave medical reasons for third parties while preserving for owner and admin', () => {
    const sickLeave = {
      id: 'LEV-2570-001',
      teacherId: 'TCH-005',
      leaveType: 'sick',
      reason: 'ผ่าตัดไส้ติ่งอักเสบที่โรงพยาบาลมหาราช',
    };

    // Third-party regular teacher -> masked
    const thirdPartyLeave = sanitizeLeaveForViewer(sickLeave, {
      id: 'TCH-009',
      role: 'teacher',
    });
    assert.strictEqual(thirdPartyLeave.reason, 'ข้อมูลส่วนบุคคล (PDPA)');

    // Leave Owner -> unmasked
    const ownerLeave = sanitizeLeaveForViewer(sickLeave, {
      id: 'TCH-005',
      role: 'teacher',
    });
    assert.strictEqual(ownerLeave.reason, 'ผ่าตัดไส้ติ่งอักเสบที่โรงพยาบาลมหาราช');

    // HR Admin -> unmasked
    const adminLeave = sanitizeLeaveForViewer(sickLeave, {
      id: 'TCH-007',
      role: 'hr_admin',
    });
    assert.strictEqual(adminLeave.reason, 'ผ่าตัดไส้ติ่งอักเสบที่โรงพยาบาลมหาราช');
  });
});
