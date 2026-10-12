# Báo cáo kiểm chứng thực tế P0

**Cập nhật T07 — source implementation:** auth API/password/JWT/cookie/CSRF đã có
code, compiler PASS; tests/coverage/DB/HTTP interoperability và Windows chưa chạy.
Auth opt-in mặc định disabled, không restart process hoặc sửa secrets.
[REVIEW hiện hành](REVIEW.md), [auth implementation](../docs/auth-implementation.md).

**Chỉ đạo hiện hành — implementation trước, test/nghiệm thu sau:** tiếp tục trên
Ubuntu tại T06 EF Core/Npgsql mapping 18 tables/14 enums. Windows pending không còn
chặn triển khai. T06 chưa chạy tests/coverage/DB round-trip; các PASS WF03 bên dưới
là lịch sử. [REVIEW hiện hành](REVIEW.md), [mapping implementation](../docs/ef-mapping-review.md).

**Cập nhật WF03 — 2026-10-11:** implementation cục bộ hoàn thiện trước final batch.
.NET105 +Mono62 +Python100 PASS; PowerShell runner67/installer71 checks PASS trên
Linux. ZIP thật install/update/rollback/foreign-data-refusal/uninstall PASS trong root
tạm (208,23s), video package Mono400ms/55frames/143 audio blocks/muted=True.
Windows UIA helper trên Linux trả exit2/CHƯA KIỂM CHỨNG; chưa nghiệm thu Windows,
máy sạch, ký phát hành hoặc full production coverage. [REVIEW hiện hành](REVIEW.md),
[TDD WF03](../docs/winforms-packaging.tdd.md),
[bảng kiểm chứng cuối](../evidence/winforms-wf03/completion-verification.json).
Số liệu WF02/P0 bên dưới giữ làm lịch sử.

**Cập nhật WF02 — 2026-10-10:** WinForms/PictureBox/LibVLC chạy thật trên Mono/X11.
Release API/hai client target0 warnings/errors; C#167/167 +Python48/48 PASS.
Measured union98,30% line/92,03% branch, từng file >=80%; full source CHƯA KIỂM CHỨNG.
[TDD media](../docs/winforms-media.tdd.md) có raw XML/coverage/UI/curl/RED/GREEN;
[REVIEW.md](REVIEW.md) là trạng thái hiện hành. API functional PASS1/FAIL9, business
404 CHƯA TRIỂN KHAI. Số liệu P0/WPF dưới đây là lịch sử, không là nghiệm thu Windows.

Ngày 2026-10-09, Ubuntu Linux x64. SDK10.0.401, .NET10, PostgreSQL15.18 trong container
riêng `postgres:15-alpine` (image ID ghi trong prerequisites log), coverage.py7.6.12,
Coverlet6.0.2. Không dùng DB/API thật của dự án; HTTP dưới đây là process Kestrel thật
mới tạo trên loopback. WPF được cross-build, không chạy giả Windows.

## Test trước và kết quả mỗi task

RED/GREEN gốc nằm trong các commit T01–T05 và `evidence/t0*-*.txt`. Lượt tiếp tục đọc
Git và thấy T02 đã GREEN fixture, nên không tạo lỗi giả hoặc đảo implementation.
Runner bàn giao có RED do module chưa tồn tại, rồi RED cho branch gate/root-only branch,
phase exit status, timestamp, constraint equivalence và TCP readiness race; đã GREEN
18/18 regression tests. Xem [RED](../evidence/handover-red.txt), [GREEN](../evidence/handover-green.txt).

| Task | Build/test thật | Coverage đo được | Giới hạn |
|---|---|---|---|
| T01 | 9 source-contract tests pass | N/A: docs/fixture, không thêm production logic | Java wire/runtime CHƯA KIỂM CHỨNG |
| T02 | py_compile; API build sạch; 7 guard unit +11 integration pass; DB restore độc lập cũng 11/11 | Python 45/46 lines =97.83%;15/16 branches =93.75%; tổng hợp96.77% | Baseline DB thật/Flyway/extensions CHƯA KIỂM CHỨNG |
| T03 | Release API build 0 warnings/errors;10/10 C# tests | API/contracts49/49 lines; Coverlet root6/6 branches | Dependencies readiness thật CHƯA KIỂM CHỨNG |
| T04 | Release WPF cross-build 0 warnings/errors;33 client tests +62 desktop tests | Client100% lines/98.48% branches; ShellViewModel98.65%/97.92% | Windows UI Automation/dispatcher CHƯA KIỂM CHỨNG |
| T05 | Release WPF cross-build sạch;62 desktop tests +3 HTML/real-JS DOM-stub tests | MediaPolicy100% lines/93.75% mapped branches | Actual renderer/DPI/codec/lifecycle/MinIO CHƯA KIỂM CHỨNG |

