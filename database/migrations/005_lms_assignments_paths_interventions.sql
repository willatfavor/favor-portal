-- LMS assignments, learning paths, and intervention workflows.

CREATE TABLE IF NOT EXISTS course_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  points_possible INTEGER NOT NULL DEFAULT 100 CHECK (points_possible >= 0),
  passing_percent INTEGER NOT NULL DEFAULT 70 CHECK (passing_percent >= 0 AND passing_percent <= 100),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES course_assignments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  submission_text TEXT,
  submission_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('draft', 'submitted', 'returned', 'graded')
  ),
  score_percent INTEGER CHECK (score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100)),
  grader_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, user_id)
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (
    audience IN ('all', 'partner', 'major_donor', 'church', 'foundation', 'ambassador')
  ),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  estimated_hours INTEGER CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_path_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(learning_path_id, course_id)
);

CREATE TABLE IF NOT EXISTS user_learning_path_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  completed_courses INTEGER NOT NULL DEFAULT 0 CHECK (completed_courses >= 0),
  total_courses INTEGER NOT NULL DEFAULT 0 CHECK (total_courses >= 0),
  completion_percent INTEGER NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (
    status IN ('enrolled', 'completed', 'paused')
  ),
  UNIQUE(learning_path_id, user_id)
);

CREATE TABLE IF NOT EXISTS lms_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('medium', 'high')),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  reason TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'resolved', 'dismissed')
  ),
  action_plan TEXT,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  due_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_assignments_course_id ON course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_due_at ON course_assignments(due_at);
CREATE INDEX IF NOT EXISTS idx_course_assignments_published ON course_assignments(is_published);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON course_assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user_id ON course_assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON course_assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_learning_paths_audience ON learning_paths(audience);
CREATE INDEX IF NOT EXISTS idx_learning_paths_active ON learning_paths(is_active);
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_path_id ON learning_path_courses(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_course_id ON learning_path_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_path_progress_user ON user_learning_path_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_path_progress_path ON user_learning_path_progress(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_lms_interventions_user_id ON lms_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_lms_interventions_course_id ON lms_interventions(course_id);
CREATE INDEX IF NOT EXISTS idx_lms_interventions_status ON lms_interventions(status);
CREATE INDEX IF NOT EXISTS idx_lms_interventions_risk ON lms_interventions(risk_level, risk_score DESC);

ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_path_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_interventions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published assignments" ON course_assignments;
CREATE POLICY "Users can view published assignments" ON course_assignments
  FOR SELECT TO authenticated
  USING (
    is_published = TRUE
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

DROP POLICY IF EXISTS "LMS managers can manage assignments" ON course_assignments;
CREATE POLICY "LMS managers can manage assignments" ON course_assignments
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

DROP POLICY IF EXISTS "Users can view own assignment submissions" ON course_assignment_submissions;
CREATE POLICY "Users can view own assignment submissions" ON course_assignment_submissions
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

DROP POLICY IF EXISTS "Users can create own assignment submissions" ON course_assignment_submissions;
CREATE POLICY "Users can create own assignment submissions" ON course_assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
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

DROP POLICY IF EXISTS "Users can update own assignment submissions" ON course_assignment_submissions;
CREATE POLICY "Users can update own assignment submissions" ON course_assignment_submissions
  FOR UPDATE TO authenticated
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
  )
  WITH CHECK (
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

DROP POLICY IF EXISTS "Users can view active learning paths" ON learning_paths;
CREATE POLICY "Users can view active learning paths" ON learning_paths
  FOR SELECT TO authenticated
  USING (
    is_active = TRUE
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

DROP POLICY IF EXISTS "LMS managers can manage learning paths" ON learning_paths;
CREATE POLICY "LMS managers can manage learning paths" ON learning_paths
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

DROP POLICY IF EXISTS "Users can view learning path course mappings" ON learning_path_courses;
CREATE POLICY "Users can view learning path course mappings" ON learning_path_courses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM learning_paths lp
      WHERE lp.id = learning_path_courses.learning_path_id
        AND lp.is_active = TRUE
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
  );

DROP POLICY IF EXISTS "LMS managers can manage learning path courses" ON learning_path_courses;
CREATE POLICY "LMS managers can manage learning path courses" ON learning_path_courses
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

DROP POLICY IF EXISTS "Users can view own learning path progress" ON user_learning_path_progress;
CREATE POLICY "Users can view own learning path progress" ON user_learning_path_progress
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

DROP POLICY IF EXISTS "Users can create own learning path progress" ON user_learning_path_progress;
CREATE POLICY "Users can create own learning path progress" ON user_learning_path_progress
  FOR INSERT TO authenticated
  WITH CHECK (
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

DROP POLICY IF EXISTS "Users can update own learning path progress" ON user_learning_path_progress;
CREATE POLICY "Users can update own learning path progress" ON user_learning_path_progress
  FOR UPDATE TO authenticated
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
  )
  WITH CHECK (
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

DROP POLICY IF EXISTS "Managers and analysts can view interventions" ON lms_interventions;
CREATE POLICY "Managers and analysts can view interventions" ON lms_interventions
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
        AND ur.role_key IN ('super_admin', 'lms_manager', 'support_manager', 'analyst')
    )
  );

DROP POLICY IF EXISTS "Managers can manage interventions" ON lms_interventions;
CREATE POLICY "Managers can manage interventions" ON lms_interventions
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
        AND ur.role_key IN ('super_admin', 'lms_manager', 'support_manager')
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
        AND ur.role_key IN ('super_admin', 'lms_manager', 'support_manager')
    )
  );

DROP TRIGGER IF EXISTS update_course_assignments_updated_at ON course_assignments;
CREATE TRIGGER update_course_assignments_updated_at
  BEFORE UPDATE ON course_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_assignment_submissions_updated_at ON course_assignment_submissions;
CREATE TRIGGER update_course_assignment_submissions_updated_at
  BEFORE UPDATE ON course_assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_paths_updated_at ON learning_paths;
CREATE TRIGGER update_learning_paths_updated_at
  BEFORE UPDATE ON learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lms_interventions_updated_at ON lms_interventions;
CREATE TRIGGER update_lms_interventions_updated_at
  BEFORE UPDATE ON lms_interventions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
