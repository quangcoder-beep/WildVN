# WF03 packaging, cài review và E2E

Ngày2026-10-11. Implementation cục bộ đã hoàn thiện: ZIP Mono/Windows,
manifest/hash/provenance, exact-owned runner, PowerShell per-user install/offline
update/rollback/uninstall và harness UIA Windows. Sau đó mới chạy final batch theo
chỉ dẫn hiện hành của người dùng. Các RED/GREEN packaging/runner trước đó được giữ;
không tạo RED giả cho installer/E2E mới. Không triển khai T06, nối DB/MinIO/OAuth thật
hoặc production signed installer/updater. Windows và full P0 acceptance chưa nghiệm thu.

## Kết quả cuối sau implementation

| Kiểm tra | Kết quả / evidence trong `evidence/winforms-wf03/` |
|---|---|
| Release API/client hai target/Windows publish | PASS0 warnings/errors; `completion-*-build.txt`, `completion-package-build.txt` |
| .NET105 +Mono62 | PASS, không skip; `completion-WildVN.*.Tests.txt`, `completion-mono-tests.txt` |
| Python100 gồm package/session42 và E2E boundary10 | PASS với fixture riêng; `completion-all-python-final.txt` |
| Runner67 / installer71 PowerShell checks | PASS Linux parser/filesystem/mocks; `completion-windows-runner.txt`, `completion-install-tests.txt` |
| Package/runner Python coverage | combined92%; package line91,28%/branch89,29%, runner94,35%/89,29%; `completion-python-coverage.json` |
| Fixture restore11 và backup restore11 | PASS,18 table count/hash snapshots giữ nguyên, own container cleanup; `completion-fixture-final.txt` |
| Bundled Windows E2E helper trên Linux | exit2/CHƯA KIỂM CHỨNG; `completion-e2e-platform-guard.txt`; không UI actions |
| NuGet audit gồm transitive | Không phát hiện vulnerable packages từ nguồn audit; `completion-nuget-audit.txt`; native/OS audit chưa đo |

Coverage80% gate giữ nguyên trên scope đo được. T02 chỉ đo fixture guard;
WF03 Python tools có reports riêng. Không tuyên bố full C#/PowerShell/Windows UIA/native
coverage đạt80%;5 source WPF lịch sử và device/runtime chưa đo được.

## RED/GREEN packaging

`evidence/winforms-wf03/package-red-resume.txt`: package unit RED có 15 tests, 7 failing
subtests. Failures thật là validation/schema/flavour/duplicates/canonical alias/colon/
inventory: manifest rỗng hoặc schema/flavour sai được chấp nhận, duplicate entry được
chấp nhận, `libvlc//win-x64/x.dll` và `C:payload.dll` lọt allowlist, unlisted payload/
linked ancestor chưa bị reject.

`evidence/winforms-wf03/package-integration-red-resume.txt`: integration RED có 17 tests,
2 errors. Lỗi thật: extracted archive bị reject vì `.review-session.json`; full builder
tạo archive nhưng verify lại reject chính `manifest.json`.

`evidence/winforms-wf03/package-integration-green-resume.txt`: integration GREEN17.
`evidence/winforms-wf03/package-green-resume.txt`: package unit GREEN15. Suite tổng
`evidence/winforms-wf03/python-package-final.txt` chạy GREEN42, gồm 25 Mono runner tests
mới và 17 package tests. Coverage cho `build/package_review.py` và `build/review_client.py`
là 92% tổng theo `python-package-final-coverage.txt`.

Sau đó reviewer thêm filename-policy RED5 cho các tên payload cần chặn; lượt cuối GREEN42.
Coverage ở lượt lịch sử đó: `package_review.py` line91,10%/branch88,75%;
`review_client.py` line94,35%/branch89,29%; combined92%.

## Runner và regression

`evidence/winforms-wf03/mono-runner-red.txt` giữ RED thật cho runner Mono với lỗi guard/
session/package validation; `mono-runner-green.txt` nằm trong GREEN42 ở trên. Runner chỉ
start/stop child package đã verify, không đọc cấu hình dự án thật và không kill process lạ.

`evidence/winforms-wf03/windows-runner-red-resume.txt` giữ Windows runner RED với 33 checks
và 17 failure. `evidence/winforms-wf03/windows-runner-final.txt` đạt `RUNNER_CHECKS=67 PASS`,
nhưng đây chỉ là parser/unit/mocked checks trên Linux; Start/Status/Stop thật vẫn cần
Windows x64. `Review-Windows.ps1 -Action Check` PASS trên extracted `win-x64`, xác minh
payload/manifest, không chạy UI Windows.

