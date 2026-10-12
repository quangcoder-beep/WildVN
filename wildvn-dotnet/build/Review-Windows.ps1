#requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('Check', 'Start', 'Status', 'Stop')][string]$Action = 'Start',
    [string]$ApiUrl,
    [switch]$AllowLoopbackHttp,
    [switch]$WithSamples
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$packageRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$executable = Join-Path $packageRoot 'WildVN.Desktop.exe'
$statePath = Join-Path $packageRoot '.review-session.json'

function Assert-UnlinkedPath([string]$Path) {
    $current = [IO.Path]::GetFullPath($Path)
    while ($current) {
        $item = Get-Item -LiteralPath $current -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Linked package path: $current"
        }
        $parent = [IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }
        $current = $parent
    }
}
function New-NameSet {
    return ,(New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase))
}
function Assert-PayloadName([string]$Name) {
    if ([string]::IsNullOrWhiteSpace($Name) -or $Name -match '[\\:]') { throw 'Unsafe manifest path.' }
    foreach ($part in $Name.Split('/')) {
        if ($part -notmatch '^[A-Za-z0-9_.-]+$' -or $part -in @('.', '..') -or $part.EndsWith('.') -or
            $part -match 'oauth|credential|secret|token|^\.env|^(bin|obj)$|^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)') {
            throw 'Unsafe manifest path segment.'
        }
    }
    $allowed = $Name -match '^[^/]+\.dll$|^[a-z]{2}(-[A-Za-z]{2,4})?/[^/]+\.resources\.dll$|^libvlc/win-x64/(?:[^/]+/)*[^/]+\.dll$'
    $extras = @('WildVN.Desktop.exe','createdump.exe','WildVN.Desktop.exe.config','WildVN.Desktop.dll.config',
        'WildVN.Desktop.deps.json','WildVN.Desktop.runtimeconfig.json','LibVLCSharp.dll.config',
        'Media/Assets/media-poc.html','LICENSE.txt','ThirdPartyNotices.txt','NOTICE.md',
        'review_client.py','Review-Windows.ps1','Install-WindowsReview.ps1','Start-InstalledReview.ps1',
        'Verify-WindowsReview.py','samples/image.jpg','samples/video.mp4','samples/audio.wav',
        'libvlc/win-x64/plugins/plugins.dat')
    if (-not $allowed -and $Name -notin $extras) { throw 'Unexpected payload name.' }
}
function Get-ManifestNames($Manifest) {
    if ($Manifest -isnot [Management.Automation.PSCustomObject] -or
        $Manifest.schema -isnot [int] -and $Manifest.schema -isnot [long] -or
        $Manifest.schema -ne 1 -or $Manifest.flavour -cne 'win-x64' -or $Manifest.files -isnot [Array]) {
        throw 'This runner requires a schema1 win-x64 manifest with a files array.'
    }
    $names = New-NameSet
    foreach ($entry in $Manifest.files) {
        if ($entry -isnot [Management.Automation.PSCustomObject] -or $entry.path -isnot [string] -or
            ($entry.size -isnot [int] -and $entry.size -isnot [long]) -or $entry.size -lt 0 -or
            $entry.sha256 -isnot [string] -or $entry.sha256 -notmatch '^[a-fA-F0-9]{64}$') {
            throw 'Malformed manifest file entry.'
        }
        Assert-PayloadName $entry.path
        if (-not $names.Add($entry.path)) { throw 'Duplicate manifest path (case-insensitive).' }
    }
    $required = @('WildVN.Desktop.exe','WildVN.Desktop.dll','LibVLCSharp.dll','WildVN.ApiClient.dll',
        'WildVN.Contracts.dll','WildVN.Desktop.deps.json','WildVN.Desktop.runtimeconfig.json','coreclr.dll',
        'System.Windows.Forms.dll','libvlc/win-x64/libvlc.dll','libvlc/win-x64/libvlccore.dll')
    foreach ($name in $required) { if (-not $names.Contains($name)) { throw "Incomplete manifest: $name" } }
    if (-not @($Manifest.files | Where-Object path -like 'libvlc/win-x64/plugins/*.dll').Count) { throw 'Missing plugins.' }
    return ,$names
}
function Assert-PackageInventory($Names) {
    $directories = New-NameSet
    foreach ($name in $Names) {
        $parent = [IO.Path]::GetDirectoryName($name).Replace('\','/')
        while ($parent) {
            $null = $directories.Add($parent)
            $parent = [IO.Path]::GetDirectoryName($parent).Replace('\','/')
        }
    }
    $seen = New-NameSet
    $pending = New-Object 'Collections.Generic.Stack[string]'
    $pending.Push($packageRoot)
    while ($pending.Count) {
        foreach ($item in Get-ChildItem -LiteralPath $pending.Pop() -Force) {
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked inventory item.' }
            $name = $item.FullName.Substring($packageRoot.Length + 1).Replace('\','/')
            if ($item.PSIsContainer) {
                if (-not $directories.Contains($name)) { throw "Unlisted package directory: $name" }
                $pending.Push($item.FullName)
            } elseif (-not $seen.Add($name)) {
                throw 'Duplicate physical filename (case-insensitive).'
            } elseif (-not $Names.Contains($name) -and $name -notin @('manifest.json','client.log','.review-session.json')) {
                throw "Unlisted package file: $name"
            }
        }
    }
    foreach ($name in $Names) { if (-not $seen.Contains($name)) { throw "Missing payload file: $name" } }
}
function Assert-Package {
    Assert-UnlinkedPath $packageRoot
    $manifestPath = Join-Path $packageRoot 'manifest.json'
    Assert-UnlinkedPath $manifestPath
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $names = Get-ManifestNames $manifest
    Assert-PackageInventory $names
    foreach ($entry in $manifest.files) {
        $path = Join-Path $packageRoot $entry.path
        Assert-UnlinkedPath $path
        $item = Get-Item -LiteralPath $path -Force
        if ($item.PSIsContainer -or $item.Length -ne $entry.size -or
            (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $entry.sha256) {
            throw "Payload hash/size mismatch: $($entry.path)"
        }
    }
    Write-Output 'Payload inventory and hashes verified; unsigned artifact. Windows UI acceptance CHUA KIEM CHUNG.'
}
function Get-OwnedProcess {
    Assert-UnlinkedPath $statePath
    Assert-UnlinkedPath $executable
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if (($state.pid -isnot [int] -and $state.pid -isnot [long]) -or $state.pid -le 0 -or $state.pid -gt [int]::MaxValue -or
        $state.start_ticks -isnot [string] -or $state.start_ticks -notmatch '^[0-9]{1,19}$' -or
        $state.executable -isnot [string] -or -not [string]::Equals($state.executable,$executable,[StringComparison]::OrdinalIgnoreCase)) {
        throw 'Malformed or unrelated session identity; no stop sent.'
    }
    $process = Get-Process -Id $state.pid
    try {
        # Pin the process handle before reading identity so a reused PID cannot receive close/kill.
        $null = $process.Handle
        if ($process.HasExited -or -not [string]::Equals($process.Path,$executable,[StringComparison]::OrdinalIgnoreCase) -or
            $process.StartTime.ToUniversalTime().Ticks.ToString() -cne $state.start_ticks) {
            throw 'PID stale or unrelated; no stop sent.'
        }
        return $process
    } catch { $process.Dispose(); throw }
}
function Write-ReviewState($Stream, $Process) {
    $null = $Process.Handle
    if ($Process.HasExited) { throw 'Client exited before its session could be recorded.' }
    $state = @{pid=$Process.Id; start_ticks=$Process.StartTime.ToUniversalTime().Ticks.ToString(); executable=$executable}
    $bytes = (New-Object Text.UTF8Encoding($false)).GetBytes(($state | ConvertTo-Json))
    $Stream.Write($bytes,0,$bytes.Length)
    $Stream.Flush()
}
function Set-ChildOptions {
    if ($ApiUrl) { $env:WILDVN_API_BASE_URL = $ApiUrl }
    if ($AllowLoopbackHttp) { $env:WILDVN_ALLOW_LOOPBACK_HTTP = '1' }
    if ($WithSamples) {
        $env:WILDVN_POC_IMAGE_PATH = Join-Path $packageRoot 'samples/image.jpg'
        $env:WILDVN_POC_VIDEO_PATH = Join-Path $packageRoot 'samples/video.mp4'
        $env:WILDVN_POC_AUDIO_PATH = Join-Path $packageRoot 'samples/audio.wav'
    }
}
function Start-ReviewSession {
    Assert-Package
    $saved = @{}
    foreach ($entry in Get-ChildItem Env:WILDVN_*) { $saved[$entry.Name] = $entry.Value }
    # CreateNew reserves the path atomically; keep the exclusive handle until state is written.
    $reservation = [IO.File]::Open($statePath,[IO.FileMode]::CreateNew,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    $process = $null
    $removeReservation = $false
    try {
        foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name,$null,'Process') }
        Set-ChildOptions
        $process = Start-Process -FilePath $executable -WorkingDirectory $packageRoot -PassThru
        Write-ReviewState $reservation $process
        Write-Output "Started client PID=$($process.Id). Use -Action Stop or the window X."
    } catch {
        $failure = $_
        $removeReservation = $null -eq $process
        if ($null -ne $process) {
            try {
                if (-not $process.HasExited) { $null = $process.Handle; $process.Kill() }
                $removeReservation = $process.WaitForExit(10000)
            } catch { $removeReservation = $false }
        }
        if (-not $removeReservation) { throw "Start failed; child cleanup unconfirmed. Session retained; close the owned client manually. $failure" }
        throw $failure
    } finally {
        $reservation.Dispose()
        if ($removeReservation) { Remove-Item -LiteralPath $statePath -Force }
        if ($null -ne $process) { $process.Dispose() }
        foreach ($entry in Get-ChildItem Env:WILDVN_*) { [Environment]::SetEnvironmentVariable($entry.Name,$null,'Process') }
        foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name,$saved[$name],'Process') }
    }
}
function Stop-ReviewSession {
    $process = Get-OwnedProcess
    try {
        if (-not $process.CloseMainWindow() -or -not $process.WaitForExit(10000)) {
            throw 'Graceful close failed; session retained. Close the owned window manually.'
        }
        Assert-UnlinkedPath $statePath
        Remove-Item -LiteralPath $statePath -Force
        Write-Output 'Owned client closed; no other process stopped.'
    } finally { $process.Dispose() }
}

if ($Action -eq 'Check') { Assert-Package; return }
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or -not [Environment]::Is64BitOperatingSystem -or
    [Environment]::GetEnvironmentVariable('PROCESSOR_ARCHITECTURE') -ne 'AMD64') {
    throw 'Start/Status/Stop require Windows x64; Linux parsing is not Windows execution.'
}
if ($Action -eq 'Status') {
    $process = Get-OwnedProcess
    try { Write-Output "Owned client PID=$($process.Id) Path=$($process.Path)" } finally { $process.Dispose() }
    return
}
if ($Action -eq 'Stop') { Stop-ReviewSession; return }
Start-ReviewSession
