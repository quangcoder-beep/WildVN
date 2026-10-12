# Review hiện hành — hoàn thiện source quên / đặt lại mật khẩu

Theo yêu cầu hoàn thành file web forgot-password, đã triển khai trọn luồng source:
forgot/reset UI + API thật, token 15 phút/one-use, encrypted DB outbox và SMTP TLS,
Argon2 password update atomic, revoke sessions/JWT bằng credential version, validation,
rate limits, cancel/error/loading và cookie/local auth clear. Không còn timer-success
hoặc placeholder ở hai trang. Scope này hoàn thành mã nguồn; **toàn migration plan
chưa hoàn thành**, T08 WinForms vẫn là bước kế tiếp sau auth.

[Hướng dẫn triển khai và case kiểm thử để sau](../docs/password-recovery-implementation.md),
[SQL additive chưa chạy](../docs/sql/password-recovery.sql),
[review nguồn](../evidence/password-recovery/review.md).
**API Release compiler PASS (0 warning/error), scoped semantic TypeScript PASS**:
[API log](../evidence/password-recovery/build-final.txt),
[web log](../evidence/password-recovery/frontend-typecheck.txt).
[Locked restore](../evidence/password-recovery/locked-restore.txt) thành công;
[dependency audit](../evidence/password-recovery/dependency-audit.txt) không báo
vulnerable package theo NuGet source hiện hành; không phải chứng nhận bảo mật runtime.

**Unit/integration/E2E, coverage, DB/SMTP/HTTP/browser/nghiệm thu CHƯA CHẠY**, giữ
chỉ đạo implementation trước trên Ubuntu. Chưa apply SQL, cấp SMTP/keyring settings,
restart API hoặc rebuild/deploy web. Bật source auth mới cần schema trước; bật reset
cần SMTP và persistent private keyring, NEXT_PUBLIC_API_BASE_URL trỏ .NET auth host.
Không dùng Java song song để khẳng định old JWT đã bị thu hồi. Không đọc/sửa secrets.
Web edits nằm riêng trong wildvn-client; không stage next-env/Jenkinsfile/docs có sẵn.

---

# Lịch sử checkpoint T07 — source auth trước bổ sung password recovery

Tiếp tục trên Ubuntu theo chỉ đạo hiện hành: implementation trước; unit/integration/
E2E, DB round-trip, coverage và nghiệm thu Windows để giai đoạn sau. **Toàn plan chưa
hoàn thành.** T06 đã có commit `eeca084`; lượt này bổ sung code T07 auth API.

- Login/register/me/logout giữ AuthResponse và cookie `wildvn-auth-token`; token
  thực không ra DTO; /me thiếu phiên trả empty 401. GET /api/auth/csrf là bootstrap mới.
- Legacy Argon2id verifier/hasher; JWT sub/iat/exp, 30 ngày, thuật toán theo key size,
  current/previous key và deadline chấp nhận legacy chọn rõ, không ép iss/aud cũ.
- PostgreSQL auth store tạo user/profile atomic, role từ DB, giữ soft-delete/UUID/hash;
  validation, throttling, CSRF, cookie/Origin/transport checks và sanitized errors.
- Auth mặc định disabled; routes 503 unavailable. Chỉ host cấu hình rõ mới bật;
  không sửa secrets/config hoặc nối DB/provider/process thật trong lượt này.

[Implementation, host settings và deferred cases](../docs/auth-implementation.md),
[review và tự đánh giá](../evidence/t07-implementation/review.md).
**Compiler Release PASS, 0 warning/error** ([log](../evidence/t07-implementation/build-final.txt)).
Dependency audit của graph Infrastructure không phát hiện vulnerable package qua
NuGet source tại thời điểm kiểm tra ([log](../evidence/t07-implementation/dependency-audit.txt));
không phải chứng nhận không có vulnerability. Source review độc lập không còn
finding CRITICAL/HIGH/MEDIUM sau fixes health/logout/SameSite.

**T07 tests/coverage/Java interoperability/DB/HTTP runtime đều CHƯA CHẠY.** Không tick
acceptance T07 hoặc chuyển PASS lịch sử sang code mới. API process/ZIP WF03 hiện có
chưa được restart/repackage với T07; không dùng URL/PID cũ làm bằng chứng routes mới.
Bước triển khai kế tiếp: T08 auth UI/session cho WinForms theo override hiện hành.
Trang [forgot-password/page.tsx](<../../wildvn-client/app/(auth)/forgot-password/page.tsx>)
được sửa riêng theo file người dùng đính kèm: bỏ timer báo email-sent, không nhận
email khi chức năng chưa có, hiển thị unavailable và link/login. Edit web chưa commit,
không stage các thay đổi sẵn có của người dùng. Reset page còn placeholder; T07 chưa
có reset/email API. [Syntax transpile](../evidence/t07-implementation/forgot-page-syntax.json)
không thay semantic/browser test; UI chưa chạy nghiệm thu.

---

# Lịch sử checkpoint T06 — mapping, test/nghiệm thu để sau

**Chỉ đạo mới:** triển khai trước trên Ubuntu; unit/integration/E2E tests, coverage
và nghiệm thu Windows thực hiện sau. Windows chưa có **không chặn triển khai code**.
Các kết quả PASS của WF01–WF03 là bằng chứng lịch sử, không áp cho source T06 mới.

WF01–WF03 đã có checkpoint source `d8c7e32`. Theo plan tổng, lượt tiếp tục triển khai
**T06 — EF Core/Npgsql mapping schema hiện hữu**. Code ở
[src/WildVN.Infrastructure](../src/WildVN.Infrastructure/WildVN.Infrastructure.csproj),
[báo cáo mapping và backlog kiểm thử](../docs/ef-mapping-review.md).

Đã bổ sung:

- 18 storage rows và 14 native enum PostgreSQL từ source-derived fixture;
- PK/FK/index/default/nullable mapping, giữ UUID của users/chat và username string
  của favorites/Academy;
- JSONB raw strings, enum arrays, TEXT[] và TIMESTAMPTZ/DATE, không đổi gallery TEXT
  thành JSON hoặc conservation_status VARCHAR thành enum;
- context/options factory, transaction owner và truy vấn theo soft-delete/publish
  riêng; không thêm global filter làm mất semantics legacy;
- cập nhật bằng snapshot mới và danh sách field chọn rõ; kiểm tra UTC/UpdatedAt
  tại SaveChanges để không ghi đè các giá trị gốc ngoài phạm vi sửa.

`WildVN.Api` tham chiếu Infrastructure để backend tiếp theo dùng mapping. API vẫn
là health skeleton; chưa đăng ký DbContext, chưa có endpoint nghiệp vụ T07+.
Không đọc config/credential dự án, không kết nối DB thật, không scaffold từ DB thật,
không sinh/chạy migration hoặc EnsureCreated, không tạo container để test.

