# DATABASE DESIGN — WILDVN WILD ACADEMY

## BƯỚC 1: THIẾT KẾ BẰNG LỜI (NARRATIVE DATABASE DESIGN)

---

### 1.1 Entity Identification

**Domain: User & Auth**

| Entity | Vai trò | Loại |
|--------|---------|------|
| `users` | Tài khoản người dùng, trung tâm của toàn hệ thống. Lưu thông tin xác thực, cấp bậc, XP. | Độc lập |
| `user_profiles` | Thông tin mở rộng của user (avatar, bio, conservation_identity). Tách khỏi `users` để tránh bảng quá rộng và hỗ trợ query user-auth không cần join profile. | Phụ thuộc `users` |
| `user_sessions` | Phiên đăng nhập (JWT refresh token tracking). Cần thiết cho multi-device logout và security audit. | Phụ thuộc `users` |

**Domain: Content & Species**

| Entity | Vai trò | Loại |
|--------|---------|------|
| `taxonomy` | Cây phân loại sinh học (Giới→Ngành→Lớp→Bộ→Họ→Chi). Self-referencing tree. | Độc lập |
| `species` | Thực thể loài sinh vật — trung tâm của content domain. | Độc lập |
| `species_media` | Hình ảnh, âm thanh, video gắn với loài. 1 loài có nhiều media. | Phụ thuộc `species` |
| `locations` | Địa điểm phân bố (Tỉnh, Vùng sinh thái, VQG). | Độc lập |
| `species_locations` | Junction table: loài ↔ địa điểm (N-N). | Junction |
| `species_relationships` | Quan hệ sinh thái giữa 2 loài (Predator-prey, Symbiosis...). | Junction |
| `conservation_history` | Audit trail lịch sử thay đổi tình trạng bảo tồn của loài. | Phụ thuộc `species` |
| `species_embeddings` | Vector embeddings cho AI/RAG search. | Phụ thuộc `species` |
| `species_hotspots` | **MỚI** — Điểm khám phá ẩn (hotspot) trong ảnh của expedition chapter. | Phụ thuộc `expedition_chapters` |

**Domain: Expeditions (Cuộc Viễn Chinh)**

| Entity | Vai trò | Loại |
|--------|---------|------|
| `expeditions` | Hành trình học tập chính (scroll-telling). Mỗi expedition có metadata, độ khó, thời gian. | Độc lập |
| `expedition_chapters` | Các chương con của expedition. Mỗi chapter có heroImage, content, audio cues. | Phụ thuộc `expeditions` |
| `expedition_audio_cues` | Danh sách audio cue theo % scroll trong chapter. | Phụ thuộc `expedition_chapters` |
| `expedition_species` | Junction: expedition ↔ species (N-N). Một expedition cover nhiều loài. | Junction |
| `expedition_quizzes` | **MỚI** — Boss Challenge quiz gắn với expedition. | Phụ thuộc `expeditions` |

**Domain: Gamification & Progress**

| Entity | Vai trò | Loại |
|--------|---------|------|
| `ranks` | Định nghĩa các cấp bậc (Novice Observer → Master Conservationist) và ngưỡng XP. | Độc lập |
| `user_expedition_progress` | Tiến trình user trong từng expedition (% hoàn thành, chapter hiện tại). | Phụ thuộc |
| `user_field_notes` | "Pokedex" — loài đã mở khóa vào sổ tay, mastery level của từng loài. | Junction |
| `user_streaks` | Streak hàng ngày của user. Chỉ 1 streak active tại 1 thời điểm. | Phụ thuộc `users` |
| `badges` | Định nghĩa huy hiệu với điều kiện unlock (JSONB condition logic). | Độc lập |
| `user_badges` | Huy hiệu user đã mở khóa. | Junction |
| `xp_transactions` | **MỚI** — Audit log mọi giao dịch XP (nguồn gốc, số lượng). Tương đương ledger. | Phụ thuộc `users` |

**Domain: Assessment & Quiz**

| Entity | Vai trò | Loại |
|--------|---------|------|
| `quiz_decks` | Bộ câu hỏi (Flashcard deck, Rapid-fire, Boss Challenge). | Độc lập |
| `questions` | Câu hỏi quiz. Hỗ trợ nhiều loại: Silhouette, Habitat Matching, Audio. | Phụ thuộc `quiz_decks` |
| `question_options` | Đáp án của câu hỏi (thay thế `answers`). | Phụ thuộc `questions` |
| `user_quiz_sessions` | **MỚI** — Một phiên làm quiz hoàn chỉnh (start→end). | Phụ thuộc `users` |
| `user_quiz_attempts` | Từng lần trả lời câu hỏi, partitioned by time. | Phụ thuộc |
| `flashcard_reviews` | **MỚI** — Spaced Repetition data: next_review_at, ease_factor, interval. | Phụ thuộc |

**Domain: Social & Community**

