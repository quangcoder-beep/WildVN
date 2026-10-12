# Unit/parser tests with mocked process handles; these do NOT assert Windows execution.
param([string]$Runner = (Join-Path $PSScriptRoot '../build/Review-Windows.ps1'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$temp = Join-Path ([IO.Path]::GetTempPath()) ('wildvn-runner-test-' + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $temp | Out-Null
$script = Join-Path $temp 'Review-Windows.ps1'
Copy-Item -LiteralPath $Runner -Destination $script
$checks = 0
$failures = @()
function Assert-True([bool]$Condition, [string]$Label) {
    if (-not $Condition) { throw $Label }
}
function Test-Case([string]$Label, [scriptblock]$Call) {
    try { & $Call | Out-Null; $script:checks++; Write-Output "PASS: $Label" }
    catch { $script:failures += "$Label :: $_"; Write-Output "FAIL: $Label :: $_" }
}
function Must-Reject([scriptblock]$Call, [string]$Label) {
    $rejected = $false
    try { & $Call | Out-Null } catch { $rejected = $true }
    if ($rejected) { $script:checks++; Write-Output "PASS reject: $Label" }
    else { $script:failures += "Accepted unsafe case: $Label"; Write-Output "FAIL accepted: $Label" }
}
function Manifest([object[]]$Files) {
    @{schema=1;flavour='win-x64';files=$Files} | ConvertTo-Json -Depth 8 |
        Set-Content -LiteralPath (Join-Path $temp 'manifest.json')
}
function Entry([string]$Name) {
    $file = Join-Path $temp $Name
    @{path=$Name;size=(Get-Item -LiteralPath $file).Length;sha256=(Get-FileHash -LiteralPath $file).Hash}
}
try {
    $tokens=$null; $errors=$null
    $ast=[Management.Automation.Language.Parser]::ParseFile($Runner,[ref]$tokens,[ref]$errors)
    Test-Case 'parser (current PowerShell, not Windows5.1 execution)' { Assert-True ($errors.Count -eq 0) ($errors | Out-String) }
    Manifest @()
    Must-Reject { & $script -Action Check } 'empty manifest cannot verify a client'
    $base = @()
    foreach ($name in @('WildVN.Desktop.exe','WildVN.Desktop.dll','LibVLCSharp.dll',
            'WildVN.ApiClient.dll','WildVN.Contracts.dll','coreclr.dll','System.Windows.Forms.dll',
            'WildVN.Desktop.deps.json','WildVN.Desktop.runtimeconfig.json',
            'libvlc/win-x64/libvlc.dll','libvlc/win-x64/libvlccore.dll',
            'libvlc/win-x64/plugins/codec/test.dll')) {
        $file=Join-Path $temp $name
        New-Item -ItemType Directory -Force -Path (Split-Path $file) | Out-Null
        [IO.File]::WriteAllText($file,'unit fixture, not an executable')
        $base += (Entry $name)
    }
    $base += (Entry 'Review-Windows.ps1')
    Manifest $base
    Test-Case 'complete unit payload hashes (not Windows run)' { & $script -Action Check }
    Must-Reject { Manifest ($base + @($base[-1])); & $script -Action Check } 'duplicate manifest entry'
    $duplicate=@{path='WILDVN.DESKTOP.EXE';size=$base[0].size;sha256=$base[0].sha256}
    Must-Reject { Manifest ($base + @($duplicate)); & $script -Action Check } 'case-insensitive duplicate'
    foreach ($path in ('../private','/private','C:/private','OAuthCredentials.json','appsettings.Development.json',
            'libvlc/win-x64/./libvlc.dll','./WildVN.Desktop.dll','libvlc//win-x64/libvlc.dll',
            'libvlc\win-x64\libvlc.dll','libvlc/win-x64/.. /file.dll','sample.dll.','con.dll')) {
        $bad=@{path=$path;size=$base[9].size;sha256=$base[9].sha256}
        Must-Reject { Manifest ($base + @($bad)); & $script -Action Check } "unsafe path $path"
    }
    foreach ($name in ('WildVN.ApiClient.dll','WildVN.Contracts.dll','WildVN.Desktop.deps.json',
            'WildVN.Desktop.runtimeconfig.json','libvlc/win-x64/plugins/codec/test.dll')) {
        Must-Reject { Manifest @($base | Where-Object path -ne $name); & $script -Action Check } "missing required $name"
    }
    foreach ($change in @(@{size=$base[0].size.ToString()},@{size=-1},@{size=1.5},@{size=$null},@{size=$true},
            @{sha256='x'*64},@{sha256=$null},@{path=$null})) {
        $bad=@{path=$base[0].path;size=$base[0].size;sha256=$base[0].sha256}
        foreach ($key in $change.Keys) { $bad[$key]=$change[$key] }
        Must-Reject { Manifest (@($bad) + @($base | Select-Object -Skip 1)); & $script -Action Check } ('malformed entry ' + ($change | ConvertTo-Json -Compress))
    }
    foreach ($document in @(@{schema='1';flavour='win-x64';files=$base},
            @{schema=$true;flavour='win-x64';files=$base},@{schema=1;flavour='win-x64';files=$null},
            @{schema=1;flavour='win-x64';files=$base[0]},@{schema=1;flavour='win-x64'})) {
        Must-Reject { $document | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $temp 'manifest.json'); & $script -Action Check } 'malformed manifest schema'
    }
    Manifest $base
    foreach ($extra in ('private.json','.hidden','extra.dll')) {
        $file=Join-Path $temp $extra
        [IO.File]::WriteAllText($file,'not in manifest')
        Must-Reject { & $script -Action Check } "unlisted disk file $extra"
        Remove-Item -LiteralPath $file -Force
    }
    $empty=Join-Path $temp 'private'
    New-Item -ItemType Directory -Path $empty | Out-Null
    Must-Reject { & $script -Action Check } 'unlisted empty directory'
    Remove-Item -LiteralPath $empty
    foreach ($runtime in ('client.log','.review-session.json')) {
        $file=Join-Path $temp $runtime
        [IO.File]::WriteAllText($file,'runner runtime file')
        Test-Case "allow regular runtime file $runtime" { & $script -Action Check }
        Remove-Item -LiteralPath $file -Force
    }
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        $target=Join-Path $temp 'WildVN.Desktop.dll'
        foreach ($name in ('manifest.json','client.log','.review-session.json')) {
            $file=Join-Path $temp $name
            if (Test-Path -LiteralPath $file) { Move-Item -LiteralPath $file -Destination ($file+'.backup') }
            # Keep backups outside the package so rejection is specifically about links.
            if (Test-Path -LiteralPath ($file+'.backup')) { Move-Item ($file+'.backup') (Join-Path ([IO.Path]::GetTempPath()) ('wildvn-backup-' + $name + '-' + (Split-Path $temp -Leaf))) }
            New-Item -ItemType SymbolicLink -Path $file -Target $target | Out-Null
            Must-Reject { & $script -Action Check } "linked $name"
            Remove-Item -LiteralPath $file -Force
            if ($name -eq 'manifest.json') { Manifest $base }
        }
        $link=Join-Path ([IO.Path]::GetTempPath()) ('wildvn-ancestor-' + [Guid]::NewGuid())
        New-Item -ItemType SymbolicLink -Path $link -Target (Split-Path $temp) | Out-Null
        try {
            $linkedScript=Join-Path (Join-Path $link (Split-Path $temp -Leaf)) 'Review-Windows.ps1'
            Must-Reject { & $linkedScript -Action Check } 'linked ancestor of package root'
        } finally { Remove-Item -LiteralPath $link }
        foreach ($action in ('Start','Status','Stop')) {
            Must-Reject { & $script -Action $action } "Linux $action cannot pretend Windows"
        }
    }
    [IO.File]::WriteAllText((Join-Path $temp 'WildVN.Desktop.exe'),'tampered')
    Must-Reject { & $script -Action Check } 'tampered executable'
    [IO.File]::WriteAllText((Join-Path $temp 'WildVN.Desktop.exe'),'unit fixture, not an executable')

    # Load functions alone for deterministic handle/reservation failure injection.
    # The actual script's Start/Status/Stop platform gate above remains exercised.
    foreach ($function in $ast.FindAll({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst]}, $false)) {
        Invoke-Expression $function.Extent.Text
    }
    $packageRoot=$temp; $executable=Join-Path $temp 'WildVN.Desktop.exe'; $statePath=Join-Path $temp '.review-session.json'
    $ApiUrl='https://example.invalid'; $AllowLoopbackHttp=$false; $WithSamples=$false
    Test-Case 'testable owned session lifecycle exists' {
        Assert-True ($null -ne (Get-Command Start-ReviewSession -ErrorAction SilentlyContinue)) 'Missing Start-ReviewSession function'
    }
    if (Get-Command Start-ReviewSession -ErrorAction SilentlyContinue) {
        Add-Type -TypeDefinition @'
public sealed class ReviewTestProcess {
    public int Id = 98765;
    public string Path;
    public System.DateTime StartTime = new System.DateTime(2026, 1, 1, 0, 0, 0, System.DateTimeKind.Utc);
    public bool HasExited = false;
    public bool Killed = false;
    public bool Disposed = false;
    public bool KillThrows = false;
    public bool CloseResult = true;
    public bool WaitResult = true;
    public int HandleReads = 0;
    public System.IntPtr Handle { get { HandleReads++; return new System.IntPtr(17); } }
    public void Kill() { if (KillThrows) throw new System.Exception("injected kill failure"); Killed = true; HasExited = true; }
    public bool CloseMainWindow() { return CloseResult; }
    public bool WaitForExit(int timeout) { if (WaitResult) HasExited = true; return WaitResult; }
    public void Dispose() { Disposed = true; }
}
'@
        $script:launchFails=$false; $script:launches=0; $script:reservationObserved=$false
        function Start-Process {
            param($FilePath,$WorkingDirectory,[switch]$PassThru)
            $script:launches++
            $lockRejected=$false
            try { $other=[IO.File]::Open($statePath,[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None); $other.Dispose() }
            catch { $lockRejected=$true }
            $script:reservationObserved=$lockRejected
            if ($script:launchFails) { throw 'injected start failure' }
            return $script:fakeProcess
        }
        function Get-Process { param($Id) return $script:fakeProcess }
        $script:fakeProcess=New-Object ReviewTestProcess; $script:fakeProcess.Path=$executable
        $script:launchFails=$true
        Must-Reject { Start-ReviewSession } 'failed launch'
        Test-Case 'failed launch releases reservation' { Assert-True (-not (Test-Path $statePath)) 'Reservation retained after failed launch' }
        $script:launchFails=$false
        function Get-ChildItem {
            param([string]$Path,[string]$LiteralPath,[switch]$Force)
            if ($Path -like 'Env:*') { throw 'injected environment read failure' }
            Microsoft.PowerShell.Management\Get-ChildItem -LiteralPath $LiteralPath -Force:$Force
        }
        Must-Reject { Start-ReviewSession } 'environment discovery failure'
        Test-Case 'environment discovery failure cannot leak reservation' {
            Assert-True (-not (Test-Path $statePath)) 'Reservation leaked before launch try/finally'
        }
        Remove-Item Function:Get-ChildItem
        if (Test-Path $statePath) { Remove-Item $statePath -Force }
        $originalWriter=(Get-Item Function:Write-ReviewState).ScriptBlock
        function Write-ReviewState { param($Stream,$Process) throw 'injected state write failure' }
        Must-Reject { Start-ReviewSession } 'failed state write'
        Test-Case 'state write failure cleans owned handle and reservation' {
            Assert-True ($script:fakeProcess.Killed -and $script:fakeProcess.Disposed -and -not (Test-Path $statePath)) 'Owned child/reservation leaked'
        }
        $script:fakeProcess=New-Object ReviewTestProcess; $script:fakeProcess.Path=$executable; $script:fakeProcess.KillThrows=$true
        Must-Reject { Start-ReviewSession } 'failed state write and cleanup'
        Test-Case 'cleanup failure retains reservation for manual recovery' { Assert-True (Test-Path $statePath) 'Live child lost reservation' }
        Remove-Item $statePath -Force
        Set-Item Function:Write-ReviewState $originalWriter
        $script:fakeProcess=New-Object ReviewTestProcess; $script:fakeProcess.Path=$executable
        $env:WILDVN_UNIT_PARENT='preserve-me'
        Test-Case 'successful start reserves exclusively and writes bound identity' {
            Start-ReviewSession
            $state=Get-Content $statePath -Raw | ConvertFrom-Json
            Assert-True ($script:reservationObserved -and $state.pid -eq 98765 -and $state.executable -eq $executable -and
                $state.start_ticks -eq $script:fakeProcess.StartTime.Ticks.ToString()) 'Missing exclusive reservation or bound state'
            Assert-True ($env:WILDVN_UNIT_PARENT -eq 'preserve-me') 'Parent environment not restored'
        }
        $oldLaunches=$script:launches
        Must-Reject { Start-ReviewSession } 'existing session does not start another process'
        Test-Case 'existing session rejects before launch' { Assert-True ($script:launches -eq $oldLaunches) 'Duplicate process launched' }
        $script:fakeProcess=New-Object ReviewTestProcess; $script:fakeProcess.Path=$executable
        Test-Case 'owned process acquires a handle before stop validation' {
            $owned=Get-OwnedProcess
            Assert-True ($owned.HandleReads -gt 0) 'No retained handle'
            $owned.Dispose()
        }
        $script:fakeProcess.Path='unrelated.exe'
        Must-Reject { Get-OwnedProcess } 'unrelated PID path'
        $script:fakeProcess.Path=$executable; $script:fakeProcess.StartTime=$script:fakeProcess.StartTime.AddSeconds(1)
        Must-Reject { Get-OwnedProcess } 'reused PID start ticks'
        $script:fakeProcess=New-Object ReviewTestProcess; $script:fakeProcess.Path=$executable; $script:fakeProcess.CloseResult=$false
        Must-Reject { Stop-ReviewSession } 'graceful close failure'
        Test-Case 'graceful close failure retains state without force kill' {
            Assert-True ((Test-Path $statePath) -and -not $script:fakeProcess.Killed) 'Session removed or force kill sent'
        }
        $script:fakeProcess=New-Object ReviewTestProcess; $script:fakeProcess.Path=$executable
        Test-Case 'successful graceful stop closes only owned handle and removes state' {
            Stop-ReviewSession
            Assert-True (-not (Test-Path $statePath) -and $script:fakeProcess.Disposed -and -not $script:fakeProcess.Killed) 'Owned stop cleanup failed'
        }
        Remove-Item Env:WILDVN_UNIT_PARENT
    }
    if ($failures.Count) { throw ("RUNNER_CHECKS=$checks FAIL=$($failures.Count)`n" + ($failures -join "`n")) }
    Write-Output "RUNNER_CHECKS=$checks PASS (unit/parser mocks only; Windows E2E CHUA KIEM CHUNG)"
}
finally {
    Remove-Item -LiteralPath $temp -Recurse -Force
    Get-ChildItem ([IO.Path]::GetTempPath()) -Filter ('wildvn-backup-*-' + (Split-Path $temp -Leaf)) | Remove-Item -Force
}
