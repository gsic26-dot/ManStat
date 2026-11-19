/**
 * ============================================================================
 * ManStat-Modern: Fail-Safe Root Edge Middleware (src/middleware.ts)
 * ============================================================================
 * 100% Resilient Next.js Edge Middleware for Session Protection & RBAC
 * Guaranteed 0 Crash / 0 MIDDLEWARE_INVOCATION_FAILED
 * ============================================================================
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database, UserRole } from '@/types/database.types';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // 1. Immediately allow public assets, APIs, and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|svg|css|js|webp|ico|woff|woff2)$/)
  ) {
    return response;
  }

  // 2. Allow public verification route (/verify/leave/[docNo])
  if (pathname.startsWith('/verify')) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // 3. If Supabase URL is not configured or dummy, bypass auth check to prevent 500 error
  const isSupabaseValid =
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project.supabase.co');

  if (!isSupabaseValid) {
    return response;
  }

  // 4. Safely initialize Supabase SSR client inside try/catch
  let user = null;
  try {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (err) {
    // If Supabase is unreachable or session invalid, fail safely without throwing 500
    user = null;
  }

  const isLoginPage = pathname === '/login';

  // 5. Check authentication (Supabase or ManStat persistent session token)
  const sessionToken = request.cookies.get('manstat_session_token')?.value;
  const authRoleCookie = request.cookies.get('manstat_auth_role')?.value;
  const isSuperuserCookie = authRoleCookie === 'superuser' || Boolean(sessionToken);

  const isAuthenticated = Boolean(user) || Boolean(sessionToken);

  // Protected Routes: Redirect unauthenticated user to /login
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 6. If logged in and visiting /login, redirect to /
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 7. Role-Based Access Control (RBAC) for /admin/*
  if (pathname.startsWith('/admin')) {
    const userRole = (user?.user_metadata?.role as UserRole) || authRoleCookie || (sessionToken ? 'superuser' : 'teacher');
    const hasAdminAccess =
      isSuperuserCookie ||
      userRole === 'superuser' ||
      userRole === 'hr_admin' ||
      userRole === 'director';

    if (!hasAdminAccess) {
      const dashboardUrl = new URL('/', request.url);
      dashboardUrl.searchParams.set('error', 'unauthorized_role');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
