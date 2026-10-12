# Chuyển client WildVN từ WPF sang WinForms

**T07 source checkpoint — 2026-10-11:** auth API đã có implementation, compile và
source review; test/DB/Java interoperability chưa chạy. Backend auth opt-in,
client ZIP/process WF03 chưa chứa source mới. Bước tiếp theo T08 auth UI/session
WinForms; Windows acceptance không chặn triển khai trên Ubuntu.
[Auth report](auth-implementation.md), [REVIEW](../handover/REVIEW.md).

Ngày: 2026-10-09. Người dùng yêu cầu lập plan rồi bắt đầu triển khai.
Đối chiếu [REVIEW.md](../handover/REVIEW.md), [P0](p0-execution.md) và source hiện tại.
Thực hiện tuần tự, dừng cuối mỗi phase để review; một commit cho mỗi task,
giữ log RED/GREEN thay cho việc tạo nhiều checkpoint commit cho cùng task.

## Tiếp tục implementation trên Ubuntu — chỉ đạo hiện hành

Người dùng đã chọn làm code trước và test/nghiệm thu sau. Các gate Windows trong
plan vẫn tồn tại để xác minh ở giai đoạn sau, không còn là điểm dừng triển khai.
WF01–WF03 có checkpoint `d8c7e32`; tiếp tục plan tổng tại T06 EF Core/Npgsql mapping
schema hiện hữu. [Mapping implementation](ef-mapping-review.md) ghi phần đã làm và
backlog test, không đánh dấu toàn plan đã nghiệm thu. Các đoạn stop/review/test-first
ở dưới là quy trình/lịch sử trước steering này.

## Trạng thái hoàn thành plan — 2026-10-11

**Chưa hoàn tất toàn plan.** Ba phase đã có implementation và bằng chứng cục bộ;
nghiệm thu Windows chưa thực hiện. Người dùng đã yêu cầu tiếp tục phần còn thiếu,
không phải bỏ các gate hoặc gọi kết quả Mono là Windows PASS.

| Phase | Đã hoàn thiện | Tiêu chí còn lại |
|---|---|---|
| WF01 shell | WinForms hai target, transport/startup/navigation/cancel và Mono UI | Windows dispatcher/UIA, keyboard/DPI/accessibility và full source coverage |
| WF02 native media | Local allowlist/staging, PictureBox/LibVLC, image/video/audio Mono | Windows Hwnd/device/codec/performance/DPI; WebView2 WinForms chưa triển khai |
| WF03 đóng gói | ZIP/hash/provenance, owned runner, offline per-user install/update/rollback/uninstall và UIA helper; local tests PASS | Chạy public install/lifecycle/UIA trên Windows thật, máy sạch, license/source-offer/media rights và signing |

Lượt tiếp tục hiện tại chốt checkpoint source WF03 thành một commit cục bộ theo
quy ước một commit/task. Các ZIP đã build vẫn giữ base `dab2ffa` và dirty-source hashes:
35 inputs khớp source; không đổi ZIP/hash chỉ để đổi HEAD trong provenance.
Không push hoặc triển khai. Không thêm helper khác chỉ để thay bằng chứng Windows.

Host hiện tại Ubuntu/Linux x64; không có Wine/QEMU/VirtualBox/virsh hoặc Windows VM
đang chạy qua các công cụ kiểm tra được. Cần Windows x64 với desktop tương tác để
chạy [checklist](../handover/CHECKLIST-WINDOWS.md) và [E2E](windows-review-e2e.md).
Ký production cần chứng thư được cung cấp riêng; source-offer/media rights cần
bằng chứng phát hành. Chưa có các đầu vào này nên giữ các tiêu chí chưa nghiệm thu.

## Mục tiêu và thay đổi quyết định

Mở được client hiện hữu trên Ubuntu/GNOME/X11 với Mono 6.8, giống ứng dụng
WinForms `net472` đã chạy thật của người dùng. Client đổi sang WinForms với
hai target: `net472` để review bằng Mono; `net10.0-windows` cho .NET hiện đại
trên Windows. Chỉ đổi UseWPF thành UseWindowsForms ở net10 không đáp ứng mục tiêu
Mono. Backend vẫn net10; không hạ target backend hoặc viết lại business APIs.

