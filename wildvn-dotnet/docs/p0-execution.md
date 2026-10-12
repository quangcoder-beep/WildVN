# P0 execution contract — 2026-10-09

## Steering hiện hành — triển khai trước, test/nghiệm thu sau

Người dùng đang dùng Ubuntu và yêu cầu tiếp tục triển khai thay vì chờ nghiệm thu
Windows. Chỉ đạo này thay cho stop-after-P0/stop-after-WF03 và test-first ở các đoạn
lịch sử dưới. Không chạy unit/integration/E2E, coverage, fixture restore hoặc GUI
acceptance trong lượt này; có thể rà source và biên dịch sau implementation để sửa
lỗi mã. Không tạo RED giả hay chuyển PASS lịch sử sang code mới.

WF03 đã commit `d8c7e32`; bước tiếp tục theo plan tổng là T06 mapping 18 tables/
14 enums với EF Core/Npgsql, source-derived schema. Không gọi DB/API thật, không
đọc project credentials, không Execute DDL/Migrate/EnsureCreated. Schema round-trip,
rollback/constraints, API startup schema diff và >=80% coverage giữ ở backlog sau.
Mỗi task có một checkpoint commit cục bộ, không push hoặc triển khai.

T06 chia theo ownership, mỗi slice tối đa năm file:

- T06.rows: Data/{CatalogRows,GeographyRows,AccountRows,HistoryRows,LegacyEnums}.cs.
- T06.mapping: WildVN.Infrastructure.csproj, Data/{PostgresConfiguration,PostgresMappings,LegacyQueries}.cs và WildVN.Api.csproj.
- T06.write: Data/{WildVnDbContext,RowWritePolicy}.cs.
- T06.docs: docs/{ef-mapping-review,p0-execution,winforms-migration.plan}.md và handover/{REVIEW,HANDOVER}.md.
- T06.status: handover/{KNOWN-ISSUES,TEST-REPORT}.md và evidence/t06-implementation/{status,source-scan}.json, review.md.
- T06.compiler: evidence/t06-implementation/build*.txt (bốn lần compile, không phải test).

Các tên project trong danh sách slice là viết tắt; đường dẫn thực ở src/WildVN.Infrastructure
và src/WildVN.Api. Không tick acceptance criteria chỉ dựa vào compiler/source review.

## T07 continuation — 2026-10-11

Người dùng đã đồng ý tiếp tục T07 sau source T06 (`eeca084`). Giữ implementation-first;
không test, DB fixture/HTTP smoke hoặc restart process. Runtime host có code opt-in
Auth settings/DB connection nhưng agent không đọc/cấp giá trị secrets hay bật auth.
Một local commit cho source task; không tick acceptance chưa kiểm chứng.

Slices <=5 files:

- T07.application: Application.csproj, Auth/{AuthPorts,AuthService}.cs.
- T07.infrastructure: Infrastructure/Auth/{LegacyArgon2PasswordVerifier,LegacyJwtTokens,PostgresAuthStore,LoginAttemptLimiter}.cs.
- T07.graph: Infrastructure.csproj, Infrastructure/packages.lock.json, API/Program.cs.
- T07.http: API/Auth/{AuthEndpoints,AuthRequests,AuthErrors}.cs.
- T07.security: API/Auth/{AuthRegistration,AuthSecurity,LegacyCookieHandler}.cs.
- T07.docs: docs/{auth-implementation,p0-execution,winforms-migration.plan}.md, handover/{REVIEW,HANDOVER}.md.
- T07.status: handover/{KNOWN-ISSUES,TEST-REPORT}.md, evidence/t07-implementation/{status,source-scan}.json, review.md.
- T07.compiler: evidence/t07-implementation/{build-first,build-final,restore-lock,restore-locked,dependency-audit}.txt.

Source review độc lập bằng /root/t07_review; planner/crypto role agents đầu tiên
không chạy được do usage limit, root tự triển khai. Không gọi failure đó thành
independent planning/crypto verification. T08 tiếp theo dùng WinForms thay WPF.

