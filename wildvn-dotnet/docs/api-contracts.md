# T01 — API contracts từ Spring source

Nguồn đối chiếu là 9 controller, DTO/service/security hiện hữu. Có 33 endpoint controller và 16 page Next, toàn bộ mẫu request/response là **tổng hợp từ mã nguồn**, không là capture production. Kiểm tra snapshot offline xác nhận endpoint/page/field không thiếu, không chứng minh server đang chạy hay serialize đúng trên wire. Runtime: **chưa xác minh**. `tests/Fixtures/api-contracts.json` là snapshot có request, status, family, full DTO samples, source paths và side effects từng endpoint.

## Bốn response family riêng

1. `ApiResponse<T>`: JSON camelCase, `success`, `data`, `message`, `errorCode`, `pagination`, `meta`. Annotation `NON_NULL` chỉ trên envelope: omit `data` khi null, omit message/errorCode/pagination/meta khi null, luôn giữ success boolean. Pagination `{page,limit,total}`; meta `{latencyMs,cacheHit}`. Field DTO con null không bị annotation envelope tự loại.
2. `AuthResponse`: không có success/data envelope; login/register/me trả `{accessToken:null,refreshToken:null,user:{...}}` dự đoán theo DTO/Jackson mặc định. Controller loại token value khỏi body bằng tạo safe response; không có `JsonInclude` trên DTO và không thấy global `default-property-inclusion`, nên **không tự khẳng định keys token bị bỏ**. Cần runtime xác nhận exact null serialization. Logout HTTP **200**, body rỗng, Set-Cookie max-age=0; me không authenticated HTTP **401**, body rỗng.
3. `ErrorResponse`: `{timestamp,status,error,message,path}` từ advice/security handlers, không có success/data. Timestamp là `LocalDateTime.now().toString()` không timezone offset, không coi là UTC. Các mã nguồn xử lý 400 validation/IllegalArgument, 401 authentication, 403 permission/CSRF, 404 missing species/ecosystem, 409 IllegalState (duplicate account), 429 rate limit, 500 message chung. Binding/malformed JSON đi qua framework/generic handler chưa chạy thử; không cam kết exact body cho case chưa xác minh.
4. POST SSE `/api/chat/stream`: `text/event-stream`; event token có plain text, done có `ChatResponse` nguyên bản không envelope. Server tính answer xong rồi chia **80 Java UTF-16 characters** mỗi token event; emitter timeout 60s. Không gọi là model token streaming. Error trước stream/completeWithError sau headers chưa có wire evidence.

Nguồn: `wildvn-server/src/main/java/com/example/wildvn/common/dto/ApiResponse.java`, `common/dto/PaginationMeta.java`, `common/dto/RequestMeta.java`, `common/exception/GlobalExceptionHandler.java`, `domain/auth/controller/AuthController.java`, `domain/auth/dto/AuthResponse.java`, `domain/chat/ChatController.java` (các relative suffix đều trong cùng Java source root).

## Auth, cookies và XSRF

- Login request `{username,password}`; register `{username,email,password}`; username đăng ký 3–30 alphanumeric/underscore, email valid, password tối thiểu 6. Success login/register HTTP **200** và auto login cookie, không mặc định 201. Login limiter 5 lần/username/phút; chat limiter 30/IP/phút, in-memory state. Wrong credentials 401; duplicate username/email 409.
- `wildvn-auth-token`: HttpOnly, Path=/, Max-Age=2592000 seconds, Secure theo config default false, SameSite theo config default Lax. JWT đọc **từ cookie**, không đọc bearer header. Credential/signing key là server-only; mẫu fixtures không chứa cookie/token value.
- XSRF mặc định enabled; `CookieCsrfTokenRepository.withHttpOnlyFalse()`, cookie `XSRF-TOKEN`, header `X-XSRF-TOKEN`. Chỉ `/api/auth/**` exempt. POST chat/SSE, favorites, Academy sync, click tracking và admin reindex đều cần XSRF khi bật, kể cả public chat/search endpoints. Không coi anonymous/public là CSRF-exempt.
- Source chưa có endpoint bootstrap CSRF chuyên dụng; deferred token/materialization cookie qua GET chưa chứng minh runtime. T08 phải thử khởi tạo token/expiry/logout/401/403 trên test host đã dựng. Cookie/container session mặc định RAM; desktop không đọc browser profile/secret JSON.
- Security public catalog/ecosystems/search/recommend/chat answer/stream/Academy overview/OAuth entry/callback. Favorites qua `anyRequest().authenticated()`. Academy sync và chat history authenticated; admin ROLE_ADMIN. `/api/auth/me` và recommend for-you checks controller trong đường security permitAll.
- **Recommend for-you unauthenticated trả HTTP 200** `{success:false,errorCode:"UNAUTHORIZED",message:"User must be authenticated for personalized recommendations."}`. Không sửa status thành 401 rồi gọi là parity.

