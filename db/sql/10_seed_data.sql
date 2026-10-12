-- ==============================================================================
-- SEED DATA v2.0 — Sample records for development & relationship testing
-- Run AFTER all schema files (01–09) have been applied.
-- ==============================================================================

-- ==============================================================================
-- RANKS (must be seeded first — triggers depend on these)
-- ==============================================================================
INSERT INTO ranks (id, name, name_vn, slug, min_xp, max_xp, sort_order) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Novice Observer',       'Người Quan Sát',        'observer',       0,     499,  1),
    ('a0000000-0000-0000-0000-000000000002', 'Field Tracker',         'Người Theo Dấu',        'tracker',        500,   1999, 2),
    ('a0000000-0000-0000-0000-000000000003', 'Senior Biologist',      'Nhà Sinh Học',          'biologist',      2000,  4999, 3),
    ('a0000000-0000-0000-0000-000000000004', 'Master Conservationist','Chuyên Gia Bảo Tồn',   'conservationist', 5000, NULL, 4);

-- ==============================================================================
-- USERS (v2.0: includes rank_id FK)
-- password_hash = Argon2id hash of "password123" (demo only!)
-- ==============================================================================
INSERT INTO users (id, username, email, password_hash, role, xp, level, rank_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'field_researcher_01', 'researcher01@wildvn.vn',
     '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hash1', 'USER', 750, 2,
     'a0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000002', 'admin_lan',          'admin@wildvn.vn',
     '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hash2', 'ADMIN', 0, 1,
     'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000003', 'mod_hoang',          'mod@wildvn.vn',
     '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hash3', 'MODERATOR', 200, 1,
     'a0000000-0000-0000-0000-000000000001');

INSERT INTO user_profiles (user_id, conservation_identity) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Nhà nghiên cứu sinh cảnh Rừng Mưa — Đã khám phá 2/50 loài');

-- ==============================================================================
-- USER STREAKS
-- ==============================================================================
INSERT INTO user_streaks (user_id, current_count, longest_count, last_active_date) VALUES
    ('b0000000-0000-0000-0000-000000000001', 5, 12, CURRENT_DATE);

-- ==============================================================================
-- TAXONOMY (Kingdom → Phylum → Class → Order → Family → Genus)
-- Path for Voọc Cát Bà: Animalia → Chordata → Mammalia → Primates → Cercopithecidae → Trachypithecus
-- ==============================================================================
INSERT INTO taxonomy (id, parent_id, rank, scientific_name, name_vn) VALUES
    ('c0000000-0000-0000-0000-000000000001', NULL,                                    'KINGDOM', 'Animalia',         'Giới Động vật'),
    ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',  'PHYLUM',  'Chordata',         'Ngành Dây sống'),
    ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002',  'CLASS',   'Mammalia',         'Lớp Thú'),
    ('c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003',  'ORDER',   'Primates',         'Bộ Linh trưởng'),
    ('c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004',  'FAMILY',  'Cercopithecidae',  'Họ Khỉ Cựu thế giới'),
    ('c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005',  'GENUS',   'Trachypithecus',   'Chi Voọc');

-- Extra taxonomy path for Sao La: Artiodactyla → Bovidae → Pseudoryx
INSERT INTO taxonomy (id, parent_id, rank, scientific_name, name_vn) VALUES
    ('c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000003',  'ORDER',   'Artiodactyla',     'Bộ Guốc chẵn'),
    ('c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000010',  'FAMILY',  'Bovidae',          'Họ Trâu bò'),
    ('c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000011',  'GENUS',   'Pseudoryx',        'Chi Sao la');

