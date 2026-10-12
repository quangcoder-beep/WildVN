-- ==============================================================================
-- DOMAIN: GAMIFICATION & PROGRESS
-- Order: user_expedition_progress → user_field_notes → badges → user_badges
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: user_expedition_progress
-- Tracks a user's reading/exploration progress through each expedition.
-- boss_score_percent: score from the Boss Challenge quiz at end of expedition.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_expedition_progress (
    id                  UUID           NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID           NOT NULL,
    expedition_id       UUID           NOT NULL,
    current_chapter_idx SMALLINT       NOT NULL DEFAULT 0,
    completion_percent  NUMERIC(5, 2)  NOT NULL DEFAULT 0.00,
    is_completed        BOOLEAN        NOT NULL DEFAULT FALSE,
    -- Score of the Boss Challenge quiz (NULL until attempted)
    boss_score_percent  NUMERIC(5, 2)           DEFAULT NULL,
    started_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ             DEFAULT NULL,
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_user_expedition_progress              PRIMARY KEY (id),
    CONSTRAINT fk_uep_user                              FOREIGN KEY (user_id)       REFERENCES users       (id) ON DELETE CASCADE,
    CONSTRAINT fk_uep_expedition                        FOREIGN KEY (expedition_id) REFERENCES expeditions (id) ON DELETE CASCADE,
    CONSTRAINT uq_uep_user_expedition                   UNIQUE (user_id, expedition_id),
    CONSTRAINT chk_uep_completion_pct                   CHECK (completion_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_uep_boss_score_pct                   CHECK (boss_score_percent IS NULL OR boss_score_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_uep_chapter_idx                      CHECK (current_chapter_idx >= 0),
    CONSTRAINT chk_uep_completed_at_logic               CHECK (
        (is_completed = TRUE  AND completed_at IS NOT NULL) OR
        (is_completed = FALSE AND completed_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_uep_user_id        ON user_expedition_progress (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_uep_expedition_id  ON user_expedition_progress (expedition_id);
CREATE INDEX IF NOT EXISTS idx_uep_completed      ON user_expedition_progress (user_id) WHERE is_completed = TRUE;

CREATE TRIGGER trg_uep_set_timestamp
    BEFORE UPDATE ON user_expedition_progress
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: user_field_notes ("Pokedex" — Species collection)
-- Created when user unlocks a species via expedition completion, quiz, or explore.
-- mastery_level: 0=Collected, 1-5=Increasing expertise via flashcard reviews.
-- v2.0: unlock_source_type uses native ENUM instead of free-text for type safety.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_field_notes (
    user_id           UUID               NOT NULL,
    species_id        UUID               NOT NULL,
    mastery_level     SMALLINT           NOT NULL DEFAULT 0,
    -- v2.0: structured enum replaces free-text 'unlock_source'
    unlock_source_type unlock_source_type NOT NULL,
    -- Optional: specific entity ID that triggered the unlock
    unlock_source_id  UUID                        DEFAULT NULL,
    collected_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_user_field_notes           PRIMARY KEY (user_id, species_id),
    CONSTRAINT fk_user_field_notes_user      FOREIGN KEY (user_id)    REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_field_notes_species   FOREIGN KEY (species_id) REFERENCES species (id) ON DELETE CASCADE,
    CONSTRAINT chk_user_field_notes_mastery  CHECK (mastery_level BETWEEN 0 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_user_field_notes_user_id     ON user_field_notes (user_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_field_notes_species_id  ON user_field_notes (species_id);
CREATE INDEX IF NOT EXISTS idx_user_field_notes_mastery     ON user_field_notes (user_id, mastery_level DESC);
CREATE INDEX IF NOT EXISTS idx_user_field_notes_source      ON user_field_notes (unlock_source_type);

CREATE TRIGGER trg_user_field_notes_set_timestamp
    BEFORE UPDATE ON user_field_notes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: badges
-- condition_logic (JSONB) stores machine-readable unlock conditions.
-- Example:
--   {"type": "boss_challenge", "expedition_slug": "ky-lan-truong-son", "min_score_pct": 100}
--   {"type": "collection_count", "min_species": 5}
--   {"type": "streak_days", "min_days": 7}
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badges (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    name            TEXT         NOT NULL,
    name_vn         TEXT         NOT NULL,
    description     TEXT                  DEFAULT NULL,
    icon_url        TEXT         NOT NULL,
    condition_logic JSONB        NOT NULL,
    rarity          badge_rarity NOT NULL DEFAULT 'COMMON',
    created_by      UUID                  DEFAULT NULL,
    updated_by      UUID                  DEFAULT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ           DEFAULT NULL,

    CONSTRAINT pk_badges              PRIMARY KEY (id),
    CONSTRAINT fk_badges_created_by   FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_badges_updated_by   FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_badges_name        CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_badges_icon_url    CHECK (icon_url ~ '^https?://|^/')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_name_uq        ON badges (LOWER(name))     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS        idx_badges_rarity         ON badges (rarity)           WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS        idx_badges_condition_gin  ON badges USING GIN (condition_logic);

CREATE TRIGGER trg_badges_set_timestamp
    BEFORE UPDATE ON badges
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: user_badges
-- share_card_url: Pre-rendered social sharing card (Instagram Story / Facebook format)
-- populated by a background job after unlock.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_badges (
    user_id       UUID        NOT NULL,
    badge_id      UUID        NOT NULL,
    unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    share_card_url TEXT                DEFAULT NULL,

    CONSTRAINT pk_user_badges         PRIMARY KEY (user_id, badge_id),
    CONSTRAINT fk_user_badges_user    FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_badges_badge   FOREIGN KEY (badge_id) REFERENCES badges (id) ON DELETE CASCADE,
    CONSTRAINT chk_user_badges_card   CHECK (share_card_url IS NULL OR share_card_url ~ '^https?://|^/')
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id   ON user_badges (user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id  ON user_badges (badge_id);

-- ----------------------------------------------------------------------------
-- TABLE: user_hotspot_discoveries
-- v2.0: Tracks which hidden hotspots in expedition chapters a user has found.
-- Each discovery grants XP (via xp_transactions) and is recorded here.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_hotspot_discoveries (
    user_id    UUID        NOT NULL,
    hotspot_id UUID        NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_user_hotspot_disc           PRIMARY KEY (user_id, hotspot_id),
    CONSTRAINT fk_uhd_user                   FOREIGN KEY (user_id)    REFERENCES users               (id) ON DELETE CASCADE,
    CONSTRAINT fk_uhd_hotspot                FOREIGN KEY (hotspot_id) REFERENCES expedition_hotspots (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_uhd_user_id    ON user_hotspot_discoveries (user_id, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_uhd_hotspot_id ON user_hotspot_discoveries (hotspot_id);

-- ----------------------------------------------------------------------------
-- TABLE: user_domain_expertise
-- v2.0: Tracks user expertise per taxonomy domain (Ornithology, Mammalogy, etc.)
-- Auto-updated via trigger on user_field_notes changes.
-- expertise_score: 0-1000, formula = SUM(mastery_level) × 20, capped at 1000
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_domain_expertise (
    user_id          UUID            NOT NULL,
    domain           taxonomy_domain NOT NULL,
    expertise_score  INTEGER         NOT NULL DEFAULT 0,
    species_count    INTEGER         NOT NULL DEFAULT 0,
    mastered_count   INTEGER         NOT NULL DEFAULT 0,
    last_updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_user_domain_expertise      PRIMARY KEY (user_id, domain),
    CONSTRAINT fk_ude_user                   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_ude_expertise_score       CHECK (expertise_score >= 0 AND expertise_score <= 1000),
    CONSTRAINT chk_ude_species_count         CHECK (species_count >= 0),
    CONSTRAINT chk_ude_mastered_count        CHECK (mastered_count >= 0 AND mastered_count <= species_count)
);

CREATE INDEX IF NOT EXISTS idx_ude_user_id ON user_domain_expertise (user_id, expertise_score DESC);
CREATE INDEX IF NOT EXISTS idx_ude_domain  ON user_domain_expertise (domain, expertise_score DESC);

-- Function: recalculate expertise for a user's domain based on their field notes
CREATE OR REPLACE FUNCTION refresh_user_domain_expertise(p_user_id UUID, p_species_id UUID)
RETURNS VOID AS $$
DECLARE
    v_domain taxonomy_domain;
BEGIN
    SELECT domain INTO v_domain FROM species WHERE id = p_species_id AND deleted_at IS NULL;
    IF v_domain IS NULL THEN RETURN; END IF;

    INSERT INTO user_domain_expertise (user_id, domain, species_count, mastered_count, expertise_score, last_updated_at)
    SELECT
        p_user_id,
        v_domain,
        COUNT(*),
        COUNT(*) FILTER (WHERE ufn.mastery_level = 5),
        LEAST(SUM(ufn.mastery_level) * 20, 1000),
        NOW()
    FROM user_field_notes ufn
    JOIN species s ON ufn.species_id = s.id
    WHERE ufn.user_id = p_user_id
      AND s.domain = v_domain
      AND s.deleted_at IS NULL
    ON CONFLICT (user_id, domain) DO UPDATE SET
        species_count    = EXCLUDED.species_count,
        mastered_count   = EXCLUDED.mastered_count,
        expertise_score  = EXCLUDED.expertise_score,
        last_updated_at  = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-refresh domain expertise when field notes change
CREATE OR REPLACE FUNCTION trg_refresh_domain_expertise()
RETURNS TRIGGER AS $$
BEGIN
    -- Works for both INSERT and UPDATE (NEW is always available)
    PERFORM refresh_user_domain_expertise(NEW.user_id, NEW.species_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ufn_domain_expertise
    AFTER INSERT OR UPDATE OF mastery_level ON user_field_notes
    FOR EACH ROW EXECUTE FUNCTION trg_refresh_domain_expertise();
