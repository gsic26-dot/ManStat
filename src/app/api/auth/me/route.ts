import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbGetTeachers } from '@/lib/db/serverDb';
import { mapAccessLevelToRole } from '@/lib/auth/roles';
import { verifySessionToken, getAuthCookieOptions } from '@/lib/auth/sessionCookie';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('manstat_session_token')?.value;
    const cookieUserId = cookieStore.get('manstat_user_id')?.value;
    const authRoleCookie = cookieStore.get('manstat_auth_role')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const verification = verifySessionToken(sessionToken);
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const userId = cookieUserId || verification.payload?.uid;
    const teachers = await dbGetTeachers();

    // 1. Lookup user from database by userId as top priority
    let currentStaff = userId
      ? teachers.find((t) => t.id === userId || t.employeeCode === userId)
      : null;

    // 2. Master Bypass fallback ONLY if userId === 'EXE-001' and not found in table
    if (!currentStaff && userId === 'EXE-001') {
      const directorStaff = teachers.find((t) => t.position.includes('ผู้อำนวยการ'));
      currentStaff = directorStaff || {
        id: 'EXE-001',
        employeeCode: 'EXE-001',
        name: 'นายธีรศักดิ์ มโนธรรม',
        position: 'ผู้อำนวยการสถานศึกษา',
        department: 'บริหารสถานศึกษา',
        accessLevel: 'Superuser',
        academicStanding: 'เชี่ยวชาญพิเศษ',
        subjectGroup: 'บริหารสถานศึกษา',
        status: 'ปฏิบัติหน้าที่',
        role: 'superuser',
      } as any;
    }

    if (!currentStaff) {
      // Fallback safe default user
      return NextResponse.json(
        {
          success: true,
          user: {
            id: 'GUEST-001',
            name: 'ครูและบุคลากร',
            fullName: 'ครูและบุคลากร',
            position: 'ข้าราชการครู',
            department: 'กลุ่มสาระการเรียนรู้',
            accessLevel: 'User',
            role: 'teacher',
          },
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // Real-time role evaluation from active database
    const currentRole = mapAccessLevelToRole(currentStaff.accessLevel);

    const userData = {
      id: currentStaff.id,
      employeeCode: currentStaff.employeeCode,
      name: currentStaff.name,
      fullName: currentStaff.name,
      position: currentStaff.position,
      department: currentStaff.department,
      accessLevel: currentStaff.accessLevel || 'User',
      role: currentRole,
      email: currentStaff.email,
    };

    const response = NextResponse.json(
      {
        success: true,
        user: userData,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );

    // If database accessLevel changed since cookie was set, re-sync cookie immediately!
    if (authRoleCookie !== currentRole) {
      const isRememberMe = Boolean(verification.payload?.rem);
      const cookieOptions = getAuthCookieOptions(request.headers, request.url, isRememberMe);
      response.cookies.set('manstat_auth_role', currentRole, cookieOptions);
    }

    return response;
  } catch (err: any) {
    console.error('[API /api/auth/me Error]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
