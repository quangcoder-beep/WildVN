# T06 — EF Core/Npgsql mapping implementation

Ngày 2026-10-11. Theo yêu cầu hiện hành: **triển khai trước; test và nghiệm thu sau**.
Source baseline ở `tests/Fixtures/schema.sql` là SQL Flyway từ repository, không là
capture DB thật. Không scaffold từ DB thật, không thay schema hay credentials.

## Phần đã triển khai

`src/WildVN.Infrastructure` target net10, Npgsql EF provider 10.0.3 và EF Core 10.0.12.
`WildVN.Api` có project reference, nhưng Program chưa đăng ký context hoặc business
routes; không tự nối DB/readiness hoặc sinh/chạy schema khi startup.

| File | Trách nhiệm |
|---|---|
| `CatalogRows.cs` | taxonomy, ecosystems, species, species_media |
| `GeographyRows.cs` | locations, species_locations, conservation_history |
| `AccountRows.cs` | users, user_profiles, ranks, user_sessions, user_favorites, academy_progress |
| `HistoryRows.cs` | chat_sessions, chat_messages, sync_failures, search_suggestions_popularity, user_affinities |
| `LegacyEnums.cs` | 14 PostgreSQL enums, đúng nhãn, gồm CitesAppendix.I |
| `WildVnDbContext.cs` | 18 DbSets, explicit model, immutable snapshot update, transaction lifecycle |
| `RowWritePolicy.cs` | save-boundary UTC và UpdatedAt policy |
| `PostgresMappings.cs` | PK/FK/defaults/uniqueness/index/check metadata |
| `PostgresConfiguration.cs` | options từ connection settings chọn rõ, enum registration, không connect |
| `LegacyQueries.cs` | read queries no-tracking và filters riêng theo source semantics |

Rows là sealed classes với init-only properties. Không dùng record ToString tự in
password/refresh-token hash. Mảng enum/TEXT[] là provider storage values; caller
thay bằng bản sao mới khi sửa, không mutate array đã được materialize. EF tracking
vẫn tự materialize/gán server-generated values; các update service sau không dùng
in-place mutations trong application state.

## Các quyết định parity

- Schema public, tên bảng/cột snake_case; native enum PascalCase giữ quoted name.
  MapEnum dùng null-name translator giữ uppercase labels ở cả EF và Npgsql.
- Users/chat/sessions dùng UUID. Favorites và Academy giữ VARCHAR(255) username keys;
  không thêm FK từ các username keys sang users.id. User affinities không tự thêm
  users FK vì runtime SQL không có.
- species.conservation_status là VARCHAR(255), không ép enum; nullable/defaults
  không được coi là NOT NULL. CitesAppendix có I theo runtime SQL, dù snapshot wire
  cũ thiếu I.
- species.habitat_type là native enum array; synonyms TEXT[]; JSONB giữ raw JSON
  string để không tự biến scalar/malformed legacy shapes thành array/POCO. Gallery
  của species/ecosystem là TEXT; location.gallery_urls mới là JSONB.
- TIMESTAMPTZ dùng DateTimeOffset, DATE dùng DateOnly, SMALLINT dùng short,
  NUMERIC(5,4) dùng decimal. Writes timestamp phải có UTC offset 0 theo provider; save-boundary kiểm tra toàn bộ
  Added/Modified rows trước SQL, có message chỉ chứa tên type/property, không values.
- Nullable defaulted fields có CLR defaults tương ứng và ValueGeneratedNever:
  caller chọn explicit null thì insert SQL NULL, không bị EF đổi thành DB default.
  UUID/timestamp và required enum/default bool giữ server-generated semantics.
- Unique constraint-backed indexes được model như unique indexes, không dùng EF
  alternate entity keys khóa thay đổi email/rank/refresh hash. Không sinh migration
  từ model này; index representation không tuyên bố DDL EF trùng constraint DDL.
- Loại convention tự thêm FK indexes; chỉ khai báo indexes source, direction và
  partial predicate. Chat role CHECK giữ user/assistant; FK delete RESTRICT/SET NULL/
  CASCADE theo SQL.
- Không có global soft-delete/published filter. Catalog/detail/featured/favorite
  dùng deleted-only theo source; published-only dành Academy sync. Ecosystem related
  paths giữ caller chọn filter; context vẫn có toàn bộ rows cho migration/admin scope.

## Timestamp và update lifecycle

