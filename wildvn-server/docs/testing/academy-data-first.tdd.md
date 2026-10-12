# Academy data-first MVP — TDD evidence

## Source plan

Derived from the approved Academy plan: Spring Boot remains the only backend;
the Academy uses the existing species catalog and does not present mock
expeditions, quizzes or audio as real content.

## Guarantees

| Guarantee | Test or command | Result |
|---|---|---|
| Species summaries expose crawler-backed learning descriptions | `SpeciesQueryServiceTest` | PASS |
| Academy overview is public and returns published species count, suggestions and facets | `AcademyProgressApiIntegrationTest` | PASS |
| Academy progress accepts only published species slugs | `AcademyProgressServiceTest` | PASS |
| Unsupported expedition IDs are rejected until a DB catalog exists | `AcademyProgressServiceTest`, `AcademyProgressApiIntegrationTest` | PASS |
| Field Notes uses server pagination, all populated facets and detail links | `scripts/academy-frontend-runtime.test.ts` | PASS |
| Academy runtime contains no sample expedition, quiz or showcase fallback | `scripts/academy-frontend-runtime.test.ts` | PASS |
| TypeScript and production frontend bundle compile | `npx tsc --noEmit`, `npm run build` | PASS |
| Spring test suite remains green | `./gradlew clean test` | PASS |

## TDD execution evidence

- RED: newly added backend tests failed to compile before DTO fields,
  repository validation and Academy overview were implemented.
- GREEN: the same backend tests and the full Spring suite pass after the
  implementation.
- GREEN: frontend runtime tests pass after replacing mock Academy data with
  Spring API adapters and truthful empty states.

## Data and migration safety

- No PostgreSQL or MinIO data was deleted or rewritten by this change.
- No Academy content schema was invented; the existing `academy_progress`
  table remains the only progress store.
- Legacy `completedExpeditions` values can still be read, while the frontend
  omits that unsupported field during new progress syncs.

## Known gaps

- The projects do not currently expose a measured 80% coverage report.
- Expedition, quiz and audio modules need explicit Flyway-managed content
  tables and an ingestion/admin workflow before they can be enabled.
- Browser-level E2E with a live MinIO service is still a deployment test,
  because MinIO is not part of the current local compose stack.
