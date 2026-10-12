-- ==============================================================================
-- DOMAIN: CONTENT & SPECIES
-- Order: taxonomy → species → species_media → locations → species_locations
--        → species_relationships → conservation_history → species_embeddings
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: taxonomy (Self-referencing tree: Kingdom→Phylum→Class→Order→Family→Genus)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS taxonomy (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    parent_id       UUID                   DEFAULT NULL,
    rank            taxonomy_rank NOT NULL,
    scientific_name TEXT          NOT NULL,
    name_vn         TEXT                   DEFAULT NULL,
    created_by      UUID                   DEFAULT NULL,
    updated_by      UUID                   DEFAULT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ            DEFAULT NULL,

    CONSTRAINT pk_taxonomy             PRIMARY KEY (id),
    CONSTRAINT fk_taxonomy_parent      FOREIGN KEY (parent_id)   REFERENCES taxonomy (id) ON DELETE RESTRICT,
    CONSTRAINT fk_taxonomy_created_by  FOREIGN KEY (created_by)  REFERENCES users (id)    ON DELETE SET NULL,
    CONSTRAINT fk_taxonomy_updated_by  FOREIGN KEY (updated_by)  REFERENCES users (id)    ON DELETE SET NULL,
    CONSTRAINT chk_taxonomy_no_self    CHECK (id != parent_id),
    CONSTRAINT chk_taxonomy_name       CHECK (length(trim(scientific_name)) > 0)
);

