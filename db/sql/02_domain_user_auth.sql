-- ==============================================================================
-- DOMAIN: USER & AUTH (v2.0)
-- Order: ranks → users → user_profiles → user_sessions → user_streaks
--        → xp_transactions → daily_challenges
-- ==============================================================================

-- Shared updated_at trigger function (used across all domains)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TABLE: ranks (Cấp bậc) — created BEFORE users for FK dependency
-- v2.0: moved before users so rank_id FK can reference it
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ranks (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL,
    name_vn    TEXT        NOT NULL,
    slug       TEXT        NOT NULL,
    min_xp     INTEGER     NOT NULL DEFAULT 0,
    max_xp     INTEGER              DEFAULT NULL, -- NULL = highest rank (no ceiling)
    icon_url   TEXT                 DEFAULT NULL,
    sort_order SMALLINT    NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ranks          PRIMARY KEY (id),
    CONSTRAINT uq_ranks_name     UNIQUE (name),
    CONSTRAINT uq_ranks_slug     UNIQUE (slug),
    CONSTRAINT uq_ranks_order    UNIQUE (sort_order),
    CONSTRAINT chk_ranks_min_xp  CHECK (min_xp >= 0),
    CONSTRAINT chk_ranks_xp_range CHECK (max_xp IS NULL OR max_xp > min_xp)
);

-- ----------------------------------------------------------------------------
-- TABLE: users
-- v2.0: added rank_id FK for direct relationship to ranks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    username      TEXT        NOT NULL,
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    role          user_role   NOT NULL DEFAULT 'USER',
    xp            INTEGER     NOT NULL DEFAULT 0,
    level         SMALLINT    NOT NULL DEFAULT 1,
    -- v2.0: direct FK to ranks (set by trigger alongside level)
    rank_id       UUID                 DEFAULT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ          DEFAULT NULL,

    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT fk_users_rank           FOREIGN KEY (rank_id) REFERENCES ranks (id) ON DELETE SET NULL,
    CONSTRAINT chk_users_xp_positive   CHECK (xp >= 0),
    CONSTRAINT chk_users_level_min     CHECK (level >= 1),
    CONSTRAINT chk_users_username_fmt  CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
    CONSTRAINT chk_users_email_fmt     CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
);

