-- ==============================================================================
-- DOMAIN: ASSESSMENT & QUIZ
-- Order: quiz_decks → questions → question_options
--        → user_quiz_sessions → user_quiz_attempts (partitioned)
--        → flashcard_reviews
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: quiz_decks
-- expedition_id: links Boss Challenge decks to their parent expedition.
--   NULL = standalone deck (Rapid-fire, Flashcard).
-- pass_threshold_pct: minimum score to "pass" (unlock species/badge).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_decks (
    id                  UUID           NOT NULL DEFAULT gen_random_uuid(),
    expedition_id       UUID                    DEFAULT NULL,
    title               TEXT           NOT NULL,
    description         TEXT                    DEFAULT NULL,
    deck_type           quiz_deck_type NOT NULL,
    time_limit_seconds  INTEGER                 DEFAULT NULL,
    pass_threshold_pct  SMALLINT       NOT NULL DEFAULT 60,
    xp_reward           INTEGER        NOT NULL DEFAULT 50,
    created_by          UUID                    DEFAULT NULL,
    updated_by          UUID                    DEFAULT NULL,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ             DEFAULT NULL,

    CONSTRAINT pk_quiz_decks                 PRIMARY KEY (id),
    CONSTRAINT fk_quiz_decks_expedition      FOREIGN KEY (expedition_id) REFERENCES expeditions (id) ON DELETE SET NULL,
    CONSTRAINT fk_quiz_decks_created_by      FOREIGN KEY (created_by)    REFERENCES users       (id) ON DELETE SET NULL,
    CONSTRAINT fk_quiz_decks_updated_by      FOREIGN KEY (updated_by)    REFERENCES users       (id) ON DELETE SET NULL,
    CONSTRAINT chk_quiz_decks_title          CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_quiz_decks_threshold      CHECK (pass_threshold_pct BETWEEN 0 AND 100),
    CONSTRAINT chk_quiz_decks_xp_reward      CHECK (xp_reward >= 0),
    CONSTRAINT chk_quiz_decks_time_limit     CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0)
);

CREATE INDEX IF NOT EXISTS idx_quiz_decks_expedition_id ON quiz_decks (expedition_id) WHERE expedition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_decks_type          ON quiz_decks (deck_type) WHERE deleted_at IS NULL;
-- v2.0: RM constraint — max 1 Boss Challenge per expedition
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_decks_one_boss_per_expedition
    ON quiz_decks (expedition_id)
    WHERE deck_type = 'BOSS_CHALLENGE' AND expedition_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_quiz_decks_set_timestamp
    BEFORE UPDATE ON quiz_decks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: questions
-- species_id: links question to a specific species (for field-notes unlocking).
-- media_url: image for SILHOUETTE questions, audio URL for AUDIO_REFLEX.
-- difficulty_score: 1 (easiest) to 5 (hardest), used by spaced repetition.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    quiz_deck_id     UUID          NOT NULL,
    species_id       UUID                   DEFAULT NULL,
    type             question_type NOT NULL,
    content          TEXT          NOT NULL,
    explanation      TEXT                   DEFAULT NULL,
    media_url        TEXT                   DEFAULT NULL,
    sort_order       SMALLINT      NOT NULL DEFAULT 0,
    difficulty_score SMALLINT      NOT NULL DEFAULT 3,
    created_by       UUID                   DEFAULT NULL,
    updated_by       UUID                   DEFAULT NULL,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ            DEFAULT NULL,

    CONSTRAINT pk_questions              PRIMARY KEY (id),
    CONSTRAINT fk_questions_deck         FOREIGN KEY (quiz_deck_id) REFERENCES quiz_decks (id) ON DELETE CASCADE,
    CONSTRAINT fk_questions_species      FOREIGN KEY (species_id)   REFERENCES species    (id) ON DELETE SET NULL,
    CONSTRAINT fk_questions_created_by   FOREIGN KEY (created_by)   REFERENCES users      (id) ON DELETE SET NULL,
    CONSTRAINT fk_questions_updated_by   FOREIGN KEY (updated_by)   REFERENCES users      (id) ON DELETE SET NULL,
    CONSTRAINT chk_questions_content     CHECK (length(trim(content)) > 0),
    CONSTRAINT chk_questions_difficulty  CHECK (difficulty_score BETWEEN 1 AND 5),
    CONSTRAINT chk_questions_sort_order  CHECK (sort_order >= 0),
    CONSTRAINT chk_questions_media_url   CHECK (media_url IS NULL OR media_url ~ '^https?://|^/')
);

