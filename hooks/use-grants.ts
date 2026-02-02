'use client';

import { useState, useEffect } from 'react';
import { FoundationGrant } from '@/types';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

interface UseGrantsReturn {
  grants: FoundationGrant[];
  isLoading: boolean;
  error: Error | null;
  totalGranted: number;
  activeGrants: number;
}

export function useGrants(userId: string | undefined): UseGrantsReturn {
  const [grants, setGrants] = useState<FoundationGrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    const activeUserId = userId;

    async function fetchGrants() {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('foundation_grants')
          .select('*')
          .eq('user_id', activeUserId)
          .order('start_date', { ascending: false });

        if (error) throw error;

        setGrants(data?.map((g: Tables<'foundation_grants'>) => ({
          id: g.id,
          userId: g.user_id,
          grantName: g.grant_name,
          amount: Number(g.amount),
          startDate: g.start_date,
          endDate: g.end_date || undefined,
          status: g.status as any,
          nextReportDue: g.next_report_due || undefined,
          notes: g.notes || undefined,
          createdAt: g.created_at,
        })) || []);

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchGrants();
  }, [userId, supabase]);

  const totalGranted = grants.reduce((sum, g) => sum + g.amount, 0);
  const activeGrants = grants.filter(g => g.status === 'active').length;

  return { grants, isLoading, error, totalGranted, activeGrants };
}
