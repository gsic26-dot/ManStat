/**
 * ============================================================================
 * ManStat: Role-Based Access Control (RBAC) Standards (roles.ts)
 * ============================================================================
 * Single Source of Truth for Role Mapping across Client and Server:
 * - 'Superuser'  -> 'superuser'  (Full root access to all modules and configurations)
 * - 'Admin'      -> 'hr_admin'   (HR Admin, staff registry, leave approvals, board)
 * - 'Director'   -> 'director'   (School executive, read-all, executive sign-off)
 * - 'User'       -> 'teacher'    (Default safe fallback for regular teaching & support staff)
 * ============================================================================
 */

import type { UserRole } from '@/types/database.types';
import type { TeacherRecord } from '@/lib/data/schoolData';
import { getStaffBranch } from '@/lib/regulations/staff-sorting';

/**
 * Maps database/staff accessLevel string to standard UserRole.
 * Safety Guarantee: Defaults to 'teacher' on missing or unrecognized values.
 * NEVER fallbacks to 'superuser'.
 */
export function mapAccessLevelToRole(accessLevel?: string | null): UserRole {
  if (!accessLevel) return 'teacher';

  const clean = accessLevel.trim().toLowerCase();

  if (clean === 'superuser' || clean.includes('superuser') || clean === 'root') {
    return 'superuser';
  }
  if (clean === 'admin' || clean.includes('admin') || clean === 'hr_admin') {
    return 'hr_admin';
  }
  if (clean === 'director' || clean.includes('director') || clean.includes('ผู้อำนวยการ')) {
    return 'director';
  }

  // Safe default: regular teacher/staff
  return 'teacher';
}

/**
 * Checks whether the given role has administrative access (Admin Center /admin).
 * Only 'superuser', 'hr_admin', and 'director' are permitted.
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return role === 'superuser' || role === 'hr_admin' || role === 'director';
}

/**
 * Formats user role for readable Thai UI labels.
 */
export function formatRoleTitle(role?: string | null): string {
  switch (role) {
    case 'superuser':
      return 'ผู้ดูแลระบบสูงสุด (Superuser)';
    case 'director':
      return 'ผู้อำนวยการสถานศึกษา (Director)';
    case 'hr_admin':
      return 'เจ้าหน้าที่บริหารงานบุคคล (Admin)';
    case 'teacher':
    default:
      return 'ครูและบุคลากรทั่วไป (User)';
  }
}

/**
 * Visual badge styling configuration for user roles.
 */
export function getRoleBadgeConfig(role?: string | null): {
  label: string;
  shortLabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  initial: string;
} {
  switch (role) {
    case 'superuser':
      return {
        label: 'Superuser',
        shortLabel: 'ROOT',
        bgClass: 'bg-amber-500/15',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-500/30',
        initial: 'S',
      };
    case 'director':
      return {
        label: 'Director',
        shortLabel: 'EXEC',
        bgClass: 'bg-purple-500/15',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-500/30',
        initial: 'D',
      };
    case 'hr_admin':
      return {
        label: 'Admin',
        shortLabel: 'ADMIN',
        bgClass: 'bg-sky-500/15',
        textClass: 'text-sky-700 dark:text-sky-300',
        borderClass: 'border-sky-500/30',
        initial: 'A',
      };
    case 'teacher':
    default:
      return {
        label: 'User',
        shortLabel: 'USER',
        bgClass: 'bg-slate-500/15',
        textClass: 'text-slate-700 dark:text-slate-300',
        borderClass: 'border-slate-500/30',
        initial: 'U',
      };
  }
}

/**
 * Checks whether the current user is authorized to view and manage salary promotion records.
 * Permitted:
 * - 'superuser'
 * - 'director'
 * - 'hr_admin'
 * - Staff members heading or assigned to the HR / Personnel department ('บริหารงานบุคคล')
 * Explicitly BLOCKED:
 * - Support staff ('office' / 'เจ้าหน้าที่ธุรการ', 'นักการภารโรง', 'พี่เลี้ยงเด็กพิการ', 'support')
 * - Regular teachers outside of HR
 */