## Client framework override — 2026-10-10

Theo yêu cầu mới của người dùng, shell hoạt động chuyển WPF sang WinForms.
[winforms-migration.plan.md](winforms-migration.plan.md) xác định WF01 hiện tại,
WF02 native media đã chạy thật; WF03 đã hoàn thiện ZIP/runner, cài đặt review,
update/rollback/uninstall cùng helper Windows E2E, rồi chạy final batch tests.
Nghiệm thu Windows còn pending. Target net472 chạy thật bằng Mono/X11;
target net10.0-windows cross-build thành công. Backend vẫn net10, không triển khai T06.
Giữ source/tests/commits T01–T05 lịch sử; không tick nghiệm thu Windows hoặc baseline thật.
WF01 có một commit riêng, RED/GREEN giữ bằng log, báo cáo [TDD](winforms-migration.tdd.md)
và [REVIEW](../handover/REVIEW.md). Các ràng buộc credential/DDL/side effect tiếp tục áp dụng.
WF02 có [TDD media](winforms-media.tdd.md): LibVLC/PictureBox native, C#167/Python48
PASS; scoped union98,30%/92,03%, full source/Windows/WebView2 chưa nghiệm thu.

Slice hỗ trợ bổ sung, tối đa năm file mỗi slice:
- WF01.tools: build/RunWithCoverageFlush.cs, build/run-winforms.sh,
  evidence/winforms-wf01/x11_owned.py, evidence/winforms-wf01/exe_coverage_smoke.py.
- WF01.docs: handover/{HANDOVER,TEST-REPORT,KNOWN-ISSUES,CHECKLIST-WINDOWS}.md,
  docs/p0-execution.md; dữ liệu lịch sử được giữ và gắn trạng thái framework hiện hành.

## Historical P0 scope

Source: ../../wildvn-client/docs/desktop-dotnet/{plan,todo}.md. Scope ends at T05.
Each parent task produces exactly one local commit, as explicitly requested. RED/GREEN
checkpoints are logs rather than extra commits. No push or production deployment.
The root .git directory has no metadata; client and server are independent repositories.
Migration work therefore has its own repository inside wildvn-dotnet; preserve existing files.

## Split before implementation

Every slice owns at most five files. Parent dependencies and acceptance criteria remain unchanged.

