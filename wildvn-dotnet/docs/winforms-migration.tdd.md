# WF01 — bằng chứng chạy thật

Ngày local: 2026-10-09 đến 2026-10-10 (UTC trong NUnit logs có thể còn ngày09).
Scope: [plan](winforms-migration.plan.md), shell WinForms + tương thích shared libraries;
không triển khai business API hoặc media WinForms. Một commit cho task WF01.

## RED trước triển khai

[red.txt](../evidence/winforms-wf01/red.txt): bộ NUnitLite net472 tham chiếu desktop
thất bại NU1201 vì desktop chỉ cung cấp net10.0-windows. Target net472/MainForm
là yêu cầu migration còn thiếu, không phải package test không cài được.
[mono-tests-first.txt](../evidence/winforms-wf01/mono-tests-first.txt): khi đã có form,
25 tests chạy thật, 23 PASS /2 FAIL. Health hoàn tất nhưng nút check vẫn bị khóa;
test retry không cập nhật UI. Fix tối thiểu: subscribe hai CanExecuteChanged của shell.
Giữ assertions, không xóa/skip tests. Log tương thích compile lỗi429 enum ở
[build-first.txt](../evidence/winforms-wf01/build-first.txt) cũng được giữ.

## Thay đổi tối thiểu và GREEN

Contracts/ApiClient thêm netstandard2.0; compiler marker IsExternalInit và các API
guard tương thích thay overload hiện đại. JSON contracts không đổi. State vẫn là record
immutable; command chuyển binding WPF sang events WinForms. MainForm giữ năm mục,
manual async health/cancel, thông báo tiếng Việt và cleanup transport/fonts.
DesktopStartup chỉ đọc hai env API rõ ràng, không đọc appsettings/.env/OAuth.

Client build net472/net10.0-windows; backend net10 giữ nguyên.
Source WPF/media cùng tests P0 được giữ nhưng adapter cũ không compile vào active client.
WebView2 package bỏ khỏi runtime WF01 vì chưa dùng renderer; media button ghi chờ chuyển.
Không tick acceptance media/Windows/baseline thật.

| Command/suite | Output thật |
|---|---|
| `dotnet build -c Release` API và client hai target | 0 warnings /0 errors, exit0 |
| Api.Tests | 10/10 PASS |
| ApiClient.Tests | 33/33 PASS |
| Desktop.Tests portable (gồm media policy cũ) | 62/62 PASS |
| NUnitLite net472 qua Mono/X11 | 27/27 PASS, không skip |
| Python toàn bộ với fixture cục bộ hiện có | 48/48 PASS, exit0 |
| NuGet vulnerable audit sáu projects, transitive | Không có package bị báo vulnerable; exit0 |

Logs: [build-final](../evidence/winforms-wf01/build-final.txt),
[API tests](../evidence/winforms-wf01/WildVN.Api.Tests.txt),
[client tests](../evidence/winforms-wf01/WildVN.ApiClient.Tests.txt),
[desktop tests](../evidence/winforms-wf01/WildVN.Desktop.Tests.txt),
[Mono final](../evidence/winforms-wf01/mono-final.txt),
[Python final](../evidence/winforms-wf01/python-final.txt),
[audit](../evidence/winforms-wf01/audit.txt).
Python lượt đầu thiếu `WILDVN_FIXTURE_CONNECTION` và FAILED(errors=1):
[log thật](../evidence/winforms-wf01/python-without-fixture-failure.txt).
Lượt GREEN dùng duy nhất container fixture `wildvn-p0-f56efb2cc671` trên loopback,
credential ngẫu nhiên của container test không được in hoặc commit. Không đổi test/seed.

## Coverage >=80%, phạm vi rõ ràng

Union theo source/line của năm XML: API, client, desktop portable, Mono và exe startup.
[coverage-summary.json](../evidence/winforms-wf01/coverage-summary.json):
351/353 executable lines = **99,43%**, branches205/212 = **96,70%**;
mọi file đo được và root-only branch group đều >=80%, measured_gate=PASS.
MainForm line100% /branch87,5%; DesktopStartup line88,89% /branch100%.
Không suy luận branch union từ hai partial hit; thuật toán giữ lower bound theo max counts.
Không suy luận mỗi TFM riêng đều đạt80% từ union giữa .NET10 và Mono.

