-- LMS production readiness upgrade
-- Adds live LMS metadata, notes/certificates storage, admin flag, and hardened RLS.

-- Admin role flag on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

UPDATE users
SET is_admin = FALSE
WHERE is_admin IS NULL;

ALTER TABLE users
  ALTER COLUMN is_admin SET NOT NULL;

-- Course metadata required by production LMS UI
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price DECIMAL DEFAULT 0 CHECK (price >= 0),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cover_image TEXT,
  ADD COLUMN IF NOT EXISTS enforce_sequential BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE courses
SET
  status = COALESCE(status, 'published'),
  is_locked = COALESCE(is_locked, FALSE),
  is_paid = COALESCE(is_paid, FALSE),
  price = COALESCE(price, 0),
  tags = COALESCE(tags, '{}'),
  enforce_sequential = COALESCE(enforce_sequential, TRUE)
WHERE
  status IS NULL
  OR is_locked IS NULL
  OR is_paid IS NULL
  OR price IS NULL
  OR tags IS NULL
  OR enforce_sequential IS NULL;

ALTER TABLE courses
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN is_locked SET NOT NULL,
  ALTER COLUMN is_paid SET NOT NULL,
  ALTER COLUMN price SET NOT NULL,
  ALTER COLUMN tags SET NOT NULL,
  ALTER COLUMN enforce_sequential SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Module metadata required by production LMS UI
ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS module_type TEXT CHECK (module_type IN ('video', 'reading', 'quiz')) DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS resource_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS quiz_payload JSONB,
  ADD COLUMN IF NOT EXISTS pass_threshold INTEGER DEFAULT 70 CHECK (pass_threshold >= 0 AND pass_threshold <= 100),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE course_modules
SET
  module_type = COALESCE(module_type, 'video'),
  pass_threshold = COALESCE(pass_threshold, 70)
WHERE module_type IS NULL OR pass_threshold IS NULL;

ALTER TABLE course_modules
  ALTER COLUMN module_type SET NOT NULL,
  ALTER COLUMN pass_threshold SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Persistent learner notes
CREATE TABLE IF NOT EXISTS user_course_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Course completion artifacts
CREATE TABLE IF NOT EXISTS user_course_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  completion_rate INTEGER NOT NULL DEFAULT 100 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_access_status ON courses(access_level, status);
CREATE INDEX IF NOT EXISTS idx_course_modules_module_type ON course_modules(module_type);
CREATE INDEX IF NOT EXISTS idx_user_course_notes_user_id ON user_course_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_notes_module_id ON user_course_notes(module_id);
CREATE INDEX IF NOT EXISTS idx_user_course_certificates_user_id ON user_course_certificates(user_id);

ALTER TABLE user_course_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_certificates ENABLE ROW LEVEL SECURITY;

-- Replace permissive LMS read policies with access-aware policies.
DROP POLICY IF EXISTS "Authenticated users can view courses" ON courses;
DROP POLICY IF EXISTS "Authenticated users can view modules" ON course_modules;

CREATE POLICY "Users can view accessible courses" ON courses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.is_admin
          OR (courses.access_level = 'partner' AND u.constituent_type IN ('individual', 'major_donor', 'church', 'foundation', 'daf', 'ambassador', 'volunteer'))
          OR (courses.access_level = 'major_donor' AND u.constituent_type IN ('major_donor', 'foundation'))
          OR (courses.access_level = 'church' AND u.constituent_type = 'church')
          OR (courses.access_level = 'foundation' AND u.constituent_type = 'foundation')
          OR (courses.access_level = 'ambassador' AND u.constituent_type = 'ambassador')
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
          OR (c.access_level = 'partner' AND u.constituent_type IN ('individual', 'major_donor', 'church', 'foundation', 'daf', 'ambassador', 'volunteer'))
          OR (c.access_level = 'major_donor' AND u.constituent_type IN ('major_donor', 'foundation'))
          OR (c.access_level = 'church' AND u.constituent_type = 'church')
          OR (c.access_level = 'foundation' AND u.constituent_type = 'foundation')
          OR (c.access_level = 'ambassador' AND u.constituent_type = 'ambassador')
        )
    )
  );

-- Admin LMS authoring policies
CREATE POLICY "Admins can manage courses" ON courses
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

CREATE POLICY "Admins can manage modules" ON course_modules
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

-- Learner notes policies
CREATE POLICY "Users can view own course notes" ON user_course_notes
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own course notes" ON user_course_notes
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Certificate policies
CREATE POLICY "Users can view own certificates" ON user_course_certificates
  FOR SELECT TO authenticated
  USING (
    auth.uid()::text = user_id::text
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid() AND u.is_admin
    )
  );

CREATE POLICY "Admins can manage certificates" ON user_course_certificates
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

-- Keep updated_at fields fresh
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_modules_updated_at ON course_modules;
CREATE TRIGGER update_course_modules_updated_at
  BEFORE UPDATE ON course_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_course_notes_updated_at ON user_course_notes;
CREATE TRIGGER update_user_course_notes_updated_at
  BEFORE UPDATE ON user_course_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
