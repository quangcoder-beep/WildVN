# Backlog chuyển WildVN sang desktop Windows và backend .NET

Đọc cùng [plan.md](./plan.md). Đích triển khai là WPF trên .NET 10 và ASP.NET Core 10; PostgreSQL, MinIO và hạ tầng tìm kiếm được giữ lại. Desktop không cần chạy Next.js. Python crawler có thể tiếp tục là công cụ nhập liệu chạy riêng.

Cập nhật P0 ngày 2026-10-09: T01–T05 đã có artifacts và commits trong repository `wildvn-dotnet/`; bằng chứng chạy lại nằm ở [TEST-REPORT.md](../../../wildvn-dotnet/handover/TEST-REPORT.md). T02 baseline thật, T04/T05 Windows và coverage toàn production còn **CHƯA KIỂM CHỨNG**; chưa nghiệm thu P0 và chưa triển khai T06. Các checkbox bên dưới chỉ xác nhận trọn tiêu chí có bằng chứng, không tự xác nhận cả task/phase. Mỗi task chỉ ước lượng tối đa 5 file: **S** = 1–2 file, **M** = 3–5 file. Nếu việc khảo sát khi bắt đầu cho thấy cần hơn 5 file hoặc hơn một phiên triển khai tập trung, tách task thành các phần `Txx.a`, `Txx.b` trước khi viết code; giữ nguyên ID cha và các dependencies. Danh sách file bao gồm file kiểm thử dự kiến, không phải giấy phép bỏ kiểm thử ở task thiếu một test file riêng.

Áp dụng TDD cho thay đổi hành vi: ghi nhận RED, chạy GREEN rồi refactor. Với code production .NET, yêu cầu tối thiểu 80% coverage theo gate T27, unit/integration/E2E phù hợp và không skip suite để đạt gate. Checkpoint xác nhận kết quả và ghi bằng chứng vào báo cáo; không tự động commit, push hoặc triển khai production.

## T01 — Kiểm kê chức năng và đóng băng API contracts

**Mục tiêu:** Lập ma trận từ route Next.js tới API Spring, dữ liệu thật và trạng thái UI hiện tại; phân biệt chức năng hoạt động với placeholder.

**Dependencies:** Không. **Scope:** M.

**Acceptance criteria:**
- [x] Mỗi màn hình hiện hữu có nguồn dữ liệu, endpoint, quyền truy cập và trạng thái `đã xác minh`, `chưa xác minh` hoặc `placeholder`; forgot/reset password, quiz và expedition không được đánh dấu đã hoạt động chỉ vì có trang UI.
- [x] Contract fixtures ghi đúng HTTP status, DTO, pagination, enum, lỗi, cookie/XSRF và SSE; giữ riêng response auth hiện tại thay vì mặc định mọi API dùng cùng envelope.
- [x] Mỗi hành vi đưa vào parity có ít nhất một source path và một mẫu request/response hoặc test chứng minh; ML HTTP client không được ghi thành implementation ML có trong repository.

**Verification:** Review đối chiếu controllers, services và API client hiện hữu; contract snapshot check với fixture đã làm sạch, không gọi API production. Rà secret files, ignore rules và trạng thái tracking/chia sẻ của OAuth credentials mà không in giá trị; nếu đã commit hoặc chia sẻ, lập việc rotate server provider secret theo quy trình được phép, không kết luận đã leak chỉ vì file có trên máy.

**Likely files:** `wildvn-dotnet/docs/feature-inventory.md`; `wildvn-dotnet/docs/api-contracts.md`; `wildvn-dotnet/tests/Fixtures/api-contracts.json`.

**Bằng chứng T01:** [t01.txt](../../../wildvn-dotnet/evidence/p0-rerun/t01.txt), inventory/contracts source và 9/9 tests; source-backed fixtures, chưa capture Java wire. Runtime Java/providers/ML **CHƯA KIỂM CHỨNG**.

## T02 — Fixture PostgreSQL, schema runtime và quyền quản lý migrations

**Mục tiêu:** Tạo baseline từ database thực tế đã được phép truy cập, đối chiếu Flyway, SQL crawler và Prisma; thử restore trước khi quyết định migration .NET.

**Dependencies:** T01. **Scope:** M.

**Acceptance criteria:**
- [ ] Schema snapshot và fixture đã làm sạch bao phủ enum, enum array, JSONB, UUID, dữ liệu loài, tài khoản/hash thử nghiệm, favorites, Academy và chat; không lưu dữ liệu cá nhân hay credentials production.
- [x] Restore vào PostgreSQL trống chạy được và đối chiếu counts, constraints, indexes, foreign keys; ghi rõ sai khác giữa schema runtime và các nguồn SQL trong repo.
- [ ] Có một chủ sở hữu migrations trong thời gian coexistence và sau cutover; Flyway history được bảo toàn, không chạy `EnsureCreated`, tự tạo baseline sai hoặc đồng thời cho EF/Flyway sửa cùng schema.

**Verification:** Integration bằng script restore PostgreSQL fixture; kiểm tra schema diff và thử restore backup độc lập.

**Likely files:** `wildvn-dotnet/docs/database-baseline.md`; `wildvn-dotnet/tests/Fixtures/schema.sql`; `wildvn-dotnet/tests/Fixtures/seed.sql`; `wildvn-dotnet/build/Restore-Fixture.ps1`; `wildvn-dotnet/build/Verify-Schema.ps1`.

**Bằng chứng T02:** [t02.txt](../../../wildvn-dotnet/evidence/p0-rerun/t02.txt), PostgreSQL15.18: restore nguồn +backup restore độc lập, mỗi DB11/11 tests, 18 bảng counts/hash bằng nhau; guard tổng hợp96,77%. Schema snapshot hiện là source-derived synthetic fixture. Baseline DB thật, Flyway history/extensions và bảo toàn history thực tế **CHƯA KIỂM CHỨNG**; giữ hai tiêu chí tương ứng chưa tick.

## T03 — ASP.NET Core skeleton và contracts dùng chung

**Mục tiêu:** Dựng API .NET 10 với cấu hình theo môi trường, shared DTO và điểm mở rộng theo domain.

**Dependencies:** T01, T02. **Scope:** M.

**Acceptance criteria:**
- [x] API build/chạy bằng .NET 10; health endpoint phân biệt tiến trình còn sống với dependencies chưa sẵn sàng và không tiết lộ cấu hình nhạy cảm.
- [ ] JSON casing, nullable, enum và envelope khớp fixtures T01; validation/error mapping trả status và thông báo đã quy định.
- [x] Cấu hình secrets đọc từ nguồn ngoài repo; API client desktop có thể tham chiếu contracts mà không tham chiếu implementation server.

