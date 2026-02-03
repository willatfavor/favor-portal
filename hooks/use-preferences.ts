'use client';

import { useState, useEffect, useMemo } from 'react';
import { CommunicationPreferences } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface UsePreferencesReturn {
  preferences: CommunicationPreferences | null;
  isLoading: boolean;
  error: Error | null;
  updatePreferences: (updates: Partial<CommunicationPreferences>) => Promise<void>;
}

export function usePreferences(userId: string | undefined): UsePreferencesReturn {
  const [preferences, setPreferences] = useState<CommunicationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    const activeUserId = userId;

    async function fetchPreferences() {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('communication_preferences')
          .select('*')
          .eq('user_id', activeUserId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setPreferences({
            id: data.id,
            userId: data.user_id,
            emailNewsletterWeekly: data.email_newsletter_weekly,
            emailNewsletterMonthly: data.email_newsletter_monthly,
            emailQuarterlyReport: data.email_quarterly_report,
            emailAnnualReport: data.email_annual_report,
            emailEvents: data.email_events,
            emailPrayer: data.email_prayer,
            emailGivingConfirmations: data.email_giving_confirmations,
            smsEnabled: data.sms_enabled,
            smsGiftConfirmations: data.sms_gift_confirmations,
            smsEventReminders: data.sms_event_reminders,
            smsUrgentOnly: data.sms_urgent_only,
            mailEnabled: data.mail_enabled,
            mailNewsletterQuarterly: data.mail_newsletter_quarterly,
            mailAnnualReport: data.mail_annual_report,
            mailHolidayCard: data.mail_holiday_card,
            mailAppeals: data.mail_appeals,
            blackbaudSolicitCodes: data.blackbaud_solicit_codes,
            lastSyncedAt: data.last_synced_at || undefined,
            updatedAt: data.updated_at,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreferences();
  }, [userId, supabase]);

  async function updatePreferences(updates: Partial<CommunicationPreferences>) {
    if (!userId || !preferences) return;

    try {
      const { error } = await supabase
        .from('communication_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      throw err;
    }
  }

  return { preferences, isLoading, error, updatePreferences };
}
