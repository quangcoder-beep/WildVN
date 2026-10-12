-- ==============================================================================
-- DOMAIN: SOCIAL & COMMUNITY
-- Order: user_observations → notifications
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: user_observations
-- GPS-tagged field observations submitted by users for community science.
-- Requires moderator review before being approved/rejected.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_observations (
    id               UUID               NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID               NOT NULL,
    species_id       UUID                        DEFAULT NULL,
    observation_point GEOMETRY(Point, 4326) NOT NULL,
    observed_at      TIMESTAMPTZ        NOT NULL,
    notes            TEXT                        DEFAULT NULL,
    photo_url        TEXT                        DEFAULT NULL,
    status           observation_status NOT NULL DEFAULT 'PENDING',
    reviewed_by      UUID                        DEFAULT NULL,
    reviewed_at      TIMESTAMPTZ                 DEFAULT NULL,
    rejection_reason TEXT                        DEFAULT NULL,
    created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ                 DEFAULT NULL,

    CONSTRAINT pk_user_observations             PRIMARY KEY (id),
    CONSTRAINT fk_user_observations_user        FOREIGN KEY (user_id)     REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_observations_species     FOREIGN KEY (species_id)  REFERENCES species (id) ON DELETE SET NULL,
    CONSTRAINT fk_user_observations_reviewer    FOREIGN KEY (reviewed_by) REFERENCES users   (id) ON DELETE SET NULL,
    CONSTRAINT chk_observations_photo           CHECK (photo_url IS NULL OR photo_url ~ '^https?://|^/'),
    -- Review logic: PENDING must have no reviewer; APPROVED/REJECTED must have reviewer+time
    CONSTRAINT chk_observations_review_logic    CHECK (
        (status = 'PENDING'  AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
        (status IN ('APPROVED', 'REJECTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    ),
    -- Rejection must include a reason; other statuses must not
    CONSTRAINT chk_observations_rejection       CHECK (
        (status = 'REJECTED' AND length(trim(rejection_reason)) > 0) OR
        (status != 'REJECTED' AND rejection_reason IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_observations_user_id    ON user_observations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_species    ON user_observations (species_id) WHERE species_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_observations_pending    ON user_observations (created_at DESC) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_observations_geom       ON user_observations USING GIST (observation_point);

CREATE TRIGGER trg_user_observations_set_timestamp
    BEFORE UPDATE ON user_observations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: notifications
-- Immutable records — created by system events, never updated.
-- TTL: 90 days. Cleaned by scheduled cron job.
-- reference_id: polymorphic FK pointing to the related entity
--   (badge_id, observation_id, expedition_id, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id           UUID              NOT NULL DEFAULT gen_random_uuid(),
    user_id      UUID              NOT NULL,
    type         notification_type NOT NULL,
    title        TEXT              NOT NULL,
    message      TEXT              NOT NULL,
    reference_id UUID                       DEFAULT NULL,
    is_read      BOOLEAN           NOT NULL DEFAULT FALSE,
    read_at      TIMESTAMPTZ                DEFAULT NULL,
    created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    -- No updated_at / deleted_at — immutable notification log

    CONSTRAINT pk_notifications            PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_notifications_title     CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_notifications_message   CHECK (length(trim(message)) > 0),
    CONSTRAINT chk_notifications_read_logic CHECK (
        (is_read = TRUE  AND read_at IS NOT NULL) OR
        (is_read = FALSE AND read_at IS NULL)
    )
);

-- Partial index for unread badge count (most frequent query pattern)
CREATE INDEX IF NOT EXISTS idx_notifications_unread   ON notifications (user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_all      ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type     ON notifications (type, created_at DESC);

-- ==============================================================================
-- DOMAIN: AI CHATBOT (v2.0)
-- Wireframe: Floating AI Widget with Internal Citation Cards, context-aware
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: ai_chat_sessions
-- Tracks chat sessions. user_id = NULL for anonymous users.
-- Anonymous sessions are identified by session_token.
-- Sessions expire after 30 minutes of inactivity (cleaned by cron).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id             UUID              NOT NULL DEFAULT gen_random_uuid(),
    user_id        UUID              DEFAULT NULL,
    session_token  TEXT              NOT NULL,
    context_type   ai_session_context NOT NULL DEFAULT 'GENERAL',
    context_entity_id UUID           DEFAULT NULL,
    started_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    expires_at     TIMESTAMPTZ       NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
    message_count  INTEGER           NOT NULL DEFAULT 0,

    CONSTRAINT pk_ai_chat_sessions        PRIMARY KEY (id),
    CONSTRAINT fk_ai_chat_sessions_user   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_ai_session_token       CHECK (length(trim(session_token)) > 0),
    CONSTRAINT chk_ai_message_count       CHECK (message_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user    ON ai_chat_sessions (user_id, started_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_token   ON ai_chat_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_expires ON ai_chat_sessions (expires_at);

-- ----------------------------------------------------------------------------
-- TABLE: ai_chat_messages
-- Stores conversation history with AI citation tracking.
-- Citations: array of entity references used in the response.
-- Format: [{"entity_type": "species", "entity_id": "uuid", "excerpt": "..."}]
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    session_id    UUID        NOT NULL,
    role          TEXT        NOT NULL,  -- 'user' | 'assistant'
    content       TEXT        NOT NULL,
    citations     JSONB                DEFAULT NULL,
    input_tokens  INTEGER              DEFAULT NULL,
    output_tokens INTEGER              DEFAULT NULL,
    model         TEXT                 DEFAULT 'claude-sonnet-4-20250514',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ai_chat_messages         PRIMARY KEY (id),
    CONSTRAINT fk_ai_chat_messages_session FOREIGN KEY (session_id) REFERENCES ai_chat_sessions (id) ON DELETE CASCADE,
    CONSTRAINT chk_ai_message_role         CHECK (role IN ('user', 'assistant')),
    CONSTRAINT chk_ai_message_content      CHECK (length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session  ON ai_chat_messages (session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created  ON ai_chat_messages (created_at DESC);
-- GIN index for citation analytics (e.g. "how many times was species X referenced?")
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_citations ON ai_chat_messages USING GIN (citations)
    WHERE citations IS NOT NULL;

-- Trigger: auto-update session metadata when new message is added
CREATE OR REPLACE FUNCTION update_ai_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_chat_sessions SET
        last_active_at = NOW(),
        expires_at     = NOW() + INTERVAL '30 minutes',
        message_count  = message_count + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_message_update_session
    AFTER INSERT ON ai_chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_ai_session_on_message();
