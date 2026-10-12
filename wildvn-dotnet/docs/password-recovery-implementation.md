# Quên / đặt lại mật khẩu — mã nguồn hoàn chỉnh

Phạm vi file người dùng yêu cầu: web forgot-password, reset-password và service gọi
API thật; backend .NET tiếp nhận, lưu yêu cầu, gửi email và cập nhật mật khẩu. Đây
là hoàn thiện **source**, không phải khẳng định toàn migration plan hoặc runtime
đã nghiệm thu. Chỉ đạo hiện hành: implementation trước trên Ubuntu; test/coverage,
DB/SMTP/HTTP/browser và nghiệm thu để sau. Không mở kết nối thật trong lượt này.

## Luồng và API

- `POST /api/auth/forgot-password`, JSON `{email}`: email trim, mailbox-only tối đa
  254 ký tự; 200 envelope `{success:true,message:...}` chung cho email đủ điều kiện,
  không tồn tại, social/deleted và case variants không chọn được duy nhất. Không
  cam kết email đã gửi ngay. Cùng floor 750–999ms theo clock monotonic cho các nhánh;
  floor giảm khác biệt thông thường, không che được dependency chậm bất thường.
- Tài khoản LOCAL với password hash: token ngẫu nhiên 32 bytes, base64url 43 ký tự,
  hạn 15 phút; DB chỉ lưu SHA256 token. Fingerprint SHA256 của hash mật khẩu + NUL +
  email hiện hành vô hiệu hóa link khi mật khẩu hoặc email đã thay đổi. Cooldown
  DB 60 giây/user và row lock tránh tạo nhiều job đồng thời.
- Email payload (địa chỉ nhận + URL token) mã hóa Data Protection trong outbox,
  lưu cùng request bằng transaction. Link `/reset-password#token=...`: fragment
  không đi vào HTTP access log/referrer; web capture một lần rồi xóa fragment,
  giữ token trong bộ nhớ, không lưu local/session storage. Reload cần mở lại email.
- SMTP worker lease 60 giây, polling 5 giây, timeout gửi 20 giây, retry sau 1 phút,
  tối đa 5 lần. SMTP TLS 1.2/1.3: mandatory STARTTLS hoặc SSL-on-connect; kiểm tra
  certificate chuẩn, không bypass. Payload bị xóa sau gửi hoặc abandon; DeliveredAt
  là terminal marker cho cả delivered/abandoned. SMTP có thể gửi trùng cùng một
  link nếu process chết sau gửi nhưng trước acknowledge (at-least-once).
- `POST /api/auth/reset-password`, JSON `{token,password}`: token đúng format,
  password tối thiểu 6 ký tự, không toàn whitespace, tối đa 1024 bytes UTF-8 (cùng
  chính sách register). Invalid/used/expired link trả 400 chung; password hash dùng
  Argon2id legacy salt16/hash32/m65536/t3/p1.
- Reset lấy user row lock, recheck expiry sau hashing/wait, consume có điều kiện
  row-count=1, đổi hash/UpdatedAt, rotate credential version, revoke user_sessions
  và tất cả link khác trong cùng transaction. Không auto-login. JWT cũ không còn
  được .NET chấp nhận; đăng nhập mới thêm `pwdv` khớp version DB. Hash và version
  khi login được đọc trong cùng statement để tránh race old-password/new-version.
- Reset thành công xóa auth/XSRF cookies; web reset dùng credentials include để
  nhận cookie deletion, clears authStore và đưa link đăng nhập lại. Forgot dùng
  credentials omit. Không retry POST tự động; có timeout/cancellation, duplicate
  submit guard, validation, loading/error/success và focus/aria states.
- Recovery chung bucket 5 requests/hour/IP; forgot thêm 3/hour/normalized email,
  bounded tối đa 16384 keys và concurrency password operations toàn API=2. Origin,
  HTTPS/Development loopback, CORS và body 16KiB giữ theo Auth. Không tin forwarded
  IP tùy ý; host phải chọn trusted proxies. ReplicaCount bắt buộc 1.

## Bật chức năng tại host — source không chứa secrets

Mặc định PasswordRecovery:Enabled=false: endpoint vẫn đăng ký và trả 503. Khi bật
phải bật Auth và cấp các settings dưới đây qua environment/secret provider. Agent
không đọc/sửa credential hay cấu hình triển khai hiện hành.

