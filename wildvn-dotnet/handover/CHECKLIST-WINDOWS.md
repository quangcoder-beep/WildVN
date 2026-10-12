# Checklist chạy thật trên Windows — CHƯA KIỂM CHỨNG

Cập nhật WF03 implementation 2026-10-11: client active đã chuyển WinForms, target
`net10.0-windows` và `net472`. Mono/X11 execution WF02/WF03 đã có bằng chứng trong
[REVIEW.md](REVIEW.md), chưa thay Windows E2E. WF03 packaging có artifact review, nhưng
đã có helper install/update/rollback/uninstall và UIA E2E; chưa có Windows runtime acceptance. Native media đã chạy trên Mono bằng PictureBox/LibVLC;
WebView2 WinForms chưa triển khai. Các yêu cầu WPF lịch sử dưới cần đối chiếu renderer
mới; helper WPF cũ không chứng minh WinForms.

- [ ] Chạy `src/WildVN.Desktop/bin/Release/net10.0-windows/WildVN.Desktop.exe` trên Windows có .NET10 Windows Desktop Runtime phù hợp.
- [ ] Chạy `src/WildVN.Desktop/bin/Release/net472/WildVN.Desktop.exe` trên Windows có .NET Framework4.7.2 hoặc runtime4.x tương thích đã kiểm chứng.
- [ ] Chuyển helpers/fixtures Mono của bộ tests sang Windows trước khi chạy test exe trên Windows; giữ output thật.
- [ ] Kiểm chứng hai runtime: manual health, năm mục, cancel, đóng trong request, lỗi cấu hình, keyboard/focus/DPI/accessibility; không tự gọi API thật.
- [ ] Nếu dùng artifact WF03, đối chiếu SHA256 với evidence cuối cho `TestResults/winforms-wf03/packages-complete-20261011/mono-net472.zip` (`2dbbd94a91f76f4f4568d3d2362be6884e1c828ed782d68cc97e83ac109d6d44`) hoặc `TestResults/winforms-wf03/packages-complete-20261011/win-x64.zip` (`b5a66135e862e67937ae57de90834922b7c4bd69bb036c7ab395ee7807961f0a`) trước khi copy/chạy.

Mọi ô dưới đây chưa chạy trên Windows tại lượt bàn giao. Lệnh là hướng dẫn tái hiện;
không coi Linux cross-build, mock HTTP hay DOM-stub là PASS cho UI/device.

## WF03 sau WF02 — tất cả CHƯA KIỂM CHỨNG trên Windows

- [ ] Xác minh Windows ZIP `net10.0-windows/win-x64` self-contained có VLC3.0.24 core và 321 plugin DLL đúng manifest; Lua/JAR/development files không nằm trong artifact review.
- [ ] Chạy `Review-Windows.ps1 -Action Check` trên extracted `win-x64`; Linux PowerShell check đã PASS nhưng không chạy UI Windows.
- [ ] Xác minh Mono ZIP không bundle native Linux LibVLC; host Mono cần native LibVLC3/plugins từ distro.
- [ ] Chạy installer/launcher từ checkout hoặc ZIP đã xác minh: [runbook install](../docs/windows-review-install.md); root `%LOCALAPPDATA%\WildVN\Review`, hash/receipt/pointer và layout đúng.
- [ ] Hai ZIP/version: install → launch/close → offline Update → Rollback → Uninstall; giữ user data, từ chối foreign file/link/hash mismatch/session sai, kiểm tra interruption/recovery trên Windows thật.
- [ ] Chạy bundled `Verify-WindowsReview.py` với pywinauto/Pillow và output mới ngoài package: [runbook E2E](../docs/windows-review-e2e.md); lưu result/log/ảnh, không dùng Linux boundary tests để tick.
- [ ] Audit dependency/licensing và chạy máy sạch; manifest/hash không thay release license audit.
- [ ] Port test helpers ln/ffmpeg/sibling samples/WILDVN_TEST_REPO; suite Mono hiện tại không là Windows evidence.
- [ ] Xác minh Hwnd embed, ảnh/video/audio, mute thiết bị, reduced motion, close/cancel/cleanup, fullscreen/DPI/keyboard/accessibility.
- [ ] Quyết định chuyển WebView2 WinForms; hiện CHƯA TRIỂN KHAI, HTML/CSP/source WPF lịch sử vẫn giữ.
- [ ] Đo GPU/memory/CPU và native codecs; C#98,30%/92,03% không thay device/renderer acceptance.

## Máy thử và build

- [ ] Ghi OS edition/build/lifecycle, CPU/GPU/RAM/driver, SDK/runtime và WebView Runtime version thực tế. Win-x64 mặc định; ARM64 là slice bổ sung chưa được yêu cầu.
- [ ] Windows11 còn hỗ trợ; Windows10 chỉ vào matrix khi edition/lifecycle và .NET10/WPF/WebView Runtime phù hợp theo support matrix plan. Không đánh dấu mọi Windows10 là được hỗ trợ.
- [ ] Có desktop session tương tác; máy sạch kiểm tra Windows package self-contained thật sự chạy không cần SDK. Helper cài review đã triển khai; Windows acceptance và production signing/updater chưa hoàn tất.
- [ ] Copy checkout có source client/server để source tests có thể đối chiếu; không copy `.env`, OAuth credentials hoặc private browser profile vào package.

