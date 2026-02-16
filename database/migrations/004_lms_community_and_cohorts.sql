-- LMS community and cohorts
-- Adds course cohorts, cohort membership, and in-course discussion threads/replies.

CREATE TABLE IF NOT EXISTS course_cohorts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, name)
);

CREATE TABLE IF NOT EXISTS course_cohort_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id UUID REFERENCES course_cohorts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'learner' CHECK (
    membership_role IN ('learner', 'mentor', 'instructor')
  ),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cohort_id, user_id)
);

CREATE TABLE IF NOT EXISTS course_discussion_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  cohort_id UUID REFERENCES course_cohorts(id) ON DELETE SET NULL,
  module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  author_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  reply_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_discussion_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES course_discussion_threads(id) ON DELETE CASCADE NOT NULL,
  author_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  is_instructor_reply BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_cohorts_course_id ON course_cohorts(course_id);
CREATE INDEX IF NOT EXISTS idx_course_cohorts_is_active ON course_cohorts(is_active);
CREATE INDEX IF NOT EXISTS idx_course_cohort_members_cohort_id ON course_cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS idx_course_cohort_members_user_id ON course_cohort_members(user_id);
CREATE INDEX IF NOT EXISTS idx_course_discussion_threads_course_id ON course_discussion_threads(course_id);
CREATE INDEX IF NOT EXISTS idx_course_discussion_threads_cohort_id ON course_discussion_threads(cohort_id);
CREATE INDEX IF NOT EXISTS idx_course_discussion_threads_module_id ON course_discussion_threads(module_id);
CREATE INDEX IF NOT EXISTS idx_course_discussion_threads_last_activity ON course_discussion_threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_discussion_replies_thread_id ON course_discussion_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_course_discussion_replies_author_user_id ON course_discussion_replies(author_user_id);

ALTER TABLE course_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_discussion_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accessible cohorts" ON course_cohorts;
CREATE POLICY "Users can view accessible cohorts" ON course_cohorts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = course_cohorts.course_id
    )
  );

DROP POLICY IF EXISTS "LMS managers can manage cohorts" ON course_cohorts;
CREATE POLICY "LMS managers can manage cohorts" ON course_cohorts
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

DROP POLICY IF EXISTS "Users can view cohort memberships" ON course_cohort_members;
CREATE POLICY "Users can view cohort memberships" ON course_cohort_members
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
    OR EXISTS (
      SELECT 1
      FROM course_cohorts cc
      JOIN courses c ON c.id = cc.course_id
      WHERE cc.id = course_cohort_members.cohort_id
    )
  );

DROP POLICY IF EXISTS "Users can join accessible cohorts" ON course_cohort_members;
CREATE POLICY "Users can join accessible cohorts" ON course_cohort_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid()::text = user_id::text
      AND EXISTS (
        SELECT 1
        FROM course_cohorts cc
        JOIN courses c ON c.id = cc.course_id
        WHERE cc.id = course_cohort_members.cohort_id
          AND cc.is_active = TRUE
      )
    )
    OR EXISTS (
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

DROP POLICY IF EXISTS "Users can leave own cohorts" ON course_cohort_members;
CREATE POLICY "Users can leave own cohorts" ON course_cohort_members
  FOR DELETE TO authenticated
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
        AND ur.role_key IN ('super_admin', 'lms_manager')
    )
  );

DROP POLICY IF EXISTS "LMS managers can update cohort memberships" ON course_cohort_members;
CREATE POLICY "LMS managers can update cohort memberships" ON course_cohort_members
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Users can view accessible discussion threads" ON course_discussion_threads;
CREATE POLICY "Users can view accessible discussion threads" ON course_discussion_threads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = course_discussion_threads.course_id
    )
    AND (
      course_discussion_threads.cohort_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM course_cohort_members cm
        WHERE cm.cohort_id = course_discussion_threads.cohort_id
          AND cm.user_id = auth.uid()
      )
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
    )
  );

