# P0 — execution evidence and acceptance status

Source plan: ../../wildvn-client/docs/desktop-dotnet/plan.md and todo.md.
User scope: T01–T05 only, test first, minimal code, exactly one local commit per task.
Task slices were declared before implementation in [p0-execution.md](p0-execution.md).
Evidence files preserve actual commands and outcomes. No production API/DB/OAuth calls.

## T01 — inventory and source-derived contracts

- RED: `python3 -m unittest discover -s wildvn-dotnet/tests -p contract_snapshot_test.py -v`;
  9 tests failed because contract snapshot did not exist ([log](../evidence/t01-red.txt)).
- GREEN: same command, 9/9 passed, 0 skips ([log](../evidence/t01-green.txt)).
- Guarantees: all 16 page sources and 33 Spring controller endpoints are indexed; all 26
  selected DTO field snapshots match Java declarations. Fixtures retain separate auth,
  empty logout, error and SSE families, explicit cookie/XSRF and GET analytics side effects.
- Review: checked controller/security/DTO source paths, synthetic .invalid samples,
  placeholder status and per-endpoint visibility. No Java/Next runtime or live wire capture.
- Credential audit: only filename/metadata inspected. Root .git is empty and cannot answer
  historical tracking/sharing; root credential is outside the independent client/server
  repositories. Neither content nor credential file was read, edited, copied or staged.
  Migration build inputs are scoped to wildvn-dotnet; ignore rules exclude credential JSON.
  No evidence proves exposure or successful provider configuration; rotation remains
  conditional on a separately confirmed exposure and authorization.

## Remaining acceptance boundaries

T02 real database snapshot/history/counts require an authorized sanitized backup or test DB.
T04 Windows execution and UI Automation, and T05 codecs/DPI/lifecycle/performance measurements
require Windows machines. Linux compile/unit results do not certify those acceptance criteria.
No task below T05 is authorized in this run. Final status must distinguish implemented
artifacts from pending device/runtime acceptance; P0 is not automatically release-ready.

## T02 — isolated PostgreSQL harness (real-baseline acceptance pending)

- RED/GREEN: [RED](../evidence/t02-red.txt), [11/11 GREEN](../evidence/t02-green.txt).
- Actual PostgreSQL restore, real enum/array/JSONB/UUID/string-key checks, counts,
  constraints/indexes, nonempty refusal and independent backup round-trip executed.
- All 18 tables retain exact row JSON after independent restore; one role CHECK rendering
  difference reviewed/tested; [details](database-baseline.md), [restore log](../evidence/t02-restore.txt).
- Diff check preserves existing upstream SQL whitespace via a per-file attribute; source byte equality still tested.
- Missing acceptance: approved real DB snapshot/Flyway history/count/media baseline,
  optional PostGIS/vector/extensions and actual backup restore; C01 remains pending.

## T03 — .NET 10 API/contracts skeleton

- [RED](../evidence/t03-red.txt): compile-time failure on referenced missing API/contracts
  implementation, not a syntax/dependency failure. SDK 10.0.401 downloaded from Microsoft
  release metadata and SHA512 verified; pinned in global.json, installed under /tmp only.
- [GREEN/build/audit/Kestrel](../evidence/t03-green.txt): 10/10 xUnit tests, zero skips;
  API build zero warnings/errors; NuGet vulnerability audit found none in current feeds.
  Kestrel loopback liveness 200, readiness 503, unported species route 404 verified.
- Tests round-trip all T01 auth/envelope/error fixtures and compare shared enum sets;
  bare auth nulls, envelope null omission, pagination, 404/405 error shape and safe
  failed/default/injected dependency readiness are verified. API/contracts coverage
  100% measured lines and branches (51/51 lines, 6/6 branches).
- No DB/migrations/secrets bundled; environment configuration uses ASP.NET defaults.
  ApiClient references Contracts only, not server implementation. Readiness cannot be
  switched green by a configuration flag; dependencies are unverified until implemented.
- Business endpoints/validation/auth/SSE remain subsequent tasks; no synthetic success
  endpoint was added. Java wire parity and real dependency readiness remain unverified.

## T04 — WPF shell and ApiClient (Windows acceptance pending)

- RED: [shell](../evidence/t04-shell-red.txt), [client](../evidence/t04-client-red.txt).
  GREEN: [18 shell + 33 handler tests, Linux cross-build](../evidence/t04-green.txt).
