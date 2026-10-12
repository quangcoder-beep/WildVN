# WF03: cài ZIP review cho người dùng Windows hiện tại

Workflow này dùng script PowerShell đã review, ZIP cục bộ và thư mục riêng của người
dùng. Đây là **review artifact chưa ký**, không phải MSIX hoặc bộ cài `.exe` production.
Không có updater, tải tự động, service, elevation, thay đổi ExecutionPolicy hoặc
shortcut Start Menu. Nghiệm thu cài/chạy/rollback/uninstall trên Windows thật vẫn
**CHƯA KIỂM CHỨNG** cho tới khi có evidence của máy Windows.

## Cài phiên bản đã chọn

Yêu cầu Windows x64 thật, PowerShell 5.1+, ZIP `win-x64` self-contained đầy đủ và SHA256
ZIP từ handover được đối chiếu qua kênh tin cậy. Dùng script từ checkout đã review hoặc
ZIP đã xác minh; hash giúp phát hiện thay đổi/corruption, **không chứng minh nhà phát
hành hay chữ ký**. Không lấy hash từ chính file tải xuống rồi coi đó là xác thực.

Ví dụ từ thư mục `wildvn-dotnet` trên Windows, thay đường dẫn/hash bằng artifact đang
review; không dùng hash của ZIP cũ nếu script/package đã thay đổi:

```powershell
$zip = 'C:\Review\win-x64.zip'
$sha = '<SHA256 ZIP 64 ký tự từ handover hiện hành>'
powershell -NoProfile -File .\build\Install-WindowsReview.ps1 -Action Install -ZipPath $zip -ZipSha256 $sha -AllowUnsignedReview
powershell -NoProfile -File .\build\Install-WindowsReview.ps1 -Action Status
```

Script không có tham số chọn thư mục cài tùy ý. Root luôn là
`LocalApplicationData\WildVN\Review` của người dùng hiện tại, thường là
`%LOCALAPPDATA%\WildVN\Review`. Root có ownership marker; nếu thư mục đã tồn tại với
file lạ, thiếu marker hoặc là link/junction/reparse point, script từ chối và giữ lại
để kiểm tra thủ công. Không cài vào thư mục source, user data hoặc DB.

Trước khi đổi pointer, script xác minh SHA256 ZIP trên cùng handle đọc dùng để giải
nén; từ chối traversal, absolute/drive/ADS paths, tên thiết bị Windows, case duplicates,
links/special files, runtime session/log có sẵn và file/directory collisions. Giới hạn
4096 files, ZIP 512MiB, mỗi file 512MiB, tổng giải nén 2GiB, ratio 1000 và manifest 4MiB.
Staging mới dưới temp được hash/inventory kiểm tra; `Review-Windows.ps1 -Action Check`
trong artifact cũng phải pass. Schema1, unsigned, `win-x64` và runtime self-contained
được yêu cầu. Các guard này bảo vệ workflow review, không thay thế OS sandbox hoặc
chữ ký của publisher.

Mỗi ZIP tạo `versions\<sha256 ZIP>` độc lập và receipt trong `receipts\<sha256>.json`,
gắn ZIP hash với manifest hash. Không ghi đè payload phiên bản trước. Pointer
`active.json` được ghi qua file mới, flush và thay thế nguyên tử; `active.bak` giữ
pointer trước đó. Lock riêng ngăn install/rollback/uninstall và launch cùng lúc.
Không tự launch, gọi health API hoặc phát media sau cài.

Root hoàn chỉnh có marker/directories được commit qua rename cùng parent. Payload
được copy từ temp sang `staging\<sha256>` dưới root, kiểm tra lại rồi rename vào
versions trên cùng volume; temp và LocalApplicationData có thể ở hai ổ đĩa khác nhau.

## Chạy phiên bản active

Chạy launcher trong một version đã cài; nó đọc pointer active, không mặc định launch
chính thư mục chứa launcher. Có thể dùng launcher từ checkout đã review:

```powershell
powershell -NoProfile -File .\build\Start-InstalledReview.ps1 -AllowUnsignedReview
powershell -NoProfile -File .\build\Start-InstalledReview.ps1 -AllowUnsignedReview -WithSamples -ApiUrl https://api.example.invalid/
```

Mọi inventory/hash/receipt được kiểm tra lại trước start. HTTPS mặc định; nếu review
API loopback HTTP, chọn rõ `-ApiUrl http://127.0.0.1:5080/ -AllowLoopbackHttp`.
Localhost Windows không tự trỏ đến API Ubuntu. Không có health request hay autoplay
lúc khởi động. `-WithSamples` chỉ dùng samples trong phiên bản active; tắt tiếng/giảm
chuyển động giữ theo client hiện hành. Runner loại inherited `WILDVN_*` khỏi child.