`.NET` regression portable đã chạy lại bằng SDK10.0.401 trong
`TestResults/winforms-wf03/tools/dotnet`: API10 + ApiClient33 + Desktop62 = 105 tests
PASS. Mono tests ban đầu không có DISPLAY: 62 total, 40 pass, 22 errors. Sau Xwayland/
xauth setup mới, Mono62 PASS; GUI evidence mới có startup epoch/xauth khác các phiên cũ.
P0 regression portable PASS nhưng exit2 vẫn là trạng thái đúng vì baseline thật, full
production coverage và Windows acceptance còn **CHƯA KIỂM CHỨNG**.

## Artifact cuối

`TestResults/winforms-wf03/packages-complete-20261011/`:

| ZIP | Payload files | Bytes | SHA256 |
|---|---:|---:|---|
| `mono-net472.zip` | 22 | 9375061 | `2dbbd94a91f76f4f4568d3d2362be6884e1c828ed782d68cc97e83ac109d6d44` |
| `win-x64.zip` | 607 | 107683448 | `b5a66135e862e67937ae57de90834922b7c4bd69bb036c7ab395ee7807961f0a` |

Metadata: `evidence/winforms-wf03/completion-smoke/packages-final.json`.
Source revision `dab2ffa989c0c101a11b631e5de201d9799d8f7f` là base (`source_revision_is_base=true`),
có dirty/untracked status và35 source hashes, khớp checkout hiện tại của cả hai flavor.
Không dùng các ZIP `packages-reviewed`/`packages-final-20261011` cũ làm final.

Windows self-contained bundle VLC3.0.24 core và321 plugin DLL.323 native DLL có
PE/AMD64 header (`completion-native-architecture.txt`); không chứng minh chạy trên
Windows. Lua/JAR/development files bị loại. Native Windows dependency chỉ áp dụng
net10; Mono package cần Mono/X11/native distro LibVLC3/plugins.
SDK10.0.401/Python coverage/PowerShell7.6.6 nằm trong ignored TestResults, không đổi
PATH/config máy. Hash/receipt không xác thực publisher; release license/source-offer/
media rights và signing vẫn cần nghiệm thu riêng, xem `build/NOTICE.md`.

## Smoke package thật

`completion-smoke/package-smoke-final.txt` giữ runner Check cả hai flavor; Mono
start/status/SIGTERM stop trước khi load media, graceful close sau playback;5 navigation
labels/unavailable states, real API health và video Play/Pause/Stop PASS.
Native video400ms/55frames/143 audio blocks/muted=True. Checkbox mute/reduced-motion
mặc định được tick, native getter trước playFalse; không dùng ảnh trước play để tuyên
bố native mute getterTrue. WAV inventory khớp hash; WAV decode WF02 là evidence lịch
sử, không gọi audio blocks trong video là replay WAV final.
Phiên cuối PID68248 đã đóng (`completion-current-state.txt`), ảnh là captured evidence.
API skeleton live200/ready503 và8 business routes404 (functional1PASS/9FAIL), chưa DB
adapters; fixture riêng cleanup xong.

Real ZIP filesystem integration trên Linux PASS exit0,208,23s:
Install/Update/Rollback/foreign-data-refusal/Uninstall.
`completion-install-integration-full.txt` và `install-package-integration.ps1` tái hiện
với607 payload files trong root tạm TestResults. Version thứ hai chỉ đổi annotation
manifest, code/sample bytes giữ nguyên; không gọi Windows public entry-point mutation
hoặc launch. Harness timeout120 được giữ, không gọi lượt đó là PASS.

## Lỗi giữ lại và giới hạn

Các log cũ giữ native plugins/plugins.dat failure, manifest/policy RED, no-DISPLAY,
coverage scope drift. Final batch có các lỗi harness đã sửa và giữ evidence: backup
roundtrip gọi hai lần (`completion-all-python.txt`), PowerShell dynamic-scope recursion
(`completion-install-hang.txt`), hidden session cleanup (`completion-install-hidden-file-failure.txt`),
integration dot-source reset parameters (`completion-install-integration-parameter-failure.txt`)
và timeout120 (`completion-install-integration.txt`). Không đổi assertions để che lỗi.

Windows .exe launch/UI/media, clean-machine install/update/rollback/uninstall,
DPI/keyboard/accessibility, device audibility/GPU/performance/codec breadth và signing
còn CHƯA KIỂM CHỨNG. PowerShell checks và Linux real ZIP filesystem exercise không
thay Windows acceptance. [Install runbook](windows-review-install.md),
[E2E runbook](windows-review-e2e.md), [REVIEW hiện hành](../handover/REVIEW.md),
[checklist Windows](../handover/CHECKLIST-WINDOWS.md).