export function canManageSalaryPromotions(
  role?: string | null,
  position?: string | null,
  department?: string | null
): boolean {
  if (!role) return false;
  const cleanRole = role.toLowerCase().trim();
  if (cleanRole === 'superuser' || cleanRole === 'director' || cleanRole === 'hr_admin') {
    return true;
  }
  const pos = (position || '').toLowerCase().trim();
  const dept = (department || '').toLowerCase().trim();

  // Strict safety block for support staff and non-civil servant positions
  if (
    pos.includes('ธุรการ') ||
    pos.includes('นักการ') ||
    pos.includes('ภารโรง') ||
    pos.includes('พี่เลี้ยง') ||
    pos.includes('ลูกจ้าง') ||
    pos.includes('จ้างเหมา')
  ) {
    return false;
  }

  // Personnel / HR department staff
  if (
    dept.includes('บริหารงานบุคคล') ||
    dept.includes('งานบุคคล') ||
    pos.includes('บริหารงานบุคคล') ||
    pos.includes('หัวหน้าฝ่ายบริหารงานบุคคล') ||
    pos.includes('เจ้าหน้าที่บริหารงานบุคคล')
  ) {
    return true;
  }

  return false;
}

/**
 * Determines if a staff member is an eligible civil servant for government salary promotions
 * (ข้าราชการครูและบุคลากรทางการศึกษา: ผู้อำนวยการสถานศึกษา, ครูชำนาญการพิเศษ, ครูชำนาญการ, ครู คศ. 1, ครูผู้ช่วย).
 * Excludes support, contract, and non-civil servant staff (เจ้าหน้าที่ธุรการ, นักการภารโรง, พี่เลี้ยงเด็กพิการ, ลูกจ้าง).
 */
export function isCivilServantForSalary(staff: TeacherRecord): boolean {
  // 1. Explicit exclusion: Support, service, and contract positions are never civil servants
  const pos = staff.position || '';
  if (
    pos.includes('พี่เลี้ยง') ||
    pos.includes('ธุรการ') ||
    pos.includes('นักการ') ||
    pos.includes('ภารโรง') ||
    pos.includes('ลูกจ้าง') ||
    pos.includes('จ้างเหมา') ||
    pos.includes('คนครัว') ||
    pos.includes('ยาม') ||
    pos.includes('ขับรถ')
  ) {
    return false;
  }

  // 2. Strict schema-level check if employment_type or employmentType is specified
  const empType = staff.employment_type || (staff as any).employmentType;
  if (empType) {
    return empType === 'civil_servant';
  }

  // 3. Fallback heuristic for legacy records without employment_type
  const branch = getStaffBranch(staff);
  if (branch === 'support') return false;

  return branch === 'management' || branch === 'teaching';
}

/**
 * Evaluates whether a user can unmask sensitive personal data (Citizen ID, phone number, salary, etc.)
 * based on PDPA rules:
 * - Data Owner (isSelf): Always allowed (can view own data)
 * - Authorized Roles: 'superuser', 'director', 'hr_admin' are allowed to unmask any staff
 * - Other Users: Blocked from unmasking other people's data
 */