Đây là bổ sung/thay thế quyết định WPF của plan desktop gốc; target net472 là
đường chạy tương thích được thêm theo môi trường người dùng, không tự tuyên bố
Mono là Windows hoặc đã nghiệm thu deployment Windows. Bản Windows hiện đại
còn được build; nghiệm thu chạy thật trên Windows vẫn cần máy Windows.

ApiClient/Contracts thêm netstandard2.0 bên cạnh net10 để chia sẻ transport/DTO.
Giữ record/state immutable, thêm compiler shim IsExternalInit, sửa các API guard
không có ở netstandard/net472 nhưng giữ hành vi. System.Text.Json được pin
10.0.12 cho target portable và phải copy dependency khi build net472.

Nguồn: [.NET Standard cho chia sẻ .NET Framework/.NET hiện đại](https://learn.microsoft.com/en-us/dotnet/standard/net-standard),
[Mono WinForms/X11](https://www.mono-project.com/docs/gui/winforms/),
[Mono chưa triển khai WPF](https://www.mono-project.com/docs/gui/wpf/).

## Phạm vi và ràng buộc

- Giữ năm mục Catalog/Ecosystems/Favorites/Academy/Chat và thông báo nghiệp vụ chưa port.
- Giữ kiểm tra GET health chỉ khi bấm nút, async/cancel, lỗi tiếng Việt và cleanup.
- Không tạo catalog/auth/media response giả, không chuyển T06 hoặc các tính năng mới.
- Không đọc/sửa OAuth credentials, không dùng DB/MinIO thật hoặc project .env/config.
- Curl chỉ dùng Kestrel review loopback do agent đã tạo; test transport dùng fake handler.
- Không analytics, Kafka, reindex hoặc provider AI thật; không chạy design DDL.
- Không xóa/sửa assertion để xanh, không push/force/đổi nhánh chính.
- Media đang có là PoC WPF, không phải business feature hoàn chỉnh. Trong WF01 nó
  được giữ dưới dạng source/history và tests nhưng không compile vào WinForms runtime;
  UI ghi rõ media đang chờ chuyển. Không coi shell WF01 là full T05 parity.

## Phase WF01 — client shell chạy thật (task WF01)

RED: thêm bộ NUnitLite net472 tham chiếu client, kiểm tra startup/config/navigation,
async/cancel/disposal và DTO JSON parity. Test build phải thất bại vì client hiện
chưa cung cấp target net472/MainForm/Startup tương ứng. Không dùng lỗi syntax/setup
hoặc thiếu package làm bằng chứng RED. Giữ toàn bộ tests P0 hiện tại.

Các slice tối đa năm file, thực hiện lần lượt:

1. WF01.a: ApiClient.csproj, ApiClient.cs, Contracts.csproj, Directory.Build.props,
   build/IsExternalInit.cs — multi-target và compatibility, không đổi contract JSON.
2. WF01.b: ShellViewModel.cs, Command.cs, DesktopStartup.cs, MainForm.cs, Program.cs —
   giữ model, thay binding XAML bằng controls/event WinForms, cleanup khi đóng form.
3. WF01.c: Desktop.csproj, tests/WinForms.Tests csproj, StartupTests.cs,
   MainFormTests.cs, TestProgram.cs — build hai target, chạy tests trên Mono/X11.
4. WF01.d: build/run-winforms.sh, handover/REVIEW.md, docs/winforms-migration.tdd.md,
   handover/HANDOVER.md, docs/p0-execution.md — một lệnh mở client, stop, evidence.
5. WF01.e: evidence/winforms-wf01/ — raw logs, coverage XML/summary và manifest;
   không commit private session state, credentials, bin/obj hoặc runtime config.

GREEN: build Release API/client hai target; chạy ba test projects P0 và NUnitLite
net472 thực sự qua Mono; coverage line/branch >=80% trong phạm vi instrument được.
Coverage adapter WinForms phải được đo bằng Mono test execution nếu công cụ hỗ trợ;
nếu không hỗ trợ, ghi CHƯA KIỂM CHỨNG và không tuyên bố full gate đạt.

UI evidence: mở exe bằng Mono trong phiên DISPLAY=:1, thấy cửa sổ WildVN mapped;
test controls qua message loop, không chỉ kiểm tra process alive. Health button gọi
GET loopback thật; curl ghi status/body health live/ready và missing business routes.
Để app mở cho người dùng review, ghi PID/lệnh dừng riêng; không dừng API/containers.

Exit phase: công bố pass/fail, phạm vi coverage, media/Windows chưa kiểm chứng,
commit WF01 và dừng chờ review. Không tự làm WF02.

Trạng thái WF01, 2026-10-10: build hai target0 warning/error; C#132/132 và Python48/48
PASS; `.exe` mapped, năm mục/health thật và ba cấu hình lỗi đã kiểm chứng.
Union line99,43%/branch96,70%, từng file đo được >=80%; full source vẫn CHƯA KIỂM CHỨNG
với năm adapter/source WPF lịch sử. Xem [TDD report](winforms-migration.tdd.md).
Thêm harness `build/RunWithCoverageFlush.cs` vì tracker Mono lỗi khi ProcessExit;
chỉ flush counters thật trước teardown. Các script X11/reproducer ở evidence,
không mở hoặc thao tác cửa sổ khác. Chờ người dùng review trước WF02.

## Phase WF02 — chuyển native media PoC (đã kiểm chứng trên Mono, chờ review)

Test trước local-file allowlist/no URL/UNC/link, lifecycle và controls media.
Thay WPF BitmapImage/MediaElement bằng adapters WinForms phù hợp từng runtime;
PictureBox có thể dùng cho ảnh; audio/video renderer phải được chọn bằng PoC thật,
không hứa codec hoặc nhúng player khi chưa chứng minh. WebView2 WinForms là renderer
Windows cần kiểm tra runtime; không tuyên bố hỗ trợ Mono/Linux.

Giữ mẫu media repository và security policy/CSP. Nếu Mono chưa có renderer video,
ghi unsupported rõ và kiểm thử fail-safe, không mock playback thành PASS.
Đo image/video/audio, mute/reduced-motion, cancel/dispose, fullscreen/DPI trên máy phù hợp.
Chỉ dọn source WPF cũ khi replacement và regression tests có bằng chứng.

Các slice tuần tự (tối đa năm file/slice):
1. WF02.a: thêm tests Mono cho policy/staging/form/player, ghi RED thiếu adapter.
2. WF02.b: MediaPolicy.cs, MediaSamples.cs — tương thích net472, chỉ ba biến môi trường
   media hiện hữu; staging riêng, kiểm tra signature/128MiB/cancel/link/cleanup.
3. WF02.c: LocalMediaPlayer.cs, MediaPoCForm.cs, LibVLCSharp.dll.config, Desktop.csproj —
   PictureBox và LibVLCSharp3.10.1; Mono XWindow, Windows Hwnd. Native LibVLC3.0.20 đã
   giải mã mẫu repo trên Mono trong spike; Windows runtime vẫn cần nghiệm thu WF03.
4. WF02.d: MainForm.cs, DesktopStartup.cs, run-winforms.sh — chỉ bật media khi người
   dùng chọn mẫu qua env; giữ startup không tự phát hoặc gọi API. Không sửa tests P0.
5. WF02.e: evidence/winforms-wf02/, báo cáo TDD và handover — build/test/coverage/curl,
   ảnh UI thật và log metrics; một commit WF02 rồi dừng. Không tự thực hiện WF03.

Audio smoke dùng WAV trích từ luồng AAC trong video repo bằng ffmpeg, ghi rõ nguồn
và hash; không coi đó là audio fixture nghiệp vụ hoặc kiểm chứng nghe trên loa.
Chưa chuyển WebView2: nút/status ghi CHƯA TRIỂN KHAI cho renderer đó; HTML/CSP và
tests lịch sử được giữ. Fullscreen/DPI Windows, codec ngoài mẫu chạy thật vẫn
CHƯA KIỂM CHỨNG. Không coi native Mono là parity toàn bộ renderer T05.

Kết quả WF02: Release hai target/API sạch, C#167/167 +Python48/48 PASS; ảnh và
MP4/WebM/WAV decode thật, `.exe` phát/tạm dừng đã chụp UI. Coverage union hiện hành
98,30% line/92,03% branch, từng file đo được >=80%; full source CHƯA KIỂM CHỨNG.
[TDD WF02](winforms-media.tdd.md) giữ RED/GREEN, lỗi ban đầu và gate FAIL trước
parser comparisons. Một commit WF02, dừng chờ review; không thực hiện WF03.

## Phase WF03 — implementation cục bộ xong, Windows chưa nghiệm thu

WF03 đã hoàn thiện ZIP Mono `net472`, Windows `net10.0-windows/win-x64`
self-contained, manifest/hash/provenance và exact-owned runner. Đã bổ sung workflow
PowerShell cài theo người dùng, offline update/rollback/uninstall và Windows UIA E2E.
Theo yêu cầu mới, hoàn thiện các step mới trước rồi mới chạy final batch; không bịa
RED cho installer/E2E. RED/GREEN packaging/runner trước đó giữ trong
[winforms-packaging.tdd.md](winforms-packaging.tdd.md).

Artifact cuối ở `TestResults/winforms-wf03/packages-complete-20261011/`:
Mono22 payload files,9.375.061 bytes, SHA256
`2dbbd94a91f76f4f4568d3d2362be6884e1c828ed782d68cc97e83ac109d6d44`;
Windows607 payload files,107.683.448 bytes, SHA256
`b5a66135e862e67937ae57de90834922b7c4bd69bb036c7ab395ee7807961f0a`.
Manifest ghi base HEAD `dab2ffa` và35 source hashes khớp checkout. Windows bundle có
VLC3.0.24 core/321 plugins,323 DLL PE/AMD64; Mono cần native distro LibVLC.

Các slice mới:
1. Install-WindowsReview.ps1: ZIP/hash/inventory guards, version/receipt và active
   pointer nguyên tử; lock/root ownership, staging cùng volume, recovery refusal.
2. Start-InstalledReview.ps1: xác minh receipt/payload rồi launch version active.
3. Verify-WindowsReview.py: UIA theo PID/executable/session, label điều hướng,
   native decode video/WAV, mute/Pause/Stop và graceful close; không fake PASS trên Linux.
4. Tests/NOTICE/runbooks/handover: unit/fault/parser checks và các giới hạn ký/
   source-offer/media rights/device/Windows acceptance.

Final batch: .NET105 +Mono62 +Python100 PASS, runner67/installer71 PowerShell checks
PASS trên Linux. Luồng ZIP thật filesystem install/update/rollback/uninstall PASS
trong root tạm Linux (208,23s); không thay Windows acceptance. Hai Python tools đạt combined92%; package line91,28%/branch89,29%,
runner94,35%/89,29%. Đây không phải full source/native/PowerShell/Windows UIA coverage.
Actual extracted Mono package start/status/stop, five-section UI, health,
video/Pause/Stop và graceful close PASS; video400ms/55frames/143 audio blocks,
muted=True khi phát. Phiên cuối PID68248 đã đóng, không tuyên bố đang live.
API health skeleton live200/ready503/business404; fixture riêng đã cleanup.

[Install/recovery](windows-review-install.md), [Windows E2E](windows-review-e2e.md),
[REVIEW hiện hành và evidence](../handover/REVIEW.md). Workflow cài review đã có code;
production signed installer/updater chưa triển khai. Windows desktop, DPI/keyboard/
accessibility/device/codec/performance, clean-machine install/update/rollback/uninstall,
signing/license và full P0 acceptance vẫn CHƯA KIỂM CHỨNG. Tiếp theo nghiệm thu đúng
ZIP trên Windows theo checklist; không mở T06 hoặc gọi DB/API thật.

## Tiêu chí review của WF01

| Bảo đảm | Kiểm chứng |
|---|---|
| Client không cần PresentationFramework/PresentationCore | Assembly references + Mono startup |
| Startup không tự gọi API | Fake handler count trước click |
| Năm mục và thông báo chưa khả dụng | WinForms controls tests |
| Check/cancel/close không block UI hoặc cập nhật sau dispose | Mono message-loop tests + portable tests |
| HTTPS mặc định, HTTP chỉ loopback opt-in | Startup/transport tests |
| DTO parity giữ nguyên | P0 contract tests + Mono serialization |
| Không mất test P0 | Chạy toàn bộ tests hiện hữu, không skip |
| Coverage trung thực | Coverlet reports, missing files, line/branch >=80% scoped |
| Chạy thật và giữ app để review | X11 mapped window, API curl, PID/log/stop command |