| Entity | Vai trò | Loại |
|--------|---------|------|
| `user_observations` | Quan sát thực địa của user (GPS + ảnh + species). | Phụ thuộc `users` |
| `notifications` | Thông báo hệ thống (badge unlock, level up, observation approved). | Phụ thuộc `users` |

---

### 1.2 Relationship Analysis

**Quan hệ chính:**

| Relationship | Type | Lý do Business |
|---|---|---|
| `users` → `user_profiles` | 1-1 | Tách auth data khỏi display data. Profile optional ở giai đoạn đầu. |
| `users` → `user_field_notes` | 1-N | User sở hữu collection loài. |
| `species` → `user_field_notes` | 1-N | Một loài được collect bởi nhiều user. |
| `users` ↔ `species` (qua `user_field_notes`) | N-N | Core gamification: user sưu tầm loài. |
| `taxonomy` → `taxonomy` | Self-ref | Cây phân loại: Kingdom→Phylum→...→Genus. |
| `taxonomy` → `species` | 1-N | Mỗi species thuộc 1 node taxonomy (GENUS level). |
| `species` ↔ `locations` (qua `species_locations`) | N-N | 1 loài phân bố nhiều nơi; 1 nơi có nhiều loài. |
| `expeditions` → `expedition_chapters` | 1-N | Expedition gồm nhiều chapter tuần tự. |
| `expeditions` ↔ `species` (qua `expedition_species`) | N-N | 1 expedition cover nhiều loài; 1 loài xuất hiện nhiều expeditions. |
| `users` → `user_expedition_progress` | 1-N | User theo dõi tiến trình từng expedition. |
| `quiz_decks` → `questions` → `question_options` | 1-N-N | Cấu trúc quiz phân cấp. |
| `users` → `user_quiz_sessions` → `user_quiz_attempts` | 1-N-N | Phiên quiz chứa nhiều lần trả lời. |
| `users` → `xp_transactions` | 1-N | Ledger bất biến ghi mọi nguồn XP. |
| `users` → `user_streaks` | 1-1 active | 1 user chỉ có 1 active streak. |

**Junction Tables cần thiết:**
- `species_locations` (species ↔ locations)
- `expedition_species` (expeditions ↔ species)
- `user_field_notes` (users ↔ species, enhanced junction)
- `user_badges` (users ↔ badges)

---

### 1.3 Attribute Design

**`users`:**
- `id` UUID — immutable PK
- `username` TEXT — mutable, unique, 3-30 chars alphanumeric+underscore
- `email` TEXT — mutable, unique, case-insensitive
- `password_hash` TEXT — immutable per change (Argon2id output)
- `role` ENUM(USER, MODERATOR, ADMIN) — mutable by admin
- `xp` INTEGER — mutable, denormalized counter (source of truth = xp_transactions SUM)
- `level` SMALLINT — derived from xp, denormalized for performance
- `created_at`, `updated_at` TIMESTAMPTZ — audit
- `deleted_at` TIMESTAMPTZ — soft delete

**`expeditions`:**
- `id` UUID
- `slug` TEXT — URL-friendly, unique
- `title` TEXT — required
- `description` TEXT — optional
- `difficulty` ENUM(beginner, intermediate, expert) — required
- `duration_minutes` SMALLINT — ước lượng thời gian đọc
- `thumbnail_url` TEXT
- `published_at` TIMESTAMPTZ — null = draft
- `location_name` TEXT — display name (vd: "VQG Cát Bà")
- `location_lat`, `location_lng` NUMERIC(10,7) — tọa độ GPS
- `xp_reward` INTEGER — XP nhận được khi hoàn thành

**`questions`:**
- `id` UUID
- `quiz_deck_id` UUID FK
- `species_id` UUID FK — optional (câu hỏi về loài cụ thể)
- `type` ENUM(SILHOUETTE, HABITAT_MATCH, AUDIO_REFLEX, RAPID_FIRE, BOSS)
- `content` TEXT — câu hỏi
- `explanation` TEXT — giải thích đáp án đúng
- `media_url` TEXT — ảnh/audio cho câu hỏi
- `sort_order` SMALLINT — thứ tự trong deck
- `difficulty_score` SMALLINT CHECK(1-5)

**`flashcard_reviews` (Spaced Repetition - SM-2 Algorithm):**
- `user_id` UUID FK
- `species_id` UUID FK — thẻ dựa trên loài
- `ease_factor` NUMERIC(4,2) DEFAULT 2.5 — SM-2 ease factor
- `interval_days` INTEGER DEFAULT 1 — số ngày đến lần review tiếp
- `repetitions` INTEGER DEFAULT 0 — số lần đã review thành công
- `next_review_at` TIMESTAMPTZ — thời điểm cần review tiếp
- `last_quality` SMALLINT CHECK(0-5) — chất lượng lần review cuối (Hard=1, Good=3, Easy=5)

---

### 1.4 Business Rules & Constraints

