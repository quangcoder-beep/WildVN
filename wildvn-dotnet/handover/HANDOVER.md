# Bàn giao P0 — T01 đến T05

**Cập nhật T07 — source implementation:** auth API/password/JWT/cookie/CSRF đã có
code, compiler PASS; tests/coverage/DB/HTTP interoperability và Windows chưa chạy.
Auth opt-in mặc định disabled, không restart process hoặc sửa secrets.
[REVIEW hiện hành](REVIEW.md), [auth implementation](../docs/auth-implementation.md).

**Chỉ đạo hiện hành — implementation trước, test/nghiệm thu sau:** tiếp tục trên
Ubuntu tại T06 EF Core/Npgsql mapping 18 tables/14 enums. Windows pending không còn
chặn triển khai. T06 chưa chạy tests/coverage/DB round-trip; các PASS WF03 bên dưới
là lịch sử. [REVIEW hiện hành](REVIEW.md), [mapping implementation](../docs/ef-mapping-review.md).

**Cập nhật WF03 — 2026-10-11:** đã hoàn thiện packaging/runner, cài review theo người
dùng, offline update/rollback/uninstall và helper Windows E2E, rồi chạy final batch.
.NET105 +Mono62 +Python100 tests và PowerShell runner67/installer71 checks PASS trên
Linux; package Mono chạy video/Pause/Stop thật. Windows execution/clean-machine,
production signing/updater, full coverage và baseline thật còn CHƯA KIỂM CHỨNG.
[REVIEW.md](REVIEW.md) là trạng thái hiện hành, có đúng artifact/hash/evidence cuối;
[TDD packaging](../docs/winforms-packaging.tdd.md) giữ lịch sử RED/GREEN và kết quả cuối.
WebView2 WinForms chưa triển khai. Bảng commit/metrics P0 dưới là lịch sử WPF.

Ngày 2026-10-09. Phạm vi dừng sau T05, chưa triển khai T06. P0 có artifact để review;
**chưa nghiệm thu phase** vì baseline thật, Windows và coverage toàn bộ production
còn **CHƯA KIỂM CHỨNG**. [TEST-REPORT.md](TEST-REPORT.md) chứa bằng chứng và giới hạn;
[KNOWN-ISSUES.md](KNOWN-ISSUES.md) liệt kê phần cần hoàn tất.

## Trạng thái Git khi tiếp tục

Đã đọc `docs/p0-execution.md`, status sạch, HEAD `a7391b0`. T02 không còn RED trong
working tree: RED lịch sử và GREEN fixture đã được commit. Không đảo các commit đó.
Repository .NET riêng, branch `migration/p0`; client/server là hai repository khác.

| Task | Commit gốc | Artifact |
|---|---|---|
| T01 | `4f96063` | Inventory 16 trang, 33 endpoints và source contracts |
| T02 | `78f0465` | Fixture nguồn, guard restore, migration ownership |
| T03 | `c208026` | .NET 10 health API và shared contracts |
| T04 | `c41e024` | WPF shell và HTTP client |
| T05 | `a7391b0` | Native/WebView2 media PoC và policy |

Lượt này thêm tests/runner/tài liệu và log, không thêm business feature. RED/GREEN của
runner ở `evidence/handover-{red,green}.txt`; mỗi commit task gốc vẫn được giữ nguyên.
`todo.md` được tick theo từng tiêu chí có bằng chứng; checkbox còn trống không bị bỏ qua.

## Một lệnh build, test, coverage và chạy API thật trên Linux

Chạy từ `wildvn-dotnet/` với SDK `10.0.401`, Python 3 + coverage.py `7.6.12`, Docker
có image `postgres:15-alpine`, PostgreSQL CLI (`psql`, `createdb`, `pg_dump`, `pg_restore`),
`curl`, `node` (chỉ chạy kiểm thử JavaScript offline). Script không tự cài dependencies.
Cần cả source client/server cạnh thư mục .NET để các source snapshot tests đối chiếu.

