# T07 — auth API implementation

**Cập nhật password recovery:** [password-recovery-implementation.md](password-recovery-implementation.md)
bổ sung API/email/reset UI và credential versions. Schema additive phải apply trước
bất kỳ Auth instance nâng cấp nào, kể cả recovery disabled; hướng dẫn bên dưới là
checkpoint auth ban đầu, các thay đổi hiện hành được nêu rõ tại tài liệu recovery.

Tiếp tục từ T06 commit `eeca084`, theo chỉ đạo triển khai trước trên Ubuntu;
test, DB fixture/round-trip, coverage và nghiệm thu Windows thực hiện sau.
Không đọc config/credential dự án hay gọi API/DB/provider thật trong lượt này.

## Phạm vi và source

Source đối chiếu: `wildvn-server/src/main/java/com/example/wildvn/` với
`domain/auth/{controller/AuthController,service/AuthService,dto/*}.java`,
`security/{SecurityConfig,JwtUtil,JwtAuthFilter,CustomUserDetailsService,LoginRateLimiter}.java`;
contract [api-contracts.md](api-contracts.md) và fixture đã đóng băng từ T01.

- Application: AuthService và các ports store/password/token/login-limiter, DTO
  nội bộ dùng class để không có generated ToString in password/hash/JWT.
- Infrastructure: PostgreSQL auth store, legacy Argon2id verifier/hasher,
  JWT issuer/validator, bounded immutable login windows và dependency lockfile.
- API: request validation, auth endpoints, cookie authentication, CSRF/bootstrap,
  role policy, request limits, sanitized errors và opt-in host registration.

| Route | Behavior khi auth bật và settings hợp lệ |
|---|---|
| POST /api/auth/login | username/password; 200 AuthResponse với accessToken/refreshToken NULL, user; cookie HttpOnly |
| POST /api/auth/register | username/email/password; tạo users + user_profiles trong một transaction, role USER; auto-login; 200 cùng body login |
| GET /api/auth/me | cookie hợp lệ và account chưa soft-delete: 200 AuthResponse; thiếu/hết hạn/invalid cookie: empty 401 như Spring |
| POST /api/auth/logout | 200 empty, Max-Age=0 auth cookie và xóa XSRF; không cần DB để xóa cookie |
| GET /api/auth/csrf | endpoint bổ sung cho desktop, 204 và bootstrap XSRF cookie/header flow |

AuthResponse/user không chứa token thực, hash, role hay provider ID. Username
lookup case-sensitive, không trim/normalize persisted keys. Login limiter dùng
lowercase invariant cho bucket, 5 attempts/60 seconds, cả thành công cũng tiêu lượt.
Đăng ký giữ min password 6 và username `[a-zA-Z0-9_]{3,30}`; email/username max 255,
password UTF-8 max 1024 bytes, auth body max 16KiB là bounds bổ sung chống allocation.
Không rehash legacy account khi đăng nhập. Unique violation/race/soft-deleted unique
username hoặc email trả 409 tương ứng, không in SQL/constraint values.

## Mật khẩu và JWT

Argon2id PHC v19, UTF-8; new hashes dùng salt16/hash32/p1/m65536KiB/t3 đúng source
Spring. Parser giới hạn PHC<=255 chars, m8192..65536/t1..3/p1..4, salt8..32/hash16..64,
reject malformed/unsupported params. Constant-time digest comparison; missing,
non-local hoặc malformed hash chạy dummy derivation để giảm timing khác biệt.
Dummy hash tạo lazy một lần; không có tài khoản/mật khẩu giả được persist.

JWT dùng thư viện IdentityModel, payload sub/iat/exp, thêm pwdv cho account đã reset
theo tài liệu recovery, lifetime 30 ngày; không bắt
legacy tokens có iss/aud. HMAC chọn theo decoded key bytes: >=64 HS512, >=48 HS384,
>=32 HS256, đúng JJWT auto selection; chỉ algorithm phù hợp key được chấp nhận.
Reject unsigned/wrong algorithm, malformed/oversize, missing/nonnumeric iat/exp,
future iat, hết hạn (zero grace), lifetime>30 ngày hoặc subject blank/>255.

Header `kid=wildvn-v1` đánh dấu token mới; token cũ không kid chỉ chấp nhận trước
JwtLegacyAcceptUntil. Unknown kid bị từ chối. Current key dùng để issue; previous
key chỉ validate trước JwtPreviousKeyAcceptUntil. Các deadline UTC bắt buộc và
không được xa hơn 30 ngày từ startup; past deadline cho phép tắt legacy. Không
log/copy key vào docs/evidence. Đây là implementation policy; interoperability
Java/.NET và việc JJWT cũ bỏ qua kid phải được kiểm chứng ở giai đoạn test.

## Cookie, CSRF và quyền

`wildvn-auth-token`: HttpOnly, Path=/, Max-Age 30 ngày; clear cùng flags/Path với
Max-Age0. Default Secure=true/SameSite=Lax; host chọn rõ Strict hoặc secure None.
Cookie không Secure chỉ cho Development + loopback. Login/register/logout vẫn
exempt CSRF như Spring; transport và exact Origin checks bổ sung, không wildcard.