1. **XP không giảm trực tiếp:** `users.xp >= 0` (CHECK). XP chỉ tăng qua `xp_transactions`, không bao giờ giảm (ngoại trừ admin correction).
2. **Level được tính từ XP:** Level là cột denormalized. Trigger cập nhật `users.level` khi `users.xp` thay đổi dựa trên bảng `ranks`.
3. **Unique active streak:** Một user chỉ có 1 active streak. Constraint: `UNIQUE(user_id) WHERE ended_at IS NULL`.
4. **Expedition unlock:** `user_expedition_progress` chỉ được tạo sau khi user đã authenticated. Draft expeditions (`published_at IS NULL`) không thể được progress.
5. **Species card unlock condition:** Loài được add vào `user_field_notes` khi: hoàn thành expedition liên quan ĐẠI ĐA SỐ (boss challenge >= 60%), HOẶC hoàn thành quiz deck có `associated_species_id`.
6. **Gold Badge (Boss Challenge):** Badge "Huy Hiệu Vàng Thực Địa" chỉ unlock khi `user_quiz_sessions.score_percent >= 100` cho quiz type BOSS của expedition đó.
7. **Một đáp án đúng duy nhất:** Mỗi `question` chỉ có đúng 1 `question_option` có `is_correct = TRUE`. Partial unique index: `UNIQUE(question_id) WHERE is_correct = TRUE AND deleted_at IS NULL`.
8. **Primary media:** Mỗi species chỉ có 1 `species_media` là primary. Partial unique index: `UNIQUE(species_id) WHERE is_primary = TRUE AND deleted_at IS NULL`.
9. **Observation review logic:** Nếu `status = APPROVED/REJECTED` thì `reviewed_by` và `reviewed_at` phải NOT NULL. Nếu `status = PENDING` thì phải NULL.
10. **Taxonomy hierarchy:** Parent rank phải HIGHER (Kingdom > Phylum > Class > Order > Family > Genus). Validated bằng trigger.
11. **Chapter order:** `expedition_chapters.sort_order` phải unique per expedition. Constraint: `UNIQUE(expedition_id, sort_order)`.
12. **Soft delete:** Chỉ active records (deleted_at IS NULL) mới tham gia vào unique constraints (dùng partial index).

---

### 1.5 Data Lifecycle Analysis

| Bảng | Tạo khi | TTL | Delete Strategy | Audit Trail |
|------|---------|-----|-----------------|-------------|
| `users` | Registration | Vô thời hạn | Soft delete | `created_at`, `updated_at` |
| `xp_transactions` | Mỗi khi earn XP | Vô thời hạn | **Hard — không xóa bao giờ** (ledger) | Immutable |
| `user_quiz_attempts` | Mỗi lần trả lời | Giữ 3 năm → archive | Partition by year | `attempted_at` |
| `expeditions` | Admin tạo | Vô thời hạn | Soft delete | `created_at`, `updated_at`, `published_at` |
| `notifications` | System events | 90 ngày | Hard delete by cron | `created_at` |
| `user_sessions` | Login | 30 ngày | Hard delete khi expire | `created_at`, `expires_at` |
| `user_streaks` | First login | Vô thời hạn | Soft (ended_at) | `created_at` |
| `user_observations` | User submit | Vô thời hạn | Soft delete | `created_at`, `updated_at` |
| `species` | Admin import | Vô thời hạn | Soft delete | Full audit |
| `conservation_history` | Status change | Vô thời hạn | **Never delete** (scientific record) | Immutable |
| `flashcard_reviews` | First review | Vô thời hạn | Hard (cascade khi user xóa) | `updated_at` |

---

### 1.6 Scalability Considerations

**Bảng tăng trưởng nhanh nhất:**
1. `user_quiz_attempts` — O(users × questions × sessions/day) → **Partition by RANGE(attempted_at)**
2. `xp_transactions` — O(users × actions/day) → Index on `(user_id, created_at DESC)`
3. `notifications` — O(users × events) → TTL 90 ngày + hard delete cron

**Query thường xuyên nhất:**
1. `SELECT species WHERE deleted_at IS NULL ORDER BY conservation_status` — cần covering index
2. `SELECT user_field_notes WHERE user_id = $1` — cần index on `user_id`
3. `SELECT notifications WHERE user_id = $1 AND is_read = FALSE` — partial index on `is_read = FALSE`
4. `SELECT * FROM expeditions WHERE published_at IS NOT NULL ORDER BY published_at DESC` — partial index

**Index Strategy:**
- Tất cả FK columns → B-tree index
- Natural keys (email, username, slug) → Unique partial index (WHERE deleted_at IS NULL)
- Timestamp columns dùng cho sort/filter → B-tree DESC
- Soft-delete queries → Partial index (WHERE deleted_at IS NULL)
- Full-text search → GIN on `tsvector`
- JSONB queries → GIN on condition_logic
- Geospatial → GIST on geometry columns
- AI vector similarity → HNSW index

**Materialized Views để cache:**
- `mv_leaderboard` — refresh mỗi 5 phút
- `mv_species_summary` — refresh mỗi giờ
- `mv_expedition_stats` — refresh mỗi 30 phút
