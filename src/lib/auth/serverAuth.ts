/**
 * ============================================================================
 * ManStat: Server-Side Authentication Helper (serverAuth.ts)
 * ============================================================================
 * Verifies session cookies and RBAC permissions in Next.js Server Components
 * and Route Handlers.
 * ============================================================================
 */

import { cookies } from 'next/headers';
import { dbGetTeachers } from '@/lib/db/serverDb';
import { mapAccessLevelToRole, isAdminRole } from '@/lib/auth/roles';
import { verifySessionToken } from '@/lib/auth/sessionCookie';
import type { UserRole } from '@/types/database.types';

export interface AuthenticatedUser {
  id: string;
  employeeCode?: string;
  name: string;
  fullName: string;
  position: string;
  department?: string;
  accessLevel: string;
  role: UserRole;
  email?: string;
}

export interface SessionVerificationResult {
  authenticated: boolean;
  user: AuthenticatedUser | null;
  error?: string;
}

/**
 * Extracts session tokens and verifies against active teacher records.
 */
export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('manstat_session_token')?.value;
    const cookieUserId = cookieStore.get('manstat_user_id')?.value;
    const roleCookie = cookieStore.get('manstat_auth_role')?.value;

    if (!sessionToken) {
      return null;
    }

    const verification = verifySessionToken(sessionToken);
    if (!verification.valid) {
      return null;
    }

    // SECURITY: Always prioritize cryptographically verified payload.uid over plaintext cookie
    const userId = verification.payload?.uid || cookieUserId;
    const teachers = await dbGetTeachers();

    // 1. Lookup staff in database by userId as highest priority
    if (userId) {
      const teacher = teachers.find(
        (t) => t.id === userId || t.employeeCode === userId
      );

      if (teacher) {
        const realRole = mapAccessLevelToRole(teacher.accessLevel);
        return {
          id: teacher.id,
          employeeCode: teacher.employeeCode,
          name: teacher.name,
          fullName: teacher.name,
          position: teacher.position,
          department: teacher.department,
          accessLevel: teacher.accessLevel || 'User',
          role: realRole,
          email: teacher.email,
        };
      }

      // 2. Master Superuser Session check (fallback ONLY if userId is explicitly EXE-001)
      if (userId === 'EXE-001') {
        const superuserStaff = teachers.find(
          (t) => t.id === 'EXE-001' || t.employeeCode === 'EXE-001' || t.position.includes('ผู้อำนวยการ')
        );
        return {
          id: superuserStaff?.id || 'EXE-001',
          employeeCode: superuserStaff?.employeeCode || 'EXE-001',
          name: superuserStaff?.name || 'นายธีรศักดิ์ มโนธรรม',
          fullName: superuserStaff?.name || 'นายธีรศักดิ์ มโนธรรม',
          position: superuserStaff?.position || 'ผู้อำนวยการสถานศึกษา',
          department: superuserStaff?.department || 'บริหารสถานศึกษา',
          accessLevel: superuserStaff?.accessLevel || 'Superuser',
          role: 'superuser',
          email: superuserStaff?.email || 'superuser',
        };
      }
    }

    // Fallback if userId not provided but session token exists: default to regular teacher
    return {
      id: 'GUEST-001',
      name: 'ครูและบุคลากร',
      fullName: 'ครูและบุคลากร',
      position: 'ข้าราชการครู',
      accessLevel: 'User',
      role: 'teacher',
    };
  } catch (err) {
    console.warn('[getSessionUser] Error verifying session:', err);
    return null;
  }
}

/**
 * Enforces admin authorization on Route Handlers.
 * Returns the authenticated admin user or null if unauthorized.
 */
export async function verifyAdminSession(): Promise<{
  authorized: boolean;
  user: AuthenticatedUser | null;
  error?: string;
  status: number;
}> {
  const user = await getSessionUser();

  if (!user) {
    return {
      authorized: false,
      user: null,
      error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ',
      status: 401,
    };
  }

  if (!isAdminRole(user.role)) {
    return {
      authorized: false,
      user,
      error: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้ (เฉพาะผู้ดูแลระบบเท่านั้น)',
      status: 403,
    };
  }

  return {
    authorized: true,
    user,
    status: 200,
  };
}