- Tested async navigation/loading/Vietnamese errors, duplicate/cancel/late/close behavior;
  HTTPS/loopback configuration, timeout/cancellation, cookie jar, safe opt-in GET retry,
  zero default retries and no POST retries. Business sections remain explicitly unavailable.
- Measured shell 97.89% lines/98.27% branches; client 100%/98.48%.
  WPF adapters/XAML runtime and global production coverage are unverified, not excluded
  to declare T27 passed. [Windows smoke instructions and limits](desktop-verification.md).

## T05 — local native/WebView2 media PoC (device acceptance pending)

- [RED](../evidence/t05-red.txt): absent media policy/HTML; then intended stream-path and
  trailing-newline allowlist failures. [GREEN](../evidence/t05-green.txt): 62 desktop tests
  (18 shell +44 media), 3 HTML/real-script DOM-stub tests, WPF cross-build zero warnings/errors.
- Native/WebView presenters use the same staged selected files, no full source directory
  exposure; native image decode off UI thread, all player sources cleared/disposed on exit.
  Local HTML CSP, exact document/resource allowlists and no web bridge. Tests verify pure
  policy/state/JS logic; adapters/real playback remain Windows-unverified.
- Linux ffprobe +3-frame decode passed repository MP4 H.264/AAC, WebM VP9/Opus and JPEG;
  that is not evidence of Windows codecs or real MinIO URL/presigned expiry behavior.
- Provisional renderer/runtime choice and full pending matrix: [media-poc-results.md](media-poc-results.md).
  No Windows numbers/screenshots were fabricated. PowerShell device helper not executed or
  parsed here. Retain WPF default until approved Windows/MinIO evidence can decide T05.

## Final verification and acceptance

[Final log](../evidence/p0-final.txt): 105 C# tests (10 API,33 client,62 desktop) and
23 Python/source/PostgreSQL tests pass; zero skipped. API build and WPF cross-build pass.
Actual Kestrel liveness/readiness/error requests ran on our temporary loopback process;
PostgreSQL tests and backup restore used only our disposable container. Secret review
checked new source/fixture inputs and explicit packaging paths, never credential contents.
Client/server working-tree status remains identical to the initial status; no push/deploy.

| Task | Implemented / checked | Acceptance still missing |
|---|---|---|
| T01 | complete source-backed inventory/snapshots | Java wire/runtime/provider/ML deployment verification |
| T02 | guarded source fixture, real PostgreSQL tests, independent backup restore | authorized real DB snapshot/counts/extensions/Flyway history; C01 pending |
| T03 | API/contracts build/test/Kestrel + source fixture serialization | real dependency readiness and later business endpoint validation |
| T04 | shell/client logic tests + WPF cross-build | Windows executable/UI Automation/dispatcher/clean-machine smoke |
| T05 | native/local WebView PoC/policy/JS/core build and offline media probe | Windows10/11 eligibility+DPI/device/codec/lifecycle/performance/snapshots; actual MinIO samples/URL errors; final renderer/runtime choice |

Measured API/contracts 100% lines/branches; client 100%/98.48%; shell 97.89%/98.27%;
media policy 100%/91.17%; media state100%/100%. These are tested production portions,
not a full-repository 80% gate. WPF adapters/XAML/device behavior are unmeasured; T27
has not run. All RED/GREEN evidence remains in commits rather than separate checkpoint
commits because user explicitly requested one commit per parent task.

P0 artifacts are reviewable, but C01 and full T04/T05 device acceptance are **not passed**.
Stopped after T05. No T06 or later task implemented. Obtain an authorized sanitized DB
backup and supported Windows desktop session before accepting P0 or expanding migration.

## Self-evaluation (agent-self-evaluation skill)

| Axis | Score | Evidence / improvement |
|---|---:|---|
| Accuracy | 4/5 | actual tests/build/probes logged; Windows and production schema remain unknown, explicitly distinguished |
| Completeness | 3/5 | P0 artifacts/one task commit ready; real baseline and Windows T04/T05 acceptance unavailable |
| Clarity | 4/5 | source/device status separated; technical evidence spans several linked reports |
| Actionability | 4/5 | runnable fixture/test commands and Windows scenarios; device helper itself unexecuted |
| Conciseness | 4/5 | concise final response; raw RED logs intentionally verbose for reproducibility |

Overall3.8/5. Highest-impact follow-ups are the real sanitized backup restore and supported
Windows matrix; neither can be replaced by a mock or Linux cross-build. A reader can act
on the artifacts while seeing why full acceptance is still pending. No scores are treated
as permission to proceed to T06.

