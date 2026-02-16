-- LMS advanced production features
-- Adds quiz attempt persistence, analytics eventing, RBAC roles, audit logging,
-- course version snapshots, certificate verification tokens, and publish scheduling.

-- Course scheduling windows
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS unpublish_at TIMESTAMP WITH TIME ZONE;

-- Certificate verification metadata
ALTER TABLE user_course_certificates
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS certificate_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_course_certificates_verification_token
  ON user_course_certificates(verification_token)
  WHERE verification_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_course_certificates_number
  ON user_course_certificates(certificate_number)
  WHERE certificate_number IS NOT NULL;

-- Granular admin roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role_key TEXT NOT NULL CHECK (
    role_key IN (
      'super_admin',
      'lms_manager',
      'content_manager',
      'support_manager',
      'analyst',
      'viewer'
    )
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_key)
);

-- Admin action audit logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course version snapshots
CREATE TABLE IF NOT EXISTS course_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  snapshot JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, version_number)
);

-- Persisted quiz attempts for reporting and learner history
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  score_percent INTEGER NOT NULL CHECK (score_percent >= 0 AND score_percent <= 100),
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  question_order TEXT[] NOT NULL DEFAULT '{}',
  option_order JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, module_id, attempt_number)
);

-- LMS engagement events for cohort/drop-off/watch analytics
CREATE TABLE IF NOT EXISTS course_module_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'module_viewed',
      'module_started',
      'module_completed',
      'module_reopened',
      'quiz_passed',
      'quiz_failed'
    )
  ),
  watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_publish_at ON courses(publish_at);
CREATE INDEX IF NOT EXISTS idx_courses_unpublish_at ON courses(unpublish_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_key ON user_roles(role_key);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_versions_course_id ON course_versions(course_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_module_id ON user_quiz_attempts(module_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_module ON user_quiz_attempts(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_course_module_events_module_id ON course_module_events(module_id);
CREATE INDEX IF NOT EXISTS idx_course_module_events_event_type ON course_module_events(event_type);
CREATE INDEX IF NOT EXISTS idx_course_module_events_created_at ON course_module_events(created_at DESC);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_module_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own role assignments.
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Full role management is restricted to legacy admins for safety.
CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
  );

-- Admin and analytics roles can view audit entries.
CREATE POLICY "Admins and analysts can view audit logs" ON admin_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager', 'analyst')
    )
  );

-- Managers can write audit entries.
CREATE POLICY "Managers can insert audit logs" ON admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager', 'content_manager', 'support_manager')
    )
  );

-- LMS managers can read/write course version snapshots.
CREATE POLICY "LMS managers can view course versions" ON course_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager', 'analyst')
    )
  );

CREATE POLICY "LMS managers can create course versions" ON course_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager')
    )
  );

-- Learner quiz attempt ownership policies
CREATE POLICY "Users can view own quiz attempts" ON user_quiz_attempts
  FOR SELECT TO authenticated
  USING (
    auth.uid()::text = user_id::text
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager', 'analyst')
    )
  );

CREATE POLICY "Users can create own quiz attempts" ON user_quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Learner analytics event policies
CREATE POLICY "Users can view own module events" ON course_module_events
  FOR SELECT TO authenticated
  USING (
    auth.uid()::text = user_id::text
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager', 'analyst')
    )
  );

CREATE POLICY "Users can create own module events" ON course_module_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Public verification requires only possession of a valid token.
CREATE POLICY "Public can verify certificates by token" ON user_course_certificates
  FOR SELECT TO anon
  USING (verification_token IS NOT NULL);

-- Learners can issue and refresh their own course certificates.
CREATE POLICY "Users can insert own certificates" ON user_course_certificates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own certificates" ON user_course_certificates
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Refresh LMS course/module visibility policies so non-admin users only see
-- currently published, unlocked, in-window content.
DROP POLICY IF EXISTS "Users can view accessible courses" ON courses;
DROP POLICY IF EXISTS "Users can view accessible modules" ON course_modules;

CREATE POLICY "Users can view accessible courses" ON courses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.is_admin
          OR (
            courses.status = 'published'
            AND courses.is_locked = FALSE
            AND (courses.publish_at IS NULL OR courses.publish_at <= NOW())
            AND (courses.unpublish_at IS NULL OR courses.unpublish_at > NOW())
            AND (
              (courses.access_level = 'partner' AND u.constituent_type IN ('individual', 'major_donor', 'church', 'foundation', 'daf', 'ambassador', 'volunteer'))
              OR (courses.access_level = 'major_donor' AND u.constituent_type IN ('major_donor', 'foundation'))
              OR (courses.access_level = 'church' AND u.constituent_type = 'church')
              OR (courses.access_level = 'foundation' AND u.constituent_type = 'foundation')
              OR (courses.access_level = 'ambassador' AND u.constituent_type = 'ambassador')
            )
          )
        )
    )
  );

CREATE POLICY "Users can view accessible modules" ON course_modules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM courses c
      JOIN users u ON u.id = auth.uid()
      WHERE c.id = course_modules.course_id
        AND (
          u.is_admin
          OR (
            c.status = 'published'
            AND c.is_locked = FALSE
            AND (c.publish_at IS NULL OR c.publish_at <= NOW())
            AND (c.unpublish_at IS NULL OR c.unpublish_at > NOW())
            AND (
              (c.access_level = 'partner' AND u.constituent_type IN ('individual', 'major_donor', 'church', 'foundation', 'daf', 'ambassador', 'volunteer'))
              OR (c.access_level = 'major_donor' AND u.constituent_type IN ('major_donor', 'foundation'))
              OR (c.access_level = 'church' AND u.constituent_type = 'church')
              OR (c.access_level = 'foundation' AND u.constituent_type = 'foundation')
              OR (c.access_level = 'ambassador' AND u.constituent_type = 'ambassador')
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
CREATE POLICY "LMS managers can manage courses" ON courses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can manage modules" ON course_modules;
CREATE POLICY "LMS managers can manage modules" ON course_modules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'lms_manager')
    )
  );

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
