# WildVN

Mã nguồn dự án đa dạng sinh học Việt Nam, gồm web, backend Java, ứng dụng .NET và các công cụ dữ liệu.

## Tải về

```bash
git clone https://github.com/quangcoder-beep/WildVN.git
cd WildVN
```

Hoặc chọn **Code → Download ZIP** trên GitHub. Các thành phần nằm trực tiếp trong repository, không dùng submodule.

| Thư mục | Nội dung |
| --- | --- |
| `wildvn-client` | Next.js / React / TypeScript |
| `wildvn-server` | Java 21 / Spring Boot / Gradle |
| `wildvn-dotnet` | API, desktop .NET, tài liệu và kiểm thử |
| `crawl4ai-project` | Công cụ Python thu thập dữ liệu |
| `scripts` | Công cụ Node.js nhập dữ liệu và media |
| `db` | Thiết kế database, schema SQL và dữ liệu mẫu |

## Bắt đầu

- Web: sao chép `wildvn-client/.env.example` thành `.env.local` trong cùng thư mục, cấu hình API, rồi chạy `npm ci` và `npm run dev` tại `wildvn-client`.
- Java API: cần JDK 21, PostgreSQL và các dịch vụ phụ trợ. Sao chép `wildvn-server/.env.example` thành `.env`, điền cấu hình riêng, rồi chạy `./gradlew bootRun` tại `wildvn-server` (Windows: `gradlew.bat bootRun`). API mặc định dùng cổng 8081.
- Dịch vụ phụ trợ: xem `docker-compose.yml` và `docker-compose.env.example`. PostgreSQL và MinIO cần chuẩn bị riêng; PostgreSQL trong Compose hiện được comment. Kiểm tra các extension/schema tại `db/sql` và migration của backend trước khi tạo database.
- .NET: phiên bản SDK được chỉ định trong `wildvn-dotnet/global.json`. Xem [bàn giao](wildvn-dotnet/handover/HANDOVER.md), [trạng thái](wildvn-dotnet/handover/REVIEW.md) và [khôi phục mật khẩu](wildvn-dotnet/docs/password-recovery-implementation.md). .NET chưa thay thế đầy đủ backend Java.
- Crawler: xem [hướng dẫn](crawl4ai-project/README.md). Bước xử lý AI cần dependencies và API key riêng.
- Công cụ dữ liệu: xem `scripts/runtime-config.js` để cấu hình biến môi trường trước khi chạy.

## Phạm vi chia sẻ

Đây là bản mã nguồn hiện tại, không kèm bộ cài ứng dụng, database đang chạy, bucket media, mật khẩu, OAuth secrets hoặc `.env` thật. Dependencies và output build cần tạo lại trên máy nhận. Các dữ liệu seed chỉ dùng cho demo.

Một số output kiểm thử tự sinh không được đưa vào Git; tài liệu kiểm thử lịch sử có thể trỏ đến artifact chỉ có trên máy phát triển. Chưa xác minh toàn bộ quy trình cài/chạy trên máy mới.

Kiểm tra dependencies trước khi triển khai production: lần rà soát trước khi đóng gói đã phát hiện advisories mức cao/nghiêm trọng ở dependency web hiện tại. Bản commit này giữ nguyên phiên bản và mã nguồn theo trạng thái dự án, chưa áp dụng cập nhật dependencies.
