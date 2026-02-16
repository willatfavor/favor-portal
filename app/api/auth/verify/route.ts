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
    const rateLimit = checkRateLimit(`auth:verify:${ip}`, 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json();
    const token = body?.token ?? body?.tokenHash;
    const scope = normalizeScope(body?.scope);
    const redirectTo = sanitizeRedirectPath(body?.redirectTo, scope);

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    if (isDevBypass) {
      logInfo({ event: 'auth.verify.dev_bypass', route: '/api/auth/verify' });
      return NextResponse.json(
        {
          success: true,
          scope,
          redirectTo,
          user: {
            id: 'dev-user',
            email: 'dev@favor.local',
          },
        },
        { status: 200 }
      );
    }

    const supabase = await createClient();

    // Exchange the token for a session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    });

    if (error) {
      logError({ event: 'auth.verify.invalid_token', route: '/api/auth/verify', error });
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'No session created' },
        { status: 500 }
      );
    }

    // Update last login timestamp and enforce admin scope when requested.
    if (data.user) {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);

      if (scope === 'admin') {
        const [{ data: userRow }, { data: roleRows }] = await Promise.all([
          supabase
            .from('users')
            .select('is_admin')
            .eq('id', data.user.id)
            .maybeSingle(),
          supabase
            .from('user_roles')
            .select('role_key')
            .eq('user_id', data.user.id),
        ]);

        const roles = (roleRows ?? []).map((row) => row.role_key);
        const permissions = resolveAdminPermissions(Boolean(userRow?.is_admin), roles);
        if (!hasAdminPermission('admin:access', permissions)) {
          await supabase.auth.signOut();
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }
      }
    }

    logInfo({
      event: 'auth.verify.success',
      route: '/api/auth/verify',
      userId: data.user?.id,
      details: { scope, redirectTo },
    });

    return NextResponse.json(
      { success: true, user: data.user, scope, redirectTo },
      { status: 200 }
    );
  } catch (error) {
    logError({ event: 'auth.verify.route_failed', route: '/api/auth/verify', error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