**Trạng thái kiểm chứng T06:** build Release API + Infrastructure PASS, 0 warning/error
([compiler log](../evidence/t06-implementation/build-nullable-timestamp-guard.txt)); test/coverage/DB round-trip/
nghiệm thu **CHƯA CHẠY — ĐỂ SAU theo yêu cầu**, không tick tiêu chí T06 đã nghiệm thu.
Rà soát source độc lập đã chốt, không còn finding CRITICAL/HIGH/MEDIUM trong phạm vi T06
([review](../evidence/t06-implementation/review.md)); đây không phải nghiệm thu runtime.
Sau T06, bước triển khai kế tiếp trong plan là T07 auth; bộ kiểm thử được gom ở
mốc kiểm chứng sau. Scope cụ thể và các case cần kiểm chứng nằm trong báo cáo mapping.

Các ZIP và SHA256 trong checkpoint WF03 bên dưới giữ nguyên để review client; chúng
không chứa backend T06. Source provenance là của lần build cũ, không phải tuyên bố
hash toàn checkout hiện tại sau khi thêm Infrastructure/API reference.

---

# Lịch sử checkpoint WF03 — đóng gói, cài review và Windows E2E, 2026-10-11

**Đã hoàn thiện các step triển khai cục bộ của WF03, rồi mới chạy bộ test cuối theo yêu
cầu. Nghiệm thu trên Windows thật còn CHƯA KIỂM CHỨNG.** Có ZIP Mono `net472` và
Windows `net10.0-windows/win-x64` self-contained; manifest/hash/provenance; runner
check/start/status/stop; cài theo người dùng, đổi phiên bản offline, rollback và gỡ;
harness Windows UIA cho shell/media. Artifact chưa ký. Production signing/updater
và backend business/T06 chưa triển khai. [Plan](../docs/winforms-migration.plan.md),
[implementation và test evidence](../docs/winforms-packaging.tdd.md).

**Phiên Mono PID68248 đã đóng:** lần kiểm tra gần nhất `owned_running=false`.
Ảnh và playback metrics dưới đây là evidence đã chụp, không phải cửa sổ đang mở.
API health skeleton vẫn trả `/health/live`200 và `/health/ready`503 ở
`http://127.0.0.1:5080` (Production). Không có adapter DB/MinIO nghiệp vụ nối vào API;
PostgreSQL fixture riêng đã cleanup. [State kiểm tra cuối](../evidence/winforms-wf03/completion-current-state.txt).
PID/window/URL trong các phần lịch sử không được dùng để stop phiên hiện tại.

## Plan đã hoàn thành chưa?

