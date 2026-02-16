-- Auth/profile/settings/goals hardening for portal production flows.
-- Adds onboarding flags, profile detail persistence, settings period persistence,
-- and server-persisted giving goals.

-- Track onboarding state for users created outside of SKY.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- Optional address/profile details separate from SKY-owned identity fields.
CREATE TABLE IF NOT EXISTS user_profile_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_details_user_id ON user_profile_details(user_id);

ALTER TABLE user_profile_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile details" ON user_profile_details;
CREATE POLICY "Users can view own profile details" ON user_profile_details
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own profile details" ON user_profile_details;
CREATE POLICY "Users can insert own profile details" ON user_profile_details
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own profile details" ON user_profile_details;
CREATE POLICY "Users can update own profile details" ON user_profile_details
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

DROP TRIGGER IF EXISTS update_user_profile_details_updated_at ON user_profile_details;
CREATE TRIGGER update_user_profile_details_updated_at
  BEFORE UPDATE ON user_profile_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Persist report period preference server-side.
ALTER TABLE communication_preferences
  ADD COLUMN IF NOT EXISTS report_period TEXT NOT NULL DEFAULT 'quarterly'
    CHECK (report_period IN ('quarterly', 'annual'));

DROP POLICY IF EXISTS "Users can insert own preferences" ON communication_preferences;
CREATE POLICY "Users can insert own preferences" ON communication_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Persist user-managed giving goals.
CREATE TABLE IF NOT EXISTS user_giving_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom'
    CHECK (category IN ('annual', 'project', 'monthly', 'custom')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_giving_goals_user_id ON user_giving_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_giving_goals_deadline ON user_giving_goals(deadline);

ALTER TABLE user_giving_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own giving goals" ON user_giving_goals;
CREATE POLICY "Users can view own giving goals" ON user_giving_goals
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own giving goals" ON user_giving_goals;
CREATE POLICY "Users can insert own giving goals" ON user_giving_goals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own giving goals" ON user_giving_goals;
CREATE POLICY "Users can update own giving goals" ON user_giving_goals
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete own giving goals" ON user_giving_goals;
CREATE POLICY "Users can delete own giving goals" ON user_giving_goals
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id::text);

DROP TRIGGER IF EXISTS update_user_giving_goals_updated_at ON user_giving_goals;
CREATE TRIGGER update_user_giving_goals_updated_at
  BEFORE UPDATE ON user_giving_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
