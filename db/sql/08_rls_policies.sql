-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) — SUPABASE ZERO-TRUST (v2.0)
-- Strategy: Users access ONLY their own data.
--           Admins/Moderators can access everything via role check.
--           Public content (species, expeditions) is readable by all.
-- ==============================================================================

-- [LOCAL DEV FIX]: Mock Supabase's auth.uid() function for standard PostgreSQL
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
BEGIN
  RETURN current_setting('request.jwt.claim.sub', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on all user-specific tables
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_expedition_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_field_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_observations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
-- v2.0: new tables
ALTER TABLE daily_challenges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_hotspot_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_domain_expertise    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages         ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin-managed tables (public read, admin write)
ALTER TABLE species                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expeditions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy                 ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- HELPER: Check if current user is admin or moderator
-- ==============================================================================
CREATE OR REPLACE FUNCTION auth_is_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
          AND role IN ('ADMIN', 'MODERATOR')
          AND deleted_at IS NULL
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==============================================================================
-- POLICIES: users table
-- ==============================================================================
DROP POLICY IF EXISTS "users: read own row" ON users;
CREATE POLICY "users: read own row"
    ON users FOR SELECT
    USING (id = auth.uid() OR auth_is_staff());

DROP POLICY IF EXISTS "users: update own row" ON users;
CREATE POLICY "users: update own row"
    ON users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() AND
        -- Prevent self-promotion: users cannot change their own role
        role = (SELECT role FROM users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "users: admin full access" ON users;
CREATE POLICY "users: admin full access"
    ON users FOR ALL
    USING (auth_is_staff());

-- ==============================================================================
-- POLICIES: user_profiles
-- ==============================================================================
DROP POLICY IF EXISTS "user_profiles: read own" ON user_profiles;
CREATE POLICY "user_profiles: read own"
    ON user_profiles FOR SELECT
    USING (user_id = auth.uid() OR auth_is_staff());

DROP POLICY IF EXISTS "user_profiles: insert own" ON user_profiles;
CREATE POLICY "user_profiles: insert own"
    ON user_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_profiles: update own" ON user_profiles;
CREATE POLICY "user_profiles: update own"
    ON user_profiles FOR UPDATE
    USING (user_id = auth.uid());

-- ==============================================================================
-- POLICIES: user_sessions
-- ==============================================================================
DROP POLICY IF EXISTS "user_sessions: own only" ON user_sessions;
CREATE POLICY "user_sessions: own only"
    ON user_sessions FOR ALL
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- POLICIES: user_streaks
-- ==============================================================================
DROP POLICY IF EXISTS "user_streaks: own only" ON user_streaks;
CREATE POLICY "user_streaks: own only"
    ON user_streaks FOR ALL
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- POLICIES: xp_transactions (Read-only for users — inserts by system/functions)
-- ==============================================================================
DROP POLICY IF EXISTS "xp_transactions: read own" ON xp_transactions;
CREATE POLICY "xp_transactions: read own"
    ON xp_transactions FOR SELECT
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- POLICIES: user_expedition_progress
-- ==============================================================================
DROP POLICY IF EXISTS "uep: own only" ON user_expedition_progress;
CREATE POLICY "uep: own only"
    ON user_expedition_progress FOR ALL
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- POLICIES: user_field_notes
-- ==============================================================================
DROP POLICY IF EXISTS "user_field_notes: read own" ON user_field_notes;
CREATE POLICY "user_field_notes: read own"
    ON user_field_notes FOR SELECT
    USING (user_id = auth.uid() OR auth_is_staff());

DROP POLICY IF EXISTS "user_field_notes: insert own" ON user_field_notes;
CREATE POLICY "user_field_notes: insert own"
    ON user_field_notes FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- POLICIES: user_badges
-- ==============================================================================
DROP POLICY IF EXISTS "user_badges: read own" ON user_badges;
CREATE POLICY "user_badges: read own"
    ON user_badges FOR SELECT
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- POLICIES: user_quiz_sessions & user_quiz_attempts
-- ==============================================================================
DROP POLICY IF EXISTS "user_quiz_sessions: own only" ON user_quiz_sessions;
CREATE POLICY "user_quiz_sessions: own only"
    ON user_quiz_sessions FOR ALL
    USING (user_id = auth.uid() OR auth_is_staff());

DROP POLICY IF EXISTS "user_quiz_attempts: own only" ON user_quiz_attempts;
CREATE POLICY "user_quiz_attempts: own only"
    ON user_quiz_attempts FOR ALL
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- POLICIES: flashcard_reviews
-- ==============================================================================
DROP POLICY IF EXISTS "flashcard_reviews: own only" ON flashcard_reviews;
CREATE POLICY "flashcard_reviews: own only"
    ON flashcard_reviews FOR ALL
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- POLICIES: user_observations
-- ==============================================================================
DROP POLICY IF EXISTS "user_observations: read own or moderator" ON user_observations;
CREATE POLICY "user_observations: read own or moderator"
    ON user_observations FOR SELECT
    USING (user_id = auth.uid() OR auth_is_staff());

DROP POLICY IF EXISTS "user_observations: insert own" ON user_observations;
CREATE POLICY "user_observations: insert own"
    ON user_observations FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_observations: update — user edits pending, staff edits all" ON user_observations;
CREATE POLICY "user_observations: update — user edits pending, staff edits all"
    ON user_observations FOR UPDATE
    USING (
        (user_id = auth.uid() AND status = 'PENDING') OR
        auth_is_staff()
    );

-- ==============================================================================
-- POLICIES: notifications
-- ==============================================================================
DROP POLICY IF EXISTS "notifications: own only" ON notifications;
CREATE POLICY "notifications: own only"
    ON notifications FOR ALL
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- POLICIES: Public content (species, taxonomy, expeditions)
-- Read: everyone (including anonymous). Write: ADMIN/MODERATOR only.
-- ==============================================================================
DROP POLICY IF EXISTS "species: public read" ON species;
CREATE POLICY "species: public read"
    ON species FOR SELECT
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "species: staff write" ON species;
CREATE POLICY "species: staff write"
    ON species FOR ALL
    USING (auth_is_staff());

DROP POLICY IF EXISTS "expeditions: public read published" ON expeditions;
CREATE POLICY "expeditions: public read published"
    ON expeditions FOR SELECT
    USING (published_at IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "expeditions: staff manage all" ON expeditions;
CREATE POLICY "expeditions: staff manage all"
    ON expeditions FOR ALL
    USING (auth_is_staff());

DROP POLICY IF EXISTS "taxonomy: public read" ON taxonomy;
CREATE POLICY "taxonomy: public read"
    ON taxonomy FOR SELECT
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "taxonomy: staff write" ON taxonomy;
CREATE POLICY "taxonomy: staff write"
    ON taxonomy FOR ALL
    USING (auth_is_staff());

-- ==============================================================================
-- v2.0 POLICIES: daily_challenges
-- ==============================================================================
DROP POLICY IF EXISTS "daily_challenges: own only" ON daily_challenges;
CREATE POLICY "daily_challenges: own only"
    ON daily_challenges FOR ALL
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- v2.0 POLICIES: user_hotspot_discoveries
-- ==============================================================================
DROP POLICY IF EXISTS "uhd: own only" ON user_hotspot_discoveries;
CREATE POLICY "uhd: own only"
    ON user_hotspot_discoveries FOR ALL
    USING (user_id = auth.uid() OR auth_is_staff());

-- ==============================================================================
-- v2.0 POLICIES: user_domain_expertise
-- Read own, write via system SECURITY DEFINER functions only
-- ==============================================================================
DROP POLICY IF EXISTS "ude: read own or staff" ON user_domain_expertise;
CREATE POLICY "ude: read own or staff"
    ON user_domain_expertise FOR SELECT
    USING (user_id = auth.uid() OR auth_is_staff());

DROP POLICY IF EXISTS "ude: system write only" ON user_domain_expertise;
CREATE POLICY "ude: system write only"
    ON user_domain_expertise FOR ALL
    USING (auth_is_staff());

-- ==============================================================================
-- v2.0 POLICIES: ai_chat_sessions
-- FIX: Separate policies for authenticated and anonymous users.
-- Anonymous users (user_id IS NULL) access via session_token stored in
-- application settings: current_setting('app.session_token', true)
-- ==============================================================================
DROP POLICY IF EXISTS "ai_chat_sessions: authenticated user" ON ai_chat_sessions;
CREATE POLICY "ai_chat_sessions: authenticated user"
    ON ai_chat_sessions FOR ALL
    USING (
        (user_id IS NOT NULL AND user_id = auth.uid()) OR
        auth_is_staff()
    );

DROP POLICY IF EXISTS "ai_chat_sessions: anonymous via token" ON ai_chat_sessions;
CREATE POLICY "ai_chat_sessions: anonymous via token"
    ON ai_chat_sessions FOR SELECT
    USING (
        user_id IS NULL AND
        session_token = current_setting('app.session_token', true)
    );

DROP POLICY IF EXISTS "ai_chat_sessions: anonymous insert" ON ai_chat_sessions;
CREATE POLICY "ai_chat_sessions: anonymous insert"
    ON ai_chat_sessions FOR INSERT
    WITH CHECK (
        user_id IS NULL AND
        session_token = current_setting('app.session_token', true)
    );

-- ==============================================================================
-- v2.0 POLICIES: ai_chat_messages
-- Access controlled via parent session ownership
-- ==============================================================================
DROP POLICY IF EXISTS "ai_chat_messages: via session ownership" ON ai_chat_messages;
CREATE POLICY "ai_chat_messages: via session ownership"
    ON ai_chat_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM ai_chat_sessions s
            WHERE s.id = session_id
              AND (
                  (s.user_id IS NOT NULL AND s.user_id = auth.uid()) OR
                  (s.user_id IS NULL AND s.session_token = current_setting('app.session_token', true)) OR
                  auth_is_staff()
              )
        )
    );
