import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAdminPermission, resolveAdminPermissions } from '@/lib/admin/roles';
import type { AdminPermission } from '@/types';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const isDevBypass = process.env.NODE_ENV !== 'production' && !isSupabaseConfigured;

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/admin/login',
  '/verify',
  '/api/auth/magic-link',
  '/api/auth/verify',
  '/api/certificates/verify',
  '/certificates',
  '/_next',
  '/static',
  '/favicon.ico',
];

function requiredAdminPermission(pathname: string): AdminPermission {
  if (pathname.startsWith('/admin/users')) return 'users:manage';
  if (pathname.startsWith('/admin/courses')) return 'lms:manage';
  if (pathname.startsWith('/admin/content')) return 'content:manage';
  if (pathname.startsWith('/admin/communications')) return 'content:manage';
  if (pathname.startsWith('/admin/support')) return 'support:manage';
  return 'admin:access';
}

export async function proxy(request: NextRequest) {
  if (isDevBypass) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Check if this is a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if this is an API route (excluding auth routes which are public)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    // API routes need authentication check
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const [{ data: userRow, error: userError }, { data: roleRows }] = await Promise.all([
      supabase
        .from('users')
        .select('is_admin')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('user_roles')
        .select('role_key')
        .eq('user_id', session.user.id),
    ]);

    if (userError) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const roles = (roleRows ?? []).map((row) => row.role_key);
    const permissions = resolveAdminPermissions(Boolean(userRow?.is_admin), roles);
    if (!hasAdminPermission('admin:access', permissions)) {
      const adminLoginUrl = new URL('/admin/login', request.url);
      adminLoginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(adminLoginUrl);
    }

    const required = requiredAdminPermission(pathname);
    if (!hasAdminPermission(required, permissions)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
  }

  // For portal routes, check authentication
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/giving') || 
      pathname.startsWith('/courses') || 
      pathname.startsWith('/content') ||
      pathname.startsWith('/profile') || 
      pathname.startsWith('/settings') ||
      pathname.startsWith('/foundation') ||
      pathname.startsWith('/church') ||
      pathname.startsWith('/daf') ||
      pathname.startsWith('/ambassador') ||
      pathname.startsWith('/major-donor') ||
      pathname.startsWith('/volunteer') ||
      pathname.startsWith('/assistant')) {
    
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

  }

  return NextResponse.next();
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