Nguồn: `wildvn-server/src/main/java/com/example/wildvn/security/SecurityConfig.java`, `JwtAuthFilter.java`, `CustomAuthenticationEntryPoint.java`, `CustomAccessDeniedHandler.java`, `LoginRateLimiter.java`; client `wildvn-client/app/_shared/services/api.ts` và `app/_shared/stores/authStore.ts`.

## DTO, enum, null và date

Snapshot `dtos` ghi 26 declaration field lists để bắt drift; `enums` ghi 9 Java enum sets. DTOs có UUID strings, enum UPPER_SNAKE_CASE, nullable String/Integer/Boolean/reference; arrays/lists giữ shape. `TaxonomyDto.parent` là recursive nullable object. Species có `habitatType` **array**, `synonyms` array, `sourceReferences` array/object JSON; nhưng legacy `tags`, `galleryUrls`, `relatedSpeciesIds`, `lessonIds` là **String**, không tự biến thành JSON array. SpeciesSummary có `images` list, shortDescription; SpeciesDetail có các trường mô tả riêng, không có images/shortDescription. Media fallback từ thumbnail có `id:null`.

`FavoriteDto.createdAt`, `ChatSessionSummary.updatedAt/expiresAt`, SyncFailure timestamps là OffsetDateTime (ISO date/time offset dự đoán Jackson Java time defaults; exact formatting chưa capture). Error timestamp là local datetime string riêng. Auth user id String; species/media/taxonomy/ecosystem/session ids UUID. Favorites/Academy keys nội bộ dùng username String, chat ownership users.id UUID; không tự đổi mọi khóa thành UUID/email.

| Enum | Wire values |
|---|---|
| DietType | `CARNIVORE`, `HERBIVORE`, `OMNIVORE`, `INSECTIVORE`, `AUTOTROPH` |
| HabitatType | `TERRESTRIAL`, `FRESHWATER`, `MARINE`, `CANOPY` |
| ActivityPattern | `DIURNAL`, `NOCTURNAL`, `CREPUSCULAR` |
| MediaType | `IMAGE`, `AUDIO`, `VIDEO` |
| VnRedListStatus | `EX`, `EW`, `CR`, `EN`, `VU`, `NT`, `LC`, `DD`, `NE` |
| CitesAppendix | `II`, `III`, `NONE` |
| VnDecreeStatus | `GROUP_IA`, `GROUP_IB`, `GROUP_IIA`, `GROUP_IIB`, `NONE` |
| PublishStatus | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| TaxonomyRank | `KINGDOM`, `PHYLUM`, `CLASS`, `ORDER`, `FAMILY`, `GENUS` |

## Endpoint snapshot index

Mỗi dòng tra `endpoints` theo `(method,path)` trong fixture để xem **mẫu request/response đầy đủ**, status, nguồn và replay policy. Tất cả success hiện là HTTP 200; các errors riêng trong `errors`, không ép envelope.

| Method/path | Family | Quyền | Side effects |
|---|---|---|---|
| `GET /api/species` | envelope | public | không ghi từ controller đã đọc |
| `GET /api/species/featured` | envelope | public | không ghi từ controller đã đọc |
| `GET /api/species/facets` | envelope | public | không ghi từ controller đã đọc |
| `GET /api/species/{slug}` | envelope | public | không ghi từ controller đã đọc |
| `GET /api/species/{slug}/related` | envelope | public | không ghi từ controller đã đọc |
| `GET /api/ecosystems` | envelope | public | không ghi từ controller đã đọc |
| `GET /api/ecosystems/{slug}` | envelope | public | không ghi từ controller đã đọc |
| `POST /api/auth/login` | auth | public | session cookie issued |
| `POST /api/auth/register` | auth | public | user/profile persisted; session cookie issued |
| `POST /api/auth/logout` | empty | public | session cookie expired |
| `GET /api/auth/me` | auth | controller checks session (security path public) | không ghi từ controller đã đọc |
| `GET /api/favorites` | envelope | session | không ghi từ controller đã đọc |
| `GET /api/favorites/{speciesId}` | envelope | session | không ghi từ controller đã đọc |
| `POST /api/favorites` | envelope | session | toggle favorite persisted; repeat reverses state |
| `GET /api/academy/overview` | envelope | public | không ghi từ controller đã đọc |
| `GET /api/academy/sync` | envelope | session | không ghi từ controller đã đọc |
| `POST /api/academy/sync` | envelope | session | per-username progress persisted; lastActiveDate updated |
| `POST /api/chat` | envelope | public | rate-limit state; history appended if authenticated; provider may make remote call |
| `POST /api/chat/stream` | sse | public | rate-limit state; history appended if authenticated; provider may make remote call |
| `GET /api/chat/sessions` | envelope | session | không ghi từ controller đã đọc |
| `GET /api/chat/sessions/{sessionId}/messages` | envelope | session owner | không ghi từ controller đã đọc |
| `DELETE /api/chat/sessions/{sessionId}` | envelope | session owner | session/history deleted |
| `GET /api/search` | envelope | public | trackSearch; Redis cache read/write |
| `GET /api/search/semantic` | envelope | public | trackSearch; Redis cache read/write |
| `GET /api/search/hybrid` | envelope | public | trackSearch; Redis cache read/write |
| `GET /api/search/suggest` | envelope | public | Redis cache read/write |
| `GET /api/search/ai-suggest` | envelope | public | Redis cache read/write |
| `GET /api/search/trending` | envelope | public | không ghi từ controller đã đọc |
| `POST /api/search/track/click` | envelope | public | Kafka click analytics |
| `GET /api/recommend/similar/{entityId}` | envelope | public | không ghi từ controller đã đọc |
| `GET /api/recommend/for-you` | envelope | controller checks session (security path public) | không ghi từ controller đã đọc |
| `GET /api/admin/sync/failures` | envelope | ROLE_ADMIN | không ghi từ controller đã đọc |
| `POST /api/admin/sync/reindex` | envelope | ROLE_ADMIN | species.updated events published for every species (including deleted/draft) |

