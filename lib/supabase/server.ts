import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createDisabledClient(): SupabaseClient<Database> {
  const emptyResult = { data: null, error: null };
  const resolved = Promise.resolve(emptyResult);

  const builder = {
    select: () => builder,
    order: () => builder,
    eq: () => builder,
    in: () => builder,
    maybeSingle: () => builder,
    single: () => builder,
    update: () => builder,
    insert: () => builder,
    upsert: () => builder,
    delete: () => builder,
    limit: () => builder,
    then: (onFulfilled?: (value: typeof emptyResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
      resolved.then(onFulfilled, onRejected),
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithOtp: async () => ({ data: null, error: null }),
      verifyOtp: async () => ({ data: { session: null, user: null }, error: { message: 'Supabase not configured' } }),
    },
    from: () => builder,
  } as unknown as SupabaseClient<Database>;
}

export async function createClient(): Promise<SupabaseClient<Database>> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createDisabledClient();
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