**Chưa hoàn thành toàn plan.** WF01/WF02/WF03 đã hoàn thiện implementation cục bộ và
các suite đo được đã PASS; nghiệm thu Windows/full coverage/release còn thiếu.
[Ma trận hoàn thành theo phase](../docs/winforms-migration.plan.md#trạng-thái-hoàn-thành-plan--2026-10-11).

Lượt tiếp tục này chốt checkpoint source WF03 bằng một commit cục bộ theo plan
(`git log -1`), giữ toàn bộ RED/failure/evidence và ZIP hiện hành; không push.
Đối chiếu lại cả hai SHA256 ZIP và35 source inputs mỗi flavor đều khớp. Không sửa
code nên không lặp lại các suite đã PASS trong final batch; vẫn kiểm tra diff và
rà soát security trước commit.

Điểm chặn còn lại: host Ubuntu không có Windows runtime/VM qua các công cụ kiểm tra
được. Cần máy Windows x64 có desktop tương tác để chạy install → UIA → update →
rollback → uninstall, sau đó DPI/accessibility/device/clean-machine matrix.
Runbooks/helpers đã sẵn sàng; không tick bằng Linux mocks. Chứng thư ký và bằng chứng
license/source-offer/media rights cũng chưa được cung cấp. T06/business backend tiếp
tục nằm ngoài continuation này.

## Artifact cuối

| ZIP cục bộ | Bytes | Payload files | Kết quả |
|---|---:|---:|---|
| [mono-net472.zip](../TestResults/winforms-wf03/packages-complete-20261011/mono-net472.zip) | 9375061 | 22 | PASS build/hash và chạy package thật qua Mono |
| [win-x64.zip](../TestResults/winforms-wf03/packages-complete-20261011/win-x64.zip) | 107683448 | 607 | PASS publish/hash/inventory; Windows execution CHƯA KIỂM CHỨNG |

SHA256 toàn ZIP trước khi giải nén/copy, cũng lưu trong
[packages-final.json](../evidence/winforms-wf03/completion-smoke/packages-final.json):

```text
mono-net472.zip 2dbbd94a91f76f4f4568d3d2362be6884e1c828ed782d68cc97e83ac109d6d44
win-x64.zip     b5a66135e862e67937ae57de90834922b7c4bd69bb036c7ab395ee7807961f0a
```

Windows ZIP gồm .NET/Windows Desktop runtime, VLC3.0.24 core, **321 plugin DLL** và
ba helper install/launch/E2E mới. Cả323 native DLL có PE/AMD64 header; kiểm tra header
không chứng minh chạy Windows. Mono cần Mono/X11/LibVLC3/plugins của host; native
Windows bundle chỉ dành cho target net10. [Build](../evidence/winforms-wf03/completion-package-build.txt),
[native architecture](../evidence/winforms-wf03/completion-native-architecture.txt),
[NOTICE/license/source-offer](../build/NOTICE.md).

Manifest ghi HEAD `dab2ffa` là **base**, dirty/untracked status và SHA256 của35 source
inputs; cả hai flavor khớp source hiện tại. Hash kiểm tra corruption/inventory, không
xác thực publisher. ZIP/TestResults không commit; các `packages-reviewed`,
`packages-resume` và `packages-final-20261011` là artifact cũ.

## Mở lại package Mono

Từ terminal desktop có DISPLAY/XAUTHORITY ở `wildvn-dotnet/`:

```bash
cd TestResults/winforms-wf03/extracted-complete-20261011/mono-net472
python3 review_client.py check --with-samples
python3 review_client.py status
```

Nếu `owned_running=false`, xóa riêng `.review-session.json` đã stale rồi chạy:

```bash
python3 review_client.py start --with-samples --api-url http://127.0.0.1:5080/ --allow-loopback-http
```

Ưu tiên đóng bằng **X trên shell** để cleanup media. `python3 review_client.py stop`
kiểm tra PID/start-ticks/executable và gửi SIGTERM qua pidfd riêng; có thể để lại media
staging. Không xóa session của client còn chạy. Cần Python3.11+, Linux pidfd, Mono và
LibVLC3/plugins. Runner loại inherited `WILDVN_*`; không gọi health hay autoplay lúc
startup. Mute/reduced-motion mặc định được chọn; native mute getter trước playback
là `False`, khi phát đã quan sát `True`. WAV được trích từ AAC của video repository.

[Ảnh review](../evidence/winforms-wf03/completion-smoke/package-review.png),
[phát video thật](../evidence/winforms-wf03/completion-smoke/package-media-playing.png),
[runner và UI/media lifecycle](../evidence/winforms-wf03/completion-smoke/package-smoke-final.txt).

## Cài và nghiệm thu trên Windows x64 thật

Từ checkout đã review trên Windows, chọn ZIP cục bộ và hash trên:

```powershell
$zip = 'C:\Review\win-x64.zip'
$sha = 'b5a66135e862e67937ae57de90834922b7c4bd69bb036c7ab395ee7807961f0a'
powershell -NoProfile -File .\build\Install-WindowsReview.ps1 -Action Install -ZipPath $zip -ZipSha256 $sha -AllowUnsignedReview
powershell -NoProfile -File .\build\Install-WindowsReview.ps1 -Action Status
powershell -NoProfile -File .\build\Start-InstalledReview.ps1 -WithSamples -AllowUnsignedReview
```

Root cố định `%LOCALAPPDATA%\WildVN\Review`, các version theo ZIP hash, receipt/hash
và pointer nguyên tử. Update yêu cầu ZIP/hash mới; rollback chọn version đã giữ;
uninstall chỉ gỡ inventory đã xác minh, từ chối file lạ và giữ marker/lock/layout rỗng.
Không elevation, đổi ExecutionPolicy, tự tải/update hoặc tự launch sau cài.
[Hướng dẫn install/update/rollback/uninstall và recovery](../docs/windows-review-install.md).

Để nghiệm thu package giải nén riêng, dùng `Review-Windows.ps1 -Action Check/Start/Status/Stop`.
Harness `Verify-WindowsReview.py` đã bundle trong ZIP, cần Python x64/pywinauto/Pillow,
output mới ngoài package và desktop tương tác. [Lệnh E2E và giới hạn](../docs/windows-review-e2e.md).
HTTPS mặc định; HTTP chỉ loopback opt-in. Localhost Windows không trỏ về Ubuntu.
[Checklist Windows](CHECKLIST-WINDOWS.md) vẫn chưa tick nghiệm thu.

Build lại vào output mới (SDK10.0.401, Python3.11+, ffmpeg, samples sibling `wildvn-client`):

```bash
DOTNET_ROOT="$PWD/TestResults/winforms-wf03/tools/dotnet" python3 build/package_review.py --dotnet "$PWD/TestResults/winforms-wf03/tools/dotnet/dotnet" --output "$PWD/TestResults/WF03-$(date +%Y%m%d-%H%M%S)"
```

SDK/Python/PowerShell riêng trong ignored TestResults, không đổi PATH/config máy.
Helper dừng API của phiên review nằm ở
`TestResults/winforms-wf03/live-20261011/stop-api.py`; kiểm tra exact command/start-ticks
và pidfd trước signal, không dừng container/process khác.

## Test sau khi hoàn thiện implementation

| Kiểm tra | Kết quả |
|---|---|
| Release API, client hai target, Windows publish | PASS; 0 warning/error |
| .NET tests + Mono tests | PASS105/105 +62/62, không skip |
| Full Python regression cùng fixture riêng | PASS100/100; gồm42 package/session và10 E2E boundary tests |
| PowerShell runner / installer trên Linux | PASS67 /71 checks; parser/filesystem/mocks, không phải Windows execution |
| Package Mono giải nén: five-section UI, health, video/Pause/Stop và close | PASS; video400ms/55frames/143 audio blocks, muted=True |
| Python package/runner coverage line và branch | package91,28%/89,29%; runner94,35%/89,29%; mỗi file >=80% |
| Fixture restore + backup restore | PASS11+11 checks;18 table snapshots giữ nguyên, container riêng cleanup |
| Windows E2E helper trên Linux | exit2/CHƯA KIỂM CHỨNG; không gửi UI actions |
| NuGet audit desktop gồm transitive | Không phát hiện vulnerable packages từ nguồn audit hiện tại |
| Functional API smoke | PASS1/FAIL9: live200, ready503, tám business routes404 |

[Python tests](../evidence/winforms-wf03/completion-all-python-final.txt),
[coverage raw](../evidence/winforms-wf03/completion-python-coverage.json),
[runner checks](../evidence/winforms-wf03/completion-windows-runner.txt),
[installer checks](../evidence/winforms-wf03/completion-install-tests.txt),
[fixture/cleanup](../evidence/winforms-wf03/completion-fixture-final.txt),
[E2E platform guard](../evidence/winforms-wf03/completion-e2e-platform-guard.txt),
[NuGet audit](../evidence/winforms-wf03/completion-nuget-audit.txt),
[API smoke body/status](../evidence/winforms-wf03/curl-final.txt).

**Luồng ZIP thật trên filesystem Linux: PASS** install → update → rollback → từ chối
gỡ khi có file lạ → uninstall; exit0,208,23 giây. Dùng ZIP607 files và version thứ hai
chỉ đổi annotation manifest; code/sample bytes giữ nguyên. Chỉ sửa root tạm trong
TestResults; không cài vào LocalApplicationData hoặc chạy Windows executable.
[Log đầy đủ](../evidence/winforms-wf03/completion-install-integration-full.txt),
[script tái hiện](../evidence/winforms-wf03/install-package-integration.ps1).
Lượt timeout120s giữ riêng; đây không phải nghiệm thu Windows install.

Các lần thất bại được giữ, gồm native plugin/policy RED, fixture harness gọi backup
lặp, PowerShell test dynamic-scope recursion/hidden-file cleanup, integration tham số
bị dot-source reset và harness timeout120s. Không sửa assertions để che lỗi; không
bịa RED cho các step mới có yêu cầu test sau implementation. T02 coverage vẫn đo
fixture guard; WF03 Python tools đo riêng, threshold80% giữ nguyên.

**WF03 chưa nghiệm thu toàn phase:** Windows launch/media/DPI/keyboard/accessibility,
clean-machine install/update/rollback/uninstall, ký phát hành, license/source-offer/
media rights, native/device/GPU/codec/performance và audibility còn CHƯA KIỂM CHỨNG.
Không đo coverage Windows UIA/PowerShell/native; full C# source gate còn CHƯA KIỂM
CHỨNG, năm source WPF lịch sử giữ nguyên. WebView2 WinForms và backend business/T06
chưa triển khai. Bước tiếp theo là chạy artifact/harness trên Windows theo checklist.

---

# Lịch sử review WF02 media WinForms — 2026-10-10

**Client đang mở thật:** Mono PID **288163**, supervisor288162, `DISPLAY=:1`.
Shell `0x2a00011` và Media PoC `0x2a0007c` đều `IsViewable`.
Media đang **Ready**, tắt tiếng/giảm chuyển động mặc định, không tự phát.
API thật: **http://127.0.0.1:5080**, PID176127.
[Cửa sổ hiện tại](../evidence/winforms-wf02/media-review.png),
[video đã phát thật](../evidence/winforms-wf02/media-playing.png),
[PID/window/controls](../evidence/winforms-wf02/client-live.txt).
PID/window chỉ đúng cho phiên này; phiên WF01 dưới là lịch sử, không dùng PID cũ để stop.

WF02 đã chuyển **native media PoC** sang WinForms: PictureBox và LibVLCSharp3.10.1/
LibVLC3.0.20 distro. JPEG/MP4/WebM/WAV đã chạy thật trên Mono; WAV trích từ AAC của
video repo, không phải dữ liệu audio nghiệp vụ. WebView2 WinForms **CHƯA TRIỂN KHAI**.
Source/tests WPF cũ giữ lịch sử; không tuyên bố parity toàn bộ T05 hoặc Windows.
**Dừng sau WF02, chờ review trước WF03.** [Plan](../docs/winforms-migration.plan.md),
[RED/GREEN và coverage](../docs/winforms-media.tdd.md).

## Chạy lại bằng một lệnh, rồi tự thử media

Từ terminal desktop X11 ở `wildvn-dotnet/`:

```bash
DOTNET=/tmp/wildvn-dotnet-sdk/dotnet WILDVN_API_BASE_URL=http://127.0.0.1:5080/ WILDVN_ALLOW_LOOPBACK_HTTP=1 WILDVN_POC_IMAGE_PATH="$PWD/../wildvn-client/public/videos/home/hero-loop-poster.jpg" WILDVN_POC_VIDEO_PATH="$PWD/../wildvn-client/public/videos/home/hero-loop.mp4" WILDVN_POC_AUDIO_PATH="$PWD/TestResults/winforms-wf02/derived-audio.wav" bash build/run-winforms.sh
```

Runner trích WAV từ video repo, build cả hai target, chạy105 .NET +62 Mono tests,
rồi mở `.exe` bằng Mono. [Output một lệnh đã chạy](../evidence/winforms-wf02/one-command-run.txt).
Cần SDK10.0.401, Mono6.8, X11, ffmpeg và LibVLC3/plugins phù hợp kiến trúc, sibling
`wildvn-client` có samples gốc. SDK/tmp và TestResults không bền qua reboot.
Runner không dựng API/DB/MinIO và không tự đo coverage; lệnh coverage ở TDD report.
Nếu không chọn ba media env, nút media bị khóa “chờ chuyển mẫu”; không tìm file tùy ý.

Bấm **PoC media (cục bộ)**. Chọn Video, bỏ **Giảm chuyển động**, bấm **Phát**;
thử **Tạm dừng**, **Dừng**, **Tắt tiếng**. Chọn Audio để thử WAV đã trích.
Khởi động/nạp file không tự phát hoặc tự gọi API. Năm mục nghiệp vụ vẫn chưa khả dụng.

Đóng bằng nút **X** trên shell để cleanup cả form con/staging. Dừng cưỡng bức riêng
PID hiện tại (có thể còn temp files vì không đi qua Form.Dispose):

```bash
kill -TERM -- 288163
```

API/containers review đang giữ từ phiên trước. Dừng riêng bằng:

```bash
/tmp/wildvn-p0-tools/bin/python TestResults/review-session/manage.py stop
```

## Smoke test và endpoints hiện hành

| Mục | Kết quả thật |
|---|---|
| Release API +WinForms net472/net10.0-windows | PASS, 0 warning/error |
| Tests .NET/Mono/Python | PASS105/105 +62/62 +48/48, không skip |
| Ảnh JPEG, video MP4/WebM, audio WAV | PASS native decode/UI; audibility trên loa CHƯA KIỂM CHỨNG |
| Play/Pause/Stop, mute getter, giảm chuyển động, close/cancel/cleanup | PASS; fault injection lỗi init chỉ là unit test, không giả playback |
| `.exe` bốn startup cases/năm mục/health/media Play/Pause | PASS; video651ms/85 frames/165 audio blocks, muted=True |
| Coverage các C# file đo được | PASS98,30% line/92,03% branch; từng file >=80%; full source CHƯA KIỂM CHỨNG |
| GET `/health/live` | PASS200 `{"status":"alive"}` |
| GET `/health/ready` | FAIL503 `{"status":"notReady"}` — dependencies chưa có adapter |
| GET `/api/species?page=1&limit=20`, `/api/species/featured`, `/api/species/fixture-sao-la` | FAIL404 — CHƯA TRIỂN KHAI |
| GET `/api/ecosystems` | FAIL404 — CHƯA TRIỂN KHAI |
| POST `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`; GET `/api/auth/me` | FAIL404 — CHƯA TRIỂN KHAI |

Functional API smoke **PASS1/FAIL9**; [curl body đầy đủ](../evidence/winforms-wf02/curl.txt).
Fixture PostgreSQL cục bộ có4 species/2 ecosystems/3 users, counts trước/sau giữ nguyên.
Slug `fixture-sao-la` có trong fixture; API chưa đọc fixture. Tài khoản curl synthetic
`wf02-review@example.invalid`, password thử `Synthetic-review-only-2026!` **chưa đăng ký
thành công**, không thể dùng để login/me. Không đưa credential DB/MinIO/OAuth thật vào docs.

```bash
curl --noproxy '*' -i http://127.0.0.1:5080/health/live
curl --noproxy '*' -i 'http://127.0.0.1:5080/api/species?page=1&limit=20'
curl --noproxy '*' -i http://127.0.0.1:5080/api/species/fixture-sao-la
curl --noproxy '*' -i -H 'Content-Type: application/json' -d '{"email":"wf02-review@example.invalid","password":"Synthetic-review-only-2026!"}' http://127.0.0.1:5080/api/auth/login
```

## Chưa kiểm chứng và điểm cần review

Windows runtime/native DLL/plugins/installer/clean machine, fullscreen, DPI,
keyboard/accessibility, GPU/memory benchmark, audibility thiết bị và codec ngoài
samples: **CHƯA KIỂM CHỨNG**. Năm source WPF lịch sử không được đo; C# coverage không
đo native decoder. NuGet audit không phát hiện từ nguồn hiện tại, native VLC/OS audit
**CHƯA KIỂM CHỨNG**. Các warnings GTK/VDPAU/get_buffer vẫn có trong log, không bị che.
Native renderer mới khác MediaElement/WebView2 của plan gốc; dependency/phát hành
Windows cần bạn xem ở WF03. Local allowlist/header/staging không là OS sandbox.
Todo P0/Windows chưa được tick thêm bằng kết quả Mono. Backend business/T06 chưa làm.

---

# Lịch sử review WinForms WF01 — 2026-10-10

**Client đang mở thật:** `WildVN .NET — WinForms (P0)`, Mono PID `228969`,
GNOME/X11 `DISPLAY=:1`, window `0x2200011` có `Map State: IsViewable`.
API hiện tại: **http://127.0.0.1:5080**, PID `176127`.
Đã bấm health trên `.exe` sản phẩm và thấy “Đã kết nối API. Các chức năng còn chờ chuyển đổi.”
[Ảnh cửa sổ thật](../evidence/winforms-wf01/client-review.png),
[PID/window/controls](../evidence/winforms-wf01/client-live.txt).
Phiên cuối có supervisor cục bộ tách khỏi launcher, ghi mã thoát khi app đóng và
không tự restart; helper/exit log ở `TestResults/winforms-wf01/` (ignored).

Đã chuyển shell đang hoạt động từ WPF sang WinForms theo
[plan](../docs/winforms-migration.plan.md). Hai target `net472` (Mono hiện tại)
và `net10.0-windows` (Windows hiện đại) cùng dùng ApiClient/Contracts.
Chỉ hoàn tất **WF01**, dừng chờ review; **WF02 media** và **WF03 nghiệm thu Windows** chưa bắt đầu.
Năm mục vẫn ghi nghiệp vụ chưa khả dụng; nút media bị khóa và ghi “chờ chuyển”.
Source/test WPF lịch sử được giữ, nhưng adapter WPF không compile vào client đang chạy.

## Một lệnh build, test và mở client

Chạy từ terminal trong phiên desktop X11, tại `wildvn-dotnet/`:

```bash
DOTNET=/tmp/wildvn-dotnet-sdk/dotnet WILDVN_API_BASE_URL=http://127.0.0.1:5080/ WILDVN_ALLOW_LOOPBACK_HTTP=1 bash build/run-winforms.sh
```

Lệnh đã chạy thật: build cả hai target Release, ba bộ test .NET10 (105 test),
build/chạy NUnitLite bằng Mono (27 test), rồi `exec mono` mở client.
Log: [one-command-run.txt](../evidence/winforms-wf01/one-command-run.txt).
Script dừng khi build/test lỗi; client không tự gọi API lúc khởi động.
Nhấn “Kiểm tra kết nối API” để gọi GET `/health/live`; HTTP chỉ được cho phép
bằng opt-in rõ ràng trên loopback. Không đặt hai env trên thì dùng HTTPS mặc định.

Prerequisites đã có: SDK10.0.401, Mono6.8, phiên X11 và dependency NuGet được restore.
`/tmp` không bền qua reboot; nếu SDK đã ở PATH có thể dùng `DOTNET=dotnet`.
Script không dựng API/DB/MinIO và không tự đo coverage toàn bộ; lệnh/gate coverage
đã chạy được ghi riêng trong [TDD report](../docs/winforms-migration.tdd.md).
API/fixture đang chạy từ phiên review trước; cách dựng lại chúng nằm ở phần lịch sử dưới.

Dừng client bằng nút **X** trên cửa sổ (cleanup/cancel đã test), hoặc riêng PID hiện tại:

```bash
kill -TERM -- 228969
```

Ctrl-C dừng client khi chạy lệnh trên trong terminal. PID thay đổi sau khi chạy lại;
không dùng kill theo tên toàn bộ process Mono/.NET. Dừng API và các container riêng:

```bash
/tmp/wildvn-p0-tools/bin/python TestResults/review-session/manage.py stop
```

## Kết quả WF01 và những gì cần review

| Kiểm tra chạy thật | Kết quả |
|---|---|
| Build API, WinForms net472/net10.0-windows | PASS, 0 warning / 0 error |
| Ba bộ test P0 .NET10 | PASS 105/105, không skip |
| Test WinForms/Mono, message loop thật | PASS 27/27, không skip |
| Python, gồm đọc fixture PostgreSQL cục bộ | PASS 48/48 |
| `.exe` khởi động/đóng bình thường; ba cấu hình sai | PASS 4/4; exit0 hoặc exit1 đúng trường hợp |
| Năm mục điều hướng trên `.exe` thật | PASS 5/5, không tạo dữ liệu giả |
| Nút health gọi Kestrel thật và cập nhật UI | PASS |
| Coverage tổng hợp các file đo được | PASS 99,43% line; 96,70% branch; từng file >=80% |
| NuGet audit, gồm transitive, sáu project | Không phát hiện package có lỗ hổng từ nguồn audit hiện tại |
| API functional smoke | PASS1 / FAIL9: live200, ready503, tám business routes404 |

Coverage là union bảo thủ của .NET10 portable tests, Mono tests và startup `.exe`;
**không** tuyên bố mỗi runtime riêng lẻ đều đạt80%.
[Coverage summary](../evidence/winforms-wf01/coverage-summary.json) giữ root-only branches
và liệt kê năm file WPF lịch sử chưa đo. **Full source gate: CHƯA KIỂM CHỨNG**.
Tracker Coverlet có lỗi flush khi Mono thoát; harness chỉ flush hit thật trước runtime
teardown, không sửa production code/counters/test assertions. Các log lỗi ban đầu được giữ.

Curl thật lần mới nhất, body đầy đủ ở [curl.txt](../evidence/winforms-wf01/curl.txt):

```text
GET /health/live -> 200 {"status":"alive"}
GET /health/ready -> 503 {"status":"notReady"}
GET /api/species?page=1&limit=20 -> 404 "Chức năng chưa khả dụng"
GET /api/species/featured -> 404 "Chức năng chưa khả dụng"
GET /api/species/fixture-sao-la -> 404 "Chức năng chưa khả dụng"
GET /api/ecosystems -> 404 "Chức năng chưa khả dụng"
POST /api/auth/register -> 404 "Chức năng chưa khả dụng"
POST /api/auth/login -> 404 "Chức năng chưa khả dụng"
GET /api/auth/me -> 404 "Chức năng chưa khả dụng"
POST /api/auth/logout -> 404 "Chức năng chưa khả dụng"
```

Curl mẫu/tài khoản fixture/URL services vẫn ở phần lịch sử dưới. Species4,
ecosystems2, users3 sau smoke; không thêm account hoặc đổi seed.
Business APIs/auth/Swagger/DB-MinIO adapters: **CHƯA TRIỂN KHAI**.
Media WinForms, codec/DPI/accessibility/installer và chạy Windows: **CHƯA KIỂM CHỨNG**.
Hai tiến trình review trước không còn khi chốt, log không có stack trace; nguyên nhân
đóng **CHƯA KIỂM CHỨNG**. Phiên cuối đã được mở lại và kiểm tra PID/window độc lập.
Không dùng credential thật, OAuth, DB/MinIO thật, analytics/Kafka/reindex/AI provider.

Điểm review chính: UI năm mục và check/cancel/close; quyết định dual target phục vụ
Mono; khác plan gốc ở framework UI và việc media phải chuyển riêng tại WF02.
Review shell xong mới xác nhận làm WF02; chưa tự chọn renderer/giả lập playback.

## Lịch sử review API và chẩn đoán WPF — 2026-10-09

Phần dưới là bằng chứng lịch sử trước yêu cầu đổi framework. Những câu “không đổi source”
và artifact `TestResults/desktop-run/win-x64` mô tả bản WPF cũ, **không phải client hiện tại**.
Ưu tiên trạng thái và lệnh WinForms ở đầu tài liệu này.

API skeleton đang chạy thật trong **Development** tại **http://127.0.0.1:5080**,
PID `176127`. Đây là P0 hiện có: health chạy được, business APIs chưa port.
Không coi liveness200 hoặc fixture restore thành công là toàn hệ thống đã sẵn sàng.
Giữ tiến trình/container cho người dùng review; chưa triển khai task/feature tiếp theo.

## Chạy lại và dừng

Từ `wildvn-dotnet/`, sau khi đã dừng lần hiện tại, một lệnh dựng lại fixture PostgreSQL,
MinIO riêng, upload đúng3 media mẫu hiện hữu, build Release và chạy API nền:

```bash
DOTNET=/tmp/wildvn-dotnet-sdk/dotnet /tmp/wildvn-p0-tools/bin/python TestResults/review-session/manage.py start
```

Dừng riêng API/container của lần review này:

```bash
/tmp/wildvn-p0-tools/bin/python TestResults/review-session/manage.py stop
```

Script vận hành và cấu hình nằm trong `TestResults/review-session/`, ignored, **không commit**.
`start` từ chối khi còn session hoặc cổng5080/9000/9001 đang bị dùng. `stop` kiểm tra
PID/start-time rồi dừng các container ID đã tạo; không dừng Jenkins/container khác.
Không chạy `docker compose down` toàn workspace hoặc kill process .NET bất kỳ.
Lệnh start đã chạy exit0; chưa dừng session hiện tại vì người dùng yêu cầu giữ để review.
Dữ liệu container này tạm thời, được nạp lại từ fixture khi start sau stop.

Prerequisites: SDK10.0.401 tại binary trên, Docker có images `postgres:15-alpine` và
`minio/minio:latest`, PostgreSQL CLI, curl8.5.0; source sibling client/server. `/tmp` và
`TestResults` có thể mất sau dọn/reboot. Artifact này phục vụ review hiện tại; công cụ
bàn giao được version-control để chạy lại API+PostgreSQL/test đầy đủ là:

```bash
DOTNET=/tmp/wildvn-dotnet-sdk/dotnet PYTHON=/tmp/wildvn-p0-tools/bin/python bash handover/run-p0.sh --serve
```

Lệnh versioned dùng cổng API động/Production và không dựng MinIO; không chạy đồng thời
với session hiện tại. Khi dùng runner đó, Ctrl-C cleanup. Không thay lệnh hiện tại bằng
API/DB URL của môi trường thật.

## URL, cấu hình và endpoints

| Thành phần | Địa chỉ | Bằng chứng / giới hạn |
|---|---|---|
| API | http://127.0.0.1:5080 | Kestrel thật; chỉ health implemented |
| Liveness | http://127.0.0.1:5080/health/live | 200 alive |
| Readiness | http://127.0.0.1:5080/health/ready | 503 notReady |
| MinIO S3 | http://127.0.0.1:9000 | `/minio/health/live`200;3 PUT object200 |
| MinIO console | http://127.0.0.1:9001 | HTML console200; chưa thử login bằng browser |
| PostgreSQL | 127.0.0.1:32773 | `wildvn_fixture_source`, PostgreSQL15.18, restore/verify11/11 |
| Swagger/OpenAPI | `/swagger/index.html`, `/swagger/v1/swagger.json`, `/openapi/v1.json` | Cả3 curl404: **CHƯA TRIỂN KHAI**, không có switch để bật |

Kestrel chạy từ output directory mới với `ASPNETCORE_ENVIRONMENT=Development` và
`--urls http://127.0.0.1:5080`; không đọc `.env`/OAuth credentials/project settings.
PostgreSQL và MinIO có credentials test ngẫu nhiên mới, chỉ bind loopback. Các giá trị
này ở file private mode600 trong folder mode700, ignored; không đặt service password
vào REVIEW.md. Xem credentials **MinIO cục bộ của session này** để đăng nhập console:

```bash
python3 -c 'import json; s=json.load(open("TestResults/review-session/private-state.json")); print(s["minio_test_user"]); print(s["minio_test_password"])'
```

API hiện **không có** DB/MinIO adapters, analytics/trackSearch, Kafka consumers, reindex
hoặc AI-provider client. Không khởi động chúng, không gọi provider thật; không thêm
AI endpoint/stub response giả. Stub readiness hiện trả false; không bật flag ready
để che việc dependencies chưa nối. Không có DB thật/MinIO thật được sử dụng.

Curl tự thử, chỉ origin của session này (404 của business routes là trạng thái hiện tại):

```bash
base=http://127.0.0.1:5080
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' "$base/health/live"
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' "$base/health/ready"
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' "$base/api/species?page=1&limit=20"
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' "$base/api/species/featured"
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' "$base/api/species/fixture-sao-la"
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' "$base/api/ecosystems"
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' -c /tmp/wildvn-review.cookies -H 'Content-Type: application/json' --data '{"username":"fixture_review_new","email":"review-new@example.invalid","password":"wildvn-fixture-password"}' "$base/api/auth/register"
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' -b /tmp/wildvn-review.cookies -c /tmp/wildvn-review.cookies -H 'Content-Type: application/json' --data '{"username":"fixture-reader","password":"wildvn-fixture-password"}' "$base/api/auth/login"
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' -b /tmp/wildvn-review.cookies "$base/api/auth/me"
curl --noproxy '*' -sS -w '\nHTTP:%{http_code}\n' -b /tmp/wildvn-review.cookies -X POST "$base/api/auth/logout"
```

## Tài khoản và dữ liệu test

Chỉ dữ liệu tổng hợp trong `tests/Fixtures/seed.sql`, không phải dữ liệu cá nhân thật:

- Username `fixture-reader`, email `reader@example.invalid`, password test công khai
  `wildvn-fixture-password`; role USER, hash Argon2id fixture. Đây **không phải** password
  service/production. Login .NET vẫn404, chưa chứng minh Java/C# hash interoperability.
- Register smoke dùng `fixture_review_new`/`review-new@example.invalid`; POST404 nên
  không tạo account. Sau cả auth smoke, bảng users vẫn3 dòng.
- Species4: `fixture-sao-la` (featured/published), `fixture-published`, `fixture-draft`,
  `fixture-deleted` (soft deleted). Slug detail lấy từ PostgreSQL đã restore thật.
- Ecosystems2: `fixture-forest`, `fixture-wetland`; chat4 messages,3 users; không đổi seed.
- Bucket MinIO `wildvn-review-media` có `hero-loop.mp4`, `hero-loop.webm`,
  `hero-loop-poster.jpg`, upload bytes từ `wildvn-client/public/videos/home/` hiện hữu.
  Bucket private, không bật anonymous policy. URL SQL seed `example.invalid` vẫn giữ
  nguyên: **không** tuyên bố đã map media của species sang bucket này.

## Smoke thật và build

**Functional smoke 10 mục: PASS1, FAIL9**. FAIL gồm readiness503 và8 endpoints
**CHƯA TRIỂN KHAI** (404); không biến404 thành PASS vì curl exit0. Status503 đúng
hành vi skeleton đã test ở P0, nhưng hệ thống chưa dependency-ready để review chức năng.

| Request | HTTP thật | Functional result |
|---|---|---|
| GET `/health/live` | 200 | PASS — process alive |
| GET `/health/ready` | 503 | FAIL — dependencies CHƯA TRIỂN KHAI / chưa xác minh |
| GET `/api/species?page=1&limit=20` | 404 | FAIL — CHƯA TRIỂN KHAI |
| GET `/api/species/featured` | 404 | FAIL — CHƯA TRIỂN KHAI |
| GET `/api/species/fixture-sao-la` | 404 | FAIL — CHƯA TRIỂN KHAI |
| GET `/api/ecosystems` | 404 | FAIL — CHƯA TRIỂN KHAI |
| POST `/api/auth/register` | 404 | FAIL — CHƯA TRIỂN KHAI |
| POST `/api/auth/login` | 404 | FAIL — CHƯA TRIỂN KHAI |
| GET `/api/auth/me` | 404 | FAIL — CHƯA TRIỂN KHAI |
| POST `/api/auth/logout` | 404 | FAIL — CHƯA TRIỂN KHAI |

Output response thật, body giữ nguyên (không fixture response giả):

```text
GET /health/live -> 200 {"status":"alive"}
GET /health/ready -> 503 {"status":"notReady"}
GET /api/species?page=1&limit=20 -> 404 {"timestamp":"2026-10-09T21:37:11.6933726","status":404,"error":"Not Found","message":"Chức năng chưa khả dụng","path":"/api/species"}
GET /api/species/featured -> 404 {"timestamp":"2026-10-09T21:37:11.7149881","status":404,"error":"Not Found","message":"Chức năng chưa khả dụng","path":"/api/species/featured"}
GET /api/species/fixture-sao-la -> 404 {"timestamp":"2026-10-09T21:37:11.7257946","status":404,"error":"Not Found","message":"Chức năng chưa khả dụng","path":"/api/species/fixture-sao-la"}
GET /api/ecosystems -> 404 {"timestamp":"2026-10-09T21:37:11.7341075","status":404,"error":"Not Found","message":"Chức năng chưa khả dụng","path":"/api/ecosystems"}
POST /api/auth/register -> 404 {"timestamp":"2026-10-09T21:37:11.7427542","status":404,"error":"Not Found","message":"Chức năng chưa khả dụng","path":"/api/auth/register"}
POST /api/auth/login -> 404 {"timestamp":"2026-10-09T21:37:11.7495173","status":404,"error":"Not Found","message":"Chức năng chưa khả dụng","path":"/api/auth/login"}
GET /api/auth/me -> 404 {"timestamp":"2026-10-09T21:37:11.7577565","status":404,"error":"Not Found","message":"Chức năng chưa khả dụng","path":"/api/auth/me"}
POST /api/auth/logout -> 404 {"timestamp":"2026-10-09T21:37:11.7653206","status":404,"error":"Not Found","message":"Chức năng chưa khả dụng","path":"/api/auth/logout"}
```

Build thật:

```text
WildVN.Api — dotnet build -c Release
Build succeeded.
    0 Warning(s)
    0 Error(s)
exit=0
WildVN.Desktop — dotnet build -c Release (Linux cross-build)
Build succeeded.
    0 Warning(s)
    0 Error(s)
exit=0
```

Restore source fixture11/11 và backup/restore độc lập11/11 pass; counts/hash18 bảng
bằng nhau. Sau auth HTTP requests, actual counts species4/ecosystems2/users3/messages4.
MinIO health và console HTTP200, create bucket và3 media uploads HTTP200; các kiểm tra
infra này ngoài10 functional smoke mục ở trên. Không có lỗi restore/build bị che.

Raw logs hiện tại: [start.txt](../TestResults/review-session/start.txt),
[fixture.txt](../TestResults/review-session/fixture.txt),
[build.txt](../TestResults/review-session/build.txt),
[minio.txt](../TestResults/review-session/minio.txt),
[api.txt](../TestResults/review-session/api.txt),
[smoke.txt](../TestResults/review-session/smoke.txt),
[smoke.json](../TestResults/review-session/smoke.json).
Không sửa/xóa tests, không đổi app source, không thêm tính năng, không push/commit
cấu hình local; Git chỉ thêm REVIEW.md, runtime artifacts ignored.

## Chưa chạy được / chưa kiểm chứng

- Catalog/featured/detail/ecosystems/auth: **CHƯA TRIỂN KHAI**,404 thực tế.
- API đọc/ghi PostgreSQL, lấy media MinIO và dependencies readiness: **CHƯA TRIỂN KHAI**.
- Swagger/OpenAPI: **CHƯA TRIỂN KHAI**,404 trong Development; không thêm package/endpoint.
- WPF UI, navigation/dispatcher/codec/DPI/lifecycle/E2E: **CHƯA KIỂM CHỨNG**, host Linux hiện thiếu môi trường chạy WPF/.NET10; chỉ cross-build.
  WinForms .NET Framework qua Mono được xác minh riêng ở phần bên dưới. Không có giao diện web .NET để review.
- MinIO console login/browser playback, presigned expiry: **CHƯA KIỂM CHỨNG**, chưa có
  app adapter hoặc Windows session; health/upload200 không thay kiểm chứng UI/media.
- Baseline DB thực/Flyway/extensions và full production coverage: **CHƯA KIỂM CHỨNG**,
  fixture tổng hợp +portable coverage không thay baseline thật/Windows instrumentation.

## Điểm nên review và quyết định

1. P0 scope mới là contracts/fixture/skeleton/shell/PoC. Những endpoints ở plan giai đoạn
   tiếp theo chưa được port. Xem readiness503 và404 để quyết định scope lượt sau; chưa
   cho phép tự triển khai T06/auth/catalog trong lượt chạy này.
2. Schema/ID legacy: users/chat UUID nhưng favorites/Academy username string; migrations
   coexistence do Flyway sở hữu. Fixture không tạo history giả, không chạy design DDL.
3. Giữ readiness trung thực; DB/MinIO standalone healthy không nghĩa API đã nối chúng.
   Không cho shell/liveness hiển thị catalog/auth migrated chỉ vì health200.
4. MinIO3 samples là media repository cũ để review infra, khác bộ URLs synthetic của
   SQL seed. Cần mẫu MinIO được phép và mapping ở task sau; không thay SQL để giả parity.
5. Để review UI/T05 cần desktop Windows được hỗ trợ; renderer/runtime packaging vẫn tạm.
   Xác nhận môi trường Windows hoặc giới hạn review lần này vào API/fixture/design.

Dừng công việc tại đây, giữ services chạy để người dùng review; chỉ làm bước tiếp sau
phản hồi/xác nhận của người dùng.

## Kiểm tra môi trường chạy .exe — 2026-10-09

- **Môi trường thật:** Ubuntu 24.04.5 LTS x86-64, GNOME/X11 (`DISPLAY=:1`).
  Shell của agent không có DISPLAY; phiên desktop GNOME có DISPLAY.
- **Cơ chế .exe hiện có:** `binfmt` mục `cli` enabled từ `mono-runtime`, detector
  `/usr/lib/cli/binfmt-detector-cli`, interpreter `/usr/bin/cli` (Mono 6.8.0.105).
  Không tìm thấy Wine/Bottles trong PATH, package đã cài hoặc các thư mục ứng dụng
  đã kiểm tra; không tìm thấy VM Windows đang chạy hoặc container Windows.
- **Artifact cũ:** apphost Release Linux là ELF, không phải `.exe` Windows.
- **Publish mới PASS:** `dotnet publish src/WildVN.Desktop/WildVN.Desktop.csproj
  -c Release -r win-x64 --self-contained true
  -o TestResults/desktop-run/win-x64`, exit 0.
  `file WildVN.Desktop.exe`: `PE32+ executable (GUI) x86-64, for MS Windows`.
  Thư mục publish có `coreclr.dll` và `PresentationFramework.dll`; tổng 148483218 bytes.
- **Thử chạy thật FAIL:** chạy trực tiếp `.exe` trả exit 2:
  `run-detectors: unable to find an interpreter for .../WildVN.Desktop.exe`.
  Chạy `mono WildVN.Desktop.exe` cũng trả exit 2:
  `File does not contain a valid CIL image.` Đây là lỗi apphost Windows dạng native;
  riêng lỗi này không chứng minh Mono không chạy được mọi ứng dụng `.exe`.
  Chạy DLL bằng .NET Linux trả exit 150, thiếu `Microsoft.WindowsDesktop.App 10.0.0`.
- **UI CHƯA KIỂM CHỨNG:** chưa có cửa sổ hoặc tiến trình WPF hoạt động.
  [Microsoft ghi rõ WPF chỉ chạy trên Windows](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/overview/).
  Không tự cài Wine/VM, không đổi framework, không sửa app source/tests.
- **API:** kiểm tra lại `/health/live` trả `HTTP_STATUS=200`, `{"status":"alive"}`.
  API/fixture/MinIO được giữ chạy như phiên review trước.

Bản Windows nằm ở [win-x64](../TestResults/desktop-run/win-x64/),
[WildVN.Desktop.exe](../TestResults/desktop-run/win-x64/WildVN.Desktop.exe).
Copy **toàn bộ thư mục publish**, không chỉ exe, sang môi trường Windows để chạy.
Nếu API cũng truy cập được tại localhost của Windows, mở CMD trong thư mục đó:

```bat
set WILDVN_API_BASE_URL=http://127.0.0.1:5080/
set WILDVN_ALLOW_LOOPBACK_HTTP=1
WildVN.Desktop.exe
```

API hiện chỉ bind loopback trên Ubuntu; localhost của VM/máy Windows khác không tự
trỏ về Ubuntu. Kết nối API từ Windows và WebView2 runtime vẫn **CHƯA KIỂM CHỨNG**.
Chưa mở/bind API ra LAN hoặc truy cập máy Windows từ xa nào.

Bằng chứng thật: [environment.txt](../TestResults/desktop-run/environment.txt),
[publish-win-x64.txt](../TestResults/desktop-run/publish-win-x64.txt),
[linux-launch.txt](../TestResults/desktop-run/linux-launch.txt),
[windows-exe-launch.txt](../TestResults/desktop-run/windows-exe-launch.txt).

## Xác minh lại WinForms đang dùng Mono — 2026-10-09

**WinForms của người dùng chạy được trên máy này; WildVN WPF/.NET10 chưa chạy được
qua cùng Mono.** Không kết luận Ubuntu không chạy được mọi `.exe`.

| Ứng dụng | Framework/UI thật | Kết quả thực thi |
|---|---|---|
| `Bai1_TinhTienNuocSinhHoat.exe` có sẵn | `net472`, `System.Windows.Forms`, Mono 6.8/X11 | **PASS startup**: cửa sổ “Tính tiền nước sinh hoạt” `1180x541`, `Map State: IsViewable` |
| WildVN Desktop | `net10.0-windows`, `<UseWPF>true</UseWPF>` | **FAIL startup**: Mono không tải được `PresentationFramework, Version=10.0.0.0`; exit 1 |

Project WinForms được kiểm tra tại
`/home/laivinhquang/Workspace/Cacmontrenlop/lttq/luyentapde/LaiVinhQuang_241230822/`.
Đã đọc Program/Form constructor/Load: startup chỉ dựng form; không gọi DB/API.
Mở bản exe hiện có bằng `mono <path>/bin/Debug/net472/Bai1_TinhTienNuocSinhHoat.exe`
với `DISPLAY=:1` và XAUTHORITY của phiên GNOME. Không build, sửa code, chmod hoặc
nhập dữ liệu vào ứng dụng này. Sau quan sát đã dừng **chỉ tiến trình probe PID183628**;
cửa sổ client `0x5000015` đã biến mất. API/fixture/MinIO WildVN vẫn được giữ chạy.

Output cửa sổ thật:

```text
STARTED_PID=183628
PROCESS_ALIVE=True
0x5000015 "Tính tiền nước sinh hoạt": ()  1180x541+14+49  +367+294
_NET_WM_NAME(UTF8_STRING) = "Tính tiền nước sinh hoạt"
Map State: IsViewable
POST_CLEANUP_CLIENT_WINDOW_PRESENT=False
```

Probe đầu tiên không nhận diện cửa sổ do yêu cầu `_NET_WM_PID`: client Mono không đặt
property này, còn frame do Mutter sở hữu PID4974. Vì vậy `WINDOW_VISIBLE=False`
trong log probe đầu **không được coi là chứng minh ứng dụng không mở**. Follow-up dùng
inventory X11 trước/sau launch, thấy cửa sổ mới đúng title/controls và đã mapped.
Log app có warning thật `Failed to load module "canberra-gtk-module"`; không che log,
warning không chặn cửa sổ startup quan sát được. Không kiểm thử chức năng tính tiền.

Đã thử đúng managed DLL của WildVN để loại trừ việc chỉ dùng nhầm apphost native:

```text
$ mono src/WildVN.Desktop/bin/Release/net10.0-windows/WildVN.Desktop.dll
The entry point method could not be loaded due to Could not load file or assembly 'PresentationFramework, Version=10.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35' or one of its dependencies.
EXIT_CODE=1
```

Mono hiện có `System.Windows.Forms.dll` và `WindowsBase.dll`; không có GAC
`PresentationFramework`/`PresentationCore`. [Mono hỗ trợ WinForms với driver X11](https://www.mono-project.com/docs/gui/winforms/)
và [không triển khai WPF](https://www.mono-project.com/docs/gui/wpf/).
Lỗi managed DLL và cấu hình project cho thấy môi trường WinForms/Mono hiện hữu không
đủ để mở WildVN WPF/.NET10. Việc đổi UI/framework là thay đổi triển khai ngoài lượt
chạy review này; chưa tự thực hiện hoặc cài runtime/máy ảo mới.

**CHƯA KIỂM CHỨNG:** WildVN UI, WebView2/media, chạy trên Windows/Wine; các project
WinForms `net8.0-windows` khác chỉ được thấy cấu hình, không được thử chạy ở lượt này.

Bằng chứng: [mono-winforms-probe.txt](../TestResults/desktop-run/mono-winforms-probe.txt),
[mono-winforms-window-details.txt](../TestResults/desktop-run/mono-winforms-window-details.txt),
[mono-wpf-dll-launch.txt](../TestResults/desktop-run/mono-wpf-dll-launch.txt).
