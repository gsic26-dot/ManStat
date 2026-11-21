import { NextResponse } from 'next/server';
import { getClearCookieOptions } from '@/lib/auth/sessionCookie';

export async function POST(request: Request) {
  const response = NextResponse.json({
    success: true,
    message: 'ออกจากระบบเรียบร้อยแล้ว',
  });

  const expireOptions = getClearCookieOptions(request.headers, request.url);

  response.cookies.set('manstat_session_token', '', expireOptions);
  response.cookies.set('manstat_auth_role', '', expireOptions);
  response.cookies.set('manstat_user_id', '', expireOptions);

  return response;
}
