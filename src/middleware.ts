/**
 * ============================================================================
 * ManStat-Modern: Root Edge Middleware (src/middleware.ts)
 * ============================================================================
 * Next.js Edge Middleware for Session Protection & Role-Based Access Control (RBAC):
 * 1. Public Routes:
 *    - /login (Authentication page)
 *    - /verify/* (Public leave certificate verification via QR code per พ.ร.บ. การปฏิบัติราชการทางอิเล็กทรอนิกส์ พ.ศ. 2565)
 *    - Static assets (_next, favicon.ico, images)
 * 2. Protected Routes:
 *    - / (Executive Dashboard)
 *    - /leave/* (Official leave forms & print views)
 *    - /admin/* (Restricted strictly to 'hr_admin' and 'director')
 * 3. PDPA & Session Security:
 *    - Automatically refreshes session tokens via @supabase/ssr.
 *    - Redirects unauthenticated users to /login with redirect callback.
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

  // 1. Allow public assets and API paths immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|svg|css|js|webp)$/)
  ) {
    return response;
  }

  // 2. Allow public verification route (/verify/leave/[docNo])
  if (pathname.startsWith('/verify')) {
    return response;
  }

  // 3. Initialize Supabase SSR Client for cookie-based auth token refreshing
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
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
    }
  );

  // 4. Retrieve current user and session
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    // In dev/demo environment without active Supabase credentials, do not hard-crash
    user = null;
  }

  const isLoginPage = pathname === '/login';

  // In production with configured Supabase credentials
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co';

  // 5. Handle unauthenticated access to protected routes
  if (isSupabaseConfigured && !user && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 6. Handle authenticated users trying to access login page
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 7. Role-Based Access Control (RBAC) for /admin/*
  if (pathname.startsWith('/admin')) {
    const userRole = (user?.user_metadata?.role as UserRole) || 'teacher';
    const hasAdminAccess = userRole === 'hr_admin' || userRole === 'director';

    if (isSupabaseConfigured && !hasAdminAccess) {
      // Forbidden: Redirect regular teachers back to main dashboard
      const dashboardUrl = new URL('/', request.url);
      dashboardUrl.searchParams.set('error', 'unauthorized_role');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
