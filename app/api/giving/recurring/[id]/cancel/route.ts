import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDevBypass } from '@/lib/dev-mode';
import { getMockRecurringGifts, setMockRecurringGifts } from '@/lib/mock-store';
import { logError, logInfo } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isDevBypass) {
      const gifts = getMockRecurringGifts();
      const giftIndex = gifts.findIndex((g) => g.id === id);
      
      if (giftIndex === -1) {
        return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
      }

      gifts[giftIndex] = {
        ...gifts[giftIndex],
        status: 'cancelled',
      };

      setMockRecurringGifts(gifts);
      return NextResponse.json({ success: true, gift: gifts[giftIndex] }, { status: 200 });
    }

    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: gift, error } = await supabase
      .from('recurring_gifts')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    logInfo({
      event: 'giving.recurring.cancelled',
      route: '/api/giving/recurring/[id]/cancel',
      userId: session.user.id,
      details: { recurringGiftId: id },
    });

    return NextResponse.json({ success: true, gift }, { status: 200 });
  } catch (error) {
    logError({
      event: 'giving.recurring.cancel_failed',
      route: '/api/giving/recurring/[id]/cancel',
      error,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