## Local re-run prerequisites

Linux SDK used in this run: `/tmp/wildvn-dotnet-sdk/dotnet` (10.0.401, SHA512-verified).
The system SDK remains8.0.131; global.json intentionally does not fall back to8. Install
SDK10 or use that explicit binary; no persistent PATH/user-config change was made.
After our disposable container is removed, recreate your own local fixture; never point
these commands at a real environment:

```bash
poc_password=$(openssl rand -hex 16)
docker run --detach --rm --name wildvn-p0-fixture --publish 127.0.0.1::5432 --env POSTGRES_USER=fixture --env POSTGRES_PASSWORD="$poc_password" --env POSTGRES_DB=wildvn_fixture_source postgres:15-alpine
poc_port=$(docker port wildvn-p0-fixture 5432/tcp | cut -d: -f2)
export WILDVN_FIXTURE_CONNECTION="postgresql://fixture:$poc_password@127.0.0.1:$poc_port/wildvn_fixture_source"
# Wait for this new container's pg_isready, then:
bash build/restore-fixture.sh
python3 -m unittest discover -s tests -p '*_test.py' -v
# Stop/remove only the fixture you created after inspection.
docker stop wildvn-p0-fixture
```

Independent pg_dump/restore results remain in t02-restore.txt even after disposal;
fixture source/seed rebuild them without a real DB. Windows commands require SDK10 and
an interactive supported Windows session; WebView mode additionally requires Runtime.

## Sequential handover continuation — 2026-10-09

Read execution contract/status/history first: clean HEADa7391b0 with five task commits.
T02 fixture had already passed; no synthetic RED or reversal of commits. Continuation
adds a separate handover commit with runner/tests and four reports, not T06.

- Runner18/18 after actual RED; fixture guard7/7. Python line97.83%, branch93.75%,
  combined96.77%. Root-only Coverlet branches and PostgreSQL TCP bootstrap race tested.
- Actual Release run:105 unique C# and48 unique Python cases passed; repeated desktop/
  independent-restore executions counted once. Builds zero warnings/errors.
- Real curl per T02–T05 against our own Kestrel:200/503/404/405 with actual headers/body.
  Independent PostgreSQL15.18 restore matches18 table counts/SHA256 digests.
- Portable C# union251/252lines(99.60%), branch lower bound173/178(97.19%);5 WPF adapter
  files/XAML/Windows/global coverage remain **CHƯA KIỂM CHỨNG**.
- Default runner exits2 for incomplete P0; --serve extra curl and Ctrl-C exit130 exercised.
  Actual process/container cleanup verified, Jenkins untouched.
- Todo updated only8 fully evidenced criteria; T06 onward byte-identical. Original source
  changes/credentials preserved. Todo remains in client's already-untracked docs directory;
  exact authorized patch retained with migration evidence.
- NuGet and pinned Python tooling audits report no known advisories in current feeds.
  One read-only reviewer PASS with18+7 tests independently re-run; no concurrent workers.

[Handover](../handover/HANDOVER.md), [test report](../handover/TEST-REPORT.md),
[known issues](../handover/KNOWN-ISSUES.md), [Windows checklist](../handover/CHECKLIST-WINDOWS.md).
Actual logs/selected raw coverage XML/SHA256 manifest: [evidence/p0-rerun](../evidence/p0-rerun/).
P0 unaccepted pending real baseline/history, Windows acceptance and full production gate.
Stop after T05 for user confirmation. No production calls/design DDL/credential-content
access/push/deployment or invented business capability.

Continuation self-evaluation (agent-self-evaluation): accuracy4/5(actual output; Java wire
unknown), completeness3/5(real baseline/Windows/full gate missing), clarity4/5(linked reports,
several artifacts), actionability4/5(one-command runner; SDK/tooling under/tmp must be
reinstalled), conciseness3/5(raw logs long; task updates concise). Overall3.6/5.
Highest impact: authorized sanitized baseline and supported Windows runtime coverage/device
matrix. Gaps need external environment, not another mock. Self-check: user can reproduce
portable results and see why full P0 PASS is not defensible. Easy missing-link/wording gaps fixed.

Raw captured logs/diffs/curl headers intentionally retain whitespace and CRLF. Scoped
.gitattributes preserves evidence bytes/SHA256 across checkout; source whitespace checks
remain active. This changes no source/report content or measurements.