export function canViewSensitiveData(
  currentUser?: { id?: string; employeeCode?: string; email?: string; role?: string; accessLevel?: string; position?: string; department?: string } | null,
  targetStaff?: { id?: string; employeeCode?: string; email?: string } | null
): { allowed: boolean; isSelf: boolean; reason?: string } {
  if (!currentUser) {
    return { allowed: false, isSelf: false, reason: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' };
  }

  // 1. Check self-ownership bypass (Data Owner)
  const currentId = (currentUser.id || '').trim();
  const currentCode = (currentUser.employeeCode || '').trim();
  const currentEmail = (currentUser.email || '').trim().toLowerCase();

  const targetId = (targetStaff?.id || '').trim();
  const targetCode = (targetStaff?.employeeCode || '').trim();
  const targetEmail = (targetStaff?.email || '').trim().toLowerCase();

  const isSelf = Boolean(
    (targetId && (currentId === targetId || currentCode === targetId)) ||
    (targetCode && (currentCode === targetCode || currentId === targetCode)) ||
    (targetEmail && currentEmail && currentEmail === targetEmail)
  );

  if (isSelf) {
    return { allowed: true, isSelf: true };
  }

  // 2. Check authorized administrative roles (Case-insensitive)
  const cleanRole = (currentUser.role || currentUser.accessLevel || '').toLowerCase().trim();
  const isAuthorizedRole =
    cleanRole === 'superuser' ||
    cleanRole === 'director' ||
    cleanRole === 'hr_admin' ||
    cleanRole === 'admin' ||
    cleanRole === 'root';

  // Check HR department personnel
  const pos = (currentUser.position || '').toLowerCase();
  const dept = (currentUser.department || '').toLowerCase();
  const isHrPersonnel =
    (dept.includes('บริหารงานบุคคล') || pos.includes('บริหารงานบุคคล')) &&
    !pos.includes('ธุรการ') && !pos.includes('ภารโรง') && !pos.includes('พี่เลี้ยง');

  if (isAuthorizedRole || isHrPersonnel) {
    return { allowed: true, isSelf: false };
  }

  return {
    allowed: false,
    isSelf: false,
    reason: 'สงวนสิทธิ์เฉพาะเจ้าของข้อมูลและงานบุคคล',
  };
}

/**
 * Masks a personal phone number for PDPA protection (e.g. 099-***-2233)
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || phone.trim() === '' || phone === '-') return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-***-${clean.slice(6)}`;
  }
  if (clean.length === 9) {
    return `${clean.slice(0, 2)}-***-${clean.slice(5)}`;
  }
  if (clean.length >= 6) {
    return `${clean.slice(0, 3)}-***-${clean.slice(-3)}`;
  }
  return '0xx-***-xxxx';
}

/**
 * Protects sensitive medical / health data in leave requests (PDPA Section 26).
 * Sick leave reasons are masked as "ข้อมูลส่วนบุคคล (PDPA)" unless viewed by
 * the Data Owner, Approver (Director), or HR Admin.
 */
export function formatPDPAProtectedLeaveReason(
  req: { teacherId?: string; staffId?: string; leaveType?: string; leave_type?: string; reason?: string },
  currentUser?: { id?: string; employeeCode?: string; email?: string; role?: string; accessLevel?: string } | null,
  currentRole?: string
): string {
  if (!req.reason || req.reason.trim() === '') return '-';

  const leaveTypeStr = req.leaveType || req.leave_type || '';
  const isSickLeave =
    leaveTypeStr.includes('ป่วย') ||
    leaveTypeStr.toLowerCase().includes('sick');

  if (!isSickLeave) {
    return req.reason;
  }

  // Check Owner
  const currentId = currentUser?.id || '';
  const currentCode = currentUser?.employeeCode || '';
  const targetId = req.teacherId || req.staffId || '';
  const isOwner = Boolean(
    targetId &&
    (currentId === targetId || currentCode === targetId)
  );

  if (isOwner) {
    return req.reason;
  }

  // Check Approver / HR Admin
  const role = (currentRole || currentUser?.role || currentUser?.accessLevel || '').toLowerCase().trim();
  const isApproverOrAdmin =
    role === 'superuser' || role === 'director' || role === 'hr_admin' || role === 'admin' || role === 'root';

  if (isApproverOrAdmin) {
    return req.reason;
  }

  return 'ข้อมูลส่วนบุคคล (PDPA)';
}
