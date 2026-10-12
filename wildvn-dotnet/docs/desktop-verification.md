# T04 — WPF shell / HTTP transport verification

SDK 10.0.401, net10.0-windows, WPF, EnableWindowsTargeting. Actual Linux cross-build
passed with zero warnings/errors. This does **not** mean the executable ran on Windows.
[RED shell](../evidence/t04-shell-red.txt) and [RED client](../evidence/t04-client-red.txt)
exercise missing implementation. [GREEN](../evidence/t04-green.txt): 18 shell tests and
33 fake-handler HTTP tests, no skips; no request to a real backend.

Shell navigation and network states are Vietnamese and immutable snapshots. I/O awaits
without blocking UI; commands prevent duplicate checks and remain navigable while loading.
Cancel/close/replacement suppress old completion/error updates. Every business destination
explicitly says unavailable; health liveness does not claim catalog/auth have migrated.
No automatic request on startup. No Node/Next process needed.

HttpClient: validated HTTPS origin or explicitly opted-in HTTP loopback, finite timeout,
caller cancellation, in-memory CookieContainer, no redirects in production factory, safe
status mapping without response body leakage. Retry budget defaults to zero; only a caller
explicitly marked safe GET may retry selected transient statuses (max2). POST never retries;
GET /api/search is not safe by default. Auth/XSRF/SSE port remains deferred to T08/T22.
ApiClient project references shared contracts without a server project reference.

Run Windows executable with environment configuration:

```powershell
$env:WILDVN_API_BASE_URL = 'https://localhost:5123/'
dotnet run --project src/WildVN.Desktop/WildVN.Desktop.csproj
```

For the newly built isolated API only, explicitly opt into loopback HTTP with
WILDVN_ALLOW_LOOPBACK_HTTP=1; port must match the separately started API. No real endpoint
is required merely to launch/navigate the shell. Do not use health checking as permission
for later business mutations on a real environment.

Cross-platform verification:

```bash
dotnet test tests/WildVN.ApiClient.Tests --collect:'XPlat Code Coverage'
dotnet test tests/WildVN.Desktop.Tests --collect:'XPlat Code Coverage' -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.IncludeTestAssembly=true 'DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.ExcludeByFile=**/*Tests.cs'
dotnet build src/WildVN.Desktop --no-restore
```

Linked production shell code is included in the test assembly for Linux portability;
IncludeTestAssembly=true measures it, ExcludeByFile excludes only test source. Measured
shell production: 97.89% lines / 98.27% branches; ApiClient: 100% lines / 98.48% branches.
Reports from separate suites must be merged by source/line, not averaged with duplicate
uncovered reference assemblies. App.xaml.cs/MainWindow.xaml.cs/XAML runtime are unmeasured
here and no global 80% production C# gate is claimed. T27/Windows runner is still required.

Pending actual Windows smoke: launch, five navigation items, manual health loading/error,
check/cancel/double click, close during request, keyboard/screen reader, real UI dispatcher,
clean machine without SDK/Node, and Windows UI Automation evidence. No visual screenshot
or device PASS is recorded in this Linux run.
