# Kiểm thử desktop WF03 trên Windows

`build/Verify-WindowsReview.py` là bài nghiệm thu tự động cho shell/native media WinForms
trong ZIP review đã giải nén. Cần Windows x64, Python x64, desktop session tương tác,
PowerShell và dependencies pywinauto/Pillow trong môi trường Python riêng.

```powershell
py -3 -m venv TestResults\windows-e2e-tools
TestResults\windows-e2e-tools\Scripts\python -m pip install pywinauto Pillow
TestResults\windows-e2e-tools\Scripts\python build\Verify-WindowsReview.py --package C:\Review\win-x64 --output TestResults\Windows-E2E-01
```

Chọn thư mục output mới. Package phải sạch session: đóng client trước, không xóa
session của client đang chạy. Script gọi runner Check/Start và quản lý đúng PID/start
identity/executable; mọi selector/UIA và ảnh được giới hạn trong child đó. Không dùng
global window title để bấm cửa sổ của người khác, không kill process theo tên.

Nếu có API health review riêng trên cùng Windows, thêm URL rõ ràng:

```powershell
TestResults\windows-e2e-tools\Scripts\python build\Verify-WindowsReview.py --package C:\Review\win-x64 --output TestResults\Windows-E2E-02 --api-url http://127.0.0.1:5080/ --allow-loopback-http
```

Nếu không chọn URL, không bấm health. Không dùng credential/query/token trong URL.
Không mở/bind API Ubuntu ra LAN hoặc gọi backend thật để chạy smoke.

Bài kiểm tra: startup chưa check API, năm mục ghi chưa khả dụng, media không autoplay,
checkbox mute/reduced-motion, video decode thật và native muted getter khi phát,
Pause/Stop, decode WAV trích từ video repository, graceful close qua runner. Mỗi bước
lưu evidence thật; `result.json`, `runner.log` và ảnh riêng trong output. Decode audio
không chứng minh loa nghe được. Cleanup failure làm kết quả FAIL và giữ session để
kiểm tra, không force kill process không xác minh.

Exit0 = PASS cho những bước đã chạy; exit1 = failure; exit2 = CHƯA KIỂM CHỨNG khi
host/Python không phải Windows x64. Linux không nhập pywinauto hoặc giả lập playback.
`tests/windows_review_e2e_test.py` chỉ kiểm tra boundary, result và platform guard.
Không coi các portable unit tests là Windows E2E.

DPI100/150/200, keyboard/focus/screen reader, memory/GPU, clean-machine install,
upgrade/rollback/uninstall, signing và device audibility vẫn cần matrix nghiệm thu
riêng trong `handover/CHECKLIST-WINDOWS.md`. Implementation đã hoàn thiện trước final
batch theo yêu cầu người dùng:10 boundary tests PASS, còn chạy helper trên Linux
trả exit2/CHƯA KIỂM CHỨNG; không phải Windows E2E. Evidence:
`evidence/winforms-wf03/completion-e2e-boundaries.txt` và
`evidence/winforms-wf03/completion-e2e-platform-guard.txt`.

Nguồn workflow: [pywinauto Application API](https://pywinauto.readthedocs.io/en/latest/code/pywinauto.application.html),
[UIA wrappers](https://pywinauto.readthedocs.io/en/latest/code/pywinauto.controls.uia_controls.html).

Helper cũng nằm trong Windows ZIP, nên có thể chạy `python Verify-WindowsReview.py`
ngay từ package với `--package . --output <thư mục mới bên ngoài package>`. Dependencies
Python là công cụ nghiệm thu; app self-contained không cần Python để chạy.
