# Password recovery — source review and verification

Scope: two web pages + recovery service, .NET endpoints/validation/registration,
application recovery orchestration, PostgreSQL requests/encrypted outbox/version
rows, atomic reset, JWT credential-version enforcement and SMTP worker.

Independent agent `/root/recovery_review` reviewed all listed source and SQL/docs.
First MEDIUM: unknown/ineligible email returned faster than an eligible request.
Fixed with randomized 750–999ms minimum response duration measured monotonically,
including suppressed/cooldown/null/exception paths. This masks normal differences,
not unusually slow dependencies; not a formal timing guarantee.
Final review (including hash+email fingerprint delta) found no remaining concrete
CRITICAL/HIGH/MEDIUM source issue within scope. No runtime assertions were made.

Root corrections before closure:

- Read hash + credential version in a single statement so concurrent login/reset
  cannot issue a new-version token based on an old password hash.
- Recheck token expiry after the user lock; consume conditional count=1 and password,
  version, session/link revocation all share the same explicit transaction.
- Bind fingerprint to current hash + email; email changes invalidate links and
  recipient lookup/lock races fail closed.
- Recovery POST bypasses stale cookie authentication lookup. Reset credentials
  include permits clearing cookies; web clears local authStore after success.
- Encrypted outbox uses strict SMTP TLS, lease ownership checks and bounded retries;
  terminal payload is wiped and stale requests have bounded cleanup.

Verification performed (compiler/static only, user deferred tests):

| Check | Result / evidence |
|---|---|
| API Release build, final source | PASS, 0 warnings/errors; build-final.txt |
| Scoped strict TS semantic compiler (three files and imported source, official Next globals) | PASS, 0 diagnostics; frontend-typecheck.txt |
| API locked restore | PASS; locked-restore.txt |
| Infrastructure NuGet vulnerable audit including transitives | none reported by current NuGet source; dependency-audit.txt |
| Git whitespace diff check, both repos | PASS |
| Unit/integration/E2E/coverage/DB/HTTP/SMTP/browser/runtime acceptance | NOT RUN, deferred by explicit user instruction |

No DB connection, DDL execution, SMTP/provider call, API startup/restart, credential
read, deployed web build, push or publication occurred. SQL is a reviewable artifact.
Existing user changes in client next-env.d.ts, Jenkinsfile and docs/desktop-dotnet
were preserved. Web changes remain local separately from the .NET checkpoint.

Reproduce scoped typecheck from wildvn-client directory:
`node ../wildvn-dotnet/evidence/password-recovery/frontend-typecheck.cjs`
This is not a test suite or full Next production build.

Self-evaluation (agent-self-evaluation):

| Axis | Score | Evidence / improvement |
|---|---:|---|
| Accuracy | 4 | Compilers and independent source review clear; EF/SMTP concurrency behavior awaits runtime verification. |
| Completeness | 4 | Full requested source pipeline implemented; host schema, SMTP/keyring provisioning and acceptance are still external steps. |
| Clarity | 4 | Dedicated implementation doc distinguishes source completion, host prerequisites and historical evidence. |
| Actionability | 4 | Additive SQL/settings/backlog supplied; actual host values intentionally untouched. |
| Conciseness | 4 | Focused source files, shared existing UI; detailed deployment evidence kept out of user flow. |

Average 4.0/5. Highest-impact next verification: isolated DB reset/login races;
TLS SMTP/outbox restart/lease cases; complete browser flow including cookie clearing.
Would the user agree? Source request is fulfilled; no claim of 100% runtime correctness
or completion of the unrelated migration plan.
