import { NextResponse } from 'next/server';
import { dbGetTeachers, recordAuditLog } from '@/lib/db/serverDb';
import { mapAccessLevelToRole } from '@/lib/auth/roles';
import { createSessionToken, getAuthCookieOptions } from '@/lib/auth/sessionCookie';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Brute-Force Rate Limiter (Max 8 failed attempts within 15 minutes per IP + Identifier)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 8;
const failedLoginAttempts = new Map<string, { count: number; firstAttemptAt: number }>();

export function checkLoginRateLimit(key: string, now: number = Date.now()): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const entry = failedLoginAttempts.get(key);
  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    failedLoginAttempts.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    const remainingMs = RATE_LIMIT_WINDOW_MS - (now - entry.firstAttemptAt);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLoginAttempt(key: string, now: number = Date.now()): void {
  const entry = failedLoginAttempts.get(key);
  if (!entry || now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    failedLoginAttempts.set(key, { count: 1, firstAttemptAt: now });
  } else {
    entry.count += 1;
  }
}

export function clearFailedLoginAttempts(key: string): void {
  failedLoginAttempts.delete(key);
}

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

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `${clientIp}:${identifier}`;
    const rateCheck = checkLoginRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `พยายามเข้าสู่ระบบผิดพลาดเกินจำนวนครั้งที่กำหนด กรุณารอ ${Math.ceil(rateCheck.retryAfterSeconds / 60)} นาทีแล้วลองใหม่`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const teachers = await dbGetTeachers();

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
      matchedStaff = teachers.find(
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
      matchedStaff = teachers.find((t) => {
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
        recordFailedLoginAttempt(rateLimitKey);
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
        recordFailedLoginAttempt(rateLimitKey);
        recordAuditLog(
          'LOGIN_FAILED',
          matchedStaff.name || identifier,
          'teacher',
          'ระบบยืนยันตัวตน',
          `พยายามเข้าสู่ระบบไม่สำเร็จ (รหัสผ่านไม่ถูกต้อง) สำหรับผู้ใช้ ${identifier}`
        );
        return NextResponse.json(
          { success: false, error: 'รหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      }

      // Map real accessLevel from database to Role
      userRole = mapAccessLevelToRole(matchedStaff.accessLevel);
    }

    clearFailedLoginAttempts(rateLimitKey);

    const isRememberMe = Boolean(rememberMe);
    const userId = matchedStaff.id || matchedStaff.employeeCode || '';
    const sessionToken = createSessionToken(userId, userRole, isRememberMe);

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
      rememberMe: isRememberMe,
    });

    const cookieOptions = getAuthCookieOptions(request.headers, request.url, isRememberMe);

    // Set secure authentication cookies with actual role and user ID
    response.cookies.set('manstat_session_token', sessionToken, cookieOptions);
    response.cookies.set('manstat_auth_role', userRole, cookieOptions);
    response.cookies.set('manstat_user_id', userId, cookieOptions);

    return response;
  } catch (err: any) {
    console.error('[API /api/auth/login Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
