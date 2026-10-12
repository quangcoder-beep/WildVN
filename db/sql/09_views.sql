-- ==============================================================================
-- VIEWS & MATERIALIZED VIEWS (v2.0)
-- Refresh strategy noted for each MV.
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW: mv_leaderboard
-- Refresh: every 5 minutes via cron
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leaderboard;
-- v2.0: uses rank_id FK instead of level = sort_order
-- ----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_leaderboard CASCADE;
CREATE MATERIALIZED VIEW mv_leaderboard AS
SELECT
    u.id,
    u.username,
    u.xp,
    u.level,
    r.name_vn   AS rank_name,
    r.slug      AS rank_slug,
    up.avatar_url,
    ROW_NUMBER() OVER (ORDER BY u.xp DESC, u.created_at ASC) AS position
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN ranks r ON u.rank_id = r.id
WHERE u.deleted_at IS NULL
ORDER BY u.xp DESC, u.created_at ASC;

CREATE UNIQUE INDEX idx_mv_leaderboard_id       ON mv_leaderboard (id);
CREATE INDEX        idx_mv_leaderboard_position ON mv_leaderboard (position);

-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW: mv_species_summary
-- Aggregates collection counts. Used on species listing pages.
-- Refresh: every hour
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_species_summary;
-- v2.0: includes domain column for filtering
-- ----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_species_summary CASCADE;
CREATE MATERIALIZED VIEW mv_species_summary AS
SELECT
    s.id,
    s.slug,
    s.scientific_name,
    s.name_vn,
    s.conservation_status,
    s.habitat_type,
    s.background_tint,
    s.domain,
    t.rank              AS taxonomy_rank,
    t.scientific_name   AS taxonomy_name,
    COUNT(ufn.user_id)  AS total_collectors,
    sm.url              AS primary_image_url
FROM species s
JOIN taxonomy t           ON s.taxonomy_id = t.id
LEFT JOIN user_field_notes ufn ON s.id = ufn.species_id
LEFT JOIN species_media sm ON s.id = sm.species_id AND sm.is_primary = TRUE AND sm.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.slug, s.scientific_name, s.name_vn, s.conservation_status,
         s.habitat_type, s.background_tint, s.domain, t.rank, t.scientific_name, sm.url;

CREATE UNIQUE INDEX idx_mv_species_summary_id     ON mv_species_summary (id);
CREATE INDEX        idx_mv_species_summary_slug   ON mv_species_summary (slug);
CREATE INDEX        idx_mv_species_summary_status ON mv_species_summary (conservation_status);
CREATE INDEX        idx_mv_species_summary_domain ON mv_species_summary (domain) WHERE domain IS NOT NULL;

-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW: mv_expedition_stats
-- Aggregates completion rates. Used on /academy page cards.
-- Refresh: every 30 minutes
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_expedition_stats;
-- ----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_expedition_stats CASCADE;
CREATE MATERIALIZED VIEW mv_expedition_stats AS
SELECT
    e.id,
    e.slug,
    e.title,
    e.difficulty,
    e.duration_minutes,
    e.xp_reward,
    e.thumbnail_url,
    e.location_name,
    e.published_at,
    COUNT(DISTINCT uep.user_id)                                        AS total_started,
    COUNT(DISTINCT uep.user_id) FILTER (WHERE uep.is_completed = TRUE) AS total_completed,
    ROUND(
        COUNT(DISTINCT uep.user_id) FILTER (WHERE uep.is_completed = TRUE)::NUMERIC
        / NULLIF(COUNT(DISTINCT uep.user_id), 0) * 100, 1
    )                                                                   AS completion_rate_pct
FROM expeditions e
LEFT JOIN user_expedition_progress uep ON e.id = uep.expedition_id
WHERE e.deleted_at IS NULL AND e.published_at IS NOT NULL
GROUP BY e.id, e.slug, e.title, e.difficulty, e.duration_minutes,
         e.xp_reward, e.thumbnail_url, e.location_name, e.published_at;

CREATE UNIQUE INDEX idx_mv_expedition_stats_id   ON mv_expedition_stats (id);
CREATE INDEX        idx_mv_expedition_stats_slug ON mv_expedition_stats (slug);

-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW: mv_domain_leaderboard (v2.0)
-- Top researchers per taxonomy domain.
-- Refresh: every 10 minutes via cron
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_domain_leaderboard;
-- ----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS mv_domain_leaderboard CASCADE;
CREATE MATERIALIZED VIEW mv_domain_leaderboard AS
SELECT
    ude.domain,
    u.id          AS user_id,
    u.username,
    up.avatar_url,
    ude.expertise_score,
    ude.species_count,
    ude.mastered_count,
    ROW_NUMBER() OVER (
        PARTITION BY ude.domain
        ORDER BY ude.expertise_score DESC, ude.mastered_count DESC
    ) AS domain_rank
FROM user_domain_expertise ude
JOIN users u         ON ude.user_id = u.id AND u.deleted_at IS NULL
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE ude.expertise_score > 0
ORDER BY ude.domain, ude.expertise_score DESC;

