# Social auth buttons TDD evidence

## User journey

As a visitor, I want to choose Google or Facebook on the login/register screens,
so that Spring Boot can start the corresponding OAuth flow.

## Test evidence

| # | Guarantee | Test | Result |
|---|---|---|---|
| 1 | The shared component renders Google and Facebook OAuth links using the configured API base URL. | `scripts/social-auth-buttons.test.ts` | PASS |
| 2 | The component passes TypeScript validation. | `npx --no-install tsc --noEmit` | PASS |
| 3 | Existing frontend runtime checks remain green. | `npx --no-install tsx --test scripts/social-auth-buttons.test.ts scripts/chat-runtime.test.ts scripts/frontend-species-runtime.test.ts scripts/minio-image-config.test.ts scripts/academy-frontend-runtime.test.ts scripts/species-detail-ui.test.ts scripts/taxonomy-parser.test.ts` | PASS (29 tests) |
| 4 | The login and register routes compile in a production build. | `npm run build` | PASS |

## RED/GREEN checkpoints

- RED: `35b0916 test: add social auth button red case` failed because the component returned `null`.
- GREEN: `41910dd feat: add Google and Facebook auth buttons` passed the focused test and typecheck.

## Known integration requirement

The buttons navigate to `/oauth2/authorization/google` and `/oauth2/authorization/facebook`.
The corresponding Spring client registrations and provider credentials must be configured in
the backend runtime environment before a real provider login can complete.
