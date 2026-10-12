## BƯỚC 2: RELATIONAL MODEL (RM)

---

### Domain: User & Auth

```
users (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
        username            : TEXT               NOT NULL UNIQUE
        email               : TEXT               NOT NULL UNIQUE
        password_hash       : TEXT               NOT NULL
        role                : user_role          NOT NULL DEFAULT 'USER'
        xp                  : INTEGER            NOT NULL DEFAULT 0 CHECK(xp >= 0)
        level               : SMALLINT           NOT NULL DEFAULT 1 CHECK(level >= 1)
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)

user_profiles (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
        avatar_url          : TEXT               DEFAULT NULL
        bio                 : TEXT               DEFAULT NULL
        conservation_identity : TEXT            DEFAULT NULL  -- "Nhà nghiên cứu rừng mưa..."
        headphone_preference : BOOLEAN          NOT NULL DEFAULT FALSE
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)

user_sessions (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
        refresh_token_hash  : TEXT               NOT NULL UNIQUE
        device_info         : JSONB              DEFAULT NULL
        ip_address          : INET               DEFAULT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        expires_at          : TIMESTAMPTZ        NOT NULL
        revoked_at          : TIMESTAMPTZ        DEFAULT NULL
)

user_streaks (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
        current_count       : INTEGER            NOT NULL DEFAULT 1 CHECK(current_count >= 1)
        longest_count       : INTEGER            NOT NULL DEFAULT 1 CHECK(longest_count >= 1)
        last_active_date    : DATE               NOT NULL DEFAULT CURRENT_DATE
        started_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        ended_at            : TIMESTAMPTZ        DEFAULT NULL  -- NULL = active streak
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)
-- Business rule: UNIQUE(user_id) WHERE ended_at IS NULL

xp_transactions (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
        amount              : INTEGER            NOT NULL CHECK(amount > 0)
        source_type         : xp_source_type     NOT NULL  -- EXPEDITION, QUIZ, HOTSPOT, STREAK_BONUS
        source_id           : UUID               DEFAULT NULL  -- FK to expedition_id / quiz_session_id
        description         : TEXT               NOT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)
-- Immutable ledger: no updated_at, no deleted_at
```

---

### Domain: Content & Species

```
taxonomy (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  parent_id           : UUID               DEFAULT NULL → taxonomy(id) ON DELETE RESTRICT
        rank                : taxonomy_rank      NOT NULL  -- KINGDOM,PHYLUM,CLASS,ORDER,FAMILY,GENUS
        scientific_name     : TEXT               NOT NULL
        name_vn             : TEXT               DEFAULT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)
-- Constraint: id != parent_id
-- Unique: UNIQUE(COALESCE(parent_id,'00000000...'), scientific_name, rank) WHERE deleted_at IS NULL

species (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  taxonomy_id         : UUID               NOT NULL → taxonomy(id) ON DELETE RESTRICT
        slug                : TEXT               NOT NULL  -- URL slug
        scientific_name     : TEXT               NOT NULL
        name_vn             : TEXT               NOT NULL
        conservation_status : conservation_status NOT NULL
        identification_desc : TEXT               DEFAULT NULL
        biology_desc        : TEXT               DEFAULT NULL
        threats_desc        : TEXT               DEFAULT NULL
        conservation_desc   : TEXT               DEFAULT NULL
        habitat_type        : TEXT               DEFAULT NULL  -- "Rừng mưa nhiệt đới"
        background_tint     : TEXT               DEFAULT NULL  -- CSS color for cinematic mode
        search_vector       : TSVECTOR           GENERATED ALWAYS AS (...)
        created_by          : UUID               → users(id) ON DELETE SET NULL
        updated_by          : UUID               → users(id) ON DELETE SET NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)
-- Unique: UNIQUE(slug) WHERE deleted_at IS NULL
-- Unique: UNIQUE(scientific_name) WHERE deleted_at IS NULL

species_media (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  species_id          : UUID               NOT NULL → species(id) ON DELETE CASCADE
        type                : media_type         NOT NULL  -- IMAGE, AUDIO, VIDEO
        url                 : TEXT               NOT NULL
        caption             : TEXT               DEFAULT NULL
        is_primary          : BOOLEAN            NOT NULL DEFAULT FALSE
        sort_order          : SMALLINT           NOT NULL DEFAULT 0
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)
-- Unique: UNIQUE(species_id) WHERE is_primary = TRUE AND deleted_at IS NULL

locations (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
        name                : TEXT               NOT NULL
        type                : location_type      NOT NULL  -- PROVINCE, ECO_REGION, NATIONAL_PARK
        geom                : GEOMETRY(Geometry,4326) NOT NULL  -- PostGIS
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)

species_locations (
    PK  [species_id, location_id]
    FK  species_id          : UUID               NOT NULL → species(id) ON DELETE CASCADE
    FK  location_id         : UUID               NOT NULL → locations(id) ON DELETE CASCADE
        distribution_type   : distribution_type  NOT NULL DEFAULT 'NATIVE'
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)

species_relationships (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  species_id_1        : UUID               NOT NULL → species(id) ON DELETE CASCADE
    FK  species_id_2        : UUID               NOT NULL → species(id) ON DELETE CASCADE
        relationship_type   : relationship_type  NOT NULL
        description         : TEXT               DEFAULT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)
-- Constraint: species_id_1 < species_id_2 (prevent reverse duplicates)
-- Unique: UNIQUE(species_id_1, species_id_2, relationship_type) WHERE deleted_at IS NULL

conservation_history (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  species_id          : UUID               NOT NULL → species(id) ON DELETE CASCADE
        old_status          : conservation_status DEFAULT NULL
        new_status          : conservation_status NOT NULL
        changed_at          : DATE               NOT NULL
        source              : TEXT               NOT NULL
        notes               : TEXT               DEFAULT NULL
        created_by          : UUID               → users(id) ON DELETE SET NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)

species_embeddings (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  species_id          : UUID               NOT NULL → species(id) ON DELETE CASCADE
        chunk_text          : TEXT               NOT NULL
        chunk_index         : INTEGER            NOT NULL CHECK(chunk_index >= 0)
        embedding           : VECTOR(1536)       NOT NULL
        source_info         : JSONB              DEFAULT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)
-- Unique: UNIQUE(species_id, chunk_index)
```

