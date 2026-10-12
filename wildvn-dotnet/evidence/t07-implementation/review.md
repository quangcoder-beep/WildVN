# T07 source checkpoint — 2026-10-11

Implementation: Application auth ports/service, PostgreSQL user/profile store,
legacy Argon2id/JWT, cookie endpoints, opt-in registration, CSRF/bootstrap, DB role
policy, request/body/concurrency limits and redacted errors. Source behavior was
compared with Java auth/security files, never application config/credentials.

Independent `/root/t07_review` final static pass: no remaining CRITICAL/HIGH/MEDIUM
findings. Fixed findings: valid cookies no longer send /health liveness through
DB; POST logout skips DB lookup; SameSite parsing rejects undefined enum values.
Planner/crypto role agents could not execute due usage limit. Root implemented;
those failed agents supplied no planning/crypto verification evidence. Default
review agent completed independently without tests/build/DB/edit/stage/commit.

[Final compiler](build-final.txt): API + Application + Infrastructure Release,
0 warnings/errors. [Dependency audit](dependency-audit.txt): current NuGet source
reports no vulnerable package for Infrastructure including transitive graph.
Pinned graph is in Infrastructure/packages.lock.json;
[locked restore](restore-locked.txt) completed successfully. This does not prove runtime
crypto/EF/HTTP correctness or absence of all vulnerabilities.

No tests, coverage, Java interoperability vectors, DB/HTTP round-trip or Windows
acceptance ran. No project credentials/config were read or changed, live services
called, DDL executed, process restarted or ZIP repackaged. User-attached web forgot page was subsequently
edited to remove timer/fake sent-success and show unavailable/login; isolated TS
syntax transpile reports zero errors. This separate web edit remains uncommitted,
existing client changes are preserved, browser/semantic checks are deferred.
[Deferred verification cases](../../docs/auth-implementation.md) remain unchecked.

## Self-evaluation

Overall 4.0/5 for source implementation, not runtime acceptance.

| Axis | Score | Evidence / improvement |
|---|---:|---|
| Accuracy | 4 | Compiler and independent review support source claims; exact Java hash/JWT vectors and HTTP behavior still need deferred verification. |
| Completeness | 4 | T07 routes/store/crypto/CSRF/roles/throttling implemented; acceptance evidence intentionally pending and T08 UI remains next task. |
| Clarity | 4 | Current REVIEW separates implementation from unrun tests; detailed host policy needs deployment-specific settings later. |
| Actionability | 4 | Code/build/settings/deferred cases are recorded; host must supply secrets and one-replica ownership before enabling auth. |
| Conciseness | 4 | REVIEW links to details; policy deviations require a longer auth report for future interoperability review. |

Improvements: run documented Java/.NET and DB/HTTP cases at the later verification
phase; compose WinForms T08 session/UI without adding placeholder reset success.
Self-check: likely yes — continued implementation on Ubuntu and deferred tests as
requested. Save a local source checkpoint; do not label the migration accepted.

Referenced web page final static review by /root/t07_review found no concrete bug:
no timer/fake success; clear unavailable text; existing /login link with keyboard
focus; one h1 and decorative icons aria-hidden. Reset/email functionality is not
implemented. [Page syntax](forgot-page-syntax.json), [page source hash](forgot-page-source.json).
