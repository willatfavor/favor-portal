import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logError, logInfo } from '@/lib/logger';
import { hasAdminPermission, resolveAdminPermissions } from '@/lib/admin/roles';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const isDevBypass = process.env.NODE_ENV !== 'production' && !isSupabaseConfigured;
const VALID_SCOPES = ['portal', 'admin'] as const;
type AuthScope = (typeof VALID_SCOPES)[number];

function normalizeScope(scope: unknown): AuthScope {
  return VALID_SCOPES.includes(scope as AuthScope) ? (scope as AuthScope) : 'portal';
}

function sanitizeRedirectPath(redirectTo: unknown, scope: AuthScope): string {
  const fallback = scope === 'admin' ? '/admin' : '/dashboard';
  if (typeof redirectTo !== 'string') return fallback;
  if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) return fallback;
  if (scope === 'admin' && !redirectTo.startsWith('/admin')) return '/admin';
  return redirectTo;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`auth:magic-link:${ip}`, 6, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email : '';
    const scope = normalizeScope(body?.scope);
    const redirectTo = sanitizeRedirectPath(body?.redirectTo, scope);

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (isDevBypass) {
      logInfo({ event: 'auth.magic_link.dev_bypass', route: '/api/auth/magic-link' });
      return NextResponse.json(
        {
          success: true,
          message: 'Dev mode: magic link generated',
          devLink: `/verify?token=dev&scope=${scope}&redirect=${encodeURIComponent(redirectTo)}`,
        },
        { status: 200 }
      );
    }

    const supabase = await createClient();

    // Check if user exists
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .eq('email', email.toLowerCase())
      .single();

    if (!userData) {
      // Don't reveal whether email exists for security
      return NextResponse.json(
        { success: true, message: 'If an account exists, a magic link has been sent' }
      );
    }

    if (scope === 'admin') {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role_key')
        .eq('user_id', userData.id);
      const roles = (roleData ?? []).map((row) => row.role_key);
      const permissions = resolveAdminPermissions(Boolean(userData.is_admin), roles);
      if (!hasAdminPermission('admin:access', permissions)) {
        return NextResponse.json(
          { success: true, message: 'If an admin account exists, a magic link has been sent' }
        );
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const verifyUrl = new URL('/verify', appUrl);
    verifyUrl.searchParams.set('scope', scope);
    verifyUrl.searchParams.set('redirect', redirectTo);

    // Generate magic link using Supabase
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: verifyUrl.toString(),
      },
    });

    if (error) {
      logError({
        event: 'auth.magic_link.supabase_failed',
        route: '/api/auth/magic-link',
        details: { email: email.toLowerCase() },
        error,
      });
      return NextResponse.json(
        { error: 'Failed to generate magic link' },
        { status: 500 }
      );
    }

    // If using email provider, the email is sent by Supabase
    // Optionally, we can send a custom email here if needed
    // For now, we'll rely on Supabase's built-in email

    logInfo({
      event: 'auth.magic_link.sent',
      route: '/api/auth/magic-link',
      details: { email: email.toLowerCase(), scope, redirectTo },
    });

    return NextResponse.json(
      { success: true, message: 'Magic link sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    logError({ event: 'auth.magic_link.route_failed', route: '/api/auth/magic-link', error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
