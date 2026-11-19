import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'ออกจากระบบเรียบร้อยแล้ว',
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const expireOptions = {
    path: '/',
    maxAge: 0,
    sameSite: 'lax' as const,
    secure: isProduction,
  };

  response.cookies.set('manstat_session_token', '', expireOptions);
  response.cookies.set('manstat_auth_role', '', expireOptions);
  response.cookies.set('manstat_user_id', '', expireOptions);

  return response;
}
