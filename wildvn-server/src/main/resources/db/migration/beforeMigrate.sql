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