**Verification:** `dotnet build` API/contracts; unit serialization và integration bằng test host với cấu hình thử nghiệm.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/WildVN.Api.csproj`; `wildvn-dotnet/src/WildVN.Api/Program.cs`; `wildvn-dotnet/src/WildVN.Contracts/WildVN.Contracts.csproj`; `wildvn-dotnet/src/WildVN.Contracts/ApiContracts.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/ApiBootstrapTests.cs`.

**Bằng chứng T03:** [t03.txt](../../../wildvn-dotnet/evidence/p0-rerun/t03.txt), .NET10 build sạch,10/10 tests, API/contracts100% lines,6/6 root branches; curl200/503/404/405. Serialization và lỗi404/405 đã chứng minh; domain validation/business routes chưa port và Java wire parity **CHƯA KIỂM CHỨNG**, nên tiêu chí validation/error tổng hợp chưa tick. External configuration và client reference được đối chiếu source/build, không nạp secret thật.

### Checkpoint C01 — Sau T01–T03

- [x] Inventory và contracts có bằng chứng; placeholder không được tính là tính năng đã migrate.
- [ ] API build sạch, restore PostgreSQL fixture thành công và ownership migrations đã ghi rõ.

**Checkpoint C01 chưa nghiệm thu:** API và source fixture có bằng chứng, migration ownership đã ghi nhưng T02 baseline/history thực tế **CHƯA KIỂM CHỨNG**. Không suy từ restore fixture rằng baseline production đã được bảo toàn.

## T04 — WPF shell và ApiClient

**Mục tiêu:** Tạo WPF/MVVM shell, navigation, cấu hình API và HTTP client dùng xuyên suốt ứng dụng.

**Dependencies:** T03. **Scope:** M.

**Acceptance criteria:**
- [ ] Shell chạy trên Windows bằng `net10.0-windows`, có navigation và trạng thái loading/error bằng tiếng Việt; thao tác I/O không khóa UI thread.
- [x] ApiClient có timeout, cancellation và error mapping; chỉ retry các request an toàn đã quy định, không retry mặc định POST/mutation.
- [ ] Endpoint cấu hình được theo môi trường; ứng dụng không cần Node.js, Next server hoặc render route web để khởi động.

**Verification:** Build WPF trên Windows; unit ApiClient với HTTP handler giả lập; smoke UI navigation bằng Windows UI Automation.

**Likely files:** `wildvn-dotnet/src/WildVN.Desktop/WildVN.Desktop.csproj`; `wildvn-dotnet/src/WildVN.Desktop/App.xaml`; `wildvn-dotnet/src/WildVN.Desktop/MainWindow.xaml`; `wildvn-dotnet/src/WildVN.Desktop/ShellViewModel.cs`; `wildvn-dotnet/src/WildVN.ApiClient/ApiClient.cs`.

**Bằng chứng T04:** [t04.txt](../../../wildvn-dotnet/evidence/p0-rerun/t04.txt), WPF Release cross-build sạch,33 client +62 desktop tests pass; client100% lines/98,48% branches; ShellViewModel98,65%/97,92%. Windows startup/navigation/dispatcher/UI Automation và yêu cầu không Node/Next ở runtime máy sạch **CHƯA KIỂM CHỨNG**. Source không có dependency Node/Next để startup; chưa thay bằng bằng chứng Windows.

## T05 — PoC media native và WebView2 cục bộ

**Mục tiêu:** Kiểm chứng cách hiển thị cinematic home, ảnh, video và chi tiết loài trước khi nhân rộng UI.

**Dependencies:** T01, T04. **Scope:** M.

**Acceptance criteria:**
- [ ] So sánh WPF native với WebView2 chỉ chứa tài nguyên HTML/CSS/JS cục bộ biệt lập; PoC dùng cùng mẫu MinIO media và ghi rõ kết quả codecs, loading, lỗi URL và điều khiển playback.
- [ ] Có kết quả Windows 10/11 tại DPI 100%, 150%, 200% theo support matrix trong plan; đo startup, RAM và frame drops bằng cùng kịch bản để quyết định.
- [ ] Ghi lựa chọn có lý do; nếu dùng WebView2 thì chặn navigation ngoài allowlist và cầu nối không cần thiết, có kế hoạch runtime packaging; cả hai phương án không chạy Next.js.

**Verification:** Manual/device matrix và visual snapshots; lifecycle check mở/đóng/navigate lặp lại không còn video/audio nền; ghi số đo PoC.

**Likely files:** `wildvn-dotnet/src/WildVN.Desktop/Media/MediaPoCView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Media/NativeMediaPresenter.cs`; `wildvn-dotnet/src/WildVN.Desktop/Media/IsolatedWebMediaPresenter.cs`; `wildvn-dotnet/src/WildVN.Desktop/Media/Assets/media-poc.html`; `wildvn-dotnet/docs/media-poc-results.md`.

**Bằng chứng T05:** [t05.txt](../../../wildvn-dotnet/evidence/p0-rerun/t05.txt), WPF cross-build sạch,62 desktop +3 HTML/real-JS DOM-stub tests pass; MediaPolicy100% lines/93,75% mapped branches. Cùng mẫu MinIO, Windows10/11+DPI100/150/200, actual playback/lifecycle/performance/snapshots và lựa chọn renderer cuối **CHƯA KIỂM CHỨNG**. Native/WebView security policy có tests, chưa đủ toàn tiêu chí nên chưa tick. Dừng P0, chờ người dùng xác nhận; T06 chưa thực hiện.

## T06 — EF Core/Npgsql mapping schema hiện hữu

**Mục tiêu:** Đọc/ghi đúng PostgreSQL baseline mà không thiết kế lại dữ liệu giữa migration.

**Dependencies:** T02, T03. **Scope:** M.

**Acceptance criteria:**
- [ ] Round-trip được enum PostgreSQL, enum arrays, JSONB, UUID và timestamp trên fixture; bảng/cột/naming khớp schema runtime, không tự tạo schema khác.
- [ ] Giữ semantics khóa legacy: `users.id`/chat dùng UUID, còn `user_favorites.user_id` và `academy_progress.user_id` runtime là chuỗi username; không ép tất cả về UUID/email hoặc đổi ID gây đứt khóa ngoại.
- [ ] Scaffolding được review và bổ sung mapping thủ công cho kiểu không sinh chính xác; query soft-delete/publish và transaction giữ hành vi nguồn, không dùng migration tự sinh chưa review.

**Verification:** Integration against PostgreSQL thật từ T02; schema diff phải rỗng khi khởi động API; tests read/write rồi rollback fixture.

**Likely files:** `wildvn-dotnet/src/WildVN.Infrastructure/Data/WildVnDbContext.cs`; `wildvn-dotnet/src/WildVN.Infrastructure/Data/LegacyEntities.cs`; `wildvn-dotnet/src/WildVN.Infrastructure/Data/PostgresMappings.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/PostgresMappingTests.cs`; `wildvn-dotnet/docs/ef-mapping-review.md`.

### Checkpoint C02 — Sau T04–T06

- [ ] Shell WPF và API chạy từ fixture, không cần Next server; media PoC có kết luận trên Windows.
- [ ] Mapping không làm thay đổi schema/data và đã xử lý riêng ID legacy.

## T07 — Auth API, JWT cookie và Argon2id legacy

**Mục tiêu:** Port login/register/me/logout và kiểm tra hash hiện hữu trước khi thay password encoder.

**Dependencies:** T03, T06. **Scope:** M.

**Acceptance criteria:**
- [ ] Tài khoản fixture với Argon2id legacy đăng nhập được bằng mật khẩu đúng, từ chối sai; tham số/hash encoding được kiểm chứng bằng mẫu thử, không buộc người dùng reset chỉ do đổi ngôn ngữ.
- [ ] Auth endpoints trả body đã đóng băng, đặt/xóa cookie `wildvn-auth-token` đúng flags/lifetime; kiểm chứng algorithm/key/expiry và JWT legacy hiện chỉ có `sub`/`iat`/`exp`. Không bắt token cũ có `iss`/`aud` khi chưa có version policy/interoperability hoặc mốc login lại; key rotation và cửa sổ chấp nhận legacy được cấu hình rõ.
- [ ] Validation, login throttling, role checks và XSRF bootstrap/enforcement có tests; không đưa access token vào DTO người dùng hay log.

**Verification:** Unit hash/JWT/validation; integration PostgreSQL cho login/register/me/logout, duplicate account, 401/403, CSRF và cookie flags.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/Auth/AuthEndpoints.cs`; `wildvn-dotnet/src/WildVN.Application/Auth/AuthService.cs`; `wildvn-dotnet/src/WildVN.Infrastructure/Auth/LegacyArgon2PasswordVerifier.cs`; `wildvn-dotnet/src/WildVN.Api/Auth/AuthSecurity.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/AuthParityTests.cs`.