CREATE INDEX IF NOT EXISTS idx_questions_deck_id    ON questions (quiz_deck_id, sort_order ASC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_questions_species_id ON questions (species_id) WHERE species_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_questions_set_timestamp
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: question_options
-- Replaces the previous `answers` table with a clearer name.
-- Business rule: exactly 1 option per question must have is_correct = TRUE.
-- Enforced via partial unique index below.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_options (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    question_id UUID        NOT NULL,
    content     TEXT        NOT NULL,
    is_correct  BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order  SMALLINT    NOT NULL DEFAULT 0,
    created_by  UUID                 DEFAULT NULL,
    updated_by  UUID                 DEFAULT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ          DEFAULT NULL,

    CONSTRAINT pk_question_options           PRIMARY KEY (id),
    CONSTRAINT fk_question_options_question  FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
    CONSTRAINT fk_question_options_created   FOREIGN KEY (created_by)  REFERENCES users     (id) ON DELETE SET NULL,
    CONSTRAINT fk_question_options_updated   FOREIGN KEY (updated_by)  REFERENCES users     (id) ON DELETE SET NULL,
    CONSTRAINT chk_question_options_content  CHECK (length(trim(content)) > 0),
    CONSTRAINT chk_question_options_order    CHECK (sort_order >= 0)
);

-- Exactly one correct option per question (partial unique enforces the business rule at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_question_options_single_correct_uq
    ON question_options (question_id) WHERE is_correct = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_question_options_question_id
    ON question_options (question_id, sort_order ASC) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_question_options_set_timestamp
    BEFORE UPDATE ON question_options
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TABLE: user_quiz_sessions
-- Represents one complete quiz attempt by a user (start → finish).
-- score_percent and xp_earned are computed and stored on session completion.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_quiz_sessions (
    id               UUID           NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID           NOT NULL,
    quiz_deck_id     UUID           NOT NULL,
    total_questions  SMALLINT       NOT NULL,
    correct_answers  SMALLINT       NOT NULL DEFAULT 0,
    score_percent    NUMERIC(5, 2)           DEFAULT NULL,
    time_taken_seconds INTEGER               DEFAULT NULL,
    xp_earned        INTEGER                 DEFAULT NULL,
    started_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ             DEFAULT NULL,

    CONSTRAINT pk_user_quiz_sessions            PRIMARY KEY (id),
    CONSTRAINT fk_user_quiz_sessions_user       FOREIGN KEY (user_id)      REFERENCES users      (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_quiz_sessions_deck       FOREIGN KEY (quiz_deck_id) REFERENCES quiz_decks (id) ON DELETE CASCADE,
    CONSTRAINT chk_uqs_total_questions          CHECK (total_questions > 0),
    CONSTRAINT chk_uqs_correct_answers          CHECK (correct_answers >= 0 AND correct_answers <= total_questions),
    CONSTRAINT chk_uqs_score_pct                CHECK (score_percent IS NULL OR score_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_uqs_xp_earned                CHECK (xp_earned IS NULL OR xp_earned >= 0),
    CONSTRAINT chk_uqs_time_taken               CHECK (time_taken_seconds IS NULL OR time_taken_seconds >= 0)
);

CREATE INDEX IF NOT EXISTS idx_uqs_user_id       ON user_quiz_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_uqs_deck_id       ON user_quiz_sessions (quiz_deck_id);
CREATE INDEX IF NOT EXISTS idx_uqs_completed     ON user_quiz_sessions (user_id, quiz_deck_id) WHERE completed_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- TABLE: user_quiz_attempts (Partitioned by attempted_at — high volume table)
-- Stores individual question-level answers within a session.
-- Partitioned by YEAR to manage high row counts (O(users × questions × sessions)).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    session_id         UUID        NOT NULL,
    user_id            UUID        NOT NULL,
    question_id        UUID        NOT NULL,
    selected_option_id UUID                 DEFAULT NULL,
    is_correct         BOOLEAN     NOT NULL,
    time_taken_ms      INTEGER              DEFAULT NULL,
    attempted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_user_quiz_attempts PRIMARY KEY (id, attempted_at),
    CONSTRAINT fk_uqa_session        FOREIGN KEY (session_id)         REFERENCES user_quiz_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_uqa_user           FOREIGN KEY (user_id)            REFERENCES users              (id) ON DELETE CASCADE,
    CONSTRAINT fk_uqa_question       FOREIGN KEY (question_id)        REFERENCES questions          (id) ON DELETE CASCADE,
    CONSTRAINT fk_uqa_selected       FOREIGN KEY (selected_option_id) REFERENCES question_options   (id) ON DELETE SET NULL,
    CONSTRAINT chk_uqa_time          CHECK (time_taken_ms IS NULL OR time_taken_ms >= 0)
) PARTITION BY RANGE (attempted_at);

-- Yearly partitions
CREATE TABLE IF NOT EXISTS user_quiz_attempts_2025 PARTITION OF user_quiz_attempts
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS user_quiz_attempts_2026 PARTITION OF user_quiz_attempts
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS user_quiz_attempts_2027 PARTITION OF user_quiz_attempts
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE IF NOT EXISTS user_quiz_attempts_default PARTITION OF user_quiz_attempts DEFAULT;

-- Indexes on partitioned table (applied to all partitions automatically)
CREATE INDEX IF NOT EXISTS idx_uqa_user_time     ON user_quiz_attempts (user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_uqa_session_id    ON user_quiz_attempts (session_id);
CREATE INDEX IF NOT EXISTS idx_uqa_question_id   ON user_quiz_attempts (question_id);

-- ----------------------------------------------------------------------------
-- TABLE: flashcard_reviews (SM-2 Spaced Repetition Algorithm)
-- ease_factor:   starts at 2.5, adjusted per review quality (Hard reduces, Easy increases)
-- interval_days: grows exponentially with each successful recall
-- last_quality:  0-5 rating from user (Hard=1, Good=3, Easy=5 — matches SM-2 scale)
-- next_review_at: computed by backend after each review using SM-2 formula
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id            UUID           NOT NULL DEFAULT gen_random_uuid(),
    user_id       UUID           NOT NULL,
    species_id    UUID           NOT NULL,
    ease_factor   NUMERIC(4, 2)  NOT NULL DEFAULT 2.50,
    interval_days INTEGER        NOT NULL DEFAULT 1,
    repetitions   INTEGER        NOT NULL DEFAULT 0,
    next_review_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_quality  SMALLINT                DEFAULT NULL,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_flashcard_reviews           PRIMARY KEY (id),
    CONSTRAINT fk_flashcard_reviews_user      FOREIGN KEY (user_id)    REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_flashcard_reviews_species   FOREIGN KEY (species_id) REFERENCES species (id) ON DELETE CASCADE,
    CONSTRAINT uq_flashcard_reviews_user_spec UNIQUE (user_id, species_id),
    CONSTRAINT chk_flashcard_ease_factor      CHECK (ease_factor >= 1.3),  -- SM-2 minimum
    CONSTRAINT chk_flashcard_interval         CHECK (interval_days >= 1),
    CONSTRAINT chk_flashcard_repetitions      CHECK (repetitions >= 0),
    CONSTRAINT chk_flashcard_quality          CHECK (last_quality IS NULL OR last_quality BETWEEN 0 AND 5)
);

-- Due-for-review index: find all cards user needs to review today
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_due
    ON flashcard_reviews (user_id, next_review_at ASC);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user
    ON flashcard_reviews (user_id, updated_at DESC);

CREATE TRIGGER trg_flashcard_reviews_set_timestamp
    BEFORE UPDATE ON flashcard_reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- TRIGGER: Mastery auto-update from quiz performance
-- v2.0: Wireframe "Làm đúng quiz về loài đó nhiều lần sẽ đầy 100%"
-- When a quiz session is completed with score >= 60%, find the most relevant
-- species and increase mastery_level in user_field_notes.
-- WARNING: This function uses TG_OP check — safe for AFTER UPDATE only.
-- Do NOT bind to INSERT triggers without modification.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_mastery_from_quiz_session()
RETURNS TRIGGER AS $$
DECLARE
    v_species_id      UUID;
    v_current_mastery SMALLINT;
    v_new_mastery     SMALLINT;
BEGIN
    -- Guard: only fire when completed_at transitions from NULL to non-NULL
    IF TG_OP != 'UPDATE' THEN RETURN NEW; END IF;
    IF NEW.completed_at IS NULL OR OLD.completed_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Only apply if score is good enough (>= 60%)
    IF NEW.score_percent IS NULL OR NEW.score_percent < 60 THEN
        RETURN NEW;
    END IF;

    -- Find the most-referenced species in this quiz deck's questions
    SELECT q.species_id INTO v_species_id
    FROM questions q
    WHERE q.quiz_deck_id = NEW.quiz_deck_id
      AND q.species_id IS NOT NULL
      AND q.deleted_at IS NULL
    GROUP BY q.species_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    IF v_species_id IS NULL THEN RETURN NEW; END IF;

    -- Get current mastery (must have already collected the species)
    SELECT mastery_level INTO v_current_mastery
    FROM user_field_notes
    WHERE user_id = NEW.user_id AND species_id = v_species_id;

    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Calculate new mastery based on quiz score
    v_new_mastery := v_current_mastery + CASE
        WHEN NEW.score_percent >= 95 THEN 2  -- Near-perfect → +2
        WHEN NEW.score_percent >= 75 THEN 1  -- Good → +1
        ELSE 0
    END;
    v_new_mastery := LEAST(v_new_mastery, 5); -- Cap at 5

    IF v_new_mastery > v_current_mastery THEN
        UPDATE user_field_notes SET mastery_level = v_new_mastery
        WHERE user_id = NEW.user_id AND species_id = v_species_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_quiz_session_update_mastery
    AFTER UPDATE OF completed_at ON user_quiz_sessions
    FOR EACH ROW EXECUTE FUNCTION update_mastery_from_quiz_session();