- T01.a: docs/feature-inventory.md, docs/api-contracts.md, tests/Fixtures/api-contracts.json, tests/contract_snapshot_test.py.
- T01.b: .gitignore, docs/p0-execution.md, docs/p0-evidence.md, evidence/t01-red.txt, evidence/t01-green.txt.
- T02.a: tests/fixture_validation_test.py, tests/Fixtures/schema.sql (pre-existing), tests/Fixtures/seed.sql, build/restore-fixture.sh, build/verify-fixture.sh.
- T02.b: build/fixture_connection.py, docs/database-baseline.md, evidence/t02-red.txt, evidence/t02-green.txt, evidence/t02-restore.txt.
- T02.c: .gitattributes (verbatim upstream SQL whitespace), docs/p0-execution.md, docs/p0-evidence.md (per-task progress).
- T03.a: global.json, Directory.Build.props, src/WildVN.Api/WildVN.Api.csproj, src/WildVN.Api/Program.cs, src/WildVN.Contracts/WildVN.Contracts.csproj.
- T03.b: src/WildVN.Contracts/ApiContracts.cs, tests/WildVN.Api.Tests/WildVN.Api.Tests.csproj, tests/WildVN.Api.Tests/ApiBootstrapTests.cs, evidence/t03-red.txt, evidence/t03-green.txt.
- T04.a: src/WildVN.ApiClient/WildVN.ApiClient.csproj, src/WildVN.ApiClient/ApiClient.cs, tests/WildVN.ApiClient.Tests/WildVN.ApiClient.Tests.csproj, tests/WildVN.ApiClient.Tests/ApiClientTests.cs, evidence/t04-client-red.txt.
- T04.b: src/WildVN.Desktop/WildVN.Desktop.csproj, src/WildVN.Desktop/App.xaml, src/WildVN.Desktop/App.xaml.cs, src/WildVN.Desktop/MainWindow.xaml, src/WildVN.Desktop/MainWindow.xaml.cs.
- T04.c: src/WildVN.Desktop/ShellViewModel.cs, src/WildVN.Desktop/ShellState.cs, src/WildVN.Desktop/Command.cs, tests/WildVN.Desktop.Tests/WildVN.Desktop.Tests.csproj, tests/WildVN.Desktop.Tests/ShellViewModelTests.cs.
- T04.d: evidence/t04-shell-red.txt, evidence/t04-green.txt, docs/desktop-verification.md (if needed).
- T05.a: src/WildVN.Desktop/Media/MediaPoCView.xaml, src/WildVN.Desktop/Media/MediaPoCView.xaml.cs, src/WildVN.Desktop/Media/NativeMediaPresenter.cs, src/WildVN.Desktop/Media/IsolatedWebMediaPresenter.cs, src/WildVN.Desktop/Media/Assets/media-poc.html.
- T05.b: src/WildVN.Desktop/Media/MediaPolicy.cs, tests/WildVN.Desktop.Tests/MediaPolicyTests.cs, docs/media-poc-results.md, evidence/t05-red.txt, evidence/t05-green.txt.
- T05.c: build/Measure-MediaPoC.ps1, tests/media_asset_test.py, evidence/p0-final.txt, src/WildVN.Desktop/MainWindow.xaml.cs (navigation wiring), src/WildVN.Desktop/WildVN.Desktop.csproj (local asset/runtime packaging).

## Verification boundaries

Source-backed examples are synthetic contracts, never captured production responses.
A source-derived PostgreSQL fixture and backup round-trip cannot certify the real DB's
schema, data counts, Flyway history or media paths. Obtain an authorized sanitized backup
before completing T02's real-baseline acceptance. Do not execute db/design or db/sql DDL.
No credential contents may be read/copied/edited. Inspect only paths/tracking/history.
No production API calls, including GET /api/search analytics side effects. The 2026-10-09
continuation explicitly authorizes curl against our newly started loopback Kestrel process
(health plus unavailable-route/error smoke only). PostgreSQL writes use an empty disposable
local fixture only. Never consume project connection settings or credential files.
Linux cross-build does not prove WPF execution, codecs, DPI, accessibility or performance.
Windows 10/11 measurements remain pending until an appropriate Windows machine is available.
No fabricated feature, model server, fixture provenance, migration history or PASS status.

- T05.d: tests/WildVN.Desktop.Tests/WildVN.Desktop.Tests.csproj (link pure production policy), docs/p0-execution.md, docs/p0-evidence.md (final acceptance status).

## Sequential verification and handover continuation — 2026-10-09

Observed HEAD a7391b0 contains all five task commits, with a clean working tree. T02 is
not currently RED: its historical RED and fixture GREEN are committed. Real-baseline
acceptance remains pending. Preserve that history; do not reimplement T06 or mark P0 accepted.
The user now requests sequential build/test/coverage/curl re-runs and one-command handover.
No concurrent subagents. Each continuation slice remains at most five files.

- H01.a (test first): tests/handover_test.py, tests/fixture_connection_test.py,
  handover/coverage_report.py, handover/run-p0.sh, handover/verify_p0.py.
  Regression checks cover coverage union/threshold/missing sources, real curl response
  validation, fixture guard/error dispatch. The runner creates its own local resources,
  records actual output, and never takes a real API/DB URL.
- H01.b: docs/p0-execution.md, .gitignore, evidence/handover-red.txt,
  evidence/handover-green.txt, docs/p0-evidence.md.
