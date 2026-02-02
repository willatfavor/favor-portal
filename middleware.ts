import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/verify',
  '/api/auth/magic-link',
  '/api/auth/verify',
  '/_next',
  '/static',
  '/favicon.ico',
];

export async function middleware(request: NextRequest) {
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

  // For portal routes, check authentication
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/giving') || 
      pathname.startsWith('/courses') || 
      pathname.startsWith('/profile') || 
      pathname.startsWith('/settings') ||
      pathname.startsWith('/foundation') ||
      pathname.startsWith('/church') ||
      pathname.startsWith('/daf') ||
      pathname.startsWith('/ambassador')) {
    
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
