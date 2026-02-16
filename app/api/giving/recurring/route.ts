import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDevBypass } from '@/lib/dev-mode';
import { 
  getMockRecurringGifts, 
  setMockRecurringGifts,
  getMockRecurringGiftsForUser 
} from '@/lib/mock-store';
import { RecurringGift } from '@/types';
import { logError, logInfo } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    if (isDevBypass) {
      // Get userId from query param in dev mode
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId') || 'mock-user-id';
      const gifts = getMockRecurringGiftsForUser(userId);
      return NextResponse.json({ success: true, gifts }, { status: 200 });
    }

    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: gifts, error } = await supabase
      .from('recurring_gifts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, gifts: gifts || [] }, { status: 200 });
  } catch (error) {
    logError({ event: 'giving.recurring.fetch_failed', route: '/api/giving/recurring', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, frequency } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (!frequency || !['monthly', 'quarterly', 'annual'].includes(frequency)) {
      return NextResponse.json({ error: 'Valid frequency is required' }, { status: 400 });
    }

    if (isDevBypass) {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId') || 'mock-user-id';
      
      const newGift: RecurringGift = {
        id: `rec-${Date.now()}`,
        userId,
        amount,
        frequency,
        nextChargeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stripeSubscriptionId: `mock-sub-${Date.now()}`,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const existing = getMockRecurringGifts();
      setMockRecurringGifts([...existing, newGift]);

      return NextResponse.json({ success: true, gift: newGift }, { status: 201 });
    }

    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate next charge date based on frequency
    const now = new Date();
    const nextChargeDate = new Date();
    
    switch (frequency) {
      case 'monthly':
        nextChargeDate.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        nextChargeDate.setMonth(now.getMonth() + 3);
        break;
      case 'annual':
        nextChargeDate.setFullYear(now.getFullYear() + 1);
        break;
    }

    const { data: gift, error } = await supabase
      .from('recurring_gifts')
      .insert({
        user_id: session.user.id,
        amount,
        frequency,
        next_charge_date: nextChargeDate.toISOString(),
        stripe_subscription_id: `pending-${Date.now()}`, // Will be updated by Stripe webhook
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    logInfo({
      event: 'giving.recurring.created',
      route: '/api/giving/recurring',
      userId: session.user.id,
      details: { frequency, amount },
    });

    return NextResponse.json({ success: true, gift }, { status: 201 });
  } catch (error) {
    logError({ event: 'giving.recurring.create_failed', route: '/api/giving/recurring', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