## T08 — WPF login/register/me/logout và lưu phiên

**Mục tiêu:** Nối UI xác thực với API bằng HttpClient riêng cho desktop.

**Dependencies:** T04, T07. **Scope:** M.

**Acceptance criteria:**
- [ ] Login/register thành công nạp `me`; cookie được giữ trong `CookieContainer`, header XSRF lấy từ cơ chế bootstrap, không sao chép cookie trình duyệt ngoài.
- [ ] Nếu bật nhớ đăng nhập, trạng thái phiên chỉ lưu bằng DPAPI CurrentUser; logout/401 xóa dữ liệu được bảo vệ và đổi tài khoản xóa caches cá nhân.
- [ ] Validation, lỗi server, double-click và cancellation có trạng thái rõ; forgot/reset password chỉ hiển thị trạng thái đúng T01, không tạo luồng thành công giả.

**Verification:** Unit auth state với HTTP giả lập; integration auth API; Windows E2E register → login → me → logout và restart có/không nhớ phiên.

**Likely files:** `wildvn-dotnet/src/WildVN.Desktop/Auth/AuthView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Auth/AuthViewModel.cs`; `wildvn-dotnet/src/WildVN.Desktop/Auth/DesktopAuthService.cs`; `wildvn-dotnet/src/WildVN.Desktop/Auth/DpapiSessionStore.cs`; `wildvn-dotnet/tests/WildVN.Desktop.Tests/AuthFlowTests.cs`.

### Checkpoint C03 — Sau T07–T08

- [ ] Login tài khoản legacy chạy xuyên WPF → .NET API → PostgreSQL; auth/XSRF negative tests pass.
- [ ] Restart/logout/switch account không lộ token hoặc mang caches người trước sang người sau.

## T09 — OAuth API broker với code một lần

**Mục tiêu:** Thay browser redirect của website bằng OAuth broker cho desktop, giữ provider secrets ở server.

**Dependencies:** T01, T07. **Scope:** M.

**Acceptance criteria:**
- [ ] Provider Google/Facebook được hỗ trợ theo cấu hình đã xác minh; server callback tạo code một lần có hạn dùng và ràng buộc transaction, state, PKCE challenge, callback loopback hợp lệ.
- [ ] Exchange yêu cầu code/verifier đúng, tiêu thụ code nguyên tử và trả auth cookie cho desktop; replay, expiry, state/verifier sai và callback ngoài allowlist bị từ chối.
- [ ] Không đặt JWT, provider secret hay access token vào URL loopback, binary desktop hoặc log; account linking giữ quy tắc nhận dạng đã đóng băng.