---

### Domain: Expeditions

```
expeditions (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
        slug                : TEXT               NOT NULL
        title               : TEXT               NOT NULL
        description         : TEXT               DEFAULT NULL
        difficulty          : expedition_difficulty NOT NULL  -- beginner, intermediate, expert
        duration_minutes    : SMALLINT           NOT NULL CHECK(duration_minutes > 0)
        thumbnail_url       : TEXT               DEFAULT NULL
        location_name       : TEXT               DEFAULT NULL
        location_lat        : NUMERIC(10,7)      DEFAULT NULL
        location_lng        : NUMERIC(10,7)      DEFAULT NULL
        xp_reward           : INTEGER            NOT NULL DEFAULT 100 CHECK(xp_reward >= 0)
        published_at        : TIMESTAMPTZ        DEFAULT NULL  -- NULL = draft
        created_by          : UUID               → users(id) ON DELETE SET NULL
        updated_by          : UUID               → users(id) ON DELETE SET NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)
-- Unique: UNIQUE(slug) WHERE deleted_at IS NULL

expedition_chapters (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  expedition_id       : UUID               NOT NULL → expeditions(id) ON DELETE CASCADE
        sort_order          : SMALLINT           NOT NULL
        title               : TEXT               NOT NULL
        subtitle            : TEXT               DEFAULT NULL
        content             : TEXT               NOT NULL  -- MDX or HTML content
        hero_image_url      : TEXT               NOT NULL
        image_alt           : TEXT               NOT NULL
        blur_hash           : TEXT               DEFAULT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)
-- Unique: UNIQUE(expedition_id, sort_order)

expedition_audio_cues (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  chapter_id          : UUID               NOT NULL → expedition_chapters(id) ON DELETE CASCADE
        scroll_percent      : SMALLINT           NOT NULL CHECK(scroll_percent BETWEEN 0 AND 100)
        track_url           : TEXT               NOT NULL
        fade_in_seconds     : NUMERIC(4,1)       NOT NULL DEFAULT 2.0
        fade_out_seconds    : NUMERIC(4,1)       NOT NULL DEFAULT 2.0
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)

expedition_hotspots (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  chapter_id          : UUID               NOT NULL → expedition_chapters(id) ON DELETE CASCADE
        x_percent           : NUMERIC(5,2)       NOT NULL CHECK(x_percent BETWEEN 0 AND 100)
        y_percent           : NUMERIC(5,2)       NOT NULL CHECK(y_percent BETWEEN 0 AND 100)
        title               : TEXT               NOT NULL
        description         : TEXT               NOT NULL
        image_url           : TEXT               DEFAULT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)

expedition_species (
    PK  [expedition_id, species_id]
    FK  expedition_id       : UUID               NOT NULL → expeditions(id) ON DELETE CASCADE
    FK  species_id          : UUID               NOT NULL → species(id) ON DELETE CASCADE
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)
```

---

### Domain: Gamification & Progress