Từ thư mục `wildvn-dotnet/`, PowerShell với SDK10.0.401:

```powershell
dotnet --version
dotnet build src/WildVN.Api/WildVN.Api.csproj -c Release
dotnet build src/WildVN.Desktop/WildVN.Desktop.csproj -c Release
dotnet test tests/WildVN.Api.Tests/WildVN.Api.Tests.csproj -c Release --collect:"XPlat Code Coverage"
dotnet test tests/WildVN.ApiClient.Tests/WildVN.ApiClient.Tests.csproj -c Release --collect:"XPlat Code Coverage"
dotnet test tests/WildVN.Desktop.Tests/WildVN.Desktop.Tests.csproj -c Release --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.IncludeTestAssembly=true 'DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.ExcludeByFile=**/*Tests.cs'
```

- [ ] Lưu stdout/stderr, exit codes, TRX/Cobertura; không skip. Linked model tests không instrument5 WPF adapter files: còn cần Windows runtime coverage/E2E bổ sung.
- [ ] Gộp toàn production theo T27, cả line/branch >=80%; công khai phần XAML công cụ không đo được. Không bỏ adapter/business code để tăng số.

## API riêng và shell

Terminal thứ nhất, chỉ skeleton mới này, không cấu hình DB/provider thật:

```powershell
dotnet run --project src/WildVN.Api/WildVN.Api.csproj -c Release --no-build -- --urls http://127.0.0.1:5123
```

Terminal thứ hai:

```powershell
curl.exe --noproxy '*' --include http://127.0.0.1:5123/health/live
curl.exe --noproxy '*' --include http://127.0.0.1:5123/health/ready
$env:WILDVN_API_BASE_URL='http://127.0.0.1:5123/'
$env:WILDVN_ALLOW_LOOPBACK_HTTP='1'
dotnet run --project src/WildVN.Desktop/WildVN.Desktop.csproj -c Release --no-build
```

- [ ] Quan sát alive200/notReady503; readiness503 không phải business API hoạt động.
- [ ] Khởi động/điều hướng5 sections không Node/Next server, hiển thị chức năng chưa khả dụng đúng trạng thái.
- [ ] Manual health, loading/error tiếng Việt, duplicate click/cancel, đổi section, đóng khi I/O đang chạy, response cũ không ghi đè. UI vẫn phản hồi trên dispatcher thật.
- [ ] Keyboard focus/Tab/screen reader, resize và UI Automation recordings/screenshots thực. Không đánh dấu bằng unit tests.

## Cùng mẫu media và DPI

- [ ] Chọn media đã được phép: JPEG/PNG/WebP, MP4/H264, WebM/VP9, audio; lưu MIME/size/SHA256 và nguồn. URL MinIO/presigned expiry/error chỉ thử ở môi trường được phép, không dùng fixture runner để nối production.
- [ ] Dùng cùng bytes và cùng scenario cho Native/WebView. Cấu hình path cục bộ `WILDVN_POC_IMAGE_PATH`, `WILDVN_POC_VIDEO_PATH`, `WILDVN_POC_AUDIO_PATH`; không UNC/symlink/stream/remote URI.
- [ ] Test mỗi renderer trên Windows11 và Windows10 đủ điều kiện, từng DPI100/150/200 (6 scenarios mỗi OS); kiểm tra DPI thực tế, không chỉ tin tên file/report.
- [ ] Playback play/pause/stop/mute; reduced motion, load/error, unsupported codec, image/video decode, URL/expiry scope thực tế.
- [ ] Mở/đóng/đổi navigation lặp lại, đóng app trong initialization/playback, không audio/video/process nền; kiểm tra staged-file/profile cleanup.
- [ ] WebView: đúng local allowlist/CSP; remote navigation/iframe/new-window/download/permission bị chặn; không host objects/messages bridge không cần thiết.
- [ ] Visual snapshots, startup shell và media readiness riêng, RAM/process tree (có shared pages), decoder/frame drops bằng nguồn đo thực. Chưa có phép đo thì ghi CHƯA KIỂM CHỨNG, giữ null.

Helper **chưa parse/run** trên host bàn giao. Trước khi dùng, parse trên Windows và sửa lỗi
nếu có; không ghi đè output/credential. Ví dụ cho executable đã build, paths thật của máy thử:

```powershell
./build/Measure-MediaPoC.ps1 -Executable 'C:\WildVN\WildVN.Desktop.exe' -Renderer Native -ExpectedDpiPercent 100 -ImagePath 'C:\Poc\poster.jpg' -VideoPath 'C:\Poc\sample.mp4' -AudioPath 'C:\Poc\sample.wav' -OutputPath 'C:\Evidence\native-100.json'
```

- [ ] Ghi support/runtime packaging choice sau khi có matrix đủ; không chọn renderer cuối từ Linux ffmpeg probe.
- [ ] Nối tất cả evidence vào TEST-REPORT, tick todo từng tiêu chí trọn vẹn, xin xác nhận cuối P0 trước T06. Không tự chạy DDL/migration hoặc gọi API side effect ở môi trường thật.