Full source gate vẫn **CHƯA KIỂM CHỨNG**: App.xaml.cs, MainWindow.xaml.cs và ba
adapter/view media WPF lịch sử bị loại khỏi active compile. MediaPolicy đo bằng
portable tests nhưng playback/device/UI không được suy ra từ coverage.
`build/IsExternalInit.cs` chỉ là marker không có executable method.
Scripts/harness không nằm trong mẫu số production C# này.

Coverlet6.0.4 trên Mono6.8 ban đầu báo0% dù26 tests PASS. Debug log:
[coverage-tracker-failure](../evidence/winforms-wf01/coverage-tracker-failure.txt),
[tracker-exception](../evidence/winforms-wf01/tracker-exception.txt) có
NullReferenceException trong String.Format của UnloadModule lúc ProcessExit.
[RunWithCoverageFlush.cs](../build/RunWithCoverageFlush.cs) gọi entry point nguyên bản,
flush tracker có thật trước runtime teardown, rồi tắt flush lần hai. Không sửa counters,
production IL/source hoặc assertions. Coverlet vẫn tự instrument/restore assembly.
Số hit không được tự tạo và exit0 của Coverlet không được coi là threshold PASS.

Để tái chạy Mono coverage sau khi build, trong phiên desktop X11:

```bash
mkdir -p TestResults/winforms-wf01
mcs -out:TestResults/winforms-wf01/RunWithCoverageFlush.exe build/RunWithCoverageFlush.cs
# Công cụ đã dùng: coverlet.console6.0.4 tại TestResults/winforms-tools/coverlet.
# Nếu cần cài lại, dùng SDK đã pin; đây là package tool test, không đổi app source.
DOTNET_ROOT=/tmp/wildvn-dotnet-sdk DOTNET_ROLL_FORWARD=LatestMajor /tmp/wildvn-dotnet-sdk/dotnet tool install coverlet.console --version 6.0.4 --tool-path TestResults/winforms-tools
DOTNET_ROOT=/tmp/wildvn-dotnet-sdk DOTNET_ROLL_FORWARD=LatestMajor TestResults/winforms-tools/coverlet tests/WildVN.WinForms.Tests/bin/Release/net472/WildVN.WinForms.Tests.exe --target mono --targetargs "TestResults/winforms-wf01/RunWithCoverageFlush.exe tests/WildVN.WinForms.Tests/bin/Release/net472/WildVN.WinForms.Tests.exe --workers=0 --noresult" --format cobertura --output TestResults/winforms-wf01/mono-final.xml --include '[WildVN.*]*'
```