Các unsafe /api routes ngoài /api/auth bắt IAntiforgery với header X-XSRF-TOKEN.
GET /api/auth/csrf cấp HttpOnly protected cookie WildVN-XSRF và readable XSRF-TOKEN;
client đọc cookie thứ hai để gửi header. Sau login/register/logout xóa cả hai;
client bootstrap lại sau thay đổi identity. Cơ chế .NET bổ sung signed/bound token,
không dùng unsigned Java double-submit cookie như proof .NET. Coexistence/cutover
phải gọi bootstrap theo backend hiện hành; không tuyên bố CSRF token Java/.NET chung.

Cookie handler bỏ qua /health và POST logout; liveness/xóa phiên cục bộ không query
DB. Các request có valid cookie khác nạp current account+role từ DB; deleted/missing
account không authenticated. Policy Admin yêu cầu ROLE_ADMIN; không tin role từ
JWT/request. Chưa thêm admin business endpoint để giả lập role checks.

API general throttle 100 requests/minute/IP, login bucket5/minute/username và global
password-operation concurrency 2 (queue0) giới hạn Argon2 CPU/memory. In-memory
counter là single-process; bật auth bắt ReplicaCount=1. Shared limiter/multi-replica
là công việc triển khai sau, không gọi counter RAM thành distributed throttling.
Do not enable forwarded headers tùy ý; host phải cấu hình trusted proxies tại deploy.
Auth responses no-store; headers nosniff/frame-deny/CSP và HTTPS HSTS. Failures chỉ
log exception type; validation/duplicate/401/403/429 giữ ErrorResponse family.
Unavailable DB/unexpected auth failure trả sanitized503, không stack/SQL/secrets.

## Host settings — không cung cấp giá trị secrets

Mặc định Auth:Enabled=false. Routes auth đã đăng ký nhưng trả503 unavailable;
không đọc auth DB/key settings hoặc mở connection khi disabled. /health/ready vẫn
notReady503 vì toàn bộ dependencies business còn chưa được xác minh.

Host cấp qua environment provider, ví dụ tên (không ghi giá trị):

| Setting | Yêu cầu |
|---|---|
| Auth__Enabled | true để opt in |
| Auth__ReplicaCount | chính xác1 |
| Auth__DatabaseConnection | host/database/username chọn rõ; cấm parameter/error detail logging |
| Auth__JwtCurrentKeyBase64 | decoded32..256 bytes từ secret store, không commit |
| Auth__JwtLegacyAcceptUntil | explicit UTC deadline, <=startup+30 ngày |
| Auth__JwtPreviousKeyBase64 / Auth__JwtPreviousKeyAcceptUntil | cả hai hoặc không có, finite UTC window |
| Auth__CookieSecure / Auth__CookieSameSite | true/Lax default; allowlist như trên |
| Auth__AllowedOrigins__0… | exact HTTPS origins hoặc HTTP loopback; empty cho desktop cùng host |

Không có default signing key/DB connection. Không sửa appsettings/credential,
không bật auth trên process đang chạy, không thêm Migrate/EnsureCreated/DDL.
Graph Infrastructure có packages.lock.json; restore bằng `dotnet restore
src/WildVN.Infrastructure/WildVN.Infrastructure.csproj --locked-mode` khi kiểm chứng/CI.
Signing key là server-only; không đưa vào installer/client.

## Deferred verification — CHƯA CHẠY

- Java-generated Argon2id fixtures đúng/sai, Unicode, malformed PHC/bounded costs,
  new .NET hashes verify qua Spring; không dùng mật khẩu/user thật.
- Legacy/current/previous JWT theo key lengths32/48/64, kid/claims/algorithms/expiry,
  cutoff/rotation, malformed tokens và zero grace bằng clock giả lập.
- PostgreSQL register atomicity/rollback/races, duplicate active/deleted username
  và email; local/social/deleted/missing accounts, hash/UUID không bị đổi.
- HTTP cookie flags/clear, null DTO tokens, empty /me401, transport/Origin/CORS,
  signed/bound XSRF bootstrap/enforcement/identity change, role ADMIN vs USER.
- Limiter fifth/sixth attempt, expiry/concurrency/IP/bounded username keys,
  body bounds, dependency outage /health and logout behavior.
- Regression suite + coverage>=80% gồm Application/Infrastructure/API mới;
  không chuyển PASS T06/WF03 lịch sử thành evidence T07.
- T08 WinForms auth UI, CookieContainer/DPAPI, cancellation/logout/cache switching;
  Windows E2E tại nghiệm thu sau. Web forgot/reset đã triển khai đầy đủ source tại
  [password-recovery-implementation.md](password-recovery-implementation.md); SMTP/DB/
  browser testing vẫn deferred theo chỉ đạo hiện hành.

## Nguồn thư viện chính thức

- [Konscious Argon2 README](https://github.com/kmaragon/Konscious.Security.Cryptography)
  và [package1.3.1](https://www.nuget.org/packages/Konscious.Security.Cryptography.Argon2/1.3.1).
- [JJWT signing/key selection](https://github.com/jwtk/jjwt#signing-key).
- [IdentityModel validation parameters](https://learn.microsoft.com/en-us/dotnet/api/microsoft.identitymodel.tokens.tokenvalidationparameters)
  và [JWT package8.23.0](https://www.nuget.org/packages/System.IdentityModel.Tokens.Jwt/8.23.0).
- [ASP.NET Core antiforgery/bootstrap](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery).
