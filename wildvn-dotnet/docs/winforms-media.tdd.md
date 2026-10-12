# WF02 — media PoC WinForms, bằng chứng ngày 2026-10-10

Người dùng đã duyệt WF01 rồi yêu cầu tiếp tục. Phạm vi WF02 là chuyển media PoC
hiện hữu; không triển khai business API/T06. Dừng sau một commit WF02 để review.
Áp dụng tdd-workflow, verification-loop và agent-self-evaluation; một reviewer
read-only, làm tuần tự, không nhiều worker. Giữ mọi assertions/tests P0.

## RED → GREEN

| Bảo đảm | RED thật | GREEN thật |
|---|---|---|
| Adapter/policy Mono còn thiếu | [RED-build.txt](../evidence/winforms-wf02/RED-build.txt), CS0234/CS0246 | Build cả net472/net10.0-windows sạch |
| Nạp/đóng form media | [RED-runtime.txt](../evidence/winforms-wf02/RED-runtime.txt), 42/46, bốn lỗi UI | Direct BeginInvoke trên form đang sống, token capture/cancel; dispose owned forms rõ trên Mono |
| Ảnh hỏng không kẹt Loading | [corrupt-image-test.txt](../evidence/winforms-wf02/corrupt-image-test.txt) và [diagnostic-tests.txt](../evidence/winforms-wf02/diagnostic-tests.txt) | GDI+ OutOfMemory chuyển thành InvalidData; catch InvalidData riêng vì nó không kế thừa IOException |
| Init player thất bại phải thả ảnh/staging | [RED-player-init-cleanup.txt](../evidence/winforms-wf02/RED-player-init-cleanup.txt), Bitmap còn giữ | ClearImage ở đường lỗi/dispose; fault injection chỉ mô phỏng lỗi init, không giả playback |
| Không làm mất health regression | [tests-after-fixes.txt](../evidence/winforms-wf02/tests-after-fixes.txt), 55/56 | Assembly STA chung; Mono invoke_control static đã thấy bằng [monodis](../evidence/winforms-wf02/mono-context-fields.txt); assertions cũ giữ nguyên |

Mute native là thao tác async: test mới chờ getter thật xác nhận trước assertion;
không xóa assertion. WebM repo có VP9 +Opus, MP4 có H264 +AAC, WAV là PCM trích từ
AAC bằng [prepare-media-fixture.sh](../build/prepare-media-fixture.sh). Các header
unit fixture chỉ kiểm parser/allowlist; không coi chúng là codec playback PASS.

Một lần build đầu lỗi nullable net472. Một lần gọi build ở root lỗi MSB1003 vì repo
không có solution; sau đó build từng csproj. Log được giữ, không che lỗi.
`STALE-wf01-tests.*` là lần vô tình chạy binary WF01 sau build lỗi; **không** dùng
làm bằng chứng WF02. Mọi kết luận cuối dùng build thành công và binary mới.

## Kết quả cuối

- API Release và Desktop hai target: 0 warning/0 error; [API](../evidence/winforms-wf02/build-api-release.txt), [Desktop](../evidence/winforms-wf02/build-desktop-final.txt).
- Ba suite .NET10:105/105, không skip; XML/TRX ở evidence/winforms-wf02/WildVN.*.Tests/.
- NUnitLite/Mono:62/62 (27 WF01 +35 WF02), không skip;
  [test/coverage log](../evidence/winforms-wf02/mono-coverage-parser.txt), [XML](../evidence/winforms-wf02/mono-covered-parser.xml).
- Python:48/48 gồm PostgreSQL fixture cục bộ, [output](../evidence/winforms-wf02/python-tests.txt).
- `.exe` sản phẩm: bốn startup cases exit đúng 0/1, năm mục, health GET thật,
  media mở từ nút shell, ảnh, video Play/Pause thật; [output](../evidence/winforms-wf02/exe-coverage-smoke.txt).
  Video651ms/85 decoded frames/165 audio blocks, muted=True;
  [ảnh phát thật](../evidence/winforms-wf02/media-playing.png).
- WAV và WebM cũng giải mã trên native LibVLC trong tests; log có TimeMs/DecodedAudio/
  DecodedVideo. Không tuyên bố đã nghe âm thanh trên loa hoặc kiểm mọi codec.
- Curl API5080: functional PASS1/FAIL9; ready503, business404 **CHƯA TRIỂN KHAI**;
  [body đầy đủ](../evidence/winforms-wf02/curl.txt). Fixture counts giữ nguyên4/2/3.
- NuGet audit sáu project, gồm transitive: không phát hiện vulnerability từ nguồn
  audit hiện tại; [output](../evidence/winforms-wf02/nuget-audit.txt). Không thay cho audit native VLC/OS.
- `strace connect` trong một suite chẩn đoán chỉ thấy AF_INET loopback, cùng local
  IPC; [trace](../evidence/winforms-wf02/network-connects.txt). Đây không phải chứng minh sandbox tuyệt đối.

LibVLC spike: ban đầu DllNotFound vì distro chỉ có libvlc.so.5; dllmap Linux giúp
load LibVLC3.0.20 có sẵn. [Log spike](../evidence/winforms-wf02/spike-mapped-run.txt)
cho time4152ms/video257/audio495. Spike/harness từng lỗi screenshot Bad Drawable/BadMatch; nguyên nhân BadMatch
chưa xác định chắc chắn. Bằng chứng ảnh cuối lấy từ `.exe` sản phẩm đang mapped, không dùng ảnh spike lỗi.
GTK thiếu canberra/VDPAU/get_buffer warnings có trong log; tests và native counters
vẫn PASS. GPU acceleration/performance chưa được nghiệm thu.

