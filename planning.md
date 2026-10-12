# Kế hoạch mới: Spring Boot là backend duy nhất

**Mục tiêu:** Spring Boot sở hữu API, logic nghiệp vụ, PostgreSQL và MinIO; Next.js chỉ gọi HTTP API và render giao diện. Không còn hai backend song song.

## 0. Điều kiện an toàn trước khi làm

Rà soát phát hiện [application.yml]\(/home/laivinhquang/Workspace/project/wildVN/wildvn-server/src/main/resources/application.yml) đang chứa thông tin nhạy cảm trực tiếp và bật `ddl-auto: update`.

- Thu hồi/đổi các credential đã lộ; không gửi credential mới qua chat.
- Chuyển DB/OAuth/JWT/MinIO sang biến môi trường hoặc secret manager.
- Thống nhất một datasource: dữ liệu hiện có ở PostgreSQL cổng `5432`, còn Docker Compose dùng `5433`.
- Đổi Hibernate sang `validate`; Flyway là nguồn quản lý schema duy nhất.

## 1. Đồng bộ schema PostgreSQL vào Spring Boot

Map lại Spring theo schema đã chứa 1.176 loài, thay vì theo mô hình seed cũ:

- `taxonomy`, `species`, `species_media`, `locations`, `species_locations`, `conservation_history`, `ecosystems`.
- Entity `Species` có đầy đủ `name_vn`, `taxonomy_id`, mô tả, danh sách đồng danh, enum bảo tồn, diet, habitat, activity và `thumbnail_url`.
- Thêm quan hệ bắt buộc Species → Taxonomy; giữ Ecosystem là quan hệ tuỳ chọn.
- Tạo baseline Flyway không phá dữ liệu hiện tại, rồi kiểm tra mapping trên database thử nghiệm trước.

## 2. Hoàn thiện API Spring

Chuẩn hoá contract cho frontend:

- `GET /api/species?q=&page=&limit=&status=&diet=&habitat=&activityPattern=`
- `GET /api/species/{slug}`
- `GET /api/species/{slug}/related`
- `GET /api/species/featured`
- `GET /api/species/facets` để frontend chỉ hiện các bộ lọc có dữ liệu.

API trả nhất quán `data` và `pagination`, gồm `name`, `nameVn`, `scientificName`, taxonomy, media, thumbnail, mô tả và metadata bảo tồn. Tham số phân trang/lọc phải được validate; slug không tồn tại trả 404 chuẩn, không lộ lỗi hệ thống.

## 3. Đồng bộ MinIO

- Spring trả đường dẫn ảnh chuẩn cho loài, không đưa credential MinIO ra frontend.
- Next.js dùng duy nhất một hàm resolve URL ảnh.
- Khuyến nghị bucket ảnh ở chế độ public read-only; nếu cần private thì Spring cấp proxy hoặc presigned URL.
- Kiểm tra từng thumbnail đang liên kết với 1.176 record.

## 4. Chuyển Next.js thành frontend thuần

- Đổi [api.ts]\(/home/laivinhquang/Workspace/project/wildVN/wildvn-client/app/\_shared/services/api.ts) để gọi Spring Boot.
- Loại bỏ runtime Prisma và các route Next `/app/api/species/*`.
- Chuyển `ecosystems`, `favorites` và `chat` sang Spring API tương ứng; Next không tự query database.
- Sửa danh sách loài: bỏ tải cố định 100 bản ghi rồi lọc trên trình duyệt; dùng tìm kiếm/phân trang từ Spring.
- Bỏ `SAOLA_MOCK`, dữ liệu demo và ảnh fallback không liên quan khỏi trang chi tiết/trang chủ.
- Sửa mọi ảnh để dùng URL MinIO, kể cả `SpeciesFan`.

## 5. Đồng bộ UI với chất lượng dữ liệu thật

Dữ liệu hiện tại có 1.176 thumbnail nhưng tất cả conservation status là `NE`; diet/habitat/activity mới có rất ít bản ghi.

- Không hiển thị số liệu bảo tồn hay category giả.
- Bộ lọc chỉ hiển thị lựa chọn có kết quả, hoặc ghi rõ “chưa cập nhật”.
- Featured dùng cờ `isFeatured` trong DB; trước mắt API có fallback xác định rõ, sau đó chọn danh sách loài nổi bật thật.

## 6. Kiểm thử và nghiệm thu

- Spring: mapping JPA, repository, controller list/detail/filter/404, URL media.
- Next.js: HTTP client, danh sách, tìm kiếm, chi tiết và ảnh.
- E2E: tìm loài ngoài trang đầu tiên, mở chi tiết, ảnh MinIO hiển thị.
- Xác nhận không có Prisma trong luồng runtime dữ liệu loài.
- Xác nhận vẫn còn 1.176 species, 1.176 thumbnail và không có migration làm mất dữ liệu.

## Thứ tự triển khai

1. Bảo mật config + chốt datasource/Flyway. &#x20;
2. Entity/repository/DTO Spring. &#x20;
3. Species API và MinIO contract. &#x20;
4. Chuyển Next.js. &#x20;
5. Migrate các API Next còn lại. &#x20;
6. Test và nghiệm thu.