Lệnh đã chạy trên máy hiện tại:

```bash
DOTNET=/tmp/wildvn-dotnet-sdk/dotnet PYTHON=/tmp/wildvn-p0-tools/bin/python bash handover/run-p0.sh
```

Khi SDK/Python phù hợp đã ở PATH, dùng `bash handover/run-p0.sh`. SDK hệ thống ở máy
này là 8.0.131 nên cần chọn binary SDK10; đường dẫn `/tmp/` không bền qua reboot.
Python tooling được cài trong venv tạm, không sửa Python hoặc PATH hệ thống:

```bash
python3 -m venv /tmp/wildvn-p0-tools
/tmp/wildvn-p0-tools/bin/python -m pip install coverage==7.6.12
```

Runner lần lượt chạy T01, T02, T03, T04, T05; build Release, test/coverage, tạo PostgreSQL
trống riêng trên numeric loopback, restore và backup round-trip, rồi curl Kestrel thật.
Kestrel bind `127.0.0.1` cổng động và chạy từ output directory mới; không lấy API/DB URL
của dự án. Output thực nằm trong `TestResults/P0-*` (ignored), không ghi đè thư mục có sẵn.
Dùng `--output TestResults/<ten-moi>` để đặt tên. Runner dừng ngay khi một command/gate
đo được thất bại; cleanup chỉ xử lý process/container do chính lần chạy tạo thành công.

| Exit code | Ý nghĩa |
|---|---|
| `1` | Kiểm chứng đo được thất bại; xem log task và cleanup |
| `2` | Các portable checks pass, toàn phase P0 vẫn CHƯA KIỂM CHỨNG |
| `130` | Dừng `--serve` bằng Ctrl-C, cleanup tài nguyên riêng |

Muốn giữ API chạy để xem sau khi checks xong, thêm `--serve`; URL được in/lưu trong
`summary.txt`. Ctrl-C kết thúc API và container fixture riêng. Đây là health skeleton:
`/health/live` 200, `/health/ready` 503, `/api/species` 404. Chưa có auth/catalog/chat API.

## Tiếp nhận trên Windows

[CHECKLIST-WINDOWS.md](CHECKLIST-WINDOWS.md) chứa lệnh và ma trận cần chạy thật.
Linux runner không chứng minh Windows UI/E2E, codec, DPI hay installer. WF03 packaging
tạo artifact review: Mono ZIP cần Mono/X11/native LibVLC3 distro; Windows ZIP là
`net10.0-windows/win-x64` self-contained với VLC3.0.24 core và 321 plugin DLL, không
gồm Lua/JAR. Đường dẫn final 2026-10-11:
`TestResults/winforms-wf03/packages-complete-20261011/mono-net472.zip` và
`TestResults/winforms-wf03/packages-complete-20261011/win-x64.zip`.
Mono: 22 files, 9.375.061 bytes, SHA256
`2dbbd94a91f76f4f4568d3d2362be6884e1c828ed782d68cc97e83ac109d6d44`.
Windows: 607 files, 107.683.448 bytes, SHA256
`b5a66135e862e67937ae57de90834922b7c4bd69bb036c7ab395ee7807961f0a`.
[Cài/update/rollback/uninstall review](../docs/windows-review-install.md) và
[Windows E2E](../docs/windows-review-e2e.md) đã có helper trong Windows ZIP, nhưng
chưa chạy trên Windows thật. Signed production installer/updater chưa triển khai.
Native là lựa chọn tạm; WebView2 cần runtime thực tế ngoài SDK NuGet.
Hạ tầng thật và secrets chưa được nối vào API skeleton. Không chạy design DDL,
không `EnsureCreated`, không thay Flyway history, không đọc/chỉnh OAuth credentials.

Dừng tại P0 để người dùng xác nhận trạng thái và cung cấp môi trường/backup được phép
cho phần còn thiếu; chưa có quyền thực hiện T06 hoặc phase tiếp theo.
