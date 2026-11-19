/**
 * ============================================================================
 * ManStat-Modern: Role-Based Access Control (RBAC) Standards (roles.ts)
 * ============================================================================
 * Single Source of Truth for Role Mapping across Client and Server:
 * - 'Superuser'  -> 'superuser'  (Full root access to all modules and configurations)
 * - 'Admin'      -> 'hr_admin'   (HR Admin, staff registry, leave approvals, board)
 * - 'Director'   -> 'director'   (School executive, read-all, executive sign-off)
 * - 'User'       -> 'teacher'    (Default safe fallback for regular teaching & support staff)
 * ============================================================================
 */

import type { UserRole } from '@/types/database.types';

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