-- ==============================================================================
-- SPECIES (v2.0: includes domain tag)
-- ==============================================================================
INSERT INTO species (id, taxonomy_id, slug, scientific_name, name_vn, conservation_status,
    identification_desc, habitat_type, background_tint, domain, created_by) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006',
     'vooc-cat-ba', 'Trachypithecus poliocephalus', 'Voọc Cát Bà', 'CR',
     'Loài linh trưởng cực kỳ nguy cấp, chỉ phân bố trên đảo Cát Bà với dưới 100 cá thể.',
     'Núi đá vôi đảo Cát Bà', '#3D5A45', 'MAMMALOGY',
     'b0000000-0000-0000-0000-000000000002'),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000012',
     'sao-la', 'Pseudoryx nghetinhensis', 'Sao La', 'CR',
     'Kỳ lân châu Á. Phát hiện năm 1992. Ước tính chỉ còn vài chục cá thể.',
     'Rừng thường xanh ẩm nhiệt đới', '#4A5D6B', 'MAMMALOGY',
     'b0000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- SPECIES MEDIA (v2.0: includes blur_hash)
-- ==============================================================================
INSERT INTO species_media (species_id, type, url, caption, blur_hash, is_primary, sort_order) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'IMAGE', '/images/species/vooc-cat-ba-hero.jpg',
     'Voọc Cát Bà trên vách đá vôi', 'LEHV6nWB2yk8pyo0adR*.7kCMdnj', TRUE, 0),
    ('d0000000-0000-0000-0000-000000000001', 'AUDIO', '/audio/species/vooc-cat-ba-call.mp3',
     'Tiếng kêu cảnh báo của Voọc', NULL, FALSE, 1),
    ('d0000000-0000-0000-0000-000000000002', 'IMAGE', '/images/species/sao-la-hero.jpg',
     'Sao La trong rừng nguyên sinh', 'LKO2?V%2Tw=w]~RBVZRi}*PVoeaf', TRUE, 0);

-- ==============================================================================
-- LOCATIONS (v2.0: includes province_code)
-- ==============================================================================
INSERT INTO locations (id, name, type, geom, province_code, created_by) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'VQG Cát Bà', 'NATIONAL_PARK',
     ST_SetSRID(ST_MakePoint(107.0006, 20.8014), 4326), 'HP',
     'b0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000002', 'Khu bảo tồn Sao La', 'NATIONAL_PARK',
     ST_SetSRID(ST_MakePoint(107.5678, 16.1234), 4326), 'TT-HUE',
     'b0000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- SPECIES ↔ LOCATIONS
