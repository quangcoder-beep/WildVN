# T02 — source-derived PostgreSQL fixture and migration ownership

**Real database baseline: pending.** No real DB or sanitized backup was supplied/approved.
The only DB accessed was our disposable `postgres:15-alpine` container, numeric loopback,
PostgreSQL 15.18. This fixture is not a production snapshot, actual row count, actual
Flyway history, media object inventory, embedding/vector parity or real backup rehearsal.

## Source and schema differences

`tests/Fixtures/schema.sql` (present before this run) contains exact ordered copies of
Spring `beforeMigrate.sql`, V0–V4 and `afterMigrate.sql`. A source test checks byte-for-byte
inclusion and ordering. No `db/design/*` or `db/sql/*` script was executed. V0 already had
an uncommitted user change; it was preserved, not repaired or committed here.

| Source fixture fact | Difference/limitation |
|---|---|
| 14 quoted/runtime enum types; `species.habitat_type` enum array; synonyms TEXT[] | Do not normalize to unquoted lower-case types |
| `species.conservation_status` VARCHAR(255) | Design uses a conservation enum; unknown legacy text is possible |
| Species/ecosystem gallery text; locations gallery JSONB; source_references JSONB | Do not assume every gallery column is a JSON array |
| users/chat ownership UUID; favorites/Academy user_id VARCHAR(255) username | No users FK on favorites/Academy; fixture intentionally includes an unlinked legacy key |
| pgcrypto enabled; optional extensions enabled only when installed by V0 | Prisma declares pg_trgm/postgis/uuid-ossp/vector; this basic container cannot certify those capabilities |
| 18 tables from runtime bootstrap; chat V4 with role CHECK/FKs/indexes | Design adds relationships/embeddings/gamification tables beyond this source baseline |

Synthetic seed: 4 species (2 visible published, 1 draft, 1 soft-deleted), 3 users,
2 favorites, 2 Academy progress rows, 2 sessions and 4 messages; all 18 table counts
are asserted. Synthetic Argon2id hash verified using libargon2; Java/C# interoperability
is T07. Legacy malformed gallery/progress and old expedition data are edge fixtures,
not new catalog features or a promise that sync accepts new expeditions.

## Real executions

[RED](../evidence/t02-red.txt): missing guard scripts and missing tables/data on an empty
disposable database. [GREEN](../evidence/t02-green.txt): 11/11 tests, zero skips, including
source/connection guards, types, Unicode/JSON, legacy keys, counts, FK/CHECK/uniqueness,
indexes and refusal to restore into nonempty DB without changes.

[Independent backup/restore](../evidence/t02-restore.txt): `pg_dump --format=custom
--no-owner --no-privileges`, then `pg_restore --exit-on-error --no-owner --no-privileges`
into a second empty fixture DB. All 18 tables compared by sorted row JSON: identical,
aggregate SHA256 `8c5bd108ebd912b0a1ec1aaaa1e4b5ff019b0ae6808060a8b30d07c11b1b41f6`.
The restored DB passed the same 11 tests. Textual schema diff was **not zero**:
PostgreSQL rewrote the chat role CHECK array cast from an array-wide cast to per-element
casts. All other schema text matched after removal of pg_dump random restrict markers
and trailing whitespace. Both CHECK forms were compared on NULL/user/assistant/system/
empty/USER; identical results. No blanket schema differences were ignored.

## Reproduce safely

Use an empty disposable PostgreSQL 15 DB named `wildvn_fixture_*`, on numeric loopback
with an explicit port and synthetic credentials, never a real DB URI. Supply connection
via environment (do not paste it into committed logs):

```bash
export WILDVN_FIXTURE_CONNECTION='postgresql://fixture:<temporary-password>@127.0.0.1:<port>/wildvn_fixture_source'
bash build/restore-fixture.sh
bash build/verify-fixture.sh
python3 -m unittest discover -s tests -p fixture_validation_test.py -v
```

The guard rejects remote hosts, localhost/DNS aliases, absent credentials/port, all URI
queries/fragments and non-fixture DB names before invoking psql. It clears inherited PG
connection overrides, uses `psql -X --no-password`, checks for nonempty objects, and
restores schema+seed in one transaction. It never drops DB/tables. Shell scripts replace
the anticipated PowerShell harness because pwsh is absent; the test exercises the actual
host's PostgreSQL tools. Run backup/restore against another checked empty fixture only.

## Migration ownership

During coexistence: the Spring Flyway pipeline is the sole DDL owner. Actual configured
history table is `spring_flyway_schema_history` (`wildvn-server/src/main/resources/application.yml`).
The fixture copies SQL without pretending Flyway ran: no fake Flyway/EF history is created.
For a real baseline, retain the actual history/checksums, runtime extensions/views/triggers,
counts/IDs/media references and restore an authorized sanitized backup before C01 acceptance.
Runtime .NET credentials must have no schema-migration role. No `EnsureCreated`, startup
`Database.Migrate`, EF initial CREATE or parallel EF/Flyway ownership.

After cutover: one explicit .NET deployment SQL migration pipeline takes ownership only
after approved baseline/empty-existing DB tests and preserved Flyway history. EF migrations
remain deferred until a reviewed baseline proves compatibility. Existing caller-visible
keys/types remain unchanged; DDL ownership is not inferred from this test fixture.
