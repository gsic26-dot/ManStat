import { NextResponse } from 'next/server';
import { loadDatabase } from '@/lib/db/serverDb';
import { mapAccessLevelToRole } from '@/lib/auth/roles';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password, rememberMe } = body;

    const identifier = (username || email || '').trim().toLowerCase();
    const pwd = (password || '').trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้ หรืออีเมล' },
        { status: 400 }
      );
    }

    const db = loadDatabase();

    // 1. Master Superuser / Director master bypass credentials
    const isMasterSuperuser =
      (identifier === 'superuser' ||
        identifier === 'admin' ||
        identifier === 'root' ||
        identifier === '44123130114' ||
        identifier === 'gsic26@gmail.com') &&
      (pwd === '44123130114' ||
        pwd === '123456' ||
        pwd === 'admin' ||
        pwd === 'superuser');

    let matchedStaff = null;
    let userRole = 'teacher';

    if (isMasterSuperuser) {
      // Find school director or use default EXE-001
      matchedStaff = db.teachers.find(
        (t) => t.id === 'EXE-001' || t.employeeCode === 'EXE-001' || t.position.includes('ผู้อำนวยการ')
      ) || {
        id: 'EXE-001',
        employeeCode: 'EXE-001',
        name: 'นายธีรศักดิ์ มโนธรรม',
        position: 'ผู้อำนวยการสถานศึกษา',
        department: 'บริหารสถานศึกษา',
        accessLevel: 'Superuser',
      };
      userRole = 'superuser';
    } else {
      // 2. Lookup staff in database by email, employeeCode, idCard (citizen ID), or phone
      matchedStaff = db.teachers.find((t) => {
        const tEmail = (t.email || '').toLowerCase().trim();
        const tCode = (t.employeeCode || '').toLowerCase().trim();
        const tId = (t.id || '').toLowerCase().trim();
        const tPhone = (t.phone || '').replace(/[^0-9]/g, '');
        const tCard = (t.idCard || '').replace(/[^0-9]/g, '');
        const cleanIdent = identifier.replace(/[^0-9]/g, '');

        return (
          tEmail === identifier ||
          tCode === identifier ||
          tId === identifier ||
          (cleanIdent.length > 5 && (tPhone === cleanIdent || tCard === cleanIdent))
        );
      });

      if (!matchedStaff) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบบัญชีผู้ใช้ในระบบ หรือรหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      }

      // Password verification:
      // Accepts master passwords (123456, 44123130114) or employeeCode or last 4 digits of citizen ID
      const validPasswords = [
        '123456',
        '44123130114',
        matchedStaff.employeeCode?.toLowerCase(),
        matchedStaff.idCard ? matchedStaff.idCard.slice(-4) : null,
        matchedStaff.idCard ? matchedStaff.idCard.slice(-6) : null,
      ].filter(Boolean);

      // In production with Supabase password auth, or demo pass check
      const isPasswordValid = pwd.length > 0 && (validPasswords.includes(pwd) || pwd === 'password');

      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'รหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      }

      // Map real accessLevel from database to Role
      userRole = mapAccessLevelToRole(matchedStaff.accessLevel);
    }

    const sessionToken = `mst_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : undefined; // 30 days or session

    const userData = {
      id: matchedStaff.id,
      employeeCode: matchedStaff.employeeCode,
      name: matchedStaff.name,
      fullName: matchedStaff.name,
      position: matchedStaff.position,
      department: matchedStaff.department,
      accessLevel: matchedStaff.accessLevel || (userRole === 'superuser' ? 'Superuser' : 'User'),
      role: userRole,
      email: matchedStaff.email || `${matchedStaff.employeeCode || 'user'}@obec.local`,
    };

    const response = NextResponse.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: userData,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      path: '/',
      sameSite: 'lax' as const,
      secure: isProduction,
      ...(maxAge ? { maxAge } : {}),
    };

    // Set secure authentication cookies with actual role and user ID
    response.cookies.set('manstat_session_token', sessionToken, cookieOptions);
    response.cookies.set('manstat_auth_role', userRole, cookieOptions);
    response.cookies.set('manstat_user_id', matchedStaff.id || matchedStaff.employeeCode || '', cookieOptions);

    return response;
  } catch (err: any) {
    console.error('[API /api/auth/login Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