CREATE UNIQUE INDEX idx_mv_domain_lb_composite ON mv_domain_leaderboard (domain, user_id);
CREATE INDEX        idx_mv_domain_lb_rank      ON mv_domain_leaderboard (domain, domain_rank);

-- ----------------------------------------------------------------------------
-- VIEW: v_user_progress_summary (v2.0)
-- Real-time (not MV) — used on /field-notes profile page.
-- Shows a user's full academy progress snapshot.
-- FIX: Uses LEFT JOIN LATERAL instead of correlated subqueries for performance.
-- Uses rank_id FK instead of level = sort_order.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_progress_summary AS
SELECT
    u.id                                                        AS user_id,
    u.username,
    u.xp,
    u.level,
    r.name_vn                                                   AS rank_name,
    r.slug                                                      AS rank_slug,
    -- Streak
    us.current_count                                            AS streak_current,
    us.longest_count                                            AS streak_longest,
    us.last_active_date,
    -- Collections
    COUNT(DISTINCT ufn.species_id)                              AS species_collected,
    COUNT(DISTINCT ufn.species_id) FILTER (WHERE ufn.mastery_level >= 3) AS species_mastered,
    -- Expeditions
    COUNT(DISTINCT uep.expedition_id)                           AS expeditions_started,
    COUNT(DISTINCT uep.expedition_id) FILTER (WHERE uep.is_completed) AS expeditions_completed,
    -- Badges
    COUNT(DISTINCT ub.badge_id)                                 AS badges_earned,
    -- v2.0: domain expertise (via LATERAL — single subquery, not per-row)
    top_ude.domain::TEXT                                        AS top_domain,
    top_ude.expertise_score                                     AS top_domain_score,
    -- v2.0: AI chatbot usage (via LATERAL)
    ai_usage.session_count                                      AS ai_sessions_30d
FROM users u
LEFT JOIN ranks r               ON u.rank_id = r.id
LEFT JOIN user_profiles up      ON u.id = up.user_id
LEFT JOIN user_streaks us       ON u.id = us.user_id AND us.ended_at IS NULL
LEFT JOIN user_field_notes ufn  ON u.id = ufn.user_id
LEFT JOIN user_expedition_progress uep ON u.id = uep.user_id
LEFT JOIN user_badges ub        ON u.id = ub.user_id
-- LATERAL join: top domain expertise (single scan, not correlated subquery)
LEFT JOIN LATERAL (
    SELECT domain, expertise_score
    FROM user_domain_expertise
    WHERE user_id = u.id
    ORDER BY expertise_score DESC
    LIMIT 1
) top_ude ON TRUE
-- LATERAL join: AI usage in last 30 days (single scan)
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS session_count
    FROM ai_chat_sessions
    WHERE user_id = u.id
      AND started_at >= NOW() - INTERVAL '30 days'
) ai_usage ON TRUE
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.xp, u.level, r.name_vn, r.slug,
         us.current_count, us.longest_count, us.last_active_date,
         top_ude.domain, top_ude.expertise_score, ai_usage.session_count;

-- ----------------------------------------------------------------------------
-- VIEW: v_flashcards_due_today
-- Returns all flashcard items due for review for each user.
-- Used by the /arena/flashcards page to build the review queue.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_flashcards_due_today AS
SELECT
    fr.user_id,
    fr.species_id,
    s.name_vn,
    s.scientific_name,
    s.conservation_status,
    fr.ease_factor,
    fr.interval_days,
    fr.repetitions,
    fr.last_quality,
    fr.next_review_at,
    sm.url AS primary_image_url
FROM flashcard_reviews fr
JOIN species s      ON fr.species_id = s.id AND s.deleted_at IS NULL
LEFT JOIN species_media sm ON s.id = sm.species_id AND sm.is_primary = TRUE AND sm.deleted_at IS NULL
WHERE fr.next_review_at <= NOW();

-- ==============================================================================
-- CRON JOBS (pg_cron — Supabase built-in)
-- Uncomment and run in Supabase SQL editor to activate.
-- ==============================================================================

-- Materialized View refreshes
-- SELECT cron.schedule('refresh-leaderboard',        '*/5 * * * *',  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leaderboard');
-- SELECT cron.schedule('refresh-species-summary',    '0 * * * *',    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_species_summary');
-- SELECT cron.schedule('refresh-expedition-stats',   '*/30 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_expedition_stats');
-- SELECT cron.schedule('refresh-domain-leaderboard', '*/10 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_domain_leaderboard');

-- Data cleanup
-- SELECT cron.schedule('cleanup-ai-sessions',   '0 * * * *',  'DELETE FROM ai_chat_sessions WHERE expires_at < NOW()');
-- SELECT cron.schedule('cleanup-notifications',  '0 3 * * *',  'DELETE FROM notifications WHERE created_at < NOW() - INTERVAL ''90 days''');
-- SELECT cron.schedule('cleanup-user-sessions',  '0 4 * * *',  'DELETE FROM user_sessions WHERE expires_at < NOW() AND revoked_at IS NOT NULL');