DROP POLICY IF EXISTS "Users can create discussion threads" ON course_discussion_threads;
CREATE POLICY "Users can create discussion threads" ON course_discussion_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = author_user_id::text
    AND EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = course_discussion_threads.course_id
    )
    AND (
      course_discussion_threads.cohort_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM course_cohort_members cm
        WHERE cm.cohort_id = course_discussion_threads.cohort_id
          AND cm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "LMS managers can update discussion threads" ON course_discussion_threads;
CREATE POLICY "LMS managers can update discussion threads" ON course_discussion_threads
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Users can delete own threads or managers" ON course_discussion_threads;
CREATE POLICY "Users can delete own threads or managers" ON course_discussion_threads
  FOR DELETE TO authenticated
  USING (
    auth.uid()::text = author_user_id::text
    OR EXISTS (
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

DROP POLICY IF EXISTS "Users can view replies on accessible threads" ON course_discussion_replies;
CREATE POLICY "Users can view replies on accessible threads" ON course_discussion_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM course_discussion_threads t
      WHERE t.id = course_discussion_replies.thread_id
        AND EXISTS (
          SELECT 1
          FROM courses c
          WHERE c.id = t.course_id
        )
        AND (
          t.cohort_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM course_cohort_members cm
            WHERE cm.cohort_id = t.cohort_id
              AND cm.user_id = auth.uid()
          )
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
        )
    )
  );

DROP POLICY IF EXISTS "Users can create replies on accessible threads" ON course_discussion_replies;
CREATE POLICY "Users can create replies on accessible threads" ON course_discussion_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = author_user_id::text
    AND EXISTS (
      SELECT 1
      FROM course_discussion_threads t
      WHERE t.id = course_discussion_replies.thread_id
        AND t.locked = FALSE
        AND EXISTS (
          SELECT 1
          FROM courses c
          WHERE c.id = t.course_id
        )
        AND (
          t.cohort_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM course_cohort_members cm
            WHERE cm.cohort_id = t.cohort_id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can update own replies or managers" ON course_discussion_replies;
CREATE POLICY "Users can update own replies or managers" ON course_discussion_replies
  FOR UPDATE TO authenticated
  USING (
    auth.uid()::text = author_user_id::text
    OR EXISTS (
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
    auth.uid()::text = author_user_id::text
    OR EXISTS (
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

DROP POLICY IF EXISTS "Users can delete own replies or managers" ON course_discussion_replies;
CREATE POLICY "Users can delete own replies or managers" ON course_discussion_replies
  FOR DELETE TO authenticated
  USING (
    auth.uid()::text = author_user_id::text
    OR EXISTS (
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

DROP TRIGGER IF EXISTS update_course_cohorts_updated_at ON course_cohorts;
CREATE TRIGGER update_course_cohorts_updated_at
  BEFORE UPDATE ON course_cohorts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_discussion_threads_updated_at ON course_discussion_threads;
CREATE TRIGGER update_course_discussion_threads_updated_at
  BEFORE UPDATE ON course_discussion_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_discussion_replies_updated_at ON course_discussion_replies;
CREATE TRIGGER update_course_discussion_replies_updated_at
  BEFORE UPDATE ON course_discussion_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION refresh_discussion_thread_metrics()
RETURNS TRIGGER AS $$
DECLARE
  target_thread_id UUID;
BEGIN
  target_thread_id := COALESCE(NEW.thread_id, OLD.thread_id);

  UPDATE course_discussion_threads t
  SET
    reply_count = (
      SELECT COUNT(*)::INTEGER
      FROM course_discussion_replies r
      WHERE r.thread_id = target_thread_id
    ),
    last_activity_at = COALESCE(
      (
        SELECT MAX(r.created_at)
        FROM course_discussion_replies r
        WHERE r.thread_id = target_thread_id
      ),
      t.created_at
    ),
    updated_at = NOW()
  WHERE t.id = target_thread_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_discussion_thread_metrics_trigger ON course_discussion_replies;
CREATE TRIGGER refresh_discussion_thread_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON course_discussion_replies
  FOR EACH ROW
  EXECUTE FUNCTION refresh_discussion_thread_metrics();
