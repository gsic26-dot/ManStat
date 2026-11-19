import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapAccessLevelToRole, isAdminRole, formatRoleTitle, getRoleBadgeConfig } from '../roles';

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
});
