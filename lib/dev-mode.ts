export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const isDevBypass = process.env.NODE_ENV !== 'production' && !isSupabaseConfigured;