**Verification:** Unit broker/state machine và PKCE; integration callback/exchange với provider giả lập, replay đồng thời và negative redirect tests; smoke provider thật chỉ bằng tài khoản thử được phép.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/Auth/DesktopOAuthEndpoints.cs`; `wildvn-dotnet/src/WildVN.Application/Auth/DesktopOAuthBroker.cs`; `wildvn-dotnet/src/WildVN.Api/Auth/OAuthTransactionStore.cs`; `wildvn-dotnet/src/WildVN.Application/Auth/OAuthAccountLinker.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/DesktopOAuthTests.cs`.

## T10 — WPF OAuth bằng trình duyệt ngoài và loopback

**Mục tiêu:** Mở trình duyệt hệ thống, nhận callback tại loopback và exchange code qua ApiClient.

**Dependencies:** T08, T09. **Scope:** M.

**Acceptance criteria:**
- [ ] Listener chỉ bind loopback ở cổng động, sinh state/verifier mới mỗi lần; callback state hợp lệ dẫn tới exchange và `me` trong CookieContainer desktop.
- [ ] Cancel, timeout, callback trùng và port unavailable đều kết thúc listener/transaction; request không hợp lệ không hoàn tất login.
- [ ] Luồng hoạt động với trình duyệt mặc định trên Windows và không dùng embedded browser để nhập credentials provider; desktop không chứa client secret.

**Verification:** Unit listener/callback/cancellation; Windows E2E với OAuth test provider; manual smoke browser mặc định cho provider được bật.

**Likely files:** `wildvn-dotnet/src/WildVN.Desktop/Auth/ExternalOAuthService.cs`; `wildvn-dotnet/src/WildVN.Desktop/Auth/LoopbackCallbackListener.cs`; `wildvn-dotnet/src/WildVN.Desktop/Auth/OAuthPkce.cs`; `wildvn-dotnet/tests/WildVN.Desktop.Tests/ExternalOAuthTests.cs`.

### Checkpoint C04 — Sau T09–T10

- [ ] OAuth login xuyên browser → broker → WPF chạy được; replay/cancel/mismatched state không cấp phiên.
- [ ] Không có provider secrets trong package hoặc tokens trong callback URL.

## T11 — Species list và facets API

**Mục tiêu:** Port catalog query, filters, pagination và facets từ PostgreSQL.

**Dependencies:** T01, T06. **Scope:** M.

**Acceptance criteria:**
- [ ] Fixture gồm DRAFT/PUBLISHED và soft-deleted species trả cùng items, total, pagination cho các tổ hợp `q`, status, category, diet, habitat và activityPattern đã ghi ở T01; visibility theo từng endpoint/query, không tự thêm điều kiện PUBLISHED cho catalog hiện chỉ lọc `deleted_at`.
- [ ] Facet values/counts chỉ lấy từ dữ liệu và giữ policy query thực tế đã đóng băng T01; facets hiện lọc `deleted_at`, không có điều kiện PUBLISHED. Trang rỗng không bịa options.
- [ ] Page/size/filter sai bị xử lý theo contract; truy vấn tham số hóa, cancellation và giới hạn page size được kiểm thử.

**Verification:** Unit query normalization; integration parity against fixture PostgreSQL với catalog, combinations, empty/invalid input và facets.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/Species/SpeciesCatalogEndpoints.cs`; `wildvn-dotnet/src/WildVN.Application/Species/SpeciesQueryService.cs`; `wildvn-dotnet/src/WildVN.Application/Species/SpeciesFacetsService.cs`; `wildvn-dotnet/src/WildVN.Contracts/SpeciesCatalogDtos.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/SpeciesCatalogParityTests.cs`.

## T12 — Species catalog UI

**Mục tiêu:** Dựng danh sách/thẻ loài WPF, filters, search text và pagination.

**Dependencies:** T04, T05, T11. **Scope:** M.

**Acceptance criteria:**
- [ ] UI hiển thị đúng items/counts/filter từ API, chuyển trang/đổi filter theo contract và mở đúng slug từ thẻ; có trạng thái loading, empty, error, retry.
- [ ] Request mới hủy hoặc vô hiệu hóa kết quả request cũ; list virtualization và tải ảnh không khóa UI khi lướt fixture lớn.
- [ ] Bàn phím/focus có thể đi qua search, filters, thẻ và pagination; layout không mất nội dung ở các DPI đã chốt T05.

**Verification:** Unit catalog ViewModel với responses lệch thứ tự; Windows E2E filter → page → open item; visual/lifecycle check tại DPI matrix.

**Likely files:** `wildvn-dotnet/src/WildVN.Desktop/Species/SpeciesCatalogView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Species/SpeciesCatalogViewModel.cs`; `wildvn-dotnet/src/WildVN.Desktop/Species/SpeciesCardView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Species/SpeciesCatalogClient.cs`; `wildvn-dotnet/tests/WildVN.Desktop.Tests/SpeciesCatalogTests.cs`.

### Checkpoint C05 — Sau T11–T12

- [ ] Catalog/filter/facets chạy xuyên desktop/API/PostgreSQL với kết quả parity.
- [ ] UI xử lý response cũ, dataset rỗng, API unavailable và bàn phím.

## T13 — Species detail, related và MinIO API

**Mục tiêu:** Port detail lookup và media signing; giữ object keys và media data hiện hữu.

**Dependencies:** T06, T11. **Scope:** M.

**Acceptance criteria:**
- [ ] Slug hợp lệ trả taxonomy, conservation, biology, related và media metadata theo fixture; detail/featured/related giữ visibility T01 với tests DRAFT/PUBLISHED/deleted/unknown. Source hiện chỉ lọc `deleted_at`, nên việc bổ sung PUBLISHED là thay đổi hành vi/security riêng cần được xác định trước khi sửa, không được gọi là parity hiện hữu.
- [ ] Object keys/URL legacy được chuẩn hóa đúng và ký URL ở backend; giới hạn bucket/host, thời hạn ký và endpoint phía client được kiểm thử, không đặt MinIO credentials vào DTO.
- [ ] Ảnh/video thiếu hoặc object lỗi có kết quả/error rõ; không thay toàn bộ storage bằng một migration media không cần thiết.

**Verification:** Integration PostgreSQL + MinIO thử nghiệm; parity detail/related; unit URL normalization và signing policy, expiry/invalid host tests.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/Species/SpeciesDetailEndpoints.cs`; `wildvn-dotnet/src/WildVN.Application/Species/SpeciesDetailService.cs`; `wildvn-dotnet/src/WildVN.Infrastructure/Media/MinioMediaService.cs`; `wildvn-dotnet/src/WildVN.Contracts/SpeciesDetailDtos.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/SpeciesDetailMediaTests.cs`.

## T14 — Species detail desktop

**Mục tiêu:** Dựng trải nghiệm hồ sơ loài bằng media renderer đã chọn, thay scrolling/layout riêng của browser.

**Dependencies:** T05, T12, T13. **Scope:** M.

**Acceptance criteria:**
- [ ] Catalog → detail → related → back hiển thị đúng loài/nội dung thật và giữ trạng thái catalog; không cần route Next.js.
- [ ] Renderer xử lý URL hết hạn, ảnh/video lỗi, resize và reduced motion theo quyết định T05; chuyển màn hình dừng/dispose playback cũ.
- [ ] Taxonomy, conservation, bài mô tả dài và citations/link ngoài có thể đọc/điều hướng bằng bàn phím; lỗi detail có thể retry.

**Verification:** Unit ViewModel navigation/error; Windows E2E catalog/detail/related/back; visual + media lifecycle checks trên support matrix.

**Likely files:** `wildvn-dotnet/src/WildVN.Desktop/Species/SpeciesDetailView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Species/SpeciesDetailViewModel.cs`; `wildvn-dotnet/src/WildVN.Desktop/Media/MediaPresenter.cs`; `wildvn-dotnet/src/WildVN.Desktop/Species/SpeciesDetailClient.cs`; `wildvn-dotnet/tests/WildVN.Desktop.Tests/SpeciesDetailTests.cs`.

### Checkpoint C06 — Sau T13–T14

- [ ] Detail/related/MinIO URL parity đạt; không lộ storage credentials.
- [ ] Mở/đóng nhiều hồ sơ không còn playback/tài nguyên màn hình trước.

## T15 — Ecosystems API và desktop

**Mục tiêu:** Port trọn đường đi ecosystem list → detail → species catalog/detail.

**Dependencies:** T06, T14. **Scope:** M.

**Acceptance criteria:**
- [ ] API list/detail trả đúng ecosystem, filters region/climate, species liên quan và media metadata theo contract; unknown slug trả lỗi tương ứng. Không tự thêm publish/soft-delete policy cho ecosystem hiện không có các fields đó; visibility species liên quan được kiểm thử theo query thật T01.
- [ ] Desktop mở đúng ecosystem/species và back giữ trạng thái danh sách; dùng lại media lifecycle T14.
- [ ] Loading, empty, error và cancellation có trạng thái kiểm thử được; không dùng dữ liệu minh họa làm kết quả database.

**Verification:** Integration parity PostgreSQL; unit ecosystem ViewModel; Windows E2E ecosystem → species → back.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/Ecosystems/EcosystemEndpoints.cs`; `wildvn-dotnet/src/WildVN.Application/Ecosystems/EcosystemService.cs`; `wildvn-dotnet/src/WildVN.Desktop/Ecosystems/EcosystemView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Ecosystems/EcosystemViewModel.cs`; `wildvn-dotnet/tests/WildVN.Features.Tests/EcosystemSliceTests.cs`.

