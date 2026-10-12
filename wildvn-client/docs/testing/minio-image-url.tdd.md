# MinIO image URL configuration — TDD evidence

## Source plan

Derived from the user-reported homepage image failure and the approved plan to
make MinIO configuration environment-driven for local and production use.

## User journey

As a visitor, I want species images on the homepage to load from MinIO in
development and production, so that changing the deployment endpoint does not
require changing image components.

## RED → GREEN evidence

- RED: `npx --no-install tsx --test scripts/minio-image-config.test.ts`
  failed because `app/_shared/lib/minio-config` did not exist.
- GREEN: the same test target passed after adding the URL/config utility.
- Runtime verification: local MinIO object returned `200`, and Next's
  `/_next/image` returned `200 image/jpeg` after the development-only local-IP
  setting was enabled.

## Guarantees

| Guarantee | Test/verification | Result |
|---|---|---|
| Local URL preserves the `/wildvn` bucket path | `scripts/minio-image-config.test.ts` | PASS |
| Public HTTPS URL becomes a matching Next remote pattern | `scripts/minio-image-config.test.ts` | PASS |
| Private hosts are recognized | `scripts/minio-image-config.test.ts` | PASS |
| Local IP allowance is disabled in production | `scripts/minio-image-config.test.ts` and production config inspection | PASS |
| Existing homepage/species/Academy image contracts remain intact | `scripts/frontend-species-runtime.test.ts`, Academy runtime tests | PASS |
| Production frontend compiles | `npm run build` | PASS |
| TypeScript compiles | `npx --no-install tsc --noEmit` | PASS |

## Known gaps

- A public production MinIO domain still needs to be supplied through
  deployment environment variables and rebuilt into Next.js.
- Browser visual E2E was not run because the local Chrome remote-debugging
  permission was unavailable; the HTTP image optimizer path was verified
  directly.
- No database or MinIO objects were modified by this change.
