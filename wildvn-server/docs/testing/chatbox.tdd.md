# Chatbox TDD evidence

## Scope

The Chatbox now uses a provider router. `auto` selects the PostgreSQL-backed
provider when `ANTHROPIC_API_KEY` is blank and selects the Anthropic adapter when
the key is present. Authenticated sessions are stored in PostgreSQL and expire
five days after the last activity; anonymous history stays in the frontend
localStorage with the same five-day TTL.

## User journeys

1. A visitor asks how many species WildVN contains and receives the database count.
2. A visitor asks about a species and receives a link/citation to its detail page.
3. An authenticated user refreshes the page and can reload an unexpired session.
4. A visitor without a Claude key can use the database provider; adding the key later switches provider without a contract change.

## Evidence

| Guarantee | Test/command | Result |
|---|---|---|
| Provider auto mode uses database without a key and Anthropic with a key | `./gradlew test --tests com.example.wildvn.domain.chat.ChatProviderRouterTest` | PASS |
| Invalid/empty chat payloads are rejected before provider execution | `./gradlew test --tests com.example.wildvn.domain.chat.ChatRequestValidatorTest` and `ChatApiIntegrationTest` | PASS |
| Retention expires at the five-day boundary | `./gradlew test --tests com.example.wildvn.domain.chat.ChatHistoryRetentionTest` | PASS |
| Count response comes from PostgreSQL and authenticated chat returns a session id | `ChatApiIntegrationTest` | PASS |
| Chat UI uses request snapshots, citations, SSE contract and five-day local TTL | `npx --no-install tsx --test scripts/chat-runtime.test.ts` | PASS (3/3) |
| Existing frontend runtime remains green | `npx --no-install tsx --test scripts/chat-runtime.test.ts scripts/frontend-species-runtime.test.ts scripts/minio-image-config.test.ts scripts/academy-frontend-runtime.test.ts scripts/species-detail-ui.test.ts scripts/taxonomy-parser.test.ts` | PASS (28/28) |
| Frontend type safety and production bundle | `npx --no-install tsc --noEmit`; `npm run build` | PASS |
| Existing backend suite remains green | `./gradlew test` | PASS |

## Known gaps

- Anthropic calls are tested through provider selection and the adapter contract;
  no paid external request is made without a real key.
- The SSE endpoint chunks a complete provider response. Token-native streaming
  can be added later when the selected model/provider exposes it.
- Thumbs-up/down feedback is currently an interactive local UI state; durable
  feedback storage is intentionally left for a follow-up migration.
- Rate limiting is in-memory and should move to Redis for multi-instance production.