## Đổi phiên bản và rollback

Cài ZIP mới bằng cùng lệnh Install và hash mới (`-Action Update` là alias cùng quy trình
offline, luôn yêu cầu ZIP/hash rõ ràng). Phiên bản trước giữ nguyên để rollback;
không update từ mạng và không tự chọn “latest”. Mọi session của version đã cài phải
đóng trước khi đổi pointer. Đóng bằng X, sau đó dùng runner của version đó để kiểm tra
state; hoặc dùng `-StopRunning` để yêu cầu runner exact-owned gửi graceful close:

```powershell
powershell -NoProfile -File .\build\Install-WindowsReview.ps1 -Action Rollback -AllowUnsignedReview -StopRunning
powershell -NoProfile -File .\build\Install-WindowsReview.ps1 -Action Rollback -VersionHash '<sha256 của version giữ lại>' -AllowUnsignedReview
```

Không truyền `-VersionHash` thì chọn `previous` từ pointer. Truyền hash đầy đủ của ZIP
giữ lại để chọn bản cụ thể hoặc phục hồi active pointer hỏng. Receipt/manifest/payload
phải pass trước lựa chọn. Runner chỉ đóng process có PID, start ticks và executable
đúng package; không force kill. Session stale, malformed, PID tái sử dụng hoặc graceful
close thất bại khiến thao tác từ chối với đường dẫn cần kiểm tra. Không xóa state chỉ
để bỏ qua phiên client còn chạy.

Nếu crash để lại `.active.pending.json`, script giữ file và từ chối ghi pointer tiếp.
Kiểm tra pending, active/backup và receipts trước khi loại bỏ riêng pending file.
Status liệt kê versions trước khi đọc active pointer để hỗ trợ phục hồi. Nếu crash
giữa copy/move payload và receipt, staging/payload orphan được giữ. Reinstall đúng ZIP
và hash đã chọn sẽ hoàn thiện staged file cùng inventory rồi receipt; tên/file lạ hay
link khiến từ chối. Payload/version hoàn chỉnh có thể được giữ khi session cũ ngăn
đổi active pointer. Không coi mock fault injection là Windows crash-recovery acceptance.

## Gỡ riêng bản review

```powershell
powershell -NoProfile -File .\build\Install-WindowsReview.ps1 -Action Uninstall -AllowUnsignedReview -StopRunning
```

Uninstall kiểm tra ownership/layout, receipts và toàn bộ package trước xóa; file lạ,
link hoặc payload sửa đổi khiến từ chối. Chỉ xóa version có receipt, receipts và các
metadata review đã biết. File payload được xóa theo danh sách đã kiểm tra, directories
bị xóa **không recursive**, nên file lạ xuất hiện đồng thời được giữ. Root nhỏ chứa
ownership marker/lock và ba directories rỗng được giữ cho lần cài tiếp theo; không
xóa lock giữa lúc một thao tác khác có thể cài. Session/log của
runner trong package được gỡ cùng payload sau khi xác nhận đóng. Thư mục cha WildVN,
user data, temp media của ứng dụng, DB, API, credential và system policy không bị sửa.
Giữ checkout hoặc script ngoài install root để quản lý sau khi gỡ; không chạy uninstall
từ script sẽ bị chính thao tác đó xóa nếu có thể dùng checkout. Interrupted staging
phải được hoàn thiện bằng đúng ZIP trước uninstall; nếu crash trong lúc xóa file,
script từ chối inventory thiếu và giữ phần còn lại để kiểm tra, không tự sweep directory.

## Evidence và nghiệm thu còn lại

`tests/install_windows_test.ps1` đã PASS71 checks trong final batch sau implementation
(`evidence/winforms-wf03/completion-install-tests.txt`), kiểm tra parser và
filesystem/fault mocks trên Linux, không mở desktop. Luồng ZIP thật607 files trong
root tạm TestResults đã PASS install/update/rollback/foreign-data-refusal/uninstall,
exit0 sau208,23s (`evidence/winforms-wf03/completion-install-integration-full.txt`);
version thứ hai chỉ đổi annotation manifest. Không coi rehearsal filesystem này là
nghiệm thu Windows public entry-point hoặc clean machine. Windows E2E còn phải có
hai ZIP/version riêng để thử install → launch/close → đổi version → rollback →
uninstall, session sai/PID reuse, hash mismatch, linked roots, interruption/recovery
và xác minh user data giữ nguyên trên Windows thật. Full Windows signing/production
update, clean-machine/DPI/accessibility/device/media/license gates còn độc lập.
