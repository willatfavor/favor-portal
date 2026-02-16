'use client';

import { useState, useEffect, useMemo } from 'react';
import { CommunicationPreferences } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { isDevBypass } from '@/lib/dev-mode';
import {
  getMockPreferences,
  getMockPreferencesForUser,
  setMockPreferences,
} from '@/lib/mock-store';
import type { Tables } from '@/types/database';

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

  const buildDefaultPreferences = (activeUserId: string): CommunicationPreferences => ({
    id: `pref-${activeUserId}`,
    userId: activeUserId,
    emailNewsletterWeekly: true,
    emailNewsletterMonthly: true,
    emailQuarterlyReport: true,
    emailAnnualReport: true,
    emailEvents: true,
    emailPrayer: true,
    emailGivingConfirmations: true,
    smsEnabled: false,
    smsGiftConfirmations: false,
    smsEventReminders: false,
    smsUrgentOnly: false,
    mailEnabled: true,
    mailNewsletterQuarterly: true,
    mailAnnualReport: true,
    mailHolidayCard: true,
    mailAppeals: false,
    reportPeriod: 'quarterly',
    blackbaudSolicitCodes: [],
    updatedAt: new Date().toISOString(),
  });

  const mapPreferenceRow = (row: Tables<'communication_preferences'>): CommunicationPreferences => ({
    id: row.id,
    userId: row.user_id,
    emailNewsletterWeekly: row.email_newsletter_weekly,
    emailNewsletterMonthly: row.email_newsletter_monthly,
    emailQuarterlyReport: row.email_quarterly_report,
    emailAnnualReport: row.email_annual_report,
    emailEvents: row.email_events,
    emailPrayer: row.email_prayer,
    emailGivingConfirmations: row.email_giving_confirmations,
    smsEnabled: row.sms_enabled,
    smsGiftConfirmations: row.sms_gift_confirmations,
    smsEventReminders: row.sms_event_reminders,
    smsUrgentOnly: row.sms_urgent_only,
    mailEnabled: row.mail_enabled,
    mailNewsletterQuarterly: row.mail_newsletter_quarterly,
    mailAnnualReport: row.mail_annual_report,
    mailHolidayCard: row.mail_holiday_card,
    mailAppeals: row.mail_appeals,
    reportPeriod: row.report_period === 'annual' ? 'annual' : 'quarterly',
    blackbaudSolicitCodes: row.blackbaud_solicit_codes,
    lastSyncedAt: row.last_synced_at || undefined,
    updatedAt: row.updated_at,
  });

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    const activeUserId = userId;

    async function fetchPreferences() {
      try {
        setIsLoading(true);

        if (isDevBypass) {
          const mockPrefs = getMockPreferencesForUser(activeUserId);
          setPreferences(mockPrefs ?? buildDefaultPreferences(activeUserId));
          return;
        }

        const { data, error } = await supabase
          .from('communication_preferences')
          .select('*')
          .eq('user_id', activeUserId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setPreferences(mapPreferenceRow(data));
        } else {
          setPreferences(buildDefaultPreferences(activeUserId));
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
    if (!userId) return;

    const base = preferences ?? buildDefaultPreferences(userId);
    const next: CommunicationPreferences = {
      ...base,
      ...updates,
      userId,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isDevBypass) {
        const current = getMockPreferencesForUser(userId);
        if (current) {
          const all = getMockPreferences().map((entry) =>
            entry.userId === userId ? next : entry
          );
          setMockPreferences(all);
        } else {
          setMockPreferences([next, ...getMockPreferences()]);
        }
        setPreferences(next);
        return;
      }

      const { error } = await supabase
        .from('communication_preferences')
        .upsert({
          user_id: userId,
          email_newsletter_weekly: next.emailNewsletterWeekly,
          email_newsletter_monthly: next.emailNewsletterMonthly,
          email_quarterly_report: next.emailQuarterlyReport,
          email_annual_report: next.emailAnnualReport,
          email_events: next.emailEvents,
          email_prayer: next.emailPrayer,
          email_giving_confirmations: next.emailGivingConfirmations,
          sms_enabled: next.smsEnabled,
          sms_gift_confirmations: next.smsGiftConfirmations,
          sms_event_reminders: next.smsEventReminders,
          sms_urgent_only: next.smsUrgentOnly,
          mail_enabled: next.mailEnabled,
          mail_newsletter_quarterly: next.mailNewsletterQuarterly,
          mail_annual_report: next.mailAnnualReport,
          mail_holiday_card: next.mailHolidayCard,
          mail_appeals: next.mailAppeals,
          report_period: next.reportPeriod,
          blackbaud_solicit_codes: next.blackbaudSolicitCodes,
          updated_at: next.updatedAt,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setPreferences(next);
    } catch (err) {
      throw err;
    }
  }

  return { preferences, isLoading, error, updatePreferences };
}
