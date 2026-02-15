export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          blackbaud_constituent_id: string | null;
          constituent_type: string;
          lifetime_giving_total: number;
          rdd_assignment: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
          last_login: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          blackbaud_constituent_id?: string | null;
          constituent_type: string;
          lifetime_giving_total?: number;
          rdd_assignment?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
          last_login?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          blackbaud_constituent_id?: string | null;
          constituent_type?: string;
          lifetime_giving_total?: number;
          rdd_assignment?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
          last_login?: string | null;
        };
        Relationships: [];
      };
      giving_cache: {
        Row: {
          id: string;
          user_id: string;
          gift_date: string;
          amount: number;
          designation: string;
          blackbaud_gift_id: string | null;
          is_recurring: boolean;
          receipt_sent: boolean;
          synced_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gift_date: string;
          amount: number;
          designation: string;
          blackbaud_gift_id?: string | null;
          is_recurring?: boolean;
          receipt_sent?: boolean;
          synced_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gift_date?: string;
          amount?: number;
          designation?: string;
          blackbaud_gift_id?: string | null;
          is_recurring?: boolean;
          receipt_sent?: boolean;
          synced_at?: string;
        };
        Relationships: [];
      };
      recurring_gifts: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          frequency: string;
          next_charge_date: string;
          stripe_subscription_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          frequency: string;
          next_charge_date: string;
          stripe_subscription_id: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          frequency?: string;
          next_charge_date?: string;
          stripe_subscription_id?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      communication_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_newsletter_weekly: boolean;
          email_newsletter_monthly: boolean;
          email_quarterly_report: boolean;
          email_annual_report: boolean;
          email_events: boolean;
          email_prayer: boolean;
          email_giving_confirmations: boolean;
          sms_enabled: boolean;
          sms_gift_confirmations: boolean;
          sms_event_reminders: boolean;
          sms_urgent_only: boolean;
          mail_enabled: boolean;
          mail_newsletter_quarterly: boolean;
          mail_annual_report: boolean;
          mail_holiday_card: boolean;
          mail_appeals: boolean;
          blackbaud_solicit_codes: string[];
          last_synced_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_newsletter_weekly?: boolean;
          email_newsletter_monthly?: boolean;
          email_quarterly_report?: boolean;
          email_annual_report?: boolean;
          email_events?: boolean;
          email_prayer?: boolean;
          email_giving_confirmations?: boolean;
          sms_enabled?: boolean;
          sms_gift_confirmations?: boolean;
          sms_event_reminders?: boolean;
          sms_urgent_only?: boolean;
          mail_enabled?: boolean;
          mail_newsletter_quarterly?: boolean;
          mail_annual_report?: boolean;
          mail_holiday_card?: boolean;
          mail_appeals?: boolean;
          blackbaud_solicit_codes?: string[];
          last_synced_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_newsletter_weekly?: boolean;
          email_newsletter_monthly?: boolean;
          email_quarterly_report?: boolean;
          email_annual_report?: boolean;
          email_events?: boolean;
          email_prayer?: boolean;
          email_giving_confirmations?: boolean;
          sms_enabled?: boolean;
          sms_gift_confirmations?: boolean;
          sms_event_reminders?: boolean;
          sms_urgent_only?: boolean;
          mail_enabled?: boolean;
          mail_newsletter_quarterly?: boolean;
          mail_annual_report?: boolean;
          mail_holiday_card?: boolean;
          mail_appeals?: boolean;
          blackbaud_solicit_codes?: string[];
          last_synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          thumbnail_url: string | null;
          access_level: string;
          sort_order: number;
          status: string;
          is_locked: boolean;
          is_paid: boolean;
          price: number;
          tags: string[];
          cover_image: string | null;
          enforce_sequential: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          thumbnail_url?: string | null;
          access_level?: string;
          sort_order?: number;
          status?: string;
          is_locked?: boolean;
          is_paid?: boolean;
          price?: number;
          tags?: string[];
          cover_image?: string | null;
          enforce_sequential?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          thumbnail_url?: string | null;
          access_level?: string;
          sort_order?: number;
          status?: string;
          is_locked?: boolean;
          is_paid?: boolean;
          price?: number;
          tags?: string[];
          cover_image?: string | null;
          enforce_sequential?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      course_modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          cloudflare_video_id: string;
          sort_order: number;
          duration_seconds: number;
          module_type: string;
          resource_url: string | null;
          notes: string | null;
          quiz_payload: Json | null;
          pass_threshold: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          cloudflare_video_id: string;
          sort_order?: number;
          duration_seconds?: number;
          module_type?: string;
          resource_url?: string | null;
          notes?: string | null;
          quiz_payload?: Json | null;
          pass_threshold?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          cloudflare_video_id?: string;
          sort_order?: number;
          duration_seconds?: number;
          module_type?: string;
          resource_url?: string | null;
          notes?: string | null;
          quiz_payload?: Json | null;
          pass_threshold?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_course_progress: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          completed: boolean;
          completed_at: string | null;
          watch_time_seconds: number;
          last_watched_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          module_id: string;
          completed?: boolean;
          completed_at?: string | null;
          watch_time_seconds?: number;
          last_watched_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          module_id?: string;
          completed?: boolean;
          completed_at?: string | null;
          watch_time_seconds?: number;
          last_watched_at?: string | null;
        };
        Relationships: [];
      };
      user_course_notes: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module_id: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          module_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_course_certificates: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          completion_rate: number;
          issued_at: string;
          certificate_url: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          completion_rate?: number;
          issued_at?: string;
          certificate_url?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          completion_rate?: number;
          issued_at?: string;
          certificate_url?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      foundation_grants: {
        Row: {
          id: string;
          user_id: string;
          grant_name: string;
          amount: number;
          start_date: string;
          end_date: string | null;
          status: string;
          next_report_due: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          grant_name: string;
          amount: number;
          start_date: string;
          end_date?: string | null;
          status: string;
          next_report_due?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          grant_name?: string;
          amount?: number;
          start_date?: string;
          end_date?: string | null;
          status?: string;
          next_report_due?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      onboarding_surveys: {
        Row: {
          id: string;
          user_id: string;
          how_heard: string | null;
          rdd_contact: string | null;
          interests: string[];
          church_connection: boolean;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          how_heard?: string | null;
          rdd_contact?: string | null;
          interests?: string[];
          church_connection?: boolean;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          how_heard?: string | null;
          rdd_contact?: string | null;
          interests?: string[];
          church_connection?: boolean;
          completed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      constituent_type: 'individual' | 'major_donor' | 'church' | 'foundation' | 'daf' | 'ambassador' | 'volunteer';
      gift_frequency: 'monthly' | 'quarterly' | 'annual';
      recurring_status: 'active' | 'paused' | 'cancelled';
      grant_status: 'pending' | 'approved' | 'active' | 'completed' | 'rejected';
    };
  };
}