-- Unique node: same scientific_name cannot appear twice at same parent+rank
CREATE UNIQUE INDEX IF NOT EXISTS idx_taxonomy_unique_node
    ON taxonomy (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(scientific_name), rank)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_taxonomy_parent_id ON taxonomy (parent_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_rank      ON taxonomy (rank) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_taxonomy_set_timestamp
    BEFORE UPDATE ON taxonomy
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger: validate parent rank is strictly higher than child rank
CREATE OR REPLACE FUNCTION validate_taxonomy_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_rank taxonomy_rank;
    v_rank_map    INTEGER;
    v_parent_map  INTEGER;
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        SELECT rank INTO v_parent_rank FROM taxonomy WHERE id = NEW.parent_id;

        v_rank_map   := CASE NEW.rank
            WHEN 'KINGDOM' THEN 1 WHEN 'PHYLUM' THEN 2 WHEN 'CLASS' THEN 3
            WHEN 'ORDER'   THEN 4 WHEN 'FAMILY' THEN 5 WHEN 'GENUS' THEN 6 END;
        v_parent_map := CASE v_parent_rank
            WHEN 'KINGDOM' THEN 1 WHEN 'PHYLUM' THEN 2 WHEN 'CLASS' THEN 3
            WHEN 'ORDER'   THEN 4 WHEN 'FAMILY' THEN 5 WHEN 'GENUS' THEN 6 END;

        IF v_rank_map <= v_parent_map THEN
            RAISE EXCEPTION 'Taxonomy hierarchy violation: parent rank (%) must be higher than child rank (%)',
                v_parent_rank, NEW.rank;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_taxonomy_validate_hierarchy
    BEFORE INSERT OR UPDATE ON taxonomy
    FOR EACH ROW EXECUTE FUNCTION validate_taxonomy_hierarchy();

-- ----------------------------------------------------------------------------
-- TABLE: species
-- Note: habitat_type + background_tint support the Cinematic Storytelling System
--       (Section VII of master plan): bg tint changes per habitat being read.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS species (
    id                  UUID                NOT NULL DEFAULT gen_random_uuid(),
    taxonomy_id         UUID                NOT NULL,
    slug                TEXT                NOT NULL,
    scientific_name     TEXT                NOT NULL,
    name_vn             TEXT                NOT NULL,
    conservation_status conservation_status NOT NULL,
    identification_desc TEXT                         DEFAULT NULL,
    biology_desc        TEXT                         DEFAULT NULL,
    threats_desc        TEXT                         DEFAULT NULL,
    conservation_desc   TEXT                         DEFAULT NULL,
    habitat_type        TEXT                         DEFAULT NULL,
    -- Hex/CSS color for cinematic mode bg tint (e.g. '#2D4A3E' for rainforest)
    background_tint     TEXT                         DEFAULT NULL,
    -- v2.0: taxonomy domain for expertise tracking (Ornithology, Mammalogy, etc.)
    domain              taxonomy_domain              DEFAULT NULL,
    -- Generated full-text search vector (weighted: A=names, B=identification, C=rest)
    search_vector       TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', COALESCE(scientific_name, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(name_vn, '')),         'A') ||
        setweight(to_tsvector('simple', COALESCE(identification_desc, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(biology_desc, '')),    'C') ||
        setweight(to_tsvector('simple', COALESCE(threats_desc, '')),    'C') ||
        setweight(to_tsvector('simple', COALESCE(conservation_desc, '')), 'C')
    ) STORED,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ          DEFAULT NULL,

    CONSTRAINT pk_species                 PRIMARY KEY (id),
    CONSTRAINT fk_species_taxonomy        FOREIGN KEY (taxonomy_id)  REFERENCES taxonomy (id) ON DELETE RESTRICT,
    CONSTRAINT fk_species_created_by      FOREIGN KEY (created_by)   REFERENCES users (id)    ON DELETE SET NULL,
    CONSTRAINT fk_species_updated_by      FOREIGN KEY (updated_by)   REFERENCES users (id)    ON DELETE SET NULL,
    CONSTRAINT chk_species_slug_fmt       CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT chk_species_name_vn        CHECK (length(trim(name_vn)) > 0),
    CONSTRAINT chk_species_scientific     CHECK (length(trim(scientific_name)) > 0),
    CONSTRAINT chk_species_bg_tint        CHECK (background_tint IS NULL OR background_tint ~ '^#[0-9A-Fa-f]{3,8}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_species_slug_uq          ON species (LOWER(slug))            WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_species_scientific_uq    ON species (LOWER(scientific_name)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS        idx_species_taxonomy_status  ON species (taxonomy_id, conservation_status)
    INCLUDE (scientific_name, name_vn, slug);
CREATE INDEX IF NOT EXISTS        idx_species_created_desc     ON species (created_at DESC)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS        idx_species_active           ON species (id)                     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS        idx_species_search_vector    ON species USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS        idx_species_name_trgm        ON species USING GIN (name_vn gin_trgm_ops);
-- v2.0: domain index for expertise queries
CREATE INDEX IF NOT EXISTS        idx_species_domain           ON species (domain) WHERE domain IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_species_set_timestamp
    BEFORE UPDATE ON species
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: species_media
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS species_media (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    species_id UUID        NOT NULL,
    type       media_type  NOT NULL,
    url        TEXT        NOT NULL,
    caption    TEXT                 DEFAULT NULL,
    -- v2.0: BlurHash for progressive image loading in species catalog/hero
    blur_hash  TEXT                 DEFAULT NULL,
    is_primary BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order SMALLINT    NOT NULL DEFAULT 0,
    created_by UUID                 DEFAULT NULL,
    updated_by UUID                 DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ          DEFAULT NULL,

    CONSTRAINT pk_species_media           PRIMARY KEY (id),
    CONSTRAINT fk_species_media_species   FOREIGN KEY (species_id) REFERENCES species (id) ON DELETE CASCADE,
    CONSTRAINT fk_species_media_created   FOREIGN KEY (created_by) REFERENCES users (id)   ON DELETE SET NULL,
    CONSTRAINT fk_species_media_updated   FOREIGN KEY (updated_by) REFERENCES users (id)   ON DELETE SET NULL,
    CONSTRAINT chk_species_media_url      CHECK (url ~ '^https?://|^/'),
    CONSTRAINT chk_species_media_order    CHECK (sort_order >= 0)
);

-- Only 1 primary media per species
CREATE UNIQUE INDEX IF NOT EXISTS idx_species_media_primary_uq
    ON species_media (species_id) WHERE is_primary = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_species_media_species_id ON species_media (species_id, sort_order);

CREATE TRIGGER trg_species_media_set_timestamp
    BEFORE UPDATE ON species_media
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: locations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id            UUID          NOT NULL DEFAULT gen_random_uuid(),
    name          TEXT          NOT NULL,
    type          location_type NOT NULL,
    geom          GEOMETRY(Geometry, 4326) NOT NULL,
    -- v2.0: ISO 3166-2:VN code for Leaflet/GeoJSON integration (e.g. 'HP', 'HN', 'TT-HUE')
    province_code TEXT                   DEFAULT NULL,
    created_by    UUID                   DEFAULT NULL,
    updated_by    UUID                   DEFAULT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ            DEFAULT NULL,

    CONSTRAINT pk_locations            PRIMARY KEY (id),
    CONSTRAINT fk_locations_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_locations_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_locations_name      CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_locations_geom_type CHECK (GeometryType(geom) IN ('POINT','POLYGON','MULTIPOLYGON')),
    CONSTRAINT chk_locations_prov_code CHECK (province_code IS NULL OR province_code ~ '^[A-Z0-9\-]{1,10}$')
);

CREATE INDEX IF NOT EXISTS idx_locations_geom          ON locations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_locations_type          ON locations (type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_province_code ON locations (province_code) WHERE province_code IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_locations_set_timestamp
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: species_locations (Junction: species ↔ locations N-N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS species_locations (
    species_id        UUID              NOT NULL,
    location_id       UUID              NOT NULL,
    distribution_type distribution_type NOT NULL DEFAULT 'NATIVE',
    created_by        UUID                       DEFAULT NULL,
    created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_species_locations          PRIMARY KEY (species_id, location_id),
    CONSTRAINT fk_species_locations_species  FOREIGN KEY (species_id)  REFERENCES species   (id) ON DELETE CASCADE,
    CONSTRAINT fk_species_locations_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
    CONSTRAINT fk_species_locations_created  FOREIGN KEY (created_by)  REFERENCES users     (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_species_locations_lookup ON species_locations (location_id, species_id);
CREATE INDEX IF NOT EXISTS idx_species_locations_spec   ON species_locations (species_id);

-- ----------------------------------------------------------------------------
-- TABLE: species_relationships (Ecological relationships between 2 species)
-- Constraint: species_id_1 < species_id_2 prevents storing A→B and B→A as duplicates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS species_relationships (
    id                UUID              NOT NULL DEFAULT gen_random_uuid(),
    species_id_1      UUID              NOT NULL,
    species_id_2      UUID              NOT NULL,
    relationship_type relationship_type NOT NULL,
    description       TEXT                       DEFAULT NULL,
    created_by        UUID                       DEFAULT NULL,
    updated_by        UUID                       DEFAULT NULL,
    created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ                DEFAULT NULL,

    CONSTRAINT pk_species_relationships           PRIMARY KEY (id),
    CONSTRAINT fk_species_rel_s1                  FOREIGN KEY (species_id_1) REFERENCES species (id) ON DELETE CASCADE,
    CONSTRAINT fk_species_rel_s2                  FOREIGN KEY (species_id_2) REFERENCES species (id) ON DELETE CASCADE,
    CONSTRAINT fk_species_rel_created_by          FOREIGN KEY (created_by)   REFERENCES users   (id) ON DELETE SET NULL,
    CONSTRAINT fk_species_rel_updated_by          FOREIGN KEY (updated_by)   REFERENCES users   (id) ON DELETE SET NULL,
    CONSTRAINT chk_species_rel_no_self            CHECK (species_id_1 != species_id_2),
    CONSTRAINT chk_species_rel_canonical_order    CHECK (species_id_1 < species_id_2)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_species_rel_unique
    ON species_relationships (species_id_1, species_id_2, relationship_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_species_rel_s1 ON species_relationships (species_id_1);
CREATE INDEX IF NOT EXISTS idx_species_rel_s2 ON species_relationships (species_id_2);

CREATE TRIGGER trg_species_rel_set_timestamp
    BEFORE UPDATE ON species_relationships
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: conservation_history (Immutable audit trail of status changes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conservation_history (
    id         UUID                NOT NULL DEFAULT gen_random_uuid(),
    species_id UUID                NOT NULL,
    old_status conservation_status          DEFAULT NULL, -- NULL for the very first record
    new_status conservation_status NOT NULL,
    changed_at DATE                NOT NULL,
    source     TEXT                NOT NULL, -- e.g. 'IUCN Red List 2024'
    notes      TEXT                         DEFAULT NULL,
    created_by UUID                         DEFAULT NULL,
    created_at TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    -- No updated_at / deleted_at — immutable scientific record

    CONSTRAINT pk_conservation_history           PRIMARY KEY (id),
    CONSTRAINT fk_conservation_history_species   FOREIGN KEY (species_id) REFERENCES species (id) ON DELETE CASCADE,
    CONSTRAINT fk_conservation_history_created   FOREIGN KEY (created_by) REFERENCES users   (id) ON DELETE SET NULL,
    CONSTRAINT chk_conservation_status_changed   CHECK (old_status IS DISTINCT FROM new_status),
    CONSTRAINT chk_conservation_source_not_empty CHECK (length(trim(source)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_conservation_history_species ON conservation_history (species_id, changed_at DESC);

-- ----------------------------------------------------------------------------
-- TABLE: species_embeddings (AI/RAG vector embeddings)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS species_embeddings (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    species_id  UUID        NOT NULL,
    chunk_text  TEXT        NOT NULL,
    chunk_index INTEGER     NOT NULL,
    embedding   VECTOR(1536) NOT NULL, -- OpenAI text-embedding-3-small dimension
    source_info JSONB                DEFAULT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_species_embeddings        PRIMARY KEY (id),
    CONSTRAINT fk_species_embeddings_species FOREIGN KEY (species_id) REFERENCES species (id) ON DELETE CASCADE,
    CONSTRAINT chk_species_embed_chunk_idx  CHECK (chunk_index >= 0),
    CONSTRAINT chk_species_embed_text       CHECK (length(trim(chunk_text)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_species_embeddings_chunk_uq ON species_embeddings (species_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_species_embeddings_pagination       ON species_embeddings (species_id, created_at DESC);
-- HNSW index for approximate nearest-neighbor vector search (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_species_embeddings_hnsw
    ON species_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
