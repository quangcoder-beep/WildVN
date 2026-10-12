# Phần chưa nghiệm thu P0

**Cập nhật T07 — source implementation:** auth API/password/JWT/cookie/CSRF đã có
code, compiler PASS; tests/coverage/DB/HTTP interoperability và Windows chưa chạy.
Auth opt-in mặc định disabled, không restart process hoặc sửa secrets.
[REVIEW hiện hành](REVIEW.md), [auth implementation](../docs/auth-implementation.md).

**Chỉ đạo hiện hành — implementation trước, test/nghiệm thu sau:** tiếp tục trên
Ubuntu tại T06 EF Core/Npgsql mapping 18 tables/14 enums. Windows pending không còn
chặn triển khai. T06 chưa chạy tests/coverage/DB round-trip; các PASS WF03 bên dưới
là lịch sử. [REVIEW hiện hành](REVIEW.md), [mapping implementation](../docs/ef-mapping-review.md).

**Trạng thái hiện hành WF03 packaging — 2026-10-11:** native media/shell WinForms đã
chạy thật trên Mono ở WF02/WF03; [REVIEW.md](REVIEW.md),
[TDD media](../docs/winforms-media.tdd.md), [TDD packaging](../docs/winforms-packaging.tdd.md).
WF03 hoàn tất implementation packaging/runner, offline cài/update/rollback/uninstall
và Windows E2E helper, nhưng Windows native runtime/clean install/
fullscreen/DPI/device/performance/codec ngoài mẫu vẫn CHƯA KIỂM CHỨNG. WebView2
WinForms CHƯA TRIỂN KHAI; native VLC/OS audit chưa chạy. Năm source WPF lịch sử ngoài
measured coverage; không bỏ chúng trước parity đầy đủ. LibVLC distro có GTK/VDPAU/
get_buffer/audio-output warnings trong log; sample decode vẫn PASS. Stop cưỡng bức có
thể còn temp files; dùng X trên shell để đi qua cleanup. Các tồn đọng backend/baseline/
P0 dưới đây còn áp dụng, dù client đổi framework.

| Phần | Trạng thái / ảnh hưởng | Điều cần để kiểm chứng |
|---|---|---|
| T02 baseline thực tế | **CHƯA KIỂM CHỨNG**. Source fixture không chứng minh schema/counts/Flyway/extensions/media paths hiện tại | Backup đã làm sạch được phép hoặc DB thử riêng, kiểm tra restore/history/checksums; không trỏ runner vào DB thật |
| T01 wire parity | **CHƯA KIỂM CHỨNG**. Fixtures dựa source Java; null/status/SSE dự đoán có thể khác runtime | Spring test host/fixture được phép; không production search GET vì có analytics writes |
| T03 dependencies | **CHƯA KIỂM CHỨNG**. Readiness503 là hành vi đúng; chưa DB/cache/index/auth/provider wiring | Các task sau được xác nhận; không thêm success fake hoặc bật flag ready |
| T04/WF03 Windows | **CHƯA KIỂM CHỨNG**. Linux cross-build/package hash/linked model tests không chứng minh UI dispatcher/navigation/startup | Desktop Windows hỗ trợ, UI Automation, clean-machine smoke, evidence |
| T05 media/device | **CHƯA KIỂM CHỨNG**. Chưa cùng mẫu MinIO, lỗi URL/presigned expiry, actual native/WebView codec/lifecycle/perf | Windows10 phù hợp lifecycle +Windows11, DPI100/150/200, mẫu media được phép, visual/video/metrics |
| Global >=80% line/branch | **CHƯA KIỂM CHỨNG**. Portable source đạt99.60%/97.19%;5 WPF adapter files và XAML/device chưa đo | Instrument .NET desktop runtime trên Windows, gộp đầy đủ reports; không bỏ business files |
| WF03 package artifacts | Local implementation complete; Windows acceptance pending. Final path 2026-10-11: `packages-complete-20261011/mono-net472.zip` SHA256 `2dbbd94a91f76f4f4568d3d2362be6884e1c828ed782d68cc97e83ac109d6d44`; `packages-complete-20261011/win-x64.zip` SHA256 `b5a66135e862e67937ae57de90834922b7c4bd69bb036c7ab395ee7807961f0a` | Đối chiếu manifest/ZIP hash trước khi copy/chạy; giữ lỗi package-build cũ làm history |
| Renderer/runtime packaging | Native Windows package chỉ cho `net10.0-windows/win-x64`, self-contained với VLC3.0.24 core và 321 plugin DLL đã inspect PE x64; Mono cần distro LibVLC3. Installer/clean-machine chưa có bằng chứng | Workflow offline review đã triển khai; rehearsal trên Windows và production signing/updater còn pending |
| Package smoke hiện hành | Extracted Mono package start/status/SIGTERM stop, graceful close, năm mục, real API health và Play/Pause/Stop PASS. Captured video400ms/55frames/143 audio blocks; PID68248 đã đóng; API PID42553 live200/ready503/business404; no active DB/MinIO containers | Không dùng package smoke để tick Windows E2E hoặc full P0 acceptance |
| PowerShell helper | `build/Measure-MediaPoC.ps1` **CHƯA KIỂM CHỨNG** cả parse/run; PowerShell7.6.6 riêng đã dùng cho WF03; helper WPF cũ chưa parse/run và host không có Windows | Parse/run trên Windows. MediaReady/DecoderDroppedFrames/LifecyclePass đang null, không lấy ShellWindowReady thay playback readiness |
| ML/forgot/reset/expedition | Không có server ML đã xác minh; forgot/reset placeholder; expedition không được suy từ UI/seed | Giữ đúng inventory; không bịa capability và không tự triển khai trong P0 |
| OAuth history | Root .git thiếu metadata; không đủ bằng chứng lịch sử tracking/sharing credential | Audit được phép riêng; chưa đọc/sửa/copy credential file, không kết luận leak chỉ do file hiện hữu |
| Reproduction prerequisites | SDK10/tooling dưới `/tmp` có thể mất sau reboot; runner cần source sibling +Docker/PG CLI/Node offline | Cài đúng prerequisites trong HANDOVER; không tự đổi cấu hình cá nhân |

Một lỗi của runner đã được sửa trong lượt này: PostgreSQL bootstrap báo ready trên Unix
socket trước khi TCP listener cuối cùng sẵn sàng. Runner nay dùng `pg_isready -h127.0.0.1`
trong container riêng; regression test RED/GREEN và actual re-run được lưu. Lượt thất bại
được giữ nguyên trong evidence, không xóa để tạo cảm giác chỉ có PASS.

Schema diff chat CHECK đã được giải thích/kiểm tra equivalence; không tuyên bố diff rỗng.
Không chạy T06. WF03 đã hoàn thiện implementation cục bộ, chưa nghiệm thu Windows. C01/T04/T05 full
acceptance còn pending; cần evidence cuối và môi trường Windows cho phần còn thiếu,
không có deployment/push trong lượt này.
