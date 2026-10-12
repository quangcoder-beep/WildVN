-- SOURCE-DERIVED TEST FIXTURE; NOT a live PostgreSQL snapshot or a production migration.
-- Ordered Spring Flyway inputs copied verbatim; no fabricated migration history.
-- Restore only into an empty disposable database with build/restore-fixture.sh.

-- SOURCE: beforeMigrate.sql
-- Non-destructive bootstrap for the crawler tables used by Spring.
-- Flyway executes this callback before validating/running versioned
-- migrations, so V2's baseline guard also works on a brand-new database.
-- Every object is created with IF NOT EXISTS; no rows are deleted or changed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    CREATE TYPE "TaxonomyRank" AS ENUM ('KINGDOM', 'PHYLUM', 'CLASS', 'ORDER', 'FAMILY', 'GENUS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ConservationStatus" AS ENUM ('EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "LocationType" AS ENUM ('PROVINCE', 'ECO_REGION', 'NATIONAL_PARK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "DistributionType" AS ENUM ('NATIVE', 'ENDEMIC', 'INVASIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "VnRedListStatus" AS ENUM ('EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "CitesAppendix" AS ENUM ('I', 'II', 'III', 'NONE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "VnDecreeStatus" AS ENUM ('GROUP_IA', 'GROUP_IB', 'GROUP_IIA', 'GROUP_IIB', 'NONE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "DietType" AS ENUM ('CARNIVORE', 'HERBIVORE', 'OMNIVORE', 'INSECTIVORE', 'AUTOTROPH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "HabitatType" AS ENUM ('TERRESTRIAL', 'FRESHWATER', 'MARINE', 'CANOPY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ActivityPattern" AS ENUM ('DIURNAL', 'NOCTURNAL', 'CREPUSCULAR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS taxonomy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID,
    rank "TaxonomyRank" NOT NULL,
    scientific_name VARCHAR(255) NOT NULL,
    name_vn VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ecosystems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    climate VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    gallery_urls TEXT,
    location_description TEXT,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(255),
    slug VARCHAR(255) NOT NULL,
    species_count INTEGER NOT NULL DEFAULT 0,
    threats TEXT,
    thumbnail_url VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS species (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxonomy_id UUID NOT NULL,
    slug VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255) NOT NULL,
    name_vn VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    author_citation VARCHAR(255),
    synonyms TEXT[] DEFAULT ARRAY[]::TEXT[],
    identification_desc TEXT,
    biology_desc TEXT,
    threats_desc TEXT,
    conservation_desc TEXT,
    diet_type "DietType",
    habitat_type "HabitatType"[] DEFAULT ARRAY[]::"HabitatType"[],
    activity_pattern "ActivityPattern",
    conservation_status VARCHAR(255) NOT NULL,
    vn_redlist_status "VnRedListStatus",
    cites_appendix "CitesAppendix" DEFAULT 'NONE',
    vn_decree_status "VnDecreeStatus" DEFAULT 'NONE',
    publish_status "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    source_references JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    category VARCHAR(255),
    description TEXT,
    diet TEXT,
    fun_facts TEXT,
    gallery_urls TEXT,
    habitat VARCHAR(255),
    lesson_ids VARCHAR(255),
    related_species_ids VARCHAR(255),
    tags VARCHAR(255),
    thumbnail_url VARCHAR(255),
    ecosystem_id UUID
);

CREATE TABLE IF NOT EXISTS species_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species_id UUID NOT NULL,
    type "MediaType" NOT NULL,
    url TEXT NOT NULL,
    caption TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type "LocationType" NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    climate VARCHAR(255),
    description TEXT,
    gallery_urls JSONB DEFAULT '[]'::jsonb,
    location_description TEXT,
    region VARCHAR(255),
    slug VARCHAR(255) NOT NULL,
    threats TEXT,
    thumbnail_url TEXT
);

CREATE TABLE IF NOT EXISTS species_locations (
    species_id UUID NOT NULL,
    location_id UUID NOT NULL,
    distribution_type "DistributionType" NOT NULL DEFAULT 'NATIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (species_id, location_id)
);

CREATE TABLE IF NOT EXISTS conservation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species_id UUID NOT NULL,
    old_status "ConservationStatus",
    new_status "ConservationStatus" NOT NULL,
    changed_at DATE NOT NULL,
    source TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_favorites (
    user_id VARCHAR(255) NOT NULL,
    species_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, species_id)
);

CREATE TABLE IF NOT EXISTS academy_progress (
    user_id VARCHAR(255) NOT NULL PRIMARY KEY,
    rp_points INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 0,
    unlocked_species JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_active_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_expeditions JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_taxonomy_unique_node ON taxonomy (parent_id, scientific_name, rank);
CREATE INDEX IF NOT EXISTS idx_taxonomy_parent_id ON taxonomy (parent_id);
CREATE INDEX IF NOT EXISTS idx_species_taxonomy_status ON species (taxonomy_id, conservation_status);
CREATE INDEX IF NOT EXISTS idx_species_created_at_desc ON species (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_species_media_species_id ON species_media (species_id);
CREATE INDEX IF NOT EXISTS idx_species_locations_lookup ON species_locations (location_id, species_id);
CREATE INDEX IF NOT EXISTS idx_conservation_history_species ON conservation_history (species_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ecosystems_slug ON ecosystems (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_slug ON locations (slug);

DO $$ BEGIN
    ALTER TABLE taxonomy ADD CONSTRAINT taxonomy_parent_id_fkey
        FOREIGN KEY (parent_id) REFERENCES taxonomy(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE species ADD CONSTRAINT species_taxonomy_id_fkey
        FOREIGN KEY (taxonomy_id) REFERENCES taxonomy(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE species ADD CONSTRAINT species_ecosystem_id_fkey
        FOREIGN KEY (ecosystem_id) REFERENCES ecosystems(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE species_media ADD CONSTRAINT species_media_species_id_fkey
        FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE species_locations ADD CONSTRAINT species_locations_species_id_fkey
        FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE species_locations ADD CONSTRAINT species_locations_location_id_fkey
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE conservation_history ADD CONSTRAINT conservation_history_species_id_fkey
        FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_species_id_fkey
        FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- SOURCE: V0__postgres_extensions.sql
-- Extensions required by the Spring-owned schema. This migration runs before
-- V1 on a brand-new database; existing databases are protected by the
-- baseline at version 1 and are not modified by it.
CREATE EXTENSION IF NOT EXISTS pgcrypto;    

-- SOURCE: V1__init_users.sql
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE auth_provider AS ENUM ('LOCAL', 'GOOGLE', 'FACEBOOK');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    auth_provider auth_provider NOT NULL DEFAULT 'LOCAL',
    provider_id VARCHAR(255),
    role user_role NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    avatar_url VARCHAR(255),
    bio TEXT,
    conservation_identity VARCHAR(255),
    headphone_preference BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- SOURCE: V2__baseline_crawler_schema.sql
-- Immutable baseline guard for the crawler schema already provisioned in PostgreSQL.
-- The imported database is the source of truth for existing rows; this migration
-- deliberately performs no DROP/ALTER/DELETE. It only prevents a Spring deploy
-- from silently starting against a partial schema.
DO $$
DECLARE
    missing_tables text[];
BEGIN
    SELECT ARRAY(
        SELECT required.table_name
        FROM (VALUES
            ('taxonomy'),
            ('species'),
            ('species_media'),
            ('locations'),
            ('species_locations'),
            ('conservation_history'),
            ('ecosystems'),
            ('user_favorites'),
            ('academy_progress')
        ) AS required(table_name)
        WHERE to_regclass('public.' || required.table_name) IS NULL
    ) INTO missing_tables;

    IF cardinality(missing_tables) > 0 THEN
        RAISE EXCEPTION
            'WildVN crawler schema baseline is incomplete; missing tables: %',
            array_to_string(missing_tables, ', ');
    END IF;
END $$;


-- SOURCE: V3__academy_completed_expeditions.sql
-- Preserve the complete client Academy state across devices.
ALTER TABLE academy_progress
    ADD COLUMN IF NOT EXISTS completed_expeditions JSONB NOT NULL DEFAULT '[]'::jsonb;


-- SOURCE: V4__chat_history.sql
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chat_messages_role_check CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
    ON chat_sessions (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires_at
    ON chat_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
    ON chat_messages (session_id, created_at ASC);


-- SOURCE: afterMigrate.sql
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

