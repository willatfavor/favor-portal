import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMagicLinkEmail } from '@/lib/resend/client';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const isDevBypass = process.env.NODE_ENV !== 'production' && !isSupabaseConfigured;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (isDevBypass) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.json(
        {
          success: true,
          message: 'Dev mode: magic link generated',
          devLink: `${baseUrl}/verify?token=dev`,
        },
        { status: 200 }
      );
    }

    const supabase = await createClient();

    // Check if user exists
    const { data: userData } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (!userData) {
      // Don't reveal whether email exists for security
      return NextResponse.json(
        { success: true, message: 'If an account exists, a magic link has been sent' }
      );
    }

    // Generate magic link using Supabase
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      console.error('Supabase magic link error:', error);
      return NextResponse.json(
        { error: 'Failed to generate magic link' },
        { status: 500 }
      );
    }

    // If using email provider, the email is sent by Supabase
    // Optionally, we can send a custom email here if needed
    // For now, we'll rely on Supabase's built-in email

    return NextResponse.json(
      { success: true, message: 'Magic link sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Magic link route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