## T16 — Favorites API và desktop

**Mục tiêu:** Port favorites list/status/toggle và tích hợp nút yêu thích trên catalog/detail/profile.

**Dependencies:** T08, T12, T14. **Scope:** M.

**Acceptance criteria:**
- [ ] Chỉ tài khoản hiện tại đọc/đổi favorites của mình; fixture list/status/toggle và missing species khớp contract, account B không thấy dữ liệu A.
- [ ] Không tự động retry POST toggle: khi response mất sau server commit, UI tải lại trạng thái authoritative trước khi cho thao tác tiếp để tránh toggle hai lần.
- [ ] Double-click/request song song không làm UI/catalog/detail lệch nhau; logout/switch account xóa state favorites đúng.

**Verification:** Integration ownership/transaction; unit mutation state với lost response và concurrent clicks; Windows E2E favorite → list → logout → account khác.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/Favorites/FavoriteEndpoints.cs`; `wildvn-dotnet/src/WildVN.Application/Favorites/FavoriteService.cs`; `wildvn-dotnet/src/WildVN.Desktop/Favorites/FavoritesView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Favorites/FavoriteState.cs`; `wildvn-dotnet/tests/WildVN.Features.Tests/FavoriteSliceTests.cs`.

### Checkpoint C07 — Sau T15–T16

- [ ] Ecosystem navigation và favorites hoạt động xuyên toàn stack.
- [ ] Lost-response toggle và account-switch tests pass; không dùng generic mutation retry.

## T17 — Academy overview/progress API

**Mục tiêu:** Port đúng module Academy đã triển khai, giữ RP/streak authoritative phía server.

**Dependencies:** T06, T07, T11. **Scope:** M.

**Acceptance criteria:**
- [ ] Overview phản ánh dataset thật; progress load/sync chỉ dùng user hiện tại, validate/normalize/dedupe published species slugs và giới hạn theo contract.
- [ ] Payload desktop không thể tự cộng RP/streak; server giữ nguồn tin cậy hiện có, `completedExpeditions` không rỗng bị từ chối khi chưa có catalog và trường bị bỏ qua giữ snapshot legacy theo T01.
- [ ] Unauthenticated, foreign account, invalid/unpublished slug và repeated sync có kết quả tương ứng trong parity tests; không sinh quiz/expedition schema giả để mở UI.

**Verification:** Unit normalization/trust boundaries; integration PostgreSQL overview/progress và negative ownership/tampering tests.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/Academy/AcademyEndpoints.cs`; `wildvn-dotnet/src/WildVN.Application/Academy/AcademyOverviewService.cs`; `wildvn-dotnet/src/WildVN.Application/Academy/AcademyProgressService.cs`; `wildvn-dotnet/src/WildVN.Contracts/AcademyDtos.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/AcademyParityTests.cs`.

## T18 — Academy/Field Notes UI và caches theo tài khoản

**Mục tiêu:** Port overview, tiến trình và Field Notes dựa trên species catalog API.

**Dependencies:** T08, T12, T17. **Scope:** M.

**Acceptance criteria:**
- [ ] Overview/progress hiển thị dữ liệu API; Field Notes lọc/phân trang và mở hồ sơ thật, không bị đổi thành nội dung học giả hoặc notes đã lưu khi backend chưa có tính năng đó.
- [ ] Caches cá nhân gắn user ID và phiên; logout/switch account hủy requests, xóa/đổi namespace và không áp dụng response muộn của tài khoản cũ.
- [ ] Guest/unavailable/empty khác nhau trong UI; API lỗi không được hiển thị như progress đồng bộ thành công.

**Verification:** Unit account cache/race conditions; integration Academy client; Windows E2E guest → login → Field Notes → switch account.

**Likely files:** `wildvn-dotnet/src/WildVN.Desktop/Academy/AcademyView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Academy/AcademyViewModel.cs`; `wildvn-dotnet/src/WildVN.Desktop/Academy/FieldNotesView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Academy/AccountAcademyCache.cs`; `wildvn-dotnet/tests/WildVN.Desktop.Tests/AcademyStateTests.cs`.

## T19 — Flashcards và trạng thái nội dung chưa có

**Mục tiêu:** Port flashcards từ species API và giữ đúng giới hạn catalog học tập hiện hữu.

**Dependencies:** T14, T18. **Scope:** M.

**Acceptance criteria:**
- [ ] Flashcards lấy catalog thật; lật thẻ/chuyển thẻ/review chỉ cập nhật phạm vi đã hỗ trợ, không tuyên bố review được server đồng bộ khi backend chưa có catalog tương ứng.
- [ ] Quiz/expedition hiển thị trạng thái chờ dữ liệu và không thể bắt đầu/hoàn tất hay cộng RP bằng câu hỏi/chương mẫu.
- [ ] Catalog rỗng, API lỗi và cancel phiên ôn tập không để stale card/state; thao tác thẻ chạy được bằng bàn phím.

