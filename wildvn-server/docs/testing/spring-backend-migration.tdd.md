# Spring Boot backend migration — TDD evidence

## Source plan

Derived from the approved plan “Spring Boot là backend duy nhất”; no separate
`*.plan.md` file was supplied.

## User journeys

- As a visitor, I can search, filter, paginate and open a species from the
  crawler dataset through Spring Boot.
- As an authenticated user, I can read and synchronize favorites and academy
  progress without Next.js querying PostgreSQL directly.
- As an operator, I can start Spring against the existing database or an empty
  database without destructive schema work.

## TDD execution evidence

| Stage | Test target | Result |
|---|---|---|
| RED | `CrawlerSchemaMigrationTest` before bootstrap resource existed | 2 tests failed because the required migration resource was missing |
| GREEN | `CrawlerSchemaMigrationTest` after `beforeMigrate.sql` was added | 2 tests passed |
| GREEN | `./gradlew test --no-daemon` | 26 tests passed, 0 failed |

## Guarantees

| # | Guarantee | Test or command | Type | Result |
|---|---|---|---|---|
| 1 | Bootstrap declares the crawler tables before the immutable baseline guard and contains no destructive data statement | `CrawlerSchemaMigrationTest` | unit/resource | PASS |
| 2 | Species list/detail/filter/facets/featured/404 contracts work against PostgreSQL | `SpeciesApiIntegrationTest`, `SpeciesFacetsApiIntegrationTest` | integration | PASS |
| 3 | Academy sync requires authentication and validates payloads | `AcademyProgressApiIntegrationTest`, `AcademyProgressServiceTest` | integration/unit | PASS |
| 4 | JWT, CSRF, media URL signing, favorites and chat behavior are covered | corresponding tests under `src/test/java` | unit/integration | PASS |
| 5 | Frontend has no runtime Prisma route for species data and uses Spring/MinIO URLs | `scripts/frontend-species-runtime.test.ts` | frontend runtime | PASS (7 tests total with taxonomy parser) |
| 6 | Production frontend bundle compiles | `npm run build` (`next build --webpack`) | build | PASS |

## Coverage and known gaps

The Spring project does not currently configure a JaCoCo coverage task, and the
frontend has no coverage script. The 80% threshold therefore cannot be reported
as a measured percentage yet; adding JaCoCo and a frontend coverage runner is a
follow-up quality-gate task. MinIO object reachability also requires the MinIO
service and fresh credentials to be running in the deployment environment.

## Migration safety

`beforeMigrate.sql` uses `CREATE IF NOT EXISTS` and guarded foreign keys. It is
safe to execute against the existing 1,176-row database and also provisions the
crawler tables before `V2__baseline_crawler_schema.sql` on a new database. It
does not seed or delete rows.
