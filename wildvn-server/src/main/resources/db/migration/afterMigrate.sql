-- Complete the small set of non-crawler tables mapped by Spring JPA. The
-- versioned V1 migration owns users/user_profiles; these tables are created in
-- afterMigrate so user_sessions can safely reference users on a new database.
-- This callback is idempotent and never seeds, updates or deletes rows.

CREATE TABLE IF NOT EXISTS ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    icon_url VARCHAR(255),
    max_xp INTEGER,
    min_xp INTEGER NOT NULL DEFAULT 0,
    name VARCHAR(255) NOT NULL UNIQUE,
    name_vn VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    sort_order SMALLINT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_info JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(255),
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    revoked_at TIMESTAMPTZ,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    error_message TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0,
    target VARCHAR(50) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_suggestions_popularity (
    query VARCHAR(500) PRIMARY KEY,
    click_count BIGINT DEFAULT 0,
    search_count BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_affinities (
    entity_type VARCHAR(50) NOT NULL,
    entity_value VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    score NUMERIC(5, 4),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (entity_type, entity_value, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_failures_target ON sync_failures (target, resolved);
CREATE INDEX IF NOT EXISTS idx_user_affinities_user_id ON user_affinities (user_id);