Không build đồng thời khi Coverlet đang instrument. Bộ test .NET10 chạy tuần tự với
`--collect:'XPlat Code Coverage'`; portable Desktop thêm IncludeTestAssembly=true,
ExcludeByFile=**/*Tests.cs để đo linked production sources, không tính tests vào tỷ lệ.
Lệnh chính xác cùng paths reports có trong logs tương ứng.

Reproducer startup thực:

```bash
DOTNET_ROOT=/tmp/wildvn-dotnet-sdk DOTNET_ROLL_FORWARD=LatestMajor TestResults/winforms-tools/coverlet src/WildVN.Desktop/bin/Release/net472/WildVN.Desktop.exe --target python3 --targetargs evidence/winforms-wf01/exe_coverage_smoke.py --format cobertura --output TestResults/winforms-wf01/exe-coverage --include '[WildVN.*]*' --include-test-assembly
python3 - <<'PY'
from pathlib import Path
import runpy
root = Path.cwd()
reports = list((root / 'evidence/winforms-wf01').glob('*-coverage.xml'))
report = runpy.run_path('handover/coverage_report.py')['summarize'](reports, root)
print(report)
assert report['measured_gate'] == 'PASS'
PY
```

Lệnh summarize trên kiểm tra các XML evidence đã lưu. Muốn đo lần mới, thay list bằng
các reports mới từ lần chạy đó; không trộn báo cáo lịch sử để tuyên bố coverage code mới.
Startup reproducer cần API review đang chạy5080, libX11, xwininfo, Python/Pillow,
phiên GNOME cùng UID và mcs wrapper đã compile. Nó chỉ mở/thao tác/đóng cửa sổ nó tạo.
Việc instrument input `.exe` cần `--include-test-assembly`; tên option không biến
production executable thành fake test UI. Không dùng kết quả partial của riêng startup
(branch53,24%) làm full gate; report này được union với tests.

## Smoke thực, log lỗi được giữ

[exe-coverage-smoke.txt](../evidence/winforms-wf01/exe-coverage-smoke.txt):
valid config mở mapped window, điều hướng5/5, nút health gọi real GET, đóng exit0.
Bad URI/remote HTTP/loopback thiếu opt-in hiển thị lỗi cấu hình, đóng exit1 đúng dự kiến.
[Ảnh shell](../evidence/winforms-wf01/exe-valid.png),
[ảnh lỗi URI](../evidence/winforms-wf01/exe-bad-uri.png) đã xem thật.
Thông điệp lỗi an toàn không in địa chỉ/credential. Text nút OK/keyboard dialog trên Mono
chưa kiểm chứng tự động; E2E đóng qua WM_DELETE_WINDOW.

Ba lỗi harness được giữ: cửa sổ xuất hiện trước mapped state, messagebox text được
paint thay vì exposed qua xwininfo, GNOME frame biến mất giữa root-tree traversal.
[Lượt1](../evidence/winforms-wf01/exe-smoke-first-failure.txt),
[lượt2](../evidence/winforms-wf01/exe-smoke-second-failure.txt),
[lượt3](../evidence/winforms-wf01/exe-smoke-third-failure.txt).
Fix synchronization/quan sát của harness, không sửa tests sản phẩm hoặc giả trạng thái.
Supervisor cuối của lệnh mở app dùng regex escape sai nên báo không thấy GUI:
[log](../evidence/winforms-wf01/launch-supervisor-failure.txt).
Kiểm tra riêng `/proc` +xwininfo +click đã thấy PID222456 chạy thật:
[lần đầu](../evidence/winforms-wf01/client-first-review.txt).
Process đó không còn ở lần kiểm tra cuối, log app không có stack trace; nguyên nhân
đóng chưa xác minh. Một lượt nohup sau đó cũng không còn process ở lần chốt Git,
log không có stack trace. Đã mở lại bằng supervisor cục bộ detach khỏi launcher,
ghi exit code khi app đóng, không tự restart. Kiểm tra độc lập sau khi launcher
thoát: PID228969 vẫn mapped, real health UI PASS ở
[client-live.txt](../evidence/winforms-wf01/client-live.txt). Không sửa production source.

[curl.txt](../evidence/winforms-wf01/curl.txt): functional API PASS1/FAIL9;
live200, ready503,8 routes404 **CHƯA TRIỂN KHAI**. Không mock endpoint/auth success.
[fixture-counts](../evidence/winforms-wf01/fixture-counts.txt): species4/ecosystems2/users3.
Không gọi production, không đọc OAuth, không design DDL/analytics/consumer/AI provider.

## Rà soát và tự đánh giá

Một agent review chỉ đọc (tuần tự, không thêm worker) không thấy HIGH/CRITICAL.
Nhắc đúng giới hạn union coverage; kết quả Mono standalone không được đổi thành80%.
Các font thuộc form được cleanup; bỏ queue callback dư thừa sau Close.
Windows runtime/codec/DPI/keyboard/accessibility, media WinForms, clean-machine installer
và full historical source coverage: **CHƯA KIỂM CHỨNG**, cần WF02/WF03 sau review.

Tự đánh giá theo skill agent-self-evaluation, tổng **4,0/5**; không thay quality gate:

| Trục | Điểm | Bằng chứng / cải thiện |
|---|---|---|
| Accuracy | 4 | XML/curl/X11 thật; Windows chưa chạy nên giữ nhãn pending |
| Completeness | 4 | WF01 đủ shell/test/runner; migration toàn bộ chờ media/Windows theo phase |
| Clarity | 4 | REVIEW ưu tiên trạng thái mới; phần lịch sử dài còn cần đọc theo ngày |
| Actionability | 4 | Một lệnh mở và PID dừng; `/tmp` tooling cần dựng lại sau reboot |
| Conciseness | 4 | Final ngắn, raw logs riêng; báo cáo TDD dài để lưu lỗi/reproducer |

Không có trục <=2. Cải thiện ưu tiên: nghiệm thu media/Windows sau xác nhận;
đóng gói tooling bền qua reboot tại WF03. Người dùng có thể tự review cửa sổ hiện tại,
nhưng chưa thể nghiệm thu parity media/Windows; tự đánh giá phản ánh giới hạn này.
