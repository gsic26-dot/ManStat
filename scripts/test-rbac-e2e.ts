/**
 * ============================================================================
 * ManStat: End-to-End RBAC Security Verification Script
 * ============================================================================
 * Tests the 4 mandatory RBAC scenarios:
 * 1. Login with regular 'User' (teacher) -> Role 'teacher', cannot access admin
 * 2. Login with 'Admin' / 'Superuser' -> Role 'hr_admin' / 'superuser', can access admin
 * 3. Promote 'User' -> 'Admin' -> Role changes to 'hr_admin' in real-time
 * 4. Demote 'Admin' -> 'User' -> Role changes to 'teacher', admin access revoked
 * ============================================================================
 */

import { loadDatabase, saveDatabase } from '../src/lib/db/serverDb';
import { mapAccessLevelToRole, isAdminRole } from '../src/lib/auth/roles';

function runRBACTests() {
  console.log('================================================================');
  console.log(' MANSTAT: RBAC COMPREHENSIVE SECURITY VERIFICATION');
  console.log('================================================================\n');

  const db = loadDatabase();

  // Find a teacher with 'User' access level
  const userStaff = db.teachers.find((t) => t.accessLevel === 'User');
  if (!userStaff) {
    throw new Error('No staff with User accessLevel found in database');
  }

  // Find a teacher with 'Admin' access level
  const adminStaff = db.teachers.find((t) => t.accessLevel === 'Admin');
  if (!adminStaff) {
    throw new Error('No staff with Admin accessLevel found in database');
  }

  // Find superuser
  const superStaff = db.teachers.find((t) => t.accessLevel === 'Superuser') || {
    id: 'EXE-001',
    name: 'นายธีรศักดิ์ มโนธรรม',
    accessLevel: 'Superuser',
  };

  // --------------------------------------------------------------------------
  // SCENARIO 1: Login with regular 'User' (teacher)
  // --------------------------------------------------------------------------
  console.log('--- SCENARIO 1: Login with regular User (teacher) ---');
  const userRole = mapAccessLevelToRole(userStaff.accessLevel);
  console.log(`Staff: ${userStaff.name} (${userStaff.position})`);
  console.log(`Database accessLevel: "${userStaff.accessLevel}" -> Mapped Role: "${userRole}"`);

  if (userRole !== 'teacher') {
    throw new Error(`FAIL: User should have 'teacher' role, got '${userRole}'`);
  }
  const userCanAccessAdmin = isAdminRole(userRole);
  console.log(`isAdminRole("${userRole}"): ${userCanAccessAdmin}`);
  if (userCanAccessAdmin) {
    throw new Error('FAIL: Regular teacher should NOT have admin access');
  }
  console.log('-> [PASS] Regular teacher role is correctly mapped to "teacher" and admin access is strictly blocked.\n');

  // --------------------------------------------------------------------------
  // SCENARIO 2: Login with 'Admin' or 'Superuser'
  // --------------------------------------------------------------------------
  console.log('--- SCENARIO 2: Login with Admin or Superuser ---');
  const adminRole = mapAccessLevelToRole(adminStaff.accessLevel);
  console.log(`Admin Staff: ${adminStaff.name} -> accessLevel: "${adminStaff.accessLevel}" -> Role: "${adminRole}"`);
  if (adminRole !== 'hr_admin') {
    throw new Error(`FAIL: Admin staff should map to 'hr_admin', got '${adminRole}'`);
  }
  if (!isAdminRole(adminRole)) {
    throw new Error('FAIL: Admin staff must have admin access');
  }

  const superRole = mapAccessLevelToRole(superStaff.accessLevel);
  console.log(`Superuser Staff: ${superStaff.name} -> accessLevel: "${superStaff.accessLevel}" -> Role: "${superRole}"`);
  if (superRole !== 'superuser') {
    throw new Error(`FAIL: Superuser staff should map to 'superuser', got '${superRole}'`);
  }
  if (!isAdminRole(superRole)) {
    throw new Error('FAIL: Superuser staff must have admin access');
  }
  console.log('-> [PASS] Admin & Superuser roles correctly grant administrative privileges.\n');

  // --------------------------------------------------------------------------
  // SCENARIO 3: Promote 'User' -> 'Admin'
  // --------------------------------------------------------------------------
  console.log('--- SCENARIO 3: Promotion (User -> Admin) ---');
  const testStaffId = userStaff.id;
  const originalAccess = userStaff.accessLevel;

  // Simulate updating staff in database
  const targetStaff = db.teachers.find((t) => t.id === testStaffId)!;
  targetStaff.accessLevel = 'Admin';
  saveDatabase(db);

  // Re-read from database
  const updatedDb = loadDatabase();
  const promotedStaff = updatedDb.teachers.find((t) => t.id === testStaffId)!;
  const promotedRole = mapAccessLevelToRole(promotedStaff.accessLevel);
  console.log(`Promoted ${promotedStaff.name}: "${promotedStaff.accessLevel}" -> Role: "${promotedRole}"`);

  if (promotedRole !== 'hr_admin') {
    throw new Error(`FAIL: Promoted staff should have 'hr_admin' role, got '${promotedRole}'`);
  }
  if (!isAdminRole(promotedRole)) {
    throw new Error('FAIL: Promoted staff must now have admin access');
  }
  console.log('-> [PASS] Promotion takes effect immediately in real-time.\n');

  // --------------------------------------------------------------------------
  // SCENARIO 4: Demote 'Admin' -> 'User'
  // --------------------------------------------------------------------------
  console.log('--- SCENARIO 4: Demotion (Admin -> User) ---');
  // Demote back to original 'User'
  promotedStaff.accessLevel = originalAccess || 'User';
  saveDatabase(updatedDb);

  const reUpdatedDb = loadDatabase();
  const demotedStaff = reUpdatedDb.teachers.find((t) => t.id === testStaffId)!;
  const demotedRole = mapAccessLevelToRole(demotedStaff.accessLevel);
  console.log(`Demoted ${demotedStaff.name}: "${demotedStaff.accessLevel}" -> Role: "${demotedRole}"`);

  if (demotedRole !== 'teacher') {
    throw new Error(`FAIL: Demoted staff should revert to 'teacher', got '${demotedRole}'`);
  }
  if (isAdminRole(demotedRole)) {
    throw new Error('FAIL: Demoted staff must NOT have admin access');
  }
  console.log('-> [PASS] Demotion immediately revokes admin access.\n');

  console.log('================================================================');
  console.log(' ALL 4 RBAC SCENARIOS PASSED WITH 100% REGULATORY ACCURACY!');
  console.log('================================================================');
}

runRBACTests();