-- Soft-delete aware unique indexes (natural keys)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_uq    ON users (LOWER(email))    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_uq ON users (LOWER(username)) WHERE deleted_at IS NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_xp_rank     ON users (xp DESC, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active      ON users (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role        ON users (role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_rank_id     ON users (rank_id) WHERE rank_id IS NOT NULL;

-- Auto-update trigger
CREATE TRIGGER trg_users_set_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: user_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id                    UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id               UUID        NOT NULL,
    avatar_url            TEXT                 DEFAULT NULL,
    bio                   TEXT                 DEFAULT NULL,
    -- "Nhà nghiên cứu sinh cảnh Rừng Mưa - Đã khám phá 12/50 loài"
    conservation_identity TEXT                 DEFAULT NULL,
    headphone_preference  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_user_profiles        PRIMARY KEY (id),
    CONSTRAINT fk_user_profiles_user   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_profiles_user   UNIQUE (user_id),
    CONSTRAINT chk_user_profiles_avatar CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://')
);

CREATE TRIGGER trg_user_profiles_set_timestamp
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: user_sessions (refresh token tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id            UUID        NOT NULL,
    refresh_token_hash TEXT        NOT NULL,
    device_info        JSONB                DEFAULT NULL,
    ip_address         INET                 DEFAULT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ          DEFAULT NULL,

    CONSTRAINT pk_user_sessions            PRIMARY KEY (id),
    CONSTRAINT fk_user_sessions_user       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_sessions_token      UNIQUE (refresh_token_hash),
    CONSTRAINT chk_user_sessions_expiry    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id   ON user_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active    ON user_sessions (user_id) WHERE revoked_at IS NULL;
-- Sessions expire after 30 days — clean up via cron: DELETE FROM user_sessions WHERE expires_at < NOW()

-- ----------------------------------------------------------------------------
-- TABLE: user_streaks
-- Constraint: chỉ 1 active streak (ended_at IS NULL) per user at a time
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_streaks (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    current_count   INTEGER     NOT NULL DEFAULT 1,
    longest_count   INTEGER     NOT NULL DEFAULT 1,
    last_active_date DATE       NOT NULL DEFAULT CURRENT_DATE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ          DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_user_streaks           PRIMARY KEY (id),
    CONSTRAINT fk_user_streaks_user      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_user_streaks_current  CHECK (current_count >= 1),
    CONSTRAINT chk_user_streaks_longest  CHECK (longest_count >= current_count)
);

-- Only 1 active streak per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_streaks_active_uq ON user_streaks (user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks (user_id, created_at DESC);

CREATE TRIGGER trg_user_streaks_set_timestamp
    BEFORE UPDATE ON user_streaks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: xp_transactions (Immutable XP Ledger)
-- Lý do: Không bao giờ xóa hay sửa. Đây là nguồn sự thật (source of truth) của XP.
-- users.xp là denormalized cache, được sync qua trigger.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xp_transactions (
    id          UUID           NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID           NOT NULL,
    amount      INTEGER        NOT NULL,
    source_type xp_source_type NOT NULL,
    source_id   UUID                    DEFAULT NULL, -- Points to expedition_id, quiz_session_id, etc.
    description TEXT           NOT NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_xp_transactions        PRIMARY KEY (id),
    CONSTRAINT fk_xp_transactions_user   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_xp_transactions_amount CHECK (amount > 0),
    CONSTRAINT chk_xp_transactions_desc   CHECK (length(trim(description)) > 0)
    -- No updated_at, no deleted_at — immutable ledger
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user    ON xp_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source  ON xp_transactions (source_type, source_id) WHERE source_id IS NOT NULL;

-- Trigger: sync users.xp when a new xp_transaction is inserted
CREATE OR REPLACE FUNCTION sync_user_xp_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET xp = xp + NEW.amount
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_xp_transactions_sync_user_xp
    AFTER INSERT ON xp_transactions
    FOR EACH ROW EXECUTE FUNCTION sync_user_xp_on_transaction();

-- ----------------------------------------------------------------------------
-- Trigger: auto-update users.level AND users.rank_id when users.xp changes
-- v2.0: now also sets rank_id FK alongside level
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_user_level_on_xp_change()
RETURNS TRIGGER AS $$
DECLARE
    v_rank RECORD;
BEGIN
    IF NEW.xp IS DISTINCT FROM OLD.xp THEN
        SELECT id, sort_order INTO v_rank
        FROM ranks
        WHERE min_xp <= NEW.xp
          AND (max_xp IS NULL OR max_xp >= NEW.xp)
        ORDER BY sort_order DESC
        LIMIT 1;

        IF v_rank IS NOT NULL THEN
            NEW.level   = v_rank.sort_order;
            NEW.rank_id = v_rank.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_sync_level
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION sync_user_level_on_xp_change();

-- ----------------------------------------------------------------------------
-- TABLE: daily_challenges
-- v2.0: Wireframe "Khối Nhiệm Vụ Hôm Nay" — 3 daily tasks for XP
-- Challenges are generated per day (via cron or on-demand) and stored here.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_challenges (
    id           UUID           NOT NULL DEFAULT gen_random_uuid(),
    user_id      UUID           NOT NULL,
    challenge_date DATE         NOT NULL DEFAULT CURRENT_DATE,
    title        TEXT           NOT NULL,
    description  TEXT           NOT NULL,
    -- What the user needs to do (machine-readable)
    -- e.g. {"type": "collect_species", "count": 1} or {"type": "complete_quiz", "deck_type": "RAPID_FIRE"}
    condition    JSONB          NOT NULL,
    xp_reward    INTEGER        NOT NULL DEFAULT 25,
    is_completed BOOLEAN        NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ             DEFAULT NULL,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_daily_challenges          PRIMARY KEY (id),
    CONSTRAINT fk_daily_challenges_user     FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_dc_xp_reward             CHECK (xp_reward > 0),
    CONSTRAINT chk_dc_title                 CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_dc_completed_logic       CHECK (
        (is_completed = TRUE AND completed_at IS NOT NULL) OR
        (is_completed = FALSE AND completed_at IS NULL)
    )
);

-- Max 3 challenges per user per day
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges (user_id, challenge_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_pending   ON daily_challenges (user_id, challenge_date)
    WHERE is_completed = FALSE;