**Verification:** Unit flashcard state/placeholder guards; Windows E2E flashcards + empty dataset, kiểm tra quiz/expedition không cấp progress giả.

**Likely files:** `wildvn-dotnet/src/WildVN.Desktop/Academy/FlashcardView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Academy/FlashcardViewModel.cs`; `wildvn-dotnet/src/WildVN.Desktop/Academy/UnavailableLearningView.xaml`; `wildvn-dotnet/tests/WildVN.Desktop.Tests/FlashcardTests.cs`.

### Checkpoint C08 — Sau T17–T19

- [ ] Academy/Field Notes/flashcards dùng dữ liệu thật; RP, streak và ownership giữ phía server.
- [ ] Quiz/expedition/reset-password placeholders không được tính là luồng đã hoạt động.

## T20 — Database chat và history API

**Mục tiêu:** Port database-grounded chat, citations, history và cleanup policy.

**Dependencies:** T06, T07, T13. **Scope:** M.

**Acceptance criteria:**
- [ ] Database provider trả nội dung/citations theo fixture và dữ liệu được contract baseline cho phép ở từng context/query; tests bao gồm DRAFT/PUBLISHED/deleted để kiểm chứng visibility. Source count/catalog/focused context hiện lọc `deleted_at` mà không mặc định require PUBLISHED; validation/context/rate limiting giữ parity, không diễn dịch input thành SQL tự do.
- [ ] List/messages/delete yêu cầu auth và session ownership; guest chat không tạo history dưới một user giả, account khác không truy cập UUID session của chủ sở hữu.
- [ ] Retention mặc định 5 ngày, cấu hình và thời điểm hết hạn được giữ theo T01; cleanup dùng clock testable và cơ chế một worker chủ sở hữu khi coexistence.