## Coverage và tái đo

[Summary](../evidence/winforms-wf02/coverage-summary.json): **577/587 lines=98,30%**,
**381/414 branches=92,03%**, mỗi file đo được >=80% line/branch. Union bảo thủ chỉ
dùng ba reports .NET10 hiện hành, mono-coverage-parser.xml và exe-coverage-media.xml.
Không trộn coverage WF01 hoặc reports trước khi parser thay đổi vào kết luận cuối.
Không tuyên bố từng runtime riêng lẻ đạt80%.

Lần đầu MediaSamples branch78,38% do compiler string-switch trie có15/40 nhánh không
đi tới sau extension allowlist. Thêm negative header tests vẫn không phủ trie đó.
Đổi riêng đoạn parser sang explicit comparisons giữ cùng behavior/tests: file này
đạt95,83% line/96,15% branch. Giữ [gate FAIL cũ](../evidence/winforms-wf02/coverage-before-header-refactor.json).
Không đổi threshold, không exclude code và không sửa coverage_report.py.
Full source **CHƯA KIỂM CHỨNG**: năm source WPF lịch sử không compile vào client mới.
Native C++ decoder/device/DPI không được suy từ C# coverage.

Trong terminal X11, sau build và prepare fixture, dùng Coverlet console6.0.4 đã cài
ở TestResults/winforms-tools/; wrapper chỉ flush counters thật trước Mono teardown:

```bash
export WILDVN_TEST_REPO="$PWD" DOTNET_ROOT=/tmp/wildvn-dotnet-sdk DOTNET_ROLL_FORWARD=LatestMajor
mcs -out:TestResults/winforms-wf02/RunWithCoverageFlush.exe build/RunWithCoverageFlush.cs
TestResults/winforms-tools/coverlet tests/WildVN.WinForms.Tests/bin/Release/net472/WildVN.WinForms.Tests.exe --target mono --targetargs "TestResults/winforms-wf02/RunWithCoverageFlush.exe tests/WildVN.WinForms.Tests/bin/Release/net472/WildVN.WinForms.Tests.exe --workers=0 --noresult" --format cobertura --output TestResults/winforms-wf02/recheck.xml --include '[WildVN.*]*'
TestResults/winforms-tools/coverlet src/WildVN.Desktop/bin/Release/net472/WildVN.Desktop.exe --target python3 --targetargs evidence/winforms-wf02/exe_coverage_smoke.py --format cobertura --output TestResults/winforms-wf02/exe-recheck.xml --include '[WildVN.*]*' --include-test-assembly
```

Không build đồng thời với instrumentation. Startup reproducer cần API review5080,
Python/Pillow/libX11/xwininfo, GNOME cùng UID; chỉ thao tác các cửa sổ nó tạo.
Ba .NET suite đo bằng `--collect:'XPlat Code Coverage'`; lệnh exact trong logs,
Desktop thêm IncludeTestAssembly=true/ExcludeByFile=**/*Tests.cs cho production linked.
Tái đo ghi output mới ở TestResults; script reproducer ghi ảnh/log vào evidence nên
cần xem git diff nếu chạy lại. Summary dùng handover/coverage_report.py nguyên bản.

## Quyết định và giới hạn

PictureBox thay BitmapImage; LibVLCSharp3.10.1 bọc LibVLC distro cho video/audio.
Mono dùng native XWindow, Windows dùng Hwnd; Windows chỉ cross-build, chưa chạy.
Tham khảo [API MediaPlayer chính thức](https://raw.githubusercontent.com/videolan/libvlcsharp/3.x/src/LibVLCSharp/Shared/MediaPlayer.cs),
[WinForms VideoView chính thức](https://raw.githubusercontent.com/videolan/libvlcsharp/3.x/src/LibVLCSharp.WinForms/VideoView.cs)
và [Mono Hwnd](https://raw.githubusercontent.com/mono/mono/main/mcs/class/System.Windows.Forms/System.Windows.Forms/Hwnd.cs).
Media từ ba env keys hiện hữu, không remote/UNC/symlink, temp riêng, signature/128MiB,
cancel/cleanup; LibVLC ignore-config/no-metadata-network/no-lua/no-sub-autodetect.
Các kiểm tra này không là OS sandbox hoặc bảo đảm an toàn cho mọi parser/file độc hại.

WebView2 WinForms **CHƯA TRIỂN KHAI**; source WPF và HTML/CSP/tests giữ nguyên.
Windows native payload/clean install, fullscreen, DPI/keyboard/accessibility, output
âm thanh vật lý, memory/GPU benchmark và codecs ngoài samples: **CHƯA KIỂM CHỨNG**.
Không đổi todo P0/Windows thành tick dựa vào cross-build hoặc header tests.
Reviewer read-only không thấy HIGH/CRITICAL; MEDIUM image cleanup đã có RED/GREEN.

## Tự đánh giá

Accuracy4: logs/counters/ảnh thật; C++/device không được đo. Completeness4: native
PoC đạt, WebView2/Windows còn trống rõ. Clarity4: REVIEW tách trạng thái hiện hành
và lịch sử; evidence nhiều. Actionability4: runner một lệnh/PID/stop đã chạy, SDK/tmp
và sibling client là prerequisites. Conciseness4: báo cáo cuối <=10 dòng, docs giữ
chi tiết để tái hiện. Trung bình4,0; ưu tiên WF03 Windows/native dependency audit,
đo full renderer/device rồi mới quyết định bỏ source WPF lịch sử.
