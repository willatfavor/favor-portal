-- Portal and admin data-plane migration
-- Adds dynamic content, support desk storage, communication templates/send logs,
-- portal activity events, and enriches giving records for real one-time giving flow.

-- Extend giving cache with portal-origin metadata.
ALTER TABLE giving_cache
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('portal', 'imported', 'admin')) DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE giving_cache
SET source = COALESCE(source, 'imported')
WHERE source IS NULL;

ALTER TABLE giving_cache
  ALTER COLUMN source SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_giving_cache_source ON giving_cache(source);
CREATE INDEX IF NOT EXISTS idx_giving_cache_created_at ON giving_cache(created_at DESC);

-- Dynamic portal content managed by admin.
CREATE TABLE IF NOT EXISTS portal_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('report', 'update', 'resource', 'prayer', 'story')),
  access_level TEXT NOT NULL CHECK (
    access_level IN ('all', 'partner', 'major_donor', 'church', 'foundation', 'daf', 'ambassador', 'volunteer')
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author TEXT NOT NULL DEFAULT 'Favor International',
  tags TEXT[] NOT NULL DEFAULT '{}',
  cover_image TEXT,
  file_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_content_status ON portal_content(status);
CREATE INDEX IF NOT EXISTS idx_portal_content_type ON portal_content(type);
CREATE INDEX IF NOT EXISTS idx_portal_content_access ON portal_content(access_level);
CREATE INDEX IF NOT EXISTS idx_portal_content_published_at ON portal_content(published_at DESC);

ALTER TABLE portal_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accessible portal content" ON portal_content;
CREATE POLICY "Users can view accessible portal content" ON portal_content
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (published_at IS NULL OR published_at <= NOW())
    AND (
      access_level = 'all'
      OR EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
          AND (
            u.is_admin
            OR (access_level = 'partner' AND u.constituent_type IN ('individual', 'major_donor', 'church', 'foundation', 'daf', 'ambassador', 'volunteer'))
            OR (access_level = 'major_donor' AND u.constituent_type IN ('major_donor', 'foundation'))
            OR (access_level = 'church' AND u.constituent_type = 'church')
            OR (access_level = 'foundation' AND u.constituent_type = 'foundation')
            OR (access_level = 'daf' AND u.constituent_type = 'daf')
            OR (access_level = 'ambassador' AND u.constituent_type = 'ambassador')
            OR (access_level = 'volunteer' AND u.constituent_type = 'volunteer')
          )
      )
    )
  );

DROP POLICY IF EXISTS "Content managers can manage portal content" ON portal_content;
CREATE POLICY "Content managers can manage portal content" ON portal_content
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'content_manager', 'lms_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'content_manager', 'lms_manager')
    )
  );

DROP TRIGGER IF EXISTS update_portal_content_updated_at ON portal_content;
CREATE TRIGGER update_portal_content_updated_at
  BEFORE UPDATE ON portal_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Partner support tickets and threaded replies.
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  requester_name TEXT,
  requester_email TEXT,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('partner', 'staff')),
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_requester ON support_tickets(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at ASC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create support tickets" ON support_tickets;
CREATE POLICY "Users can create support tickets" ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_user_id = auth.uid()
    OR requester_user_id IS NULL
  );

DROP POLICY IF EXISTS "Users can view own support tickets" ON support_tickets;
CREATE POLICY "Users can view own support tickets" ON support_tickets
  FOR SELECT TO authenticated
  USING (
    requester_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'support_manager', 'analyst')
    )
  );

DROP POLICY IF EXISTS "Support managers can update support tickets" ON support_tickets;
CREATE POLICY "Support managers can update support tickets" ON support_tickets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'support_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'support_manager')
    )
  );

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP POLICY IF EXISTS "Users can view messages for accessible tickets" ON support_messages;
CREATE POLICY "Users can view messages for accessible tickets" ON support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND (
          t.requester_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin
          )
          OR EXISTS (
            SELECT 1
            FROM user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role_key IN ('super_admin', 'support_manager', 'analyst')
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can add support messages" ON support_messages;
CREATE POLICY "Users can add support messages" ON support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND (
          (
            t.requester_user_id = auth.uid()
            AND support_messages.sender = 'partner'
            AND support_messages.sender_user_id = auth.uid()
          )
          OR (
            support_messages.sender = 'staff'
            AND (
              EXISTS (
                SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin
              )
              OR EXISTS (
                SELECT 1
                FROM user_roles ur
                WHERE ur.user_id = auth.uid()
                  AND ur.role_key IN ('super_admin', 'support_manager')
              )
            )
          )
        )
    )
  );

-- Communications templates and send logs.
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'direct_mail')),
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communication_send_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'direct_mail')),
  recipient TEXT,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_templates_status ON communication_templates(status);
CREATE INDEX IF NOT EXISTS idx_communication_templates_channel ON communication_templates(channel);
CREATE INDEX IF NOT EXISTS idx_communication_send_logs_sent_at ON communication_send_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_send_logs_template ON communication_send_logs(template_id);

ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_send_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Communication managers can manage templates" ON communication_templates;
CREATE POLICY "Communication managers can manage templates" ON communication_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'content_manager', 'support_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'content_manager', 'support_manager')
    )
  );

DROP TRIGGER IF EXISTS update_communication_templates_updated_at ON communication_templates;
CREATE TRIGGER update_communication_templates_updated_at
  BEFORE UPDATE ON communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP POLICY IF EXISTS "Managers can write communication send logs" ON communication_send_logs;
CREATE POLICY "Managers can write communication send logs" ON communication_send_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'content_manager', 'support_manager')
    )
  );

DROP POLICY IF EXISTS "Managers and analysts can view communication send logs" ON communication_send_logs;
CREATE POLICY "Managers and analysts can view communication send logs" ON communication_send_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'content_manager', 'support_manager', 'analyst')
    )
  );

-- Portal activity events for admin overview and engagement analytics.
CREATE TABLE IF NOT EXISTS portal_activity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (
    type IN ('gift_created', 'course_completed', 'course_progress', 'content_viewed', 'support_ticket', 'profile_updated', 'login')
  ),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_activity_events_user ON portal_activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_activity_events_type ON portal_activity_events(type);
CREATE INDEX IF NOT EXISTS idx_portal_activity_events_created_at ON portal_activity_events(created_at DESC);

ALTER TABLE portal_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own portal activity" ON portal_activity_events;
CREATE POLICY "Users can create own portal activity" ON portal_activity_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own portal activity" ON portal_activity_events;
CREATE POLICY "Users can view own portal activity" ON portal_activity_events
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'analyst', 'support_manager')
    )
  );