## Quy tắc nghiệp vụ đã đọc, cần parity tiếp theo

- Species pagination page bắt đầu **1**, limit 1–100 default 20; q/tag trim tối đa 100; blank/ALL thành null. Status upper-case validate IUCN; enum diet/habitat/activity upper-case validate Java enums. `group` ưu tiên hơn `category`, map Thú/Chim/Bò sát/Lưỡng cư/Cá tới taxonomy CLASS; invalid 400. Catalog sort name_vn rồi id. Related cùng conservationStatus, bỏ chính nó, tối đa 8; featured isFeatured non-deleted, fallback top9 non-deleted có thumbnail name ASC. Không tự thêm PUBLISHED.
- Ecosystem pagination page1/limit1–100/name ASC. Region/climate kiểm tra rỗng/ALL nhưng không trim giống species. Detail nested species không filter deleted/publish; galleryUrls legacy String chưa ký resolve như thumbnail.
- Favorites list createdAt descending; status boolean không cần loài tồn tại; toggle existing xóa, absent tạo nếu species exists/non-deleted (không require published). **Không retry POST toggle** vì lặp request có thể đảo trạng thái lần hai. List không tự lọc deleted favorite species.
- Academy overview count PUBLISHED/non-deleted, featured/facets policy khác từ SpeciesQueryService. Sync body `payload.unlockedSpecies` required max500 entries, mỗi string notblank/max255; trim/dedupe slugs, phải PUBLISHED/non-deleted. `completedExpeditions` omitted/null giữ legacy progress; [] xóa; nonempty **400** vì chưa có catalog. Server giữ rpPoints/streak, không nhận điểm client.
- Chat messages require ít nhất một user, role user/assistant case-insensitive, nonblank content, max20 messages/max4000 chars mặc định. `contextEntityId` tên misleading: resolver dùng **species slug**, không UUID; contextType không dùng để lookup trong resolver hiện tại. Anonymous sessionId response null, signed-in append owned history. Requested/expired/not-owned sessionId hiện 400 theo IllegalArgument; history requires auth and retention default5 days. Provider fallback `database-fallback`, citations list luôn nonnull; stream done không envelope.
- Keyword search controller nhận q/type/page/limit; type đi vào cache/event nhưng `keywordSearch(q,page,limit)` không truyền type filter. Không áp validation page/limit giống species khi chưa có bằng chứng. Search result nested `{results,searchType,totalHits}`, outer pagination/meta; suggestion list và trending strings. Semantic page1; keyword/semantic/hybrid **trackSearch cả cache hit**; suggest/ai-suggest có Redis cache writes. Không mirror những GET này sang production. Cache TTL source 5 phút result, 1 phút suggestions.
- Reindex target String comment all/elasticsearch/qdrant nhưng controller không validate hay dùng target để lọc publisher: publish species.updated cho **tất cả** species, target chỉ trong response text. Click body không có @Valid validation ở controller. Đây là debt nguồn, không bịa thành input/rate guarantees.
- ML external client shapes: POST `/ml/embed` request `{text}` response `{vector,dim,latency_ms}`; `/ml/rerank` `{query,candidates}` → `{scores,ranked_indices,latency_ms}`. Không có server implementation trong repo, dimension/model/config reachable chưa xác minh. Fixture vector2 là minh họa shape, không production index schema.

Nguồn chi tiết theo từng endpoint/DTO trong fixture; tính năng nguồn được mô tả ở [feature-inventory.md](feature-inventory.md). Tất cả request viết/provider/search analytics bị giới hạn fixture/stub, không gọi live. Schema/media/provider exact runtime phải bổ sung sau bằng môi trường được phép; T01 snapshot GREEN chỉ là kiểm tra tài liệu và source completeness.
