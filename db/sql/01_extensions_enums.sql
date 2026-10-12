-- ==============================================================================
-- WILDVN WILD ACADEMY — PRODUCTION DATABASE SCHEMA v2.0
-- Engine: PostgreSQL 15+ / Supabase
-- Standard: BCNF, Zero-Trust RLS, UUID PKs, TIMESTAMPTZ, Soft-Delete
-- ==============================================================================

-- ==============================================================================
-- 01. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";           -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";          -- uuid_generate_v4() compat
CREATE EXTENSION IF NOT EXISTS "postgis";            -- Geospatial types & indexes
CREATE EXTENSION IF NOT EXISTS "vector";             -- pgvector: AI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_trgm";            -- Trigram fuzzy text search

-- ==============================================================================
-- 02. ENUM TYPES
-- ==============================================================================

-- Drop existing types to allow clean re-runs of this file
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS xp_source_type CASCADE;
DROP TYPE IF EXISTS taxonomy_rank CASCADE;
DROP TYPE IF EXISTS conservation_status CASCADE;
DROP TYPE IF EXISTS media_type CASCADE;
DROP TYPE IF EXISTS location_type CASCADE;
DROP TYPE IF EXISTS distribution_type CASCADE;
DROP TYPE IF EXISTS relationship_type CASCADE;
DROP TYPE IF EXISTS expedition_difficulty CASCADE;
DROP TYPE IF EXISTS quiz_deck_type CASCADE;
DROP TYPE IF EXISTS question_type CASCADE;
DROP TYPE IF EXISTS observation_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS badge_rarity CASCADE;
DROP TYPE IF EXISTS unlock_source_type CASCADE;
DROP TYPE IF EXISTS taxonomy_domain CASCADE;
DROP TYPE IF EXISTS ai_session_context CASCADE;

CREATE TYPE user_role AS ENUM ('USER', 'MODERATOR', 'ADMIN');

CREATE TYPE xp_source_type AS ENUM (
    'EXPEDITION_COMPLETE',
    'BOSS_CHALLENGE',
    'QUIZ_SESSION',
    'HOTSPOT_DISCOVER',
    'STREAK_BONUS',
    'OBSERVATION_APPROVED',
    'ADMIN_GRANT',
    -- v2.0: from wireframe & domain expertise
    'DAILY_CHALLENGE',
    'EXPLORE_COLLECT',
    'DOMAIN_MILESTONE'
);

CREATE TYPE taxonomy_rank AS ENUM (
    'KINGDOM', 'PHYLUM', 'CLASS', 'ORDER', 'FAMILY', 'GENUS'
);

CREATE TYPE conservation_status AS ENUM (
    'EX',  -- Tuyệt chủng
    'EW',  -- Tuyệt chủng trong tự nhiên
    'CR',  -- Cực kỳ nguy cấp
    'EN',  -- Nguy cấp
    'VU',  -- Sắp nguy cấp
    'NT',  -- Sắp bị đe dọa
    'LC',  -- Ít lo ngại
    'DD',  -- Thiếu dữ liệu
    'NE'   -- Chưa đánh giá
);

CREATE TYPE media_type AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

CREATE TYPE location_type AS ENUM ('PROVINCE', 'ECO_REGION', 'NATIONAL_PARK');

CREATE TYPE distribution_type AS ENUM ('NATIVE', 'ENDEMIC', 'INVASIVE');

CREATE TYPE relationship_type AS ENUM (
    'PREDATOR_PREY', 'SYMBIOSIS', 'PARASITISM', 'COMPETITION', 'COMMENSALISM'
);

CREATE TYPE expedition_difficulty AS ENUM ('beginner', 'intermediate', 'expert');

-- v2.0: extended with 3 wireframe quiz modes
CREATE TYPE quiz_deck_type AS ENUM (
    'FLASHCARD', 'RAPID_FIRE', 'BOSS_CHALLENGE',
    'SURVIVAL', 'BILINGUAL_REFLEX', 'VISUAL_PUZZLE'
);

-- v2.0: extended with SURVIVAL and PUZZLE from legacy schema
CREATE TYPE question_type AS ENUM (
    'MULTIPLE_CHOICE', 'SILHOUETTE', 'HABITAT_MATCH', 'AUDIO_REFLEX',
    'SURVIVAL', 'PUZZLE'
);

CREATE TYPE observation_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- v2.0: extended with wireframe notification events
CREATE TYPE notification_type AS ENUM (
    'BADGE_UNLOCKED', 'LEVEL_UP', 'SPECIES_UNLOCKED',
    'OBSERVATION_APPROVED', 'OBSERVATION_REJECTED',
    'XP_EARNED', 'STREAK_MILESTONE', 'SYSTEM',
    'SPECIES_COLLECTED', 'DOMAIN_EXPERTISE_UP',
    'STREAK_BROKEN', 'DAILY_CHALLENGE_AVAILABLE'
);

CREATE TYPE badge_rarity AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- v2.0: structured unlock tracking (replaces TEXT unlock_source)
CREATE TYPE unlock_source_type AS ENUM (
    'EXPEDITION', 'QUIZ', 'BOSS_CHALLENGE',
    'ADMIN', 'STARTER_GIFT', 'EXPLORE_ZONE'
);

-- v2.0: taxonomy domains for expertise tracking
CREATE TYPE taxonomy_domain AS ENUM (
    'ORNITHOLOGY',     -- Điểu học (Chim)
    'HERPETOLOGY',     -- Bò sát & Lưỡng cư
    'MAMMALOGY',       -- Thú học
    'ICHTHYOLOGY',     -- Ngư học (Cá)
    'ENTOMOLOGY',      -- Côn trùng học
    'BOTANY',          -- Thực vật học
    'MARINE_BIOLOGY',  -- Sinh học biển
    'CONSERVATION'     -- Bảo tồn học (cross-domain)
);

-- v2.0: AI chatbot context tracking
CREATE TYPE ai_session_context AS ENUM (
    'EXPLORE_HOME',
    'EXPLORE_CATALOG',
    'EXPLORE_SPECIES',
    'EXPLORE_MAP',
    'LEARNING_DASHBOARD',
    'LEARNING_QUIZ',
    'LEARNING_FIELD_NOTES',
    'GENERAL'
);