- H01.c: handover/HANDOVER.md, handover/TEST-REPORT.md, handover/KNOWN-ISSUES.md,
  handover/CHECKLIST-WINDOWS.md, ../../wildvn-client/docs/desktop-dotnet/todo.md.
- H01.d1: evidence/p0-rerun/{prerequisites.txt,t01.txt,t02.txt,t03.txt,t04.txt}.
- H01.d2: evidence/p0-rerun/{t05.txt,kestrel.txt,summary.txt,cleanup.txt,coverage-summary.json}.
- H01.d3: evidence/p0-rerun/{fixture-coverage.json,fixture-schema.diff,serve-curl.txt,git-final.txt,todo-p0.patch}.
- H01.d4: evidence/p0-rerun/{api-coverage.xml,client-coverage.xml,desktop-coverage.xml,race-failure.txt,mode-checks.txt}.
- H01.d5: evidence/p0-rerun/{manifest.sha256,audit.txt,review.txt}.
  Artifacts are generated sequentially from actual commands. Complete XML/TRX/dump stay
  in ignored TestResults; selected raw coverage XML is preserved with committed evidence.

The original T01–T05 commits remain one per task. A separate local handover commit records
only this continuation. Tick individual todo criteria only where the whole criterion is
proven; label unmet real baseline / Windows / all-production coverage CHƯA KIỂM CHỨNG.
Measured portable coverage >=80% does not certify uninstrumented WPF adapters or XAML.
Stop after P0 for user confirmation; the handover script does not proceed to another phase.

Runner regression findings: preserve the failed --serve startup log. PostgreSQL bootstrap
Unix socket readiness preceded final TCP startup; now explicitly probe TCP inside our own
container. Retain Coverlet root-only async branch groups, rather than dropping unlocated
counts or inventing per-file attribution. Default exit2 denotes pending full P0; --serve
Ctrl-C exit130 and cleanup are exercised against our actual local process.

- H01.e: .gitattributes (raw evidence only). Preserve exact stdout/diff/CRLF bytes
  and SHA256 on Windows checkout; disable whitespace warnings only for captured logs,
  not source. Generated unittest/diff/curl output contains intentional whitespace.

## WF03 tiếp tục hoàn thiện implementation — 2026-10-11

Theo steering mới, hoàn thiện code các bước WF03 trước rồi mới chạy test chung ở
cuối lượt; không dừng review sau mỗi bước. TDD RED/GREEN của package/runner trước
steering được giữ, không tạo RED giả cho phần installer/E2E mới. Phạm vi mới gồm
cài đặt review per-user từ ZIP chọn rõ, Update/Rollback/Uninstall, launcher active
và helper UIA Windows. Source split:

- WF03.install: build/Install-WindowsReview.ps1, build/Start-InstalledReview.ps1,
  tests/install_windows_test.ps1, docs/windows-review-install.md.
- WF03.e2e: build/Verify-WindowsReview.py, tests/windows_review_e2e_test.py,
  docs/windows-review-e2e.md.
- WF03.package: build/package_review.py, build/Review-Windows.ps1, build/NOTICE.md,
  tests/review_package_test.py và evidence.

Windows thật/certificate ký số/license-release clearance vẫn là dependencies chưa
có; không coi filesystem mocks hoặc Mono là Windows acceptance, không thay credential
hoặc chính sách hệ thống. Backend/T06 giữ phạm vi hiện tại cho đến khi scope nghiệp vụ
được chọn rõ. Không push, publish hoặc gọi hệ thống thật.

## Referenced web page steering — T07 continuation

User attached wildvn-client/app/(auth)/forgot-password/page.tsx. A separate narrow
source fix removes the simulated email-sent timer and shows unavailable/login,
without a reset/email API. This web edit remains uncommitted, existing client
changes are not staged. Its isolated TS syntax check is recorded separately from
compiler/build logs; browser/semantic/runtime tests remain deferred.