C# có **105 test cases duy nhất** (10+33+62). Python có **48 tests duy nhất**
(9 contracts+11 fixture+7 guard+18 runner+3 media). Desktop62 và fixture11 được chạy
lại ở task/DB khác; không cộng lần chạy lặp thành test cases mới. Không skip suite.

## Curl vào API thật

Mỗi T02–T05 lưu nguyên command, HTTP headers/body, timestamp, status và exit code.
`curl --noproxy '*' --include --max-time 5` chỉ gọi origin của process riêng đang sống;
runner đối chiếu JSON và HTTP code, không coi riêng exit0 của curl là thành công.

| Request | Response đã quan sát |
|---|---|
| GET `/health/live` | 200 `{"status":"alive"}` |
| GET `/health/ready` | 503 `{"status":"notReady"}` |
| GET `/api/species` | 404 ErrorResponse, tiếng Việt, path và local timestamp |
| POST `/health/live` | 405 ErrorResponse; `Allow: GET` |

POST cuối chỉ kiểm tra method không hợp lệ trên API riêng không nối DB; không gọi
mutation/analytics/OAuth ở môi trường thật. Curl không chứng minh desktop HTTP stack
hay business API chưa port.

## Fixture và independent backup/restore

Restore nguồn vào DB trống trong một transaction; guard từ chối DB không trống và
các URI không thuộc numeric loopback/wildvn_fixture_*; xóa PG override kế thừa trước
psql. `pg_dump --format=custom` và `pg_restore --exit-on-error` vào DB thứ hai trống;
11/11 integration tests pass trên cả hai. Counts và SHA256 sorted row-content của tất cả
18 bảng trùng nhau; aggregate digest của bộ count/hash là
`49476da73cfc40b8fda4564865ad1e3119e5472ab94a074cdcb2bf52dbc8dc22`.
Đây là digest khác định dạng aggregate row JSON cũ, không phải dữ liệu thay đổi.

Schema textual diff **không rỗng**: PostgreSQL đổi array-wide varchar→text[] cast của
chat role CHECK sang casts từng phần tử. Chỉ chấp nhận đúng rewrite này; mọi schema text
khác phải bằng nhau sau loại nonce/trailing whitespace. Truth-table NULL/user/assistant/
system/empty/USER trả `t` cho equivalence. Diff thật lưu trong evidence.
Không có Flyway/EF history giả; đây là source-derived seed tổng hợp, không phải snapshot thật.

## Coverage gate và bằng chứng

Gộp executable production C# bằng source/line union, không lấy trung bình các assembly
tham chiếu bị đo zero ở suite khác. Branches lấy lower bound max covered count theo
class/line; hai partial reports không tự coi là phủ cả hai nhánh. Giữ root-only async
branches Coverlet không có line records, deduplicate theo class set; không bịa source
attribution. Mọi file/group đo được cần >=80% cả line và branch (branchless ghi0/0).

Kết quả tổng hợp: **251/252 executable lines =99.60%**, **173/178 branches lower bound
=97.19%**. Hai root-only groups có6/6 và4/4 branches covered. Raw Coverlet desktop root
bao gồm dependency client chưa chạy trong suite đó; vì vậy không dùng riêng root rate
của desktop làm coverage global. JSON tổng hợp ghi rõ phạm vi và group counts.

**Coverage toàn production theo T27: CHƯA KIỂM CHỨNG.** Chưa instrument/run5 file WPF:
App.xaml.cs, MainWindow.xaml.cs, NativeMediaPresenter.cs, IsolatedWebMediaPresenter.cs,
MediaPoCView.xaml.cs. XAML/device/E2E cũng chưa đo. Portable gate pass không thay gate này.

Logs bảo toàn ở [evidence/p0-rerun](../evidence/p0-rerun/); XML/TRX hiện có trong
`TestResults/` và có thể tái tạo bằng `handover/run-p0.sh`. Manifest SHA256 kiểm tra
bản sao log. Default runner exit2 do phase còn pending; `--serve` và cleanup được
kiểm chứng riêng với actual process. Windows PowerShell helper chưa chạy/parse tại đây.

NuGet audit API/desktop và cả3 test projects không báo known vulnerabilities trong feeds
hiện tại; pip-audit2.10.1 cho tooling coverage7.6.12 cũng không báo known vulnerabilities.
Python application/runner dùng stdlib; không audit package của máy người dùng hoặc npm
app cũ ngoài scope. [Audit output](../evidence/p0-rerun/audit.txt).
Release sequence points khác log Debug cũ; số lines lấy trực tiếp XML lượt Release mới,
không loại thêm production code để thay số. [Read-only review PASS](../evidence/p0-rerun/review.txt).