```
ranks (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
        name                : TEXT               NOT NULL UNIQUE  -- "Novice Observer"
        name_vn             : TEXT               NOT NULL
        slug                : TEXT               NOT NULL UNIQUE  -- "observer"
        min_xp              : INTEGER            NOT NULL CHECK(min_xp >= 0)
        max_xp              : INTEGER            DEFAULT NULL  -- NULL = top rank
        icon_url            : TEXT               DEFAULT NULL
        sort_order          : SMALLINT           NOT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)

user_expedition_progress (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
    FK  expedition_id       : UUID               NOT NULL → expeditions(id) ON DELETE CASCADE
        current_chapter_idx : SMALLINT           NOT NULL DEFAULT 0
        completion_percent  : NUMERIC(5,2)       NOT NULL DEFAULT 0.00 CHECK(completion_percent BETWEEN 0 AND 100)
        is_completed        : BOOLEAN            NOT NULL DEFAULT FALSE
        boss_score_percent  : NUMERIC(5,2)       DEFAULT NULL  -- score of Boss Challenge
        started_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        completed_at        : TIMESTAMPTZ        DEFAULT NULL
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)
-- Unique: UNIQUE(user_id, expedition_id)

user_field_notes (
    PK  [user_id, species_id]
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
    FK  species_id          : UUID               NOT NULL → species(id) ON DELETE CASCADE
        mastery_level       : SMALLINT           NOT NULL DEFAULT 0 CHECK(mastery_level BETWEEN 0 AND 5)
        unlock_source       : TEXT               NOT NULL  -- "expedition:ky-lan-truong-son" | "quiz:deck_id"
        collected_at        : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)

badges (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
        name                : TEXT               NOT NULL UNIQUE
        name_vn             : TEXT               NOT NULL
        description         : TEXT               DEFAULT NULL
        icon_url            : TEXT               NOT NULL
        condition_logic     : JSONB              NOT NULL  -- {"type": "boss_challenge", "expedition_slug": "ky-lan-truong-son", "min_score": 100}
        rarity              : badge_rarity       NOT NULL DEFAULT 'COMMON'
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)

user_badges (
    PK  [user_id, badge_id]
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
    FK  badge_id            : UUID               NOT NULL → badges(id) ON DELETE CASCADE
        unlocked_at         : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        share_card_url      : TEXT               DEFAULT NULL  -- pre-rendered social card URL
)
```

---

### Domain: Assessment & Quiz

```
quiz_decks (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  expedition_id       : UUID               DEFAULT NULL → expeditions(id) ON DELETE SET NULL
        title               : TEXT               NOT NULL
        description         : TEXT               DEFAULT NULL
        deck_type           : quiz_deck_type     NOT NULL  -- FLASHCARD, RAPID_FIRE, BOSS_CHALLENGE
        time_limit_seconds  : INTEGER            DEFAULT NULL  -- NULL = no time limit
        pass_threshold_pct  : SMALLINT           DEFAULT 60 CHECK(pass_threshold_pct BETWEEN 0 AND 100)
        xp_reward           : INTEGER            NOT NULL DEFAULT 50
        created_by          : UUID               → users(id) ON DELETE SET NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)

questions (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  quiz_deck_id        : UUID               NOT NULL → quiz_decks(id) ON DELETE CASCADE
    FK  species_id          : UUID               DEFAULT NULL → species(id) ON DELETE SET NULL
        type                : question_type      NOT NULL  -- MULTIPLE_CHOICE, SILHOUETTE, HABITAT_MATCH, AUDIO_REFLEX
        content             : TEXT               NOT NULL
        explanation         : TEXT               DEFAULT NULL
        media_url           : TEXT               DEFAULT NULL
        sort_order          : SMALLINT           NOT NULL DEFAULT 0
        difficulty_score    : SMALLINT           NOT NULL DEFAULT 3 CHECK(difficulty_score BETWEEN 1 AND 5)
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)

question_options (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  question_id         : UUID               NOT NULL → questions(id) ON DELETE CASCADE
        content             : TEXT               NOT NULL
        is_correct          : BOOLEAN            NOT NULL DEFAULT FALSE
        sort_order          : SMALLINT           NOT NULL DEFAULT 0
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)
-- Unique: UNIQUE(question_id) WHERE is_correct = TRUE AND deleted_at IS NULL

user_quiz_sessions (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
    FK  quiz_deck_id        : UUID               NOT NULL → quiz_decks(id) ON DELETE CASCADE
        total_questions     : SMALLINT           NOT NULL
        correct_answers     : SMALLINT           NOT NULL DEFAULT 0
        score_percent       : NUMERIC(5,2)       DEFAULT NULL  -- calculated on completion
        time_taken_seconds  : INTEGER            DEFAULT NULL
        started_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        completed_at        : TIMESTAMPTZ        DEFAULT NULL
        xp_earned           : INTEGER            DEFAULT NULL
)

user_quiz_attempts (
    PK  [id, attempted_at]  : COMPOSITE (for partitioning)
        id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  session_id          : UUID               NOT NULL → user_quiz_sessions(id) ON DELETE CASCADE
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
    FK  question_id         : UUID               NOT NULL → questions(id) ON DELETE CASCADE
    FK  selected_option_id  : UUID               DEFAULT NULL → question_options(id) ON DELETE SET NULL
        is_correct          : BOOLEAN            NOT NULL
        time_taken_ms       : INTEGER            CHECK(time_taken_ms >= 0)
        attempted_at        : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (attempted_at)

flashcard_reviews (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
    FK  species_id          : UUID               NOT NULL → species(id) ON DELETE CASCADE
        ease_factor         : NUMERIC(4,2)       NOT NULL DEFAULT 2.50
        interval_days       : INTEGER            NOT NULL DEFAULT 1 CHECK(interval_days >= 1)
        repetitions         : INTEGER            NOT NULL DEFAULT 0 CHECK(repetitions >= 0)
        next_review_at      : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        last_quality        : SMALLINT           DEFAULT NULL CHECK(last_quality BETWEEN 0 AND 5)
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)
-- Unique: UNIQUE(user_id, species_id)
```

