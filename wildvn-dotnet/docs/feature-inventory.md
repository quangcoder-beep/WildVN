# T01 — Kiểm kê chức năng từ mã nguồn

Ngày đối chiếu: 2026-10-09. `đã xác minh qua mã nguồn` chỉ nói rằng đường gọi/implementation đã đọc. Trạng thái runtime của mọi luồng có implementation là **chưa xác minh**: chưa build/chạy Java/Next, chưa truy vấn DB, chưa gọi API hay provider thật. `placeholder` nói rõ trang chưa có API/implementation. Không coi snapshot tài liệu “1.176 loài” là số liệu DB hiện tại.

Ma trận dưới đây bao phủ tất cả 16 `page.tsx` tìm thấy bằng `rg --files wildvn-client/app`. Fixture tổng hợp và source paths cho từng dòng nằm tại [api-contracts.json](../tests/Fixtures/api-contracts.json). Quyền web và quyền backend có thể khác nhau: `wildvn-client/middleware.ts` chỉ kiểm tra cookie có giá trị để chặn `/profile` và `/academy`, còn Spring xác minh JWT; cookie/cache user không chứng minh phiên còn hợp lệ.

| Route | Source page | Nguồn dữ liệu / endpoint | Quyền | Trạng thái runtime |
|---|---|---|---|---|
| / | `wildvn-client/app/(home)/page.tsx` | Local cinematic videos/slides; featured species fetched by SpeciesFan; `GET /api/species/featured` | public | chưa xác minh |
| /search | `wildvn-client/app/search/page.tsx` | Species API keyword q; not the advanced /api/search pipeline; `GET /api/species?q=...` | public | chưa xác minh |
| /species | `wildvn-client/app/species/page.tsx` | SpeciesGrid and ecosystem tabs backed by Spring; `GET /api/species`, `GET /api/species/facets`, `GET /api/ecosystems` | public | chưa xác minh |
| /species/{slug} | `wildvn-client/app/species/[slug]/page.tsx` | Species detail, related and media; `GET /api/species/{slug}`, `GET /api/species/{slug}/related`, `GET /api/favorites/{speciesId}`, `POST /api/favorites` | public read; session for favorites | chưa xác minh |
| /ecosystems | `wildvn-client/app/ecosystems/page.tsx` | Redirect /species?view=ecosystems; `GET /api/ecosystems` | public | chưa xác minh |
| /ecosystems/{slug} | `wildvn-client/app/ecosystems/[slug]/page.tsx` | Spring ecosystem detail; `GET /api/ecosystems/{slug}` | public | chưa xác minh |
| /login | `wildvn-client/app/(auth)/login/page.tsx` | authStore / Spring login; social OAuth entry; `POST /api/auth/login`, `GET /api/auth/me`, `GET /oauth2/authorization/{provider}` | public | chưa xác minh |
| /register | `wildvn-client/app/(auth)/register/page.tsx` | Spring register (auto login cookie); `POST /api/auth/register` | public | chưa xác minh |
| /forgot-password | `wildvn-client/app/(auth)/forgot-password/page.tsx` | setTimeout only; no reset/email API; không có API | public | placeholder |
| /reset-password | `wildvn-client/app/(auth)/reset-password/page.tsx` | setTimeout only; no password mutation API; không có API | public | placeholder |
| /profile | `wildvn-client/app/profile/page.tsx` | Redirect /profile/favorites; không có API | session | chưa xác minh |
| /profile/favorites | `wildvn-client/app/profile/favorites/page.tsx` | Spring favorite rows mapped to species; `GET /api/favorites` | session | chưa xác minh |
| /academy | `wildvn-client/app/academy/page.tsx` | Spring overview plus per-user progress; no expedition catalog; `GET /api/academy/overview`, `GET /api/academy/sync` | web route: cookie presence via middleware; API: public catalog/overview, session progress | chưa xác minh |
| /academy/field-notes | `wildvn-client/app/academy/field-notes/page.tsx` | Species catalog/detail, server unlocked slugs; `GET /api/species`, `GET /api/species/{slug}`, `GET /api/academy/sync`, `POST /api/academy/sync` | web route: cookie presence via middleware; API: public catalog/overview, session progress | chưa xác minh |
| /academy/arena | `wildvn-client/app/academy/arena/page.tsx` | Species-based flashcard recall; not quiz backend; `GET /api/species`, `POST /api/academy/sync` | web route: cookie presence via middleware; API: public catalog/overview, session progress | chưa xác minh |
| /academy/expeditions/{slug} | `wildvn-client/app/academy/expeditions/[slug]/page.tsx` | Explicit unavailable module message; không có API | web route: cookie presence via middleware; API: public catalog/overview, session progress | placeholder |

## Luồng xuyên màn hình và năng lực ngoài UI

