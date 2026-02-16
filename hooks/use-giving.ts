'use client';

import { useState, useEffect, useMemo } from 'react';
import { Gift, RecurringGift } from '@/types';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';
import { isDevBypass } from '@/lib/dev-mode';
import {
  getMockGiftsForUser,
  getMockRecurringGiftsForUser,
} from '@/lib/mock-store';

interface UseGivingReturn {
  gifts: Gift[];
  recurringGifts: RecurringGift[];
  isLoading: boolean;
  error: Error | null;
  totalGiven: number;
  ytdGiven: number;
  refresh: () => void;
}

export function useGiving(userId: string | undefined, refreshKey?: number): UseGivingReturn {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [recurringGifts, setRecurringGifts] = useState<RecurringGift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = () => setRefreshToken((value) => value + 1);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    const activeUserId = userId;

    async function fetchGiving() {
      try {
        setIsLoading(true);

        if (isDevBypass) {
          const mockGifts = getMockGiftsForUser(activeUserId);
          const combined = [...mockGifts].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const recurring = getMockRecurringGiftsForUser(activeUserId);
          setGifts(combined);
          setRecurringGifts(recurring);
          return;
        }

        // Fetch gifts
        const { data: giftsData, error: giftsError } = await supabase
          .from('giving_cache')
          .select('*')
          .eq('user_id', activeUserId)
          .order('gift_date', { ascending: false });

        if (giftsError) throw giftsError;

        // Fetch recurring gifts
        const { data: recurringData, error: recurringError } = await supabase
          .from('recurring_gifts')
          .select('*')
          .eq('user_id', activeUserId)
          .eq('status', 'active');

        if (recurringError) throw recurringError;

        setGifts(giftsData?.map((g: Tables<'giving_cache'>) => ({
          id: g.id,
          userId: g.user_id,
          amount: Number(g.amount),
          date: g.gift_date,
          designation: g.designation,
          blackbaudGiftId: g.blackbaud_gift_id || undefined,
          isRecurring: g.is_recurring,
          receiptSent: g.receipt_sent,
          source: (g.source as Gift["source"]) ?? "imported",
        })) || []);

        setRecurringGifts(recurringData?.map((r: Tables<'recurring_gifts'>) => ({
          id: r.id,
          userId: r.user_id,
          amount: Number(r.amount),
          frequency: r.frequency as RecurringGift["frequency"],
          nextChargeDate: r.next_charge_date,
          stripeSubscriptionId: r.stripe_subscription_id,
          status: r.status as RecurringGift["status"],
          createdAt: r.created_at,
        })) || []);

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchGiving();
  }, [userId, supabase, refreshKey, refreshToken]);

  const totalGiven = gifts.reduce((sum, g) => sum + g.amount, 0);
  
  const currentYear = new Date().getFullYear();
  const ytdGiven = gifts
    .filter(g => new Date(g.date).getFullYear() === currentYear)
    .reduce((sum, g) => sum + g.amount, 0);

  return { gifts, recurringGifts, isLoading, error, totalGiven, ytdGiven, refresh };
}