---

### Domain: Social & Community

```
user_observations (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
    FK  species_id          : UUID               DEFAULT NULL → species(id) ON DELETE SET NULL
        observation_point   : GEOMETRY(Point,4326) NOT NULL
        observed_at         : TIMESTAMPTZ        NOT NULL
        notes               : TEXT               DEFAULT NULL
        photo_url           : TEXT               DEFAULT NULL
        status              : observation_status NOT NULL DEFAULT 'PENDING'
        reviewed_by         : UUID               DEFAULT NULL → users(id) ON DELETE SET NULL
        reviewed_at         : TIMESTAMPTZ        DEFAULT NULL
        rejection_reason    : TEXT               DEFAULT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        updated_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
        deleted_at          : TIMESTAMPTZ        DEFAULT NULL
)

notifications (
    PK  id                  : UUID               NOT NULL DEFAULT gen_random_uuid()
    FK  user_id             : UUID               NOT NULL → users(id) ON DELETE CASCADE
        type                : notification_type  NOT NULL
        title               : TEXT               NOT NULL
        message             : TEXT               NOT NULL
        reference_id        : UUID               DEFAULT NULL
        is_read             : BOOLEAN            NOT NULL DEFAULT FALSE
        read_at             : TIMESTAMPTZ        DEFAULT NULL
        created_at          : TIMESTAMPTZ        NOT NULL DEFAULT NOW()
)
-- No updated_at (immutable once created)
-- TTL: 90 days via cron job
```

---

### Full Relationship Map

```
Relationships:
    users           ||--o| user_profiles             : "has profile"
    users           ||--o{ user_sessions             : "has sessions"
    users           ||--o{ user_streaks              : "has streaks"
    users           ||--o{ xp_transactions           : "earns XP"
    users           ||--o{ user_expedition_progress  : "tracks progress"
    users           ||--o{ user_field_notes          : "collects species"
    users           ||--o{ user_badges               : "unlocks badges"
    users           ||--o{ user_quiz_sessions        : "takes quizzes"
    users           ||--o{ user_quiz_attempts        : "answers questions"
    users           ||--o{ flashcard_reviews         : "reviews flashcards"
    users           ||--o{ user_observations         : "submits observations"
    users           ||--o{ notifications             : "receives notifications"

    taxonomy        ||--o{ taxonomy                  : "parent-child tree"
    taxonomy        ||--o{ species                   : "classifies"
    species         ||--o{ species_media             : "has media"
    species         }o--o{ locations                 : "distributed at (species_locations)"
    species         }o--o{ species                   : "relates to (species_relationships)"
    species         ||--o{ conservation_history      : "has status history"
    species         ||--o{ species_embeddings        : "has embeddings"
    species         }o--o{ expeditions               : "featured in (expedition_species)"
    species         ||--o{ user_field_notes          : "collected by users"
    species         ||--o{ flashcard_reviews         : "reviewed as flashcard"

    expeditions     ||--o{ expedition_chapters       : "has chapters"
    expeditions     ||--o{ expedition_species        : "covers species"
    expeditions     ||--o| quiz_decks                : "has boss challenge"
    expedition_chapters ||--o{ expedition_audio_cues : "has audio cues"
    expedition_chapters ||--o{ expedition_hotspots   : "has hotspots"

    quiz_decks      ||--o{ questions                 : "contains"
    questions       ||--o{ question_options          : "has options"
    user_quiz_sessions ||--o{ user_quiz_attempts     : "contains attempts"

    badges          ||--o{ user_badges               : "unlocked by users"
    ranks           ||--o{ users                     : "defines level for (via XP range)"
```
