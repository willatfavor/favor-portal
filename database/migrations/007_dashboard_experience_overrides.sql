-- Dashboard experience overrides configurable from admin.
-- Stores role-specific overrides for dashboard highlights/actions.

CREATE TABLE IF NOT EXISTS portal_dashboard_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_key TEXT NOT NULL UNIQUE CHECK (
    role_key IN ('individual', 'major_donor', 'church', 'foundation', 'daf', 'ambassador', 'volunteer')
  ),
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_dashboard_overrides_role_key
  ON portal_dashboard_overrides(role_key);

ALTER TABLE portal_dashboard_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view dashboard overrides" ON portal_dashboard_overrides;
CREATE POLICY "Authenticated users can view dashboard overrides" ON portal_dashboard_overrides
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Managers can manage dashboard overrides" ON portal_dashboard_overrides;
CREATE POLICY "Managers can manage dashboard overrides" ON portal_dashboard_overrides
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_key IN ('super_admin', 'content_manager')
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
        AND ur.role_key IN ('super_admin', 'content_manager')
    )
  );

DROP TRIGGER IF EXISTS update_portal_dashboard_overrides_updated_at ON portal_dashboard_overrides;
CREATE TRIGGER update_portal_dashboard_overrides_updated_at
  BEFORE UPDATE ON portal_dashboard_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
