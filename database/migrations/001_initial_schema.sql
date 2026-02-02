-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    blackbaud_constituent_id TEXT,
    constituent_type TEXT CHECK (constituent_type IN ('individual', 'major_donor', 'church', 'foundation', 'daf', 'ambassador', 'volunteer')),
    lifetime_giving_total DECIMAL DEFAULT 0,
    rdd_assignment TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Giving cache table
CREATE TABLE giving_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    gift_date DATE NOT NULL,
    amount DECIMAL NOT NULL,
    designation TEXT NOT NULL,
    blackbaud_gift_id TEXT UNIQUE,
    is_recurring BOOLEAN DEFAULT FALSE,
    receipt_sent BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring gifts table
CREATE TABLE recurring_gifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    frequency TEXT CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
    next_charge_date DATE NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('active', 'paused', 'cancelled')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communication preferences table
CREATE TABLE communication_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Email preferences
    email_newsletter_weekly BOOLEAN DEFAULT TRUE,
    email_newsletter_monthly BOOLEAN DEFAULT TRUE,
    email_quarterly_report BOOLEAN DEFAULT TRUE,
    email_annual_report BOOLEAN DEFAULT TRUE,
    email_events BOOLEAN DEFAULT TRUE,
    email_prayer BOOLEAN DEFAULT TRUE,
    email_giving_confirmations BOOLEAN DEFAULT TRUE,
    
    -- SMS preferences
    sms_enabled BOOLEAN DEFAULT FALSE,
    sms_gift_confirmations BOOLEAN DEFAULT TRUE,
    sms_event_reminders BOOLEAN DEFAULT TRUE,
    sms_urgent_only BOOLEAN DEFAULT FALSE,
    
    -- Direct mail preferences
    mail_enabled BOOLEAN DEFAULT TRUE,
    mail_newsletter_quarterly BOOLEAN DEFAULT TRUE,
    mail_annual_report BOOLEAN DEFAULT TRUE,
    mail_holiday_card BOOLEAN DEFAULT TRUE,
    mail_appeals BOOLEAN DEFAULT FALSE,
    
    blackbaud_solicit_codes TEXT[] DEFAULT '{}',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url TEXT,
    access_level TEXT DEFAULT 'partner' CHECK (access_level IN ('partner', 'major_donor', 'church', 'foundation', 'ambassador')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course modules table
CREATE TABLE course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cloudflare_video_id TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0
);

-- User course progress table
CREATE TABLE user_course_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    watch_time_seconds INTEGER DEFAULT 0,
    last_watched_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, module_id)
);

-- Foundation grants table
CREATE TABLE foundation_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    grant_name TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected')),
    next_report_due DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding surveys table
CREATE TABLE onboarding_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    how_heard TEXT,
    rdd_contact TEXT,
    interests TEXT[] DEFAULT '{}',
    church_connection BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_constituent_type ON users(constituent_type);
CREATE INDEX idx_giving_cache_user_id ON giving_cache(user_id);
CREATE INDEX idx_giving_cache_date ON giving_cache(gift_date);
CREATE INDEX idx_recurring_gifts_user_id ON recurring_gifts(user_id);
CREATE INDEX idx_foundation_grants_user_id ON foundation_grants(user_id);
CREATE INDEX idx_user_course_progress_user_id ON user_course_progress(user_id);
CREATE INDEX idx_course_modules_course_id ON course_modules(course_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE giving_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE foundation_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_surveys ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Giving cache: Users can only see their own gifts
CREATE POLICY "Users can view own giving" ON giving_cache
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Recurring gifts: Users can only see their own subscriptions
CREATE POLICY "Users can view own recurring gifts" ON recurring_gifts
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own recurring gifts" ON recurring_gifts
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Communication preferences: Users can only see/update their own
CREATE POLICY "Users can view own preferences" ON communication_preferences
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own preferences" ON communication_preferences
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Courses: All authenticated users can view courses
CREATE POLICY "Authenticated users can view courses" ON courses
    FOR SELECT TO authenticated USING (true);

-- Course modules: All authenticated users can view modules
CREATE POLICY "Authenticated users can view modules" ON course_modules
    FOR SELECT TO authenticated USING (true);

-- User course progress: Users can only see/update their own progress
CREATE POLICY "Users can view own progress" ON user_course_progress
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own progress" ON user_course_progress
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Foundation grants: Users can only see their own grants
CREATE POLICY "Users can view own grants" ON foundation_grants
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Onboarding surveys: Users can only see/update their own
CREATE POLICY "Users can view own survey" ON onboarding_surveys
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own survey" ON onboarding_surveys
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_communication_preferences_updated_at
    BEFORE UPDATE ON communication_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