- Auth/logout/me: `wildvn-client/app/_shared/stores/authStore.ts` dùng endpoint Spring và cookie; profile editor chưa có endpoint. Google/Facebook entry hiện mở OAuth browser; provider registration chỉ bật khi có config. Callback Java redirect về web, chưa có broker loopback/PKCE desktop. Nguồn: `wildvn-server/src/main/java/com/example/wildvn/security/SecurityConfig.java` và `security/oauth2/OAuth2AuthenticationSuccessHandler.java` (cùng source root server).
- Chat overlay: `wildvn-client/app/_shared/components/ai-chat/AIChatPanel.tsx`, `AIChatInput.tsx`, `wildvn-client/app/_shared/services/api.ts`; POST `/api/chat/stream`, sessions/messages/delete. POST SSE `token`/`done` là chia câu trả lời đã hoàn tất, chưa là provider streaming. Có database/Anthropic routing, fallback và lịch sử theo user UUID, retention mặc định 5 ngày. Voice dùng Web Speech vi-VN; Windows engine chưa kiểm chứng.
- Search trang web dùng `/api/species?q=`, không chứng minh search nâng cao sẵn sàng. Có controller/adapters Elasticsearch, Redis, Qdrant, recommendation, Kafka analytics và admin reindex trong `wildvn-server/src/main/java/com/example/wildvn/domain/search/`. GET keyword/semantic/hybrid gọi `trackSearch`; tuyệt đối không replay vào hệ thật để lấy bằng chứng parity.
- `MlServiceClient.java` chỉ là HTTP client `/ml/embed` và `/ml/rerank`; không tìm thấy server ML do repo triển khai. Năng lực ML bên ngoài, model/dimension/provider chưa xác minh; mẫu vector 2D fixture chỉ mô tả shape. T24 phải giải quyết gap trước khi bật capability, không tự giả định Python ML server đã vận hành.
- Camera nhận diện, map hoàn chỉnh, quiz, badge/XP phức tạp và expedition catalog không được đánh dấu implemented. Arena hiện là flashcard theo loài; API sync không nhận điểm client, từ chối expedition mới. Forgot/reset chỉ có `setTimeout`, không gửi email/đổi mật khẩu thật.
- Media: URL bên ngoài được giữ nguyên; object path có thể ký GET URL nếu signer hiện hữu. Web có WebP/MP4/WebM và audio; MinIO/presigned expiry/codecs/DPI/lifecycle thật cần T05 Windows evidence. Không đưa tất cả assets lên installer trong T01.

## Visibility cần giữ theo endpoint

Nguồn: `wildvn-server/src/main/java/com/example/wildvn/domain/species/repository/SpeciesRepository.java`, `domain/species/service/SpeciesQueryService.java`, `domain/academy/AcademyProgressService.java`, `domain/academy/AcademyOverviewService.java`, `domain/ecosystem/controller/EcosystemController.java`.

| Endpoint/luồng | Soft delete | Publish |
|---|---|---|
| Species catalog/detail/featured/related/facets | Loại deleted | Không bắt buộc PUBLISHED |
| Academy sync unlocked slugs | Loại deleted | Chỉ PUBLISHED |
| Academy overview count | Loại deleted | Chỉ PUBLISHED; featured/facets tái dùng policy species |
| Ecosystem entity | Model không có fields tương ứng | Model không có fields tương ứng |
| Ecosystem detail species | `findByEcosystemId` không lọc deleted | Không lọc publish |
| Favorite list/status | Không thêm filter publish/deleted | Existing favorite có thể trỏ deleted; toggle tạo mới chỉ loại deleted |
| Admin reindex | `findAll` cả deleted | Cả draft |

Fixture có DRAFT/PUBLISHED/DELETED riêng. Đây là mô tả nguồn, không khuyến khích lộ dữ liệu riêng tư; nếu baseline thật phát hiện thông tin riêng tư thì tách sửa bảo mật với acceptance riêng.

## OAuth credentials và provenance

Chỉ được kiểm tra tên/path, `git ls-files`, `git check-ignore`, `git log -- <path>` và đường đóng gói, không đọc/in/copy/edit nội dung credentials. Root `.git` rỗng/thiếu metadata; client và server là repository độc lập. Vì vậy không thể chứng nhận lịch sử/chia sẻ của file OAuth root hoặc kết luận đã leak chỉ từ sự có mặt trên đĩa. Kết quả metadata cụ thể và giới hạn nằm trong [p0-evidence.md](p0-evidence.md); dùng credential thật/rotate provider thuộc việc được phê duyệt riêng khi có bằng chứng.

Migration repository chỉ include `wildvn-dotnet/`; fixture dùng UUID/email/media tổng hợp với domain `.invalid`, không dùng token/provider secret từ root. Không gọi API live, kể cả GET search. Đây là đóng băng hợp đồng source-backed ban đầu; runtime capture sạch trong môi trường thử nghiệm vẫn cần cho full parity.
