-- ==============================================================================
-- DOMAIN: EXPEDITIONS (Cuộc Viễn Chinh)
-- Order: expeditions → expedition_chapters → expedition_audio_cues
--        → expedition_hotspots → expedition_species
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: expeditions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expeditions (
    id               UUID                  NOT NULL DEFAULT gen_random_uuid(),
    slug             TEXT                  NOT NULL,
    title            TEXT                  NOT NULL,
    description      TEXT                           DEFAULT NULL,
    difficulty       expedition_difficulty  NOT NULL,
    duration_minutes SMALLINT              NOT NULL,
    thumbnail_url    TEXT                           DEFAULT NULL,
    location_name    TEXT                           DEFAULT NULL,
    location_lat     NUMERIC(10, 7)                 DEFAULT NULL,
    location_lng     NUMERIC(10, 7)                 DEFAULT NULL,
    xp_reward        INTEGER               NOT NULL DEFAULT 100,
    -- NULL = draft (không public). Khi set published_at → expedition goes live.
    published_at     TIMESTAMPTZ                    DEFAULT NULL,
    created_by       UUID                           DEFAULT NULL,
    updated_by       UUID                           DEFAULT NULL,
    created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ                    DEFAULT NULL,

    CONSTRAINT pk_expeditions              PRIMARY KEY (id),
    CONSTRAINT fk_expeditions_created_by   FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_expeditions_updated_by   FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_expeditions_duration    CHECK (duration_minutes > 0),
    CONSTRAINT chk_expeditions_xp_reward   CHECK (xp_reward >= 0),
    CONSTRAINT chk_expeditions_title       CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_expeditions_thumbnail   CHECK (thumbnail_url IS NULL OR thumbnail_url ~ '^https?://|^/'),
    CONSTRAINT chk_expeditions_lat         CHECK (location_lat IS NULL OR location_lat BETWEEN -90 AND 90),
    CONSTRAINT chk_expeditions_lng         CHECK (location_lng IS NULL OR location_lng BETWEEN -180 AND 180)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_expeditions_slug_uq   ON expeditions (LOWER(slug)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expeditions_published        ON expeditions (published_at DESC) WHERE published_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expeditions_difficulty       ON expeditions (difficulty) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_expeditions_set_timestamp
    BEFORE UPDATE ON expeditions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: expedition_chapters
-- sort_order must be unique per expedition (determines reading sequence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expedition_chapters (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    expedition_id UUID        NOT NULL,
    sort_order    SMALLINT    NOT NULL,
    title         TEXT        NOT NULL,
    subtitle      TEXT                 DEFAULT NULL,
    -- MDX or raw HTML content for the chapter body (rendered by scroll-telling engine)
    content       TEXT        NOT NULL,
    hero_image_url TEXT       NOT NULL,
    image_alt     TEXT        NOT NULL,
    blur_hash     TEXT                 DEFAULT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_expedition_chapters             PRIMARY KEY (id),
    CONSTRAINT fk_expedition_chapters_expedition  FOREIGN KEY (expedition_id) REFERENCES expeditions (id) ON DELETE CASCADE,
    CONSTRAINT chk_expedition_chapters_sort       CHECK (sort_order >= 0),
    CONSTRAINT chk_expedition_chapters_title      CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_expedition_chapters_content    CHECK (length(trim(content)) > 0),
    CONSTRAINT chk_expedition_chapters_img        CHECK (length(trim(hero_image_url)) > 0)
);

-- Enforce reading order uniqueness per expedition
CREATE UNIQUE INDEX IF NOT EXISTS idx_expedition_chapters_order_uq
    ON expedition_chapters (expedition_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_expedition_chapters_exp_id
    ON expedition_chapters (expedition_id, sort_order ASC);

CREATE TRIGGER trg_expedition_chapters_set_timestamp
    BEFORE UPDATE ON expedition_chapters
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: expedition_audio_cues
-- scroll_percent: 0-100, defines when a new audio track crossfades in
-- Supports the Layered Audio system (Section VIII of master plan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expedition_audio_cues (
    id               UUID           NOT NULL DEFAULT gen_random_uuid(),
    chapter_id       UUID           NOT NULL,
    scroll_percent   SMALLINT       NOT NULL,
    track_url        TEXT           NOT NULL,
    fade_in_seconds  NUMERIC(4, 1)  NOT NULL DEFAULT 2.0,
    fade_out_seconds NUMERIC(4, 1)  NOT NULL DEFAULT 2.0,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_expedition_audio_cues            PRIMARY KEY (id),
    CONSTRAINT fk_expedition_audio_cues_chapter    FOREIGN KEY (chapter_id) REFERENCES expedition_chapters (id) ON DELETE CASCADE,
    CONSTRAINT chk_audio_cues_scroll_pct           CHECK (scroll_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_audio_cues_track_url            CHECK (track_url ~ '^https?://|^/'),
    CONSTRAINT chk_audio_cues_fade_in              CHECK (fade_in_seconds > 0),
    CONSTRAINT chk_audio_cues_fade_out             CHECK (fade_out_seconds > 0)
);

CREATE INDEX IF NOT EXISTS idx_expedition_audio_cues_chapter ON expedition_audio_cues (chapter_id, scroll_percent ASC);

-- ----------------------------------------------------------------------------
-- TABLE: expedition_hotspots
-- Hidden discovery points in chapter hero images (Hotspot Exploration - Section VI)
-- x_percent, y_percent: CSS % coordinates on the image
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expedition_hotspots (
    id          UUID           NOT NULL DEFAULT gen_random_uuid(),
    chapter_id  UUID           NOT NULL,
    x_percent   NUMERIC(5, 2)  NOT NULL,
    y_percent   NUMERIC(5, 2)  NOT NULL,
    title       TEXT           NOT NULL,
    description TEXT           NOT NULL,
    image_url   TEXT                    DEFAULT NULL,
    xp_reward   INTEGER        NOT NULL DEFAULT 10,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_expedition_hotspots           PRIMARY KEY (id),
    CONSTRAINT fk_expedition_hotspots_chapter   FOREIGN KEY (chapter_id) REFERENCES expedition_chapters (id) ON DELETE CASCADE,
    CONSTRAINT chk_hotspots_x_pct              CHECK (x_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_hotspots_y_pct              CHECK (y_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_hotspots_title              CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_hotspots_description        CHECK (length(trim(description)) > 0),
    CONSTRAINT chk_hotspots_image_url          CHECK (image_url IS NULL OR image_url ~ '^https?://|^/'),
    CONSTRAINT chk_hotspots_xp_reward          CHECK (xp_reward >= 0)
);

CREATE INDEX IF NOT EXISTS idx_expedition_hotspots_chapter ON expedition_hotspots (chapter_id);

CREATE TRIGGER trg_expedition_hotspots_set_timestamp
    BEFORE UPDATE ON expedition_hotspots
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: expedition_species (Junction: expeditions ↔ species N-N)
-- Links which species are featured/unlockable in each expedition
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expedition_species (
    expedition_id UUID        NOT NULL,
    species_id    UUID        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_expedition_species             PRIMARY KEY (expedition_id, species_id),
    CONSTRAINT fk_expedition_species_expedition  FOREIGN KEY (expedition_id) REFERENCES expeditions (id) ON DELETE CASCADE,
    CONSTRAINT fk_expedition_species_species     FOREIGN KEY (species_id)    REFERENCES species     (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expedition_species_exp_id     ON expedition_species (expedition_id);
CREATE INDEX IF NOT EXISTS idx_expedition_species_species_id ON expedition_species (species_id);