UpdateFromSnapshot nhận snapshot gốc no-tracking, replacement mới và danh sách
changedProperties chọn rõ (CLR names, gồm UpdatedAt khi row có cột này). Từ chối
cùng object, original đã tracked, field lạ/blank, PK/CreatedAt trong danh sách hoặc
bất kỳ property ngoài danh sách không còn giống original. Chỉ các field đã chọn
được mark modified; partial replacement thiếu giá trị gốc bị từ chối trước Attach.
OriginalValues dùng cho change tracking,
không mutate snapshot gốc. Bản replacement phải có UpdatedAt mới ở UTC cho row có
cột này; SaveChanges sync/async từ chối update thiếu timestamp mới. Các service sau
chọn DateTimeOffset.UtcNow khi tạo replacement, thay cho Java pre-update hook mutate
entity. CreatedAt/UpdatedAt khi thêm dùng server defaults khi caller để unset;
explicit TIMESTAMPTZ với offset khác 0 bị từ chối trước DB write. Timestamp có giá trị
trên modified rows, kể cả nullable DeletedAt/RevokedAt, cũng không được bị đổi sang
default year 1; null và giá trị legacy giữ nguyên vẫn được bảo toàn. Không normalize hoặc
thay giá trị của object đầu vào âm thầm.

## Kết nối và transaction

CreateOptions nhận connection settings từ caller, yêu cầu host/database/username;
không đọc env/config hoặc connect. Từ chối Include Error Detail, Log Parameters và
Persist Security Info; không đưa raw connection settings/inner exception vào validation
message. Không hardcode password/token; runtime secrets do host cấp riêng ở task sau.
Không tự enable retry replay transaction/toggle hoặc Migrate/EnsureCreated.

`InTransactionAsync` mở transaction, chạy operation, SaveChanges và Commit. Exception/
cancel để transaction chưa commit được dispose/rollback; context do caller sở hữu và
phải dispose sau unit of work. Nested transaction bị từ chối để caller compose rõ.
Operation không tự commit hoặc tự mở transaction khác; kết quả generated-ID nên trả
row object nếu cần đọc Id sau SaveChanges, không snapshot Guid.Empty trước flush.

## Kiểm chứng để giai đoạn sau — tất cả CHƯA CHẠY

| Case cần kiểm chứng | Kết quả cần có khi chạy sau |
|---|---|
| Model metadata | đủ18 bảng/columns/nullability/PK/FK/types/index/check, không shadow fields/index mới |
| PostgreSQL enum/arrays/JSONB | round-trip 14 enums, uppercase/quoted names, nullable arrays, JSON scalar/object/array, TEXT galleries giữ nguyên |
| Identity legacy | username string favorites/Academy, UUID users/chat; unlinked legacy key không bị đổi hoặc thêm FK |
| Defaults/null/UTC | new-row defaults, explicit NULL không bị thay, Guid generated, UTC timestamp/date/numeric precision |
| Query policy | draft/deleted/published fixture phân biệt; không global PUBLISHED; username và ownership boundaries |
| Transaction | save/commit, UTC/non-UTC và missing UpdatedAt refusal, immutable snapshot/PK refusal, constraint failure, exception/cancel rollback, nested refusal; không retry toggle |
| Schema/data safety | startup không DDL, schema diff và 18 table snapshots trước/sau; fixture transaction rollback |
| Regression/coverage | suite cũ cùng tests mới, line/branch>=80% với Infrastructure included; không loại code mới để xanh |
| Windows | UI/media/installer/DPI/accessibility ở giai đoạn nghiệm thu riêng |

Chưa tạo/chạy suite T06 hay fixture DB trong lượt này. Không có bằng chứng runtime
round-trip hoặc coverage T06. Các PASS 105/62/100 và WF03 là lịch sử trước T06.
Compiler build chỉ kiểm tra biên dịch, không thay test/acceptance.

## Nguồn API chính thức đã đối chiếu

- [Npgsql enum setup](https://www.npgsql.org/efcore/mapping/enum.html),
  [MapEnum API](https://www.npgsql.org/efcore/api/Npgsql.EntityFrameworkCore.PostgreSQL.Infrastructure.NpgsqlDbContextOptionsBuilder.html).
- [JSON string mapping](https://www.npgsql.org/efcore/mapping/json.html).
- [EF conventions](https://learn.microsoft.com/en-us/ef/core/modeling/).
- [Provider 10.0.3 dependency constraints](https://www.nuget.org/packages/Npgsql.EntityFrameworkCore.PostgreSQL/10.0.3),
  [EF 10.0.12](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore/10.0.12).

Bước triển khai kế tiếp: T07 auth API theo plan tổng. Test/nghiệm thu vẫn deferred
cho tới mốc kiểm chứng đã chọn; không gọi hệ thống/provider thật trong lúc port code.
