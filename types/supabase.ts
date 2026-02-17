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
          onboarding_required: boolean;
          onboarding_completed_at: string | null;
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
          onboarding_required?: boolean;
          onboarding_completed_at?: string | null;
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
          onboarding_required?: boolean;
          onboarding_completed_at?: string | null;
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
          source: string;
          note: string | null;
          created_at: string;
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
          source?: string;
          note?: string | null;
          created_at?: string;
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
          source?: string;
          note?: string | null;
          created_at?: string;
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
          report_period: string;
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
          report_period?: string;
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
          report_period?: string;
          blackbaud_solicit_codes?: string[];
          last_synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_profile_details: {
        Row: {
          id: string;
          user_id: string;
          street: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          street?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          street?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_giving_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          deadline: string;
          category: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          deadline: string;
          category?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          current_amount?: number;
          deadline?: string;
          category?: string;
          description?: string | null;
          created_at?: string;
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
          publish_at: string | null;
          unpublish_at: string | null;
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
          publish_at?: string | null;
          unpublish_at?: string | null;
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
          publish_at?: string | null;
          unpublish_at?: string | null;
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
          verification_token: string | null;
          certificate_number: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          completion_rate?: number;
          issued_at?: string;
          certificate_url?: string | null;
          verification_token?: string | null;
          certificate_number?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          completion_rate?: number;
          issued_at?: string;
          certificate_url?: string | null;
          verification_token?: string | null;
          certificate_number?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_key: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      course_versions: {
        Row: {
          id: string;
          course_id: string;
          version_number: number;
          snapshot: Json;
          published: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          version_number: number;
          snapshot: Json;
          published?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          version_number?: number;
          snapshot?: Json;
          published?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          module_id: string;
          attempt_number: number;
          score_percent: number;
          correct_answers: number;
          total_questions: number;
          passed: boolean;
          answers: Json;
          question_order: string[];
          option_order: Json;
          started_at: string;
          submitted_at: string;
          duration_seconds: number;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          module_id: string;
          attempt_number: number;
          score_percent: number;
          correct_answers?: number;
          total_questions?: number;
          passed?: boolean;
          answers?: Json;
          question_order?: string[];
          option_order?: Json;
          started_at?: string;
          submitted_at?: string;
          duration_seconds?: number;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          module_id?: string;
          attempt_number?: number;
          score_percent?: number;
          correct_answers?: number;
          total_questions?: number;
          passed?: boolean;
          answers?: Json;
          question_order?: string[];
          option_order?: Json;
          started_at?: string;
          submitted_at?: string;
          duration_seconds?: number;
          metadata?: Json;
        };
        Relationships: [];
      };
      course_module_events: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          module_id: string;
          event_type: string;
          watch_time_seconds: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          module_id: string;
          event_type: string;
          watch_time_seconds?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          module_id?: string;
          event_type?: string;
          watch_time_seconds?: number;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      course_cohorts: {
        Row: {
          id: string;
          course_id: string;
          name: string;
          description: string | null;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          name: string;
          description?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          name?: string;
          description?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_cohort_members: {
        Row: {
          id: string;
          cohort_id: string;
          user_id: string;
          membership_role: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          cohort_id: string;
          user_id: string;
          membership_role?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          cohort_id?: string;
          user_id?: string;
          membership_role?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      course_discussion_threads: {
        Row: {
          id: string;
          course_id: string;
          cohort_id: string | null;
          module_id: string | null;
          author_user_id: string;
          title: string;
          body: string;
          pinned: boolean;
          locked: boolean;
          reply_count: number;
          last_activity_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          cohort_id?: string | null;
          module_id?: string | null;
          author_user_id: string;
          title: string;
          body: string;
          pinned?: boolean;
          locked?: boolean;
          reply_count?: number;
          last_activity_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          cohort_id?: string | null;
          module_id?: string | null;
          author_user_id?: string;
          title?: string;
          body?: string;
          pinned?: boolean;
          locked?: boolean;
          reply_count?: number;
          last_activity_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_discussion_replies: {
        Row: {
          id: string;
          thread_id: string;
          author_user_id: string;
          body: string;
          is_instructor_reply: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          author_user_id: string;
          body: string;
          is_instructor_reply?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          author_user_id?: string;
          body?: string;
          is_instructor_reply?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      portal_content: {
        Row: {
          id: string;
          title: string;
          excerpt: string;
          body: string;
          type: string;
          access_level: string;
          status: string;
          author: string;
          tags: string[];
          cover_image: string | null;
          file_url: string | null;
          published_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          excerpt: string;
          body: string;
          type: string;
          access_level: string;
          status?: string;
          author?: string;
          tags?: string[];
          cover_image?: string | null;
          file_url?: string | null;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          excerpt?: string;
          body?: string;
          type?: string;
          access_level?: string;
          status?: string;
          author?: string;
          tags?: string[];
          cover_image?: string | null;
          file_url?: string | null;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          id: string;
          requester_user_id: string | null;
          requester_name: string | null;
          requester_email: string | null;
          category: string;
          subject: string;
          message: string;
          status: string;
          priority: string;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          requester_user_id?: string | null;
          requester_name?: string | null;
          requester_email?: string | null;
          category: string;
          subject: string;
          message: string;
          status?: string;
          priority?: string;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          requester_user_id?: string | null;
          requester_name?: string | null;
          requester_email?: string | null;
          category?: string;
          subject?: string;
          message?: string;
          status?: string;
          priority?: string;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      support_messages: {
        Row: {
          id: string;
          ticket_id: string;
          sender: string;
          sender_user_id: string | null;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          sender: string;
          sender_user_id?: string | null;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          sender?: string;
          sender_user_id?: string | null;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      communication_templates: {
        Row: {
          id: string;
          channel: string;
          name: string;
          subject: string | null;
          content: string;
          status: string;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel: string;
          name: string;
          subject?: string | null;
          content: string;
          status?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          channel?: string;
          name?: string;
          subject?: string | null;
          content?: string;
          status?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      communication_send_logs: {
        Row: {
          id: string;
          template_id: string | null;
          template_name: string;
          channel: string;
          recipient: string | null;
          sent_by: string | null;
          status: string;
          metadata: Json;
          sent_at: string;
        };
        Insert: {
          id?: string;
          template_id?: string | null;
          template_name: string;
          channel: string;
          recipient?: string | null;
          sent_by?: string | null;
          status?: string;
          metadata?: Json;
          sent_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string | null;
          template_name?: string;
          channel?: string;
          recipient?: string | null;
          sent_by?: string | null;
          status?: string;
          metadata?: Json;
          sent_at?: string;
        };
        Relationships: [];
      };
      portal_activity_events: {
        Row: {
          id: string;
          type: string;
          user_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          user_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          user_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      portal_dashboard_overrides: {
        Row: {
          id: string;
          role_key: string;
          highlights: Json;
          actions: Json;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          role_key: string;
          highlights?: Json;
          actions?: Json;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role_key?: string;
          highlights?: Json;
          actions?: Json;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
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
