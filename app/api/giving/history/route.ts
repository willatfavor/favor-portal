import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { blackbaudClient } from '@/lib/blackbaud/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user from our database to find their Blackbaud constituent ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('blackbaud_constituent_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.blackbaud_constituent_id) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch giving history from Blackbaud (using mock data)
    const gifts = await blackbaudClient.getGiftsByConstituentId(userData.blackbaud_constituent_id);

    // Format the response
    const formattedGifts = gifts.map(gift => ({
      id: gift.id,
      amount: gift.amount,
      date: gift.date,
      designation: gift.designation,
      type: gift.type,
      campaign: gift.campaign,
    }));

    // Calculate totals
    const totalGiven = formattedGifts.reduce((sum, g) => sum + g.amount, 0);
    const currentYear = new Date().getFullYear();
    const ytdGiven = formattedGifts
      .filter(g => new Date(g.date).getFullYear() === currentYear)
      .reduce((sum, g) => sum + g.amount, 0);

    return NextResponse.json({
      success: true,
      gifts: formattedGifts,
      summary: {
        totalGiven,
        ytdGiven,
        giftCount: formattedGifts.length,
        yearsActive: currentYear - Math.min(...formattedGifts.map(g => new Date(g.date).getFullYear())) + 1,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Giving history route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