-- ==============================================================================
INSERT INTO species_locations (species_id, location_id, distribution_type) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'ENDEMIC'),
    ('d0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'ENDEMIC');

-- ==============================================================================
-- CONSERVATION HISTORY
-- ==============================================================================
INSERT INTO conservation_history (species_id, old_status, new_status, changed_at, source, created_by) VALUES
    ('d0000000-0000-0000-0000-000000000001', NULL, 'CR', '2000-01-01',
     'IUCN Red List 2000', 'b0000000-0000-0000-0000-000000000002'),
    ('d0000000-0000-0000-0000-000000000002', NULL, 'CR', '1996-01-01',
     'IUCN Red List 1996', 'b0000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- EXPEDITIONS
-- ==============================================================================
INSERT INTO expeditions (id, slug, title, description, difficulty, duration_minutes,
    thumbnail_url, location_name, location_lat, location_lng, xp_reward, published_at, created_by) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'theo-dau-vooc-cat-ba',
     'Theo Dấu Voọc Cát Bà',
     'Hành trình thực địa vượt qua những rặng núi đá vôi đảo Cát Bà để tìm kiếm loài linh trưởng hiếm nhất thế giới.',
     'intermediate', 15,
     '/images/expeditions/cat-ba-thumb.jpg', 'VQG Cát Bà, Hải Phòng',
     20.8014000, 107.0006000, 200, NOW(),
     'b0000000-0000-0000-0000-000000000002'),
    ('f0000000-0000-0000-0000-000000000002', 'ky-lan-truong-son',
     'Kỳ Lân Trường Sơn',
     'Cuộc viễn chinh xuyên rừng sâu dãy Trường Sơn để tìm dấu vết của Sao La.',
     'expert', 25,
     '/images/expeditions/saola-thumb.jpg', 'Khu bảo tồn Sao La, Thừa Thiên Huế',
     16.1234000, 107.5678000, 300, NOW(),
     'b0000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- EXPEDITION CHAPTERS
-- ==============================================================================
INSERT INTO expedition_chapters (id, expedition_id, sort_order, title, subtitle, content, hero_image_url, image_alt) VALUES
    ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 0,
     'Kẻ Lữ Hành Trên Vách Đá Vôi', 'Đặc điểm sinh cảnh đảo Cát Bà',
     'Cát Bà là vùng sinh cảnh độc nhất vô nhị. Những dãy núi đá vôi dựng đứng sát biển tạo thành một mê cung hiểm trở.',
     '/images/expeditions/cat-ba-cliff.jpg', 'Vách đá vôi đảo Cát Bà'),
    ('f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 1,
     'Tiếng Gọi Từ Rừng Ngập Mặn', 'Phương thức giao tiếp giữa các bầy đàn',
     'Khi hoàng hôn buông xuống, âm thanh của rừng rậm thay đổi. Voọc Cát Bà phát ra những tiếng kêu cảnh báo vang vọng.',
     '/images/expeditions/cat-ba-mangrove.jpg', 'Rừng ngập mặn đảo Cát Bà'),
    ('f1000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 0,
     'Bóng Ma Giữa Rừng Sâu', 'Phát hiện chấn động thế giới năm 1992',
     'Sao La được phát hiện lần đầu tiên vào năm 1992 tại Vườn quốc gia Vũ Quang.',
     '/images/expeditions/saola-jungle.jpg', 'Rừng nguyên sinh Trường Sơn mù sương');

-- ==============================================================================
-- EXPEDITION AUDIO CUES
-- ==============================================================================
INSERT INTO expedition_audio_cues (chapter_id, scroll_percent, track_url, fade_in_seconds, fade_out_seconds) VALUES
    ('f1000000-0000-0000-0000-000000000001', 0,  '/audio/ambient/limestone-forest.mp3', 2.0, 2.0),
    ('f1000000-0000-0000-0000-000000000001', 50, '/audio/ambient/wind-cliff.mp3',       3.0, 2.0),
    ('f1000000-0000-0000-0000-000000000002', 0,  '/audio/ambient/mangrove-evening.mp3', 2.0, 2.0);

-- ==============================================================================
-- EXPEDITION HOTSPOTS
-- ==============================================================================
INSERT INTO expedition_hotspots (id, chapter_id, x_percent, y_percent, title, description, xp_reward) VALUES
    ('f2000000-0000-0000-0000-000000000001',
     'f1000000-0000-0000-0000-000000000001', 35.50, 62.00,
     'Vết chân trên đá', 'Dấu vết của Voọc trưởng thành trên bề mặt đá vôi ẩm ướt.', 15),
    ('f2000000-0000-0000-0000-000000000002',
     'f1000000-0000-0000-0000-000000000003', 72.00, 45.00,
     'Bẫy ảnh nghiên cứu', 'Camera trap ghi lại hình ảnh Sao La lần cuối năm 2013.', 20);

-- ==============================================================================
-- EXPEDITION ↔ SPECIES
-- ==============================================================================
INSERT INTO expedition_species (expedition_id, species_id) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001'),
    ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- BADGES
-- ==============================================================================
INSERT INTO badges (id, name, name_vn, description, icon_url, condition_logic, rarity, created_by) VALUES
    ('aa000000-0000-0000-0000-000000000001',
     'Golden Field Badge — Voọc Cát Bà', 'Huy Hiệu Vàng Thực Địa — Voọc Cát Bà',
     'Hoàn thành Boss Challenge của expedition Voọc Cát Bà với 100% chính xác.',
     '/images/badges/gold-vooc.svg',
     '{"type": "boss_challenge", "expedition_slug": "theo-dau-vooc-cat-ba", "min_score_pct": 100}',
     'LEGENDARY',
     'b0000000-0000-0000-0000-000000000002'),
    ('aa000000-0000-0000-0000-000000000002',
     'First Discovery', 'Khám Phá Đầu Tiên',
     'Thu thập loài đầu tiên vào Sổ Tay Thực Địa.',
     '/images/badges/first-discovery.svg',
     '{"type": "collection_count", "min_species": 1}',
     'COMMON',
     'b0000000-0000-0000-0000-000000000002'),
    ('aa000000-0000-0000-0000-000000000003',
     'Week Streak', 'Chuỗi 7 Ngày',
     'Duy trì streak học tập 7 ngày liên tiếp.',
     '/images/badges/streak-7.svg',
     '{"type": "streak_days", "min_days": 7}',
     'RARE',
     'b0000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- QUIZ DECKS
-- ==============================================================================
INSERT INTO quiz_decks (id, expedition_id, title, description, deck_type,
    time_limit_seconds, pass_threshold_pct, xp_reward, created_by) VALUES
    ('bb000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
     'Boss Challenge: Voọc Cát Bà',
     'Bài kiểm tra tổng hợp cuối expedition Voọc Cát Bà.',
     'BOSS_CHALLENGE', 120, 80, 150,
     'b0000000-0000-0000-0000-000000000002'),
    ('bb000000-0000-0000-0000-000000000002', NULL,
     'Nhận diện Linh trưởng Việt Nam',
     'Flashcard deck về các loài linh trưởng đặc hữu.',
     'FLASHCARD', NULL, 60, 50,
     'b0000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- QUESTIONS & OPTIONS
-- ==============================================================================
INSERT INTO questions (id, quiz_deck_id, species_id, type, content, explanation, sort_order, difficulty_score) VALUES
    ('cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001',
     'd0000000-0000-0000-0000-000000000001', 'MULTIPLE_CHOICE',
     'Voọc Cát Bà phân bố tự nhiên tại đâu?',
     'Voọc Cát Bà là loài đặc hữu chỉ có trên đảo Cát Bà, Hải Phòng.',
     0, 2),
    ('cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001',
     'd0000000-0000-0000-0000-000000000001', 'MULTIPLE_CHOICE',
     'Ước tính có bao nhiêu cá thể Voọc Cát Bà ngoài tự nhiên?',
     'Hiện chỉ còn khoảng 70-80 cá thể ngoài tự nhiên.',
     1, 3);

INSERT INTO question_options (question_id, content, is_correct, sort_order) VALUES
    -- Q1 options
    ('cc000000-0000-0000-0000-000000000001', 'Đảo Cát Bà, Hải Phòng',     TRUE,  0),
    ('cc000000-0000-0000-0000-000000000001', 'VQG Cúc Phương, Ninh Bình',  FALSE, 1),
    ('cc000000-0000-0000-0000-000000000001', 'VQG Phong Nha, Quảng Bình',  FALSE, 2),
    ('cc000000-0000-0000-0000-000000000001', 'VQG Ba Vì, Hà Nội',          FALSE, 3),
    -- Q2 options
    ('cc000000-0000-0000-0000-000000000002', 'Dưới 100 cá thể',            TRUE,  0),
    ('cc000000-0000-0000-0000-000000000002', 'Khoảng 500 cá thể',          FALSE, 1),
    ('cc000000-0000-0000-0000-000000000002', 'Hơn 1000 cá thể',            FALSE, 2),
    ('cc000000-0000-0000-0000-000000000002', 'Đã tuyệt chủng',             FALSE, 3);

-- ==============================================================================
-- USER PROGRESS (researcher_01 is mid-expedition)
-- ==============================================================================
INSERT INTO user_expedition_progress (user_id, expedition_id, current_chapter_idx, completion_percent, is_completed)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 1, 50.00, FALSE);

-- ==============================================================================
-- USER FIELD NOTES (v2.0: uses unlock_source_type ENUM)
-- ==============================================================================
INSERT INTO user_field_notes (user_id, species_id, mastery_level, unlock_source_type, unlock_source_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 1,
     'EXPEDITION', 'f0000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- USER BADGES
-- ==============================================================================
INSERT INTO user_badges (user_id, badge_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- USER HOTSPOT DISCOVERIES (v2.0)
-- ==============================================================================
INSERT INTO user_hotspot_discoveries (user_id, hotspot_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- USER DOMAIN EXPERTISE (v2.0)
-- ==============================================================================
INSERT INTO user_domain_expertise (user_id, domain, expertise_score, species_count, mastered_count)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'MAMMALOGY', 40, 2, 0)
ON CONFLICT (user_id, domain) DO NOTHING;

-- ==============================================================================
-- XP TRANSACTIONS
-- ==============================================================================
INSERT INTO xp_transactions (user_id, amount, source_type, source_id, description) VALUES
    ('b0000000-0000-0000-0000-000000000001', 300, 'EXPEDITION_COMPLETE',
     'f0000000-0000-0000-0000-000000000002', 'Hoàn thành expedition: Kỳ Lân Trường Sơn'),
    ('b0000000-0000-0000-0000-000000000001', 50, 'HOTSPOT_DISCOVER',
     NULL, 'Phát hiện hotspot: Bẫy ảnh nghiên cứu');

-- ==============================================================================
-- FLASHCARD REVIEWS
-- ==============================================================================
INSERT INTO flashcard_reviews (user_id, species_id, ease_factor, interval_days, repetitions, next_review_at, last_quality) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
     2.50, 3, 2, NOW() + INTERVAL '3 days', 4);

-- ==============================================================================
-- DAILY CHALLENGES (v2.0)
-- ==============================================================================
INSERT INTO daily_challenges (user_id, title, description, condition, xp_reward) VALUES
    ('b0000000-0000-0000-0000-000000000001',
     'Thu thập 1 loài mới', 'Khám phá trang Chi Tiết Loài và thu thập vào Sổ Tay.',
     '{"type": "collect_species", "count": 1}', 25),
    ('b0000000-0000-0000-0000-000000000001',
     'Hoàn thành 1 quiz', 'Tham gia bất kỳ quiz nào và đạt điểm tối thiểu 60%.',
     '{"type": "complete_quiz", "min_score_pct": 60}', 30),
    ('b0000000-0000-0000-0000-000000000001',
     'Ôn tập flashcard', 'Ôn tập ít nhất 3 flashcard hôm nay.',
     '{"type": "flashcard_review", "count": 3}', 20);

-- ==============================================================================
-- AI CHAT SESSION (v2.0 — demo anonymous session)
-- ==============================================================================
INSERT INTO ai_chat_sessions (session_token, context_type, context_entity_id)
VALUES ('demo-session-001', 'EXPLORE_SPECIES', 'd0000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- NOTIFICATIONS
-- ==============================================================================
INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'SPECIES_UNLOCKED',
     'Loài mới đã thu thập!', 'Sao La đã được thêm vào Sổ Tay Thực Địa của bạn.',
     'd0000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000001', 'BADGE_UNLOCKED',
     'Huy hiệu mới!', 'Bạn đã nhận được huy hiệu "Khám Phá Đầu Tiên".',
     'aa000000-0000-0000-0000-000000000002');

-- ==============================================================================
-- Refresh Materialized Views after seed data
-- ==============================================================================
REFRESH MATERIALIZED VIEW mv_leaderboard;
REFRESH MATERIALIZED VIEW mv_species_summary;
REFRESH MATERIALIZED VIEW mv_expedition_stats;
REFRESH MATERIALIZED VIEW mv_domain_leaderboard;