| Environment setting | Yêu cầu |
|---|---|
| `PasswordRecovery__Enabled` | true để đăng ký store/mail worker |
| `PasswordRecovery__ResetPageUrl` | URL HTTPS chính xác `/reset-password`, không query/fragment/userinfo; HTTP loopback chỉ Development |
| `PasswordRecovery__DataProtectionKeyDirectory` | directory tuyệt đối, bền vững, private của service user; Unix 0700; Windows ACL chỉ service/admin |
| `PasswordRecovery__Smtp__Host` | SMTP host hợp lệ |
| `PasswordRecovery__Smtp__Port` | 1–65535; default 587 |
| `PasswordRecovery__Smtp__UseSslOnConnect` | default false = mandatory STARTTLS; true = SSL-on-connect |
| `PasswordRecovery__Smtp__FromAddress` | địa chỉ gửi được provider cho phép |
| `PasswordRecovery__Smtp__Username` / `...__Password` | SMTP credential từ secret store, không commit |
| `NEXT_PUBLIC_API_BASE_URL` (web build) | cùng .NET auth host với login; không trỏ Spring chưa có reset routes |
| `Auth__AllowedOrigins__0…` | origin web chính xác nếu khác origin API; flags cookie tương ứng |

Các Auth settings/key/deadline/ReplicaCount theo [auth-implementation.md](auth-implementation.md).
Keyring Data Protection cần backup/private permissions; cấu hình file-system ở đây
không thêm mã hóa key-at-rest qua KMS/certificate: bảo vệ directory và host disk ở
triển khai. Mất keyring khiến mail job đang chờ không giải mã được. Không chia sẻ
keyring với web/client; không ghi payload/link/password vào log.

**Trước khi bật BẤT KỲ Auth instance của source mới**, review/apply artifact
[sql/password-recovery.sql](sql/password-recovery.sql) bằng tài khoản migration
riêng. SQL thêm ba bảng và indexes, chưa được chạy; API không Migrate/EnsureCreated.
Credential-version table được đọc ngay cả khi recovery disabled để việc tắt reset
không hồi sinh token cũ. Thiếu bảng trả sanitized503. Không drop version rows khi
cleanup/rollback. Khôi phục server cũ không biết versions đòi hỏi invalidating JWT
signing keys trước; không gọi disable toggle là rollback schema.

Cutover auth owner phải là .NET trên mọi routes chấp nhận cookie: Java hiện hành
không đọc credential versions và vẫn có thể nhận token cũ. Không khẳng định thu hồi
phiên xuyên backend khi hai auth owner còn phục vụ đồng thời. Những request đã xác
thực trước transaction reset có thể hoàn thành; request mới sẽ kiểm tra version.

Retention worker xóa tối đa 100 reset requests quá hạn hơn 24 giờ mỗi vòng, cascade
outbox. Không purge credential versions. DB/outbox worker outage được log bằng
exception type; đội vận hành theo dõi worker và SMTP provider, không log token.

## Kiểm chứng source / backlog test

[Compiler API Release](../evidence/password-recovery/build-final.txt),
[scoped semantic TypeScript](../evidence/password-recovery/frontend-typecheck.txt),
[locked restore](../evidence/password-recovery/locked-restore.txt),
[NuGet audit](../evidence/password-recovery/dependency-audit.txt) và
[review](../evidence/password-recovery/review.md). Scoped TS kiểm tra 3 file và
imports bằng typings Next cài trong repo; không phải full Next build/browser test.
Infrastructure thêm MailKit/MimeKit 4.17.0, lockfile gồm graph mới; ASP.NET framework
reference cung cấp Data Protection và framework dependencies.

Các case **CHƯA CHẠY**, để mốc kiểm thử sau:

- Unit: token format/hash, clock/expiry/floor, bounds password, known/unknown/social,
  ambiguous email, cooldown/limiter cleanup/capacity, JWT version old/new/malformed.
- PostgreSQL integration: SQL artifact, EF translation (`FOR UPDATE`, correlated
  version query, ExecuteUpdate lease), concurrent consume chỉ một success, atomic
  rollback, email/hash change, reset/login race, missing schema/DB failures.
- HTTP: Origin/CORS/TLS, malformed JSON/body limits, 400/429/503, cookies clear,
  stale cookie public reset exemption và old JWT rejection sau reset.
- SMTP/outbox: local isolated TLS SMTP fixture, invalid certificate, timeout/retry,
  crash after send, lease ownership, fifth-attempt abandonment, keyring restart,
  payload wipe, expiry/consumed suppression và bounded retention.
- Browser E2E: forgot → email → fragment → reset → login mới, old password rejection,
  missing/expired/used token, validation/confirm, duplicate click, abort/unmount,
  inaccessible API, authStore/cookie clearing, accessibility/mobile/focus.
- Coverage >=80% và nghiệm thu môi trường thật. Không chuyển PASS lịch sử sang feature.

Nguồn chính thức đã đối chiếu:
[MailKit SMTP API](https://mimekit.net/docs/html/T_MailKit_Net_Smtp_SmtpClient.htm),
[TLS socket options](https://mimekit.net/docs/html/T_MailKit_Security_SecureSocketOptions.htm),
[MailKit 4.17.0](https://www.nuget.org/packages/MailKit/4.17.0),
[EF ExecuteUpdate transactions/concurrency](https://learn.microsoft.com/en-us/ef/core/saving/execute-insert-update-delete).
