import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { loadDatabase } from '@/lib/db/serverDb';
import { mapAccessLevelToRole } from '@/lib/auth/roles';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('manstat_session_token')?.value;
    const userId = cookieStore.get('manstat_user_id')?.value;
    const authRoleCookie = cookieStore.get('manstat_auth_role')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const db = loadDatabase();

    // 1. Master Superuser handling
    if (userId === 'EXE-001' || authRoleCookie === 'superuser') {
      const directorStaff = db.teachers.find(
        (t) => t.id === 'EXE-001' || t.employeeCode === 'EXE-001' || t.position.includes('ผู้อำนวยการ')
      );

      return NextResponse.json({
        success: true,
        user: {
          id: directorStaff?.id || 'EXE-001',
          employeeCode: directorStaff?.employeeCode || 'EXE-001',
          name: directorStaff?.name || 'นายธีรศักดิ์ มโนธรรม',
          fullName: directorStaff?.name || 'นายธีรศักดิ์ มโนธรรม',
          position: directorStaff?.position || 'ผู้อำนวยการสถานศึกษา',
          department: directorStaff?.department || 'บริหารสถานศึกษา',
          accessLevel: directorStaff?.accessLevel || 'Superuser',
          role: 'superuser',
          email: directorStaff?.email || 'superuser',
        },
      });
    }

    // 2. Lookup user from database by ID
    let currentStaff = db.teachers.find(
      (t) => t.id === userId || t.employeeCode === userId
    );

    if (!currentStaff) {
      // Fallback safe default user
      return NextResponse.json({
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
      });
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

    const response = NextResponse.json({
      success: true,
      user: userData,
    });

    // If database accessLevel changed since cookie was set, re-sync cookie immediately!
    if (authRoleCookie !== currentRole) {
      const isProduction = process.env.NODE_ENV === 'production';
      response.cookies.set('manstat_auth_role', currentRole, {
        path: '/',
        sameSite: 'lax',
        secure: isProduction,
      });
    }

    return response;
  } catch (err: any) {
    console.error('[API /api/auth/me Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