**Verification:** Unit provider/validation/retention với clock giả lập; integration PostgreSQL history ownership, expiry, delete và cleanup.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/Chat/ChatEndpoints.cs`; `wildvn-dotnet/src/WildVN.Application/Chat/DatabaseChatProvider.cs`; `wildvn-dotnet/src/WildVN.Application/Chat/ChatHistoryService.cs`; `wildvn-dotnet/src/WildVN.Worker/Chat/ChatHistoryCleanupWorker.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/ChatParityTests.cs`.

## T21 — POST SSE và WPF chat cancellation

**Mục tiêu:** Port `/api/chat/stream` và chat UI; parse đúng event `token`/`done` bằng streaming HttpClient.

**Dependencies:** T04, T08, T20. **Scope:** M.

**Acceptance criteria:**
- [ ] Client dùng POST và `ResponseHeadersRead`; parser xử lý event/token/done, multi-line data, UTF-8 và event bị chia ở ranh giới bytes; `done` là ChatResponse DTO riêng, giữ metadata/citations/session theo contract, không ép thành ApiResponse envelope.
- [ ] Server đạt parity hiện tại: answer hoàn tất rồi phát chunks/token và done; không mô tả đây là provider token streaming thời gian thực khi chưa triển khai hành vi đó.
- [ ] Cancel/close/logout hủy request, dừng UI updates, giải phóng stream; disconnect giữa chừng và duplicate completion không lưu/render câu trả lời hai lần hoặc tự retry POST.

**Verification:** Unit SSE parser với fragmented bytes và cancellation; integration POST SSE qua HTTP server thật; Windows E2E chat → cancel → history → delete.

**Likely files:** `wildvn-dotnet/src/WildVN.Api/Chat/ChatStreamEndpoint.cs`; `wildvn-dotnet/src/WildVN.ApiClient/Chat/PostSseClient.cs`; `wildvn-dotnet/src/WildVN.Desktop/Chat/ChatView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Chat/ChatViewModel.cs`; `wildvn-dotnet/tests/WildVN.Features.Tests/ChatStreamingTests.cs`.

## T22 — Anthropic provider C# và fallback

**Mục tiêu:** Port provider tùy chọn cùng routing/fallback, giữ keys hoàn toàn ở backend.

**Dependencies:** T20, T21. **Scope:** M.

**Acceptance criteria:**
- [ ] Provider C# gửi đúng request/response contract đã xác minh; model/API key chỉ lấy từ server config, startup không yêu cầu key nếu database provider đang được chọn.
- [ ] Missing key, provider timeout/429/error dẫn tới fallback database hoặc lỗi đã quy định; response ghi rõ provider/citations và không biến lỗi provider thành câu trả lời bịa.
- [ ] Cancellation/timeout/rate limit được áp dụng; token/key/prompt dữ liệu nhạy cảm không xuất hiện trong desktop package, URL hoặc logs.

**Verification:** Unit router/fallback; integration bằng Anthropic HTTP stub cho success/429/timeout/malformed response; secret scan package/config samples.

**Likely files:** `wildvn-dotnet/src/WildVN.Infrastructure/Chat/AnthropicChatProvider.cs`; `wildvn-dotnet/src/WildVN.Application/Chat/ChatProviderRouter.cs`; `wildvn-dotnet/src/WildVN.Api/Chat/ChatProviderOptions.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/AnthropicProviderTests.cs`.

### Checkpoint C09 — Sau T20–T22

- [ ] Chat/database/history/POST SSE/fallback có parity tests và cancellation chạy xuyên desktop.
- [ ] Ownership/retention đạt; không có LLM keys ở desktop và chỉ một cleanup worker hoạt động.

## T23 — Elasticsearch keyword/suggest/cache và desktop search

**Mục tiêu:** Port keyword search, suggestions và cache rồi nối màn hình tìm kiếm WPF.

**Dependencies:** T06, T12, T14. **Scope:** M.

**Acceptance criteria:**
- [ ] Keyword/suggest trả envelope/order/pagination theo fixtures và index thử nghiệm; cache keys/TTL và xử lý Elasticsearch/Redis unavailable được xác minh.
- [ ] UI debounce/cancel, chọn suggestion và mở detail đúng; response cũ không đè query mới, cache không trộn kết quả cá nhân giữa tài khoản.
- [ ] Mọi side effects của search GET, như popularity hoặc Kafka analytics, được liệt kê trong contract để parity/cutover không vô tình chạy hai lần.

**Verification:** Integration Elasticsearch + Redis fixture, keyword/suggest/cache parity; unit debounce/stale responses; Windows E2E search → suggestion → detail.

**Likely files:** `wildvn-dotnet/src/WildVN.Application/Search/KeywordSearchService.cs`; `wildvn-dotnet/src/WildVN.Api/Search/SearchEndpoints.cs`; `wildvn-dotnet/src/WildVN.Desktop/Search/SearchView.xaml`; `wildvn-dotnet/src/WildVN.Desktop/Search/SearchViewModel.cs`; `wildvn-dotnet/tests/WildVN.Features.Tests/KeywordSearchTests.cs`.

## T24 — Semantic/hybrid/recommend và ML/Qdrant adapters

**Mục tiêu:** Port phần search/recommend có implementation và behavior đã kiểm chứng; kiểm tra riêng khoảng trống ML service.

**Dependencies:** T01, T23. **Scope:** M.

**Acceptance criteria:**
- [ ] Qdrant/ML adapter contracts, vector dimension, filters, fusion/rerank và recommend fallback được test với responses fixture; chỉ behavior có bằng chứng T01 được gắn nhãn parity.
- [ ] Ghi rõ repository hiện có client `/ml/embed` và `/ml/rerank`, chưa có implementation ML service; không ghi service đó là runtime đã tìm thấy hoặc mặc định giữ Python ML server.
- [ ] Không bật semantic/recommend phụ thuộc ML khi chưa có implementation/provider được kiểm chứng; nếu cần service do dự án sở hữu, tạo subtasks C# có verification riêng trước khi bật; khi dependency thiếu có keyword/database fallback hoặc trạng thái unavailable rõ.

**Verification:** Unit fusion/filter/ranking/fallback; integration Qdrant + HTTP ML stub; live capability check chỉ sau khi có endpoint hợp lệ được cấu hình, không tính stub thành bằng chứng production.

**Likely files:** `wildvn-dotnet/src/WildVN.Infrastructure/Search/QdrantAdapter.cs`; `wildvn-dotnet/src/WildVN.Infrastructure/Search/MlAdapter.cs`; `wildvn-dotnet/src/WildVN.Application/Search/HybridRecommendService.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/SemanticSearchTests.cs`; `wildvn-dotnet/docs/ml-capability-gap.md`.

## T25 — Kafka workers, analytics, indexer và admin sync

**Mục tiêu:** Port background consumers và administrative sync sang C#; giữ event schema/topic đã xác minh.

**Dependencies:** T06, T07, T23, T24. **Scope:** M.

**Acceptance criteria:**
- [ ] C# producers/consumers tương thích event fixtures, topic/group, entity IDs và schema; analytics/Elasticsearch/Qdrant handlers xử lý create/update/delete theo khả năng đã xác minh.
- [ ] Duplicate/out-of-order/poison events có chính sách kiểm thử được, failure được ghi và retry có giới hạn; offset và side effect không gây mất cập nhật hoặc nhân đôi analytics khi đổi worker.
- [ ] Admin sync yêu cầu ADMIN và XSRF theo auth policy; có cấu hình ownership để Java và .NET không cùng chạy writers/indexers/cleanup jobs trên cùng module trong cutover.

**Verification:** Integration Kafka + PostgreSQL + index stores thử nghiệm; replay compatibility fixtures, duplicate/delete/poison tests; auth tests admin 401/403/CSRF.

**Likely files:** `wildvn-dotnet/src/WildVN.Contracts/KafkaEventContracts.cs`; `wildvn-dotnet/src/WildVN.Worker/SearchAnalyticsWorker.cs`; `wildvn-dotnet/src/WildVN.Worker/EntityIndexerWorker.cs`; `wildvn-dotnet/src/WildVN.Api/Search/AdminSyncEndpoints.cs`; `wildvn-dotnet/tests/WildVN.Api.Tests/KafkaCompatibilityTests.cs`.

### Checkpoint C10 — Sau T23–T25

- [ ] Keyword/suggest/cache và các capability search thực sự khả dụng có bằng chứng parity.
- [ ] ML gap được ghi đúng; compatible events và một chủ sở hữu workers đã được thử nghiệm.

## T26 — Voice vi-VN, clipboard, settings và lifecycle

**Mục tiêu:** Thay browser APIs bằng Windows capabilities và hoàn thiện settings/lifecycle ứng dụng.

**Dependencies:** T05, T21. **Scope:** M.

**Acceptance criteria:**
- [ ] Voice kiểm tra engine/ngôn ngữ vi-VN sẵn có trên Windows; nếu không có, UI nói rõ unavailable và vẫn nhập text được, không mặc định rằng mọi máy có engine hoặc tự tải provider trả phí.
- [ ] Clipboard chạy đúng STA, lỗi clipboard bị khóa có thông báo; settings theme/motion/audio/API environment được validate và lưu đúng scope, không lưu server secrets.
- [ ] Minimize/navigate/close/cancel dừng microphone, audio/video và HTTP stream theo policy; dispose không cập nhật ViewModel đã đóng. Voice engine bổ sung, nếu cần, là subtask tùy chọn riêng có quyết định nguồn dữ liệu/chi phí.

**Verification:** Unit settings/lifecycle/capability detection; Windows E2E clipboard và text chat; manual voice matrix vi-VN có/không engine, microphone denied và đóng ứng dụng.

**Likely files:** `wildvn-dotnet/src/WildVN.Desktop/Platform/WindowsVoiceService.cs`; `wildvn-dotnet/src/WildVN.Desktop/Platform/WindowsClipboardService.cs`; `wildvn-dotnet/src/WildVN.Desktop/Settings/DesktopSettings.cs`; `wildvn-dotnet/src/WildVN.Desktop/Platform/ApplicationLifecycle.cs`; `wildvn-dotnet/tests/WildVN.Desktop.Tests/WindowsCapabilitiesTests.cs`.

## T27 — CI, parity và gate kiểm thử .NET

**Mục tiêu:** Gom các checks đã dùng trong từng task thành pipeline có khả năng chặn regressions trước cutover.

**Dependencies:** T10, T15, T16, T19, T22, T25, T26. **Scope:** M.

**Acceptance criteria:**
- [ ] API/contracts build, analyzers, unit và integration tests chạy against PostgreSQL fixture thật; infrastructure adapters có contract/integration tests cần thiết, không thay PostgreSQL bằng in-memory để kết luận mapping parity.
- [ ] Windows runner build WPF và chạy E2E UI Automation cho auth/OAuth/catalog/detail/ecosystems/favorites/Academy/chat/search; báo cáo failures, traces/screenshots và flaky policy rõ.
- [ ] Gate yêu cầu ít nhất 80% line và branch coverage cho code production .NET thuộc scope; không skip suite, giảm threshold, loại logic khó kiểm thử hoặc đổi failing assertions để đạt gate. Parity report chỉ đánh dấu capability đã xác minh.

**Verification:** Chạy pipeline trên môi trường thử nghiệm; cố tình thêm failure/coverage dưới ngưỡng để chứng minh gate chặn; review report so với inventory T01.

**Likely files:** `wildvn-dotnet/build/Test-Gate.ps1`; `wildvn-dotnet/build/ci.yml`; `wildvn-dotnet/tests/coverage.runsettings`; `wildvn-dotnet/tests/WildVN.E2E.Tests/DesktopCriticalFlows.cs`; `wildvn-dotnet/docs/parity-report.md`.

### Checkpoint C11 — Sau T26–T27

- [ ] Required unit/integration/Windows E2E suites pass, coverage đạt >=80%; negative gate test chứng minh pipeline chặn failure.
- [ ] Voice capability thiếu được trình bày rõ; lifecycle/clipboard/settings chạy trên matrix đã chọn.

## T28 — Packaging Windows và installer ký số

**Mục tiêu:** Tạo bản desktop cài độc lập, cấu hình backend endpoint và cơ chế nâng cấp.

**Dependencies:** T05, T27. **Scope:** M.

**Acceptance criteria:**
- [ ] Publish self-contained Windows x64 và installer chạy trên máy sạch trong support matrix; không cần .NET SDK, Node.js, Java hoặc Next server để mở app, backend vẫn dùng HTTPS từ xa.
- [ ] Nếu T05 chọn WebView2, installer kiểm tra/cài runtime theo chiến lược phân phối đã chốt; dependency thiếu có xử lý rõ, không trông chờ dev machine.
- [ ] Installer/binary được ký trong release bằng certificate bên ngoài repo; install/upgrade/uninstall bảo toàn hoặc xóa dữ liệu đúng policy, package scan không chứa secrets. Ký/phát hành thật chỉ chạy khi có quyền và vật liệu release.

**Verification:** Clean Windows VM install → login/media → upgrade → uninstall; kiểm tra chữ ký và package content; smoke offline startup/API unavailable.

**Likely files:** `wildvn-dotnet/build/Publish-Desktop.ps1`; `wildvn-dotnet/installer/WildVN.Package.wxs`; `wildvn-dotnet/build/Sign-Release.ps1`; `wildvn-dotnet/docs/desktop-distribution.md`; `wildvn-dotnet/tests/WildVN.E2E.Tests/InstallerSmokeTests.cs`.

## T29 — Cutover từng module và rollback rehearsal

**Mục tiêu:** Chuyển traffic/jobs dần sang .NET với routing và quyền ghi có thể rollback.

**Dependencies:** T02, T25, T27, T28. **Scope:** M.

**Acceptance criteria:**
- [ ] Có routing matrix theo module và ownership DB writes/jobs rõ; mỗi module chỉ có một implementation ghi và một chủ sở hữu background jobs, không dual-write Java/.NET hoặc chạy hai cleanup/indexers.
- [ ] Parity dùng fixture/request đã ghi hoặc đường đọc không side effect; không shadow-replay search GET vào cả hai vì popularity/Kafka analytics có thể bị nhân đôi, không mirror POST/toggle/sync.
- [ ] Staging rehearsal switch/rollback đạt các tiêu chí số liệu đã chốt trong plan: auth, errors, latency, data counts, queue lag và integrity; backup/restore, config, offsets và backward-compatible schema có runbook thực thi được. Production cutover chỉ thực hiện sau phê duyệt release rõ.

**Verification:** Integration routing/single-writer checks; staging Windows E2E xuyên các module; rollback rehearsal và so sánh DB/event metrics trước/sau.

**Likely files:** `wildvn-dotnet/deploy/module-routing.json`; `wildvn-dotnet/deploy/worker-ownership.json`; `wildvn-dotnet/build/Rehearse-Cutover.ps1`; `wildvn-dotnet/docs/cutover-rollback-runbook.md`; `wildvn-dotnet/tests/WildVN.Features.Tests/CutoverOwnershipTests.cs`.

## T30 — Kết thúc quan sát và loại runtime Java/Next

**Mục tiêu:** Sau thời gian quan sát đã chốt, xác nhận hệ thống độc lập trước khi retire runtimes cũ.

**Dependencies:** T29. **Scope:** M.

**Acceptance criteria:**
- [ ] Chỉ retire sau khi đạt thời gian quan sát/rollback conditions trong plan và có release approval cần thiết; ghi đủ error/latency/queue/data evidence, giữ backup và khả năng khôi phục theo policy.
- [ ] Chạy bản release trên môi trường thử nghiệm khi Java/Spring/Next/Node application servers bị dừng: toàn bộ required parity/E2E vẫn pass; không còn proxy/desktop routes, cleanup, auth/OAuth, chat, search/index jobs gọi implementation Java/Next.
- [ ] Toàn bộ app/server code sở hữu bởi dự án ở runtime đích là C#/.NET; PostgreSQL/MinIO/Elasticsearch/Qdrant/Redis/Kafka là infrastructure. Pipeline crawler/import hiện gọi `wildvn-client/seed_test.ts` qua absolute Linux path được chuyển sang CLI/config độc lập, chạy được khi Java/Next dừng; Python/Node tools chỉ là tooling offline. ML capability chưa có implementation C# hoặc provider đã xác minh không được để thành dependency runtime ẩn.

**Verification:** Dependency/process/container audit và package scan; chạy T27 + installer E2E khi runtimes cũ dừng; smoke crawler → import fixture mà không cần Next/Java và không phụ thuộc absolute workspace path; review runbook/retirement evidence. Không xóa source/history cũ hoặc resources production tự động trong task này.

**Likely files:** `wildvn-dotnet/deploy/production.compose.yml`; `wildvn-dotnet/build/Audit-RuntimeDependencies.ps1`; `wildvn-dotnet/docs/runtime-retirement.md`; `wildvn-dotnet/tools/import-crawler-data.ts`; `wildvn-dotnet/tests/WildVN.Features.Tests/RuntimeIndependenceTests.cs`.

### Checkpoint C12 — Hoàn tất T28–T30

- [ ] Signed installer được kiểm tra trên máy sạch; staging cutover/rollback rehearsal đạt và release records đủ.
- [ ] Runtime đích phục vụ app chỉ dùng C#/.NET; gate >=80% và E2E pass khi Java/Spring/Next application servers bị dừng.
- [ ] Không còn dependency runtime Java/Next; ML gap, voice option và crawler tooling được mô tả đúng trạng thái, không ngụy tạo tính năng đã hoàn tất.
