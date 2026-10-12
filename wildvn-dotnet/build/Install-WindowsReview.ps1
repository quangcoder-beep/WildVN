#requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('Install','Update','Status','Rollback','Uninstall')][string]$Action = 'Status',
    [string]$ZipPath,
    [string]$ZipSha256,
    [string]$VersionHash,
    [switch]$AllowUnsignedReview,
    [switch]$StopRunning,
    [switch]$LoadFunctionsOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-ReviewWindows {
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
        -not [Environment]::Is64BitOperatingSystem -or
        [Environment]::GetEnvironmentVariable('PROCESSOR_ARCHITECTURE') -cne 'AMD64') {
        throw 'This operation requires Windows x64. Linux parser/mocks are not Windows installation or execution.'
    }
}
function Get-ReviewInstallRoot {
    $local=[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    if (-not $local -or -not [IO.Path]::IsPathRooted($local)) { throw 'Current-user LocalApplicationData is unavailable.' }
    return [IO.Path]::GetFullPath((Join-Path $local 'WildVN/Review'))
}
function Assert-ReviewUnlinkedPath([string]$Path) {
    $current=[IO.Path]::GetFullPath($Path)
    while ($current) {
        # Get-Item also sees dangling links, which Test-Path alone may miss.
        $item=Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
        if ($null -ne $item) {
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Linked install path: $current" }
        }
        $parent=[IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }
        $current=$parent
    }
}
function Assert-ReviewTreeUnlinked([string]$Root) {
    Assert-ReviewUnlinkedPath $Root
    $pending=New-Object 'Collections.Generic.Stack[string]'
    $pending.Push($Root)
    while ($pending.Count) {
        foreach ($item in Get-ChildItem -LiteralPath $pending.Pop() -Force) {
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Linked install item: $($item.FullName)" }
            if ($item.PSIsContainer) { $pending.Push($item.FullName) }
        }
    }
}
function Assert-ReviewVersionHash([string]$Hash) {
    if ($Hash -cnotmatch '^[a-f0-9]{64}$') { throw 'Version must be the complete lowercase 64-character ZIP SHA256.' }
}
function Assert-ReviewArchiveName([string]$Name) {
    if ([string]::IsNullOrWhiteSpace($Name) -or $Name.Length -gt 220 -or $Name -match '[\\:]') { throw 'Unsafe ZIP path.' }
    foreach ($part in $Name.Split('/')) {
        if ($part -notmatch '^[A-Za-z0-9_.-]+$' -or $part -in @('.','..') -or $part.EndsWith('.') -or
            $part -match 'oauth|credential|secret|token|^\.env|^(bin|obj)$|^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)') {
            throw 'Unsafe ZIP path segment.'
        }
    }
    if ($Name -in @('client.log','.review-session.json')) { throw 'Review runtime state must not be shipped in a ZIP.' }
}
function Write-ReviewJsonNew([string]$Path,$Document) {
    Assert-ReviewUnlinkedPath $Path
    $stream=[IO.File]::Open($Path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try {
        $bytes=(New-Object Text.UTF8Encoding($false)).GetBytes(($Document | ConvertTo-Json -Depth 8))
        $stream.Write($bytes,0,$bytes.Length)
        $stream.Flush($true)
    } finally { $stream.Dispose() }
}
function Initialize-ReviewRoot([string]$Root) {
    Assert-ReviewUnlinkedPath $Root
    if (Test-Path -LiteralPath $Root) { Assert-ReviewRoot $Root; return }
    $parent=Split-Path $Root
    $null=New-Item -ItemType Directory -Path $parent -Force
    $candidate=Join-Path $parent ('Review.root-'+[Guid]::NewGuid().ToString())
    $null=New-Item -ItemType Directory -Path $candidate
    try {
        Write-ReviewJsonNew (Join-Path $candidate 'install-owner.json') ([ordered]@{
            schema=1; owner='WildVN.LocalReview'; scope='current-user'; root=[IO.Path]::GetFullPath($Root)
        })
        foreach ($name in @('versions','receipts','staging')) { $null=New-Item -ItemType Directory -Path (Join-Path $candidate $name) }
        # Same-parent rename commits the complete ownership layout or fails if another writer won.
        [IO.Directory]::Move($candidate,$Root)
    } finally {
        if (Test-Path -LiteralPath $candidate) {
            Assert-ReviewTreeUnlinked $candidate
            Remove-Item -LiteralPath $candidate -Recurse -Force
        }
    }
}
function Assert-ReviewRoot([string]$Root) {
    Assert-ReviewUnlinkedPath $Root
    $marker=Join-Path $Root 'install-owner.json'
    Assert-ReviewUnlinkedPath $marker
    $owner=Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json
    if ($owner -isnot [Management.Automation.PSCustomObject] -or ($owner.schema -isnot [int] -and $owner.schema -isnot [long]) -or
        $owner.schema -ne 1 -or $owner.owner -cne 'WildVN.LocalReview' -or $owner.scope -cne 'current-user' -or
        -not [string]::Equals($owner.root,[IO.Path]::GetFullPath($Root),[StringComparison]::OrdinalIgnoreCase)) {
        throw 'Unowned install root; no files changed.'
    }
    foreach ($item in Get-ChildItem -LiteralPath $Root -Force) {
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked install root entry.' }
        if ($item.Name -cin @('versions','receipts','staging')) {
            if (-not $item.PSIsContainer) { throw 'Install layout directory is a file.' }
        } elseif ($item.PSIsContainer -or $item.Name -cnotin @('install-owner.json','.install.lock','active.json','active.bak','.active.pending.json')) {
            throw "Foreign install-root entry preserved: $($item.Name)"
        }
    }
    foreach ($directory in @('versions','receipts','staging')) {
        foreach ($item in Get-ChildItem -LiteralPath (Join-Path $Root $directory) -Force) {
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked version/receipt.' }
            if ($directory -in @('versions','staging')) {
                Assert-ReviewVersionHash $item.Name
                if (-not $item.PSIsContainer) { throw 'Version directory is a file.' }
            } elseif ($item.PSIsContainer -or $item.Name -cnotmatch '^[a-f0-9]{64}\.json$') {
                throw 'Foreign receipt entry preserved.'
            }
        }
    }
}
function Open-ReviewInstallLock([string]$Root) {
    Assert-ReviewRoot $Root
    $path=Join-Path $Root '.install.lock'
    Assert-ReviewUnlinkedPath $path
    try { return [IO.File]::Open($path,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None) }
    catch { throw 'Another review install/launch is active or its lock is unavailable. Retry after it finishes.' }
}
function Remove-ReviewStage([string]$Stage) {
    if (Test-Path -LiteralPath $Stage) {
        if ((Split-Path $Stage -Leaf) -cnotmatch '^wildvn-review-stage-[a-f0-9-]{36}$') { throw 'Refusing cleanup of an unrelated staging path.' }
        Assert-ReviewTreeUnlinked $Stage
        Remove-Item -LiteralPath $Stage -Recurse -Force
    }
}
function Get-ReviewZipEntries($Archive) {
    if ($Archive.Entries.Count -eq 0 -or $Archive.Entries.Count -gt 4096) { throw 'ZIP must contain 1 to 4096 regular files.' }
    $names=New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    $parents=New-Object 'Collections.Generic.Dictionary[string,string]' ([StringComparer]::OrdinalIgnoreCase)
    [long]$total=0
    foreach ($entry in $Archive.Entries) {
        Assert-ReviewArchiveName $entry.FullName
        if (-not $names.Add($entry.FullName)) { throw 'Duplicate ZIP path, including case differences.' }
        $parent=[IO.Path]::GetDirectoryName($entry.FullName).Replace('\','/')
        while ($parent) {
            if ($parents.ContainsKey($parent) -and $parents[$parent] -cne $parent) { throw 'Duplicate ZIP directory case.' }
            $parents[$parent]=$parent
            $parent=[IO.Path]::GetDirectoryName($parent).Replace('\','/')
        }
        $type=($entry.ExternalAttributes -shr 16) -band 0xF000
        if ($type -notin @(0,0x8000) -or ($entry.ExternalAttributes -band 0x410) -ne 0) { throw 'ZIP directories/links/special files are not permitted.' }
        $total+=$entry.Length
        if ($entry.Length -gt 536870912 -or $total -gt 2147483648 -or
            ($entry.Length -gt 1048576 -and $entry.Length -gt ([Math]::Max(1,$entry.CompressedLength)*1000))) {
            throw 'ZIP exceeds review extraction limits (512MiB/file, 2GiB total, compression ratio 1000).'
        }
    }
    if (-not $names.Contains('manifest.json')) { throw 'ZIP manifest is missing.' }
    foreach ($parent in $parents.Keys) { if ($names.Contains($parent)) { throw 'ZIP file/directory collision.' } }
    return ,$Archive.Entries
}
function Expand-ReviewArchive([string]$Path,[string]$ExpectedSha256) {
    if ($ExpectedSha256 -notmatch '^[a-fA-F0-9]{64}$') { throw 'Supply -ZipSha256 with the complete expected ZIP SHA256 from review handover.' }
    Assert-ReviewUnlinkedPath $Path
    Add-Type -AssemblyName System.IO.Compression
    $source=[IO.File]::Open([IO.Path]::GetFullPath($Path),[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
    $archive=$null; $stage=$null
    try {
        if ($source.Length -gt 536870912) { throw 'ZIP exceeds the 512MiB archive limit.' }
        $hasher=[Security.Cryptography.SHA256]::Create()
        try { $actual=([BitConverter]::ToString($hasher.ComputeHash($source))).Replace('-','').ToLowerInvariant() }
        finally { $hasher.Dispose() }
        if ($actual -ne $ExpectedSha256.ToLowerInvariant()) { throw 'Outer ZIP SHA256 mismatch; install unchanged.' }
        $source.Position=0
        $archive=New-Object IO.Compression.ZipArchive($source,[IO.Compression.ZipArchiveMode]::Read,$true)
        $entries=Get-ReviewZipEntries $archive
        $stage=Join-Path ([IO.Path]::GetTempPath()) ('wildvn-review-stage-'+[Guid]::NewGuid().ToString())
        Assert-ReviewUnlinkedPath $stage
        $null=New-Item -ItemType Directory -Path $stage
        foreach ($entry in $entries) {
            $target=[IO.Path]::GetFullPath((Join-Path $stage $entry.FullName))
            if (-not $target.StartsWith(($stage+[IO.Path]::DirectorySeparatorChar),[StringComparison]::OrdinalIgnoreCase)) { throw 'ZIP path escaped staging.' }
            $null=New-Item -ItemType Directory -Path (Split-Path $target) -Force
            $entryStream=$entry.Open(); $output=$null
            try {
                $output=[IO.File]::Open($target,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
                $buffer=New-Object byte[] 65536
                [long]$copied=0
                while (($read=$entryStream.Read($buffer,0,$buffer.Length)) -gt 0) {
                    $copied+=$read
                    if ($copied -gt $entry.Length) { throw 'ZIP expanded beyond declared size.' }
                    $output.Write($buffer,0,$read)
                }
                $output.Flush($true)
            } finally { if ($output) { $output.Dispose() }; $entryStream.Dispose() }
            if ((Get-Item -LiteralPath $target).Length -ne $entry.Length) { throw 'Extracted ZIP size mismatch.' }
        }
        return $stage
    } catch { if ($stage) { Remove-ReviewStage $stage }; throw }
    finally { if ($archive) { $archive.Dispose() }; $source.Dispose() }
}
function Read-ReviewManifest([string]$Path,[string]$ExpectedSha256) {
    Assert-ReviewUnlinkedPath $Path
    # On Windows this held read handle denies write/delete sharing. Hash and parse
    # use the same stream, so a re-read cannot swap in fresh unverified path data.
    $stream=[IO.File]::Open($Path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
    $reader=$null
    try {
        if ($stream.Length -gt 4194304) { throw 'Manifest exceeds 4MiB.' }
        if ($ExpectedSha256) {
            $hasher=[Security.Cryptography.SHA256]::Create()
            try { $digest=([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-','').ToLowerInvariant() }
            finally { $hasher.Dispose() }
            if ($digest -ne $ExpectedSha256) { throw 'Manifest differs from its verified receipt.' }
            $stream.Position=0
        }
        $reader=New-Object IO.StreamReader($stream,[Text.Encoding]::UTF8,$true)
        return ($reader.ReadToEnd() | ConvertFrom-Json)
    } finally { if ($reader) { $reader.Dispose() }; $stream.Dispose() }
}
function Assert-ReviewPackage([string]$PackageRoot,[string]$ManifestSha256) {
    Assert-ReviewTreeUnlinked $PackageRoot
    $manifest=Read-ReviewManifest (Join-Path $PackageRoot 'manifest.json') $ManifestSha256
    if ($manifest -isnot [Management.Automation.PSCustomObject] -or
        ($manifest.schema -isnot [int] -and $manifest.schema -isnot [long]) -or $manifest.schema -ne 1 -or
        $manifest.flavour -cne 'win-x64' -or $manifest.signed -isnot [bool] -or $manifest.signed -or
        $manifest.files -isnot [Array] -or $manifest.files.Count -eq 0 -or $manifest.files.Count -gt 4095) {
        throw 'Requires an explicitly unsigned schema1 win-x64 review manifest.'
    }
    $names=New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    foreach ($entry in $manifest.files) {
        if ($entry -isnot [Management.Automation.PSCustomObject] -or $entry.path -isnot [string] -or
            ($entry.size -isnot [int] -and $entry.size -isnot [long]) -or $entry.size -lt 0 -or
            $entry.sha256 -isnot [string] -or $entry.sha256 -notmatch '^[a-fA-F0-9]{64}$') { throw 'Malformed review inventory entry.' }
        Assert-ReviewArchiveName $entry.path
        if ($entry.path -eq 'manifest.json' -or -not $names.Add($entry.path)) { throw 'Duplicate/self-referencing manifest entry.' }
        $path=Join-Path $PackageRoot $entry.path
        $item=Get-Item -LiteralPath $path -Force
        if ($item.PSIsContainer -or $item.Length -ne $entry.size -or (Get-FileHash -LiteralPath $path).Hash -ne $entry.sha256) {
            throw "Review payload hash/size mismatch: $($entry.path)"
        }
    }
    foreach ($required in @('WildVN.Desktop.exe','WildVN.Desktop.dll','coreclr.dll','System.Windows.Forms.dll',
            'WildVN.Desktop.deps.json','WildVN.Desktop.runtimeconfig.json','Review-Windows.ps1',
            'Install-WindowsReview.ps1','Start-InstalledReview.ps1')) {
        if (-not $names.Contains($required)) { throw "Incomplete installable review artifact: $required" }
    }
    # The outer digest is independently supplied by the reviewer. Installed receipts pin
    # that already selected manifest. Every script's bytes passed its entry hash before execution.
    Assert-ReviewPhysicalInventory $PackageRoot $names
    & (Join-Path $PackageRoot 'Review-Windows.ps1') -Action Check | Out-Host
    return $manifest
}
function Get-ReviewPackageItems([string]$PackageRoot) {
    $items=@(); $pending=New-Object 'Collections.Generic.Stack[string]'
    $pending.Push($PackageRoot)
    while ($pending.Count) {
        foreach ($item in Get-ChildItem -LiteralPath $pending.Pop() -Force) {
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Linked physical payload.' }
            $items+=,$item
            if ($item.PSIsContainer) { $pending.Push($item.FullName) }
        }
    }
    return ,$items
}
function Assert-ReviewPhysicalInventory([string]$PackageRoot,$Names) {
    $directories=New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    foreach ($name in $Names) {
        $parent=[IO.Path]::GetDirectoryName($name).Replace('\','/')
        while ($parent) { $null=$directories.Add($parent); $parent=[IO.Path]::GetDirectoryName($parent).Replace('\','/') }
    }
    $seen=New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    foreach ($item in (Get-ReviewPackageItems $PackageRoot)) {
        $name=$item.FullName.Substring($PackageRoot.Length+1).Replace('\','/')
        if (-not $seen.Add($name)) { throw 'Case-aliased physical payload path.' }
        if ($item.PSIsContainer) { if (-not $directories.Contains($name)) { throw "Unlisted payload directory: $name" } }
        elseif (-not $Names.Contains($name) -and $name -cnotin @('manifest.json','client.log','.review-session.json')) { throw "Unlisted payload file: $name" }
    }
}
function Read-ReviewReceipt([string]$Root,[string]$Hash) {
    Assert-ReviewVersionHash $Hash
    $receiptPath=Join-Path (Join-Path $Root 'receipts') ($Hash+'.json')
    Assert-ReviewUnlinkedPath $receiptPath
    $receipt=Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
    if ($receipt -isnot [Management.Automation.PSCustomObject] -or ($receipt.schema -isnot [int] -and $receipt.schema -isnot [long]) -or
        $receipt.schema -ne 1 -or $receipt.owner -cne 'WildVN.LocalReview' -or $receipt.zip_sha256 -cne $Hash -or
        $receipt.manifest_sha256 -isnot [string] -or $receipt.manifest_sha256 -cnotmatch '^[a-f0-9]{64}$' -or
        $receipt.flavour -cne 'win-x64' -or $receipt.signed -isnot [bool] -or $receipt.signed) { throw 'Invalid review install receipt.' }
    return $receipt
}
function Assert-InstalledReviewVersion([string]$Root,[string]$Hash) {
    $receipt=Read-ReviewReceipt $Root $Hash
    $package=Join-Path (Join-Path $Root 'versions') $Hash
    $null=Assert-ReviewPackage $package $receipt.manifest_sha256
    return $package
}
function Read-ActiveReviewRecord([string]$Root,[switch]$Backup) {
    $name='active.json'; if ($Backup) { $name='active.bak' }
    $path=Join-Path $Root $name
    Assert-ReviewUnlinkedPath $path
    $record=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if ($record -isnot [Management.Automation.PSCustomObject] -or ($record.schema -isnot [int] -and $record.schema -isnot [long]) -or
        $record.schema -ne 1 -or $record.version -isnot [string]) { throw 'Invalid active-version pointer. Use explicit Rollback -VersionHash after reviewing installed versions.' }
    Assert-ReviewVersionHash $record.version
    if ($null -ne $record.previous) { Assert-ReviewVersionHash $record.previous }
    return $record
}
function Set-ActiveReviewVersion([string]$Root,[string]$Hash,[switch]$Recover) {
    $null=Assert-InstalledReviewVersion $Root $Hash
    $active=Join-Path $Root 'active.json'; $backup=Join-Path $Root 'active.bak'
    $previous=$null
    if (Test-Path -LiteralPath $active) {
        try { $previous=(Read-ActiveReviewRecord $Root).version; $null=Assert-InstalledReviewVersion $Root $previous }
        catch { if (-not $Recover) { throw }; Write-Output 'Recovering active pointer using the explicitly selected verified version.' }
    }
    $pending=Join-Path $Root '.active.pending.json'
    if (Test-Path -LiteralPath $pending) { throw 'Interrupted pointer update retained .active.pending.json. Inspect it and the receipts before removing that pending file and retrying.' }
    if ($previous -eq $Hash) { return }
    Assert-ReviewUnlinkedPath $active; Assert-ReviewUnlinkedPath $backup
    Write-ReviewJsonNew $pending ([ordered]@{schema=1; version=$Hash; previous=$previous})
    try {
        if (Test-Path -LiteralPath $active) { [IO.File]::Replace($pending,$active,$backup,$true) }
        else { [IO.File]::Move($pending,$active) }
    } catch {
        throw 'Atomic active-pointer update failed; prior pointer remains or backup is retained. Inspect active.json/active.bak/.active.pending.json; no unverified version is launched.'
    }
}
function Get-InstalledReviewVersions([string]$Root) {
    $versions=@(Get-ChildItem -LiteralPath (Join-Path $Root 'versions') -Force | Sort-Object Name)
    foreach ($version in $versions) { $null=Assert-InstalledReviewVersion $Root $version.Name }
    foreach ($receipt in Get-ChildItem -LiteralPath (Join-Path $Root 'receipts') -Force) {
        if (-not (Test-Path -LiteralPath (Join-Path (Join-Path $Root 'versions') $receipt.BaseName))) { throw 'Orphan receipt preserved. Inspect install state before making changes.' }
    }
    return ,$versions
}
function Copy-ReviewStageToInstall([string]$Root,[string]$Stage,[string]$Hash,[string]$ManifestHash) {
    $pending=Join-Path (Join-Path $Root 'staging') $Hash
    $sourceItems=Get-ReviewPackageItems $Stage
    $sourceNames=New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
    foreach ($item in $sourceItems) { $null=$sourceNames.Add($item.FullName.Substring($Stage.Length+1)) }
    if (Test-Path -LiteralPath $pending) {
        # Resuming the independently selected exact ZIP may replace partial staged
        # copies, but every staged name/type must belong to that verified source.
        foreach ($item in (Get-ReviewPackageItems $pending)) {
            $relative=$item.FullName.Substring($pending.Length+1)
            if (-not $sourceNames.Contains($relative) -or (Get-Item -LiteralPath (Join-Path $Stage $relative)).PSIsContainer -ne $item.PSIsContainer) {
                throw 'Interrupted staging contains unrelated entries; preserved for inspection.'
            }
        }
    } else { $null=New-Item -ItemType Directory -Path $pending }
    foreach ($item in $sourceItems) {
        $relative=$item.FullName.Substring($Stage.Length+1)
        $target=Join-Path $pending $relative
        Assert-ReviewUnlinkedPath $target
        if ($item.PSIsContainer) { $null=New-Item -ItemType Directory -Path $target -Force }
        else {
            $null=New-Item -ItemType Directory -Path (Split-Path $target) -Force
            [IO.File]::Copy($item.FullName,$target,$true)
        }
    }
    $null=Assert-ReviewPackage $pending $ManifestHash
    return $pending
}
function Complete-ReviewVersion([string]$Root,[string]$Stage,[string]$Hash,[string]$ManifestHash) {
    $version=Join-Path (Join-Path $Root 'versions') $Hash
    $receipt=Join-Path (Join-Path $Root 'receipts') ($Hash+'.json')
    # Independently reselected matching ZIP repairs receipt/version interruption only
    # after validating this exact payload against the selected manifest hash.
    if (Test-Path -LiteralPath $version) { $null=Assert-ReviewPackage $version $ManifestHash }
    else {
        $pending=Copy-ReviewStageToInstall $Root $Stage $Hash $ManifestHash
        [IO.Directory]::Move($pending,$version)
    }
    if (-not (Test-Path -LiteralPath $receipt)) {
        Write-ReviewJsonNew $receipt ([ordered]@{
            schema=1; owner='WildVN.LocalReview'; zip_sha256=$Hash; manifest_sha256=$ManifestHash;
            flavour='win-x64'; signed=$false; installed_utc=[DateTime]::UtcNow.ToString('o')
        })
    }
    $null=Assert-InstalledReviewVersion $Root $Hash
}
function Stop-InstalledReviewSessions([string]$Root,[switch]$CloseRunning) {
    foreach ($version in (Get-InstalledReviewVersions $Root)) {
        $state=Join-Path $version.FullName '.review-session.json'
        if (-not (Test-Path -LiteralPath $state)) { continue }
        if (-not $CloseRunning) { throw "Review session exists in $($version.FullName). Close it with its Review-Windows.ps1 -Action Stop, or retry with -StopRunning for exact-owned graceful close. A stale or unverifiable session must be inspected manually." }
        try { & (Join-Path $version.FullName 'Review-Windows.ps1') -Action Stop | Out-Host }
        catch { throw "Owned graceful close was not confirmed. No pointer changed and no forced kill was sent. Inspect this package session: $state. $_" }
        if (Test-Path -LiteralPath $state) { throw 'Session remains after Stop; install selection unchanged.' }
    }
}
function Install-ReviewZip([string]$Root,[string]$Path,[string]$ExpectedHash,[switch]$CloseRunning) {
    $stage=Expand-ReviewArchive $Path $ExpectedHash
    $lock=$null
    try {
        $null=Assert-ReviewPackage $stage
        $manifestHash=(Get-FileHash -LiteralPath (Join-Path $stage 'manifest.json')).Hash.ToLowerInvariant()
        $hash=$ExpectedHash.ToLowerInvariant()
        Initialize-ReviewRoot $Root
        $lock=Open-ReviewInstallLock $Root
        # A stopped-client requirement protects pointer changes; complete any matching
        # interrupted immutable payload first so its receipts can be validated normally.
        Complete-ReviewVersion $Root $stage $hash $manifestHash
        Stop-InstalledReviewSessions $Root -CloseRunning:$CloseRunning
        $version=Join-Path (Join-Path $Root 'versions') $hash
        Set-ActiveReviewVersion $Root $hash
        Write-Output "Selected unsigned review version $hash. Earlier verified versions are retained for rollback."
        Write-Output "Launch: powershell -NoProfile -File `"$(Join-Path $version 'Start-InstalledReview.ps1')`" -AllowUnsignedReview"
    } finally { if ($lock) { $lock.Dispose() }; if ($stage) { Remove-ReviewStage $stage } }
}
function Show-InstalledReviewStatus([string]$Root) {
    if (-not (Test-Path -LiteralPath $Root)) { Write-Output 'No per-user WildVN review installation.'; return }
    $lock=Open-ReviewInstallLock $Root
    try {
        $versions=Get-InstalledReviewVersions $Root
        Write-Output "Unsigned current-user review root: $Root"
        foreach ($version in $versions) { Write-Output "Verified version: $($version.Name)" }
        if (Test-Path -LiteralPath (Join-Path $Root 'active.json')) {
            $record=Read-ActiveReviewRecord $Root
            Write-Output "Active: $($record.version) Previous: $($record.previous)"
        } else { Write-Output 'No active version selected.' }
        if (Test-Path -LiteralPath (Join-Path $Root 'active.bak')) {
            try { Write-Output "Pointer backup: $((Read-ActiveReviewRecord $Root -Backup).version)" }
            catch { Write-Output 'Pointer backup is invalid; preserved for manual inspection.' }
        }
        Write-Output 'This status verifies files only. Windows UI/device/clean-machine acceptance CHUA KIEM CHUNG.'
    } finally { $lock.Dispose() }
}
function Undo-ReviewSelection([string]$Root,[string]$Hash,[switch]$CloseRunning) {
    $lock=Open-ReviewInstallLock $Root
    try {
        if (-not $Hash) { $Hash=(Read-ActiveReviewRecord $Root).previous }
        if (-not $Hash) { throw 'No previous version. Supply -VersionHash with a retained verified ZIP hash.' }
        $null=Assert-InstalledReviewVersion $Root $Hash
        Stop-InstalledReviewSessions $Root -CloseRunning:$CloseRunning
        Set-ActiveReviewVersion $Root $Hash -Recover
        Write-Output "Selected retained verified review version $Hash. No API, DB, media, or user data was changed."
    } finally { $lock.Dispose() }
}
function Remove-InstalledReview([string]$Root,[switch]$CloseRunning) {
    if (-not (Test-Path -LiteralPath $Root)) { Write-Output 'No per-user review installation to uninstall.'; return }
    $lock=Open-ReviewInstallLock $Root
    try {
        $versions=Get-InstalledReviewVersions $Root
        Stop-InstalledReviewSessions $Root -CloseRunning:$CloseRunning
        # Validate all versions before deleting any. Unknown files or links prevent deletion.
        foreach ($version in $versions) { $null=Assert-InstalledReviewVersion $Root $version.Name }
        if (@(Get-ChildItem -LiteralPath (Join-Path $Root 'staging') -Force).Count) { throw 'Interrupted staging is retained. Reinstall its exact selected ZIP before uninstall.' }
        foreach ($version in $versions) { Remove-VerifiedReviewVersion $Root $version }
        foreach ($name in @('active.json','active.bak','.active.pending.json')) {
            $path=Join-Path $Root $name
            if (Test-Path -LiteralPath $path) { Assert-ReviewUnlinkedPath $path; Remove-Item -LiteralPath $path -Force }
        }
    } finally { $lock.Dispose() }
    # Retain the tiny ownership layout and lock for safe reuse and inspection so
    # concurrent operations cannot recreate the root while its lock is being deleted.
    Write-Output 'Removed all owned review versions and receipts. Empty ownership layout retained for safe reuse. User data, DB, services, and system policies were not changed.'
}
function Remove-VerifiedReviewVersion([string]$Root,$Version) {
    # Delete only manifest-listed paths and the two documented runtime files. A file
    # added after preflight is never swept up by enumerating the current directory.
    $manifestPath=Join-Path $Version.FullName 'manifest.json'
    $receipt=Read-ReviewReceipt $Root $Version.Name
    $manifest=Assert-ReviewPackage $Version.FullName $receipt.manifest_sha256
    $plan=Get-ReviewRemovalPlan $Version.FullName $manifest
    foreach ($path in $plan.files) {
        Assert-ReviewUnlinkedPath $path
        Remove-Item -LiteralPath $path -Force
    }
    foreach ($name in @('client.log','.review-session.json')) {
        $path=Join-Path $Version.FullName $name
        if (Test-Path -LiteralPath $path) { Assert-ReviewUnlinkedPath $path; Remove-Item -LiteralPath $path -Force }
    }
    foreach ($path in $plan.directories) { Assert-ReviewUnlinkedPath $path; [IO.Directory]::Delete($path,$false) }
    Assert-ReviewUnlinkedPath $manifestPath
    Remove-Item -LiteralPath $manifestPath -Force
    [IO.Directory]::Delete($Version.FullName,$false)
    Remove-Item -LiteralPath (Join-Path (Join-Path $Root 'receipts') ($Version.Name+'.json')) -Force
}
function Get-ReviewRemovalPlan([string]$VersionRoot,$Manifest) {
    $versionBase=[IO.Path]::GetFullPath($VersionRoot)+[IO.Path]::DirectorySeparatorChar
    $files=@()
    $directories=New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    foreach ($entry in $Manifest.files) {
        Assert-ReviewArchiveName $entry.path
        $path=[IO.Path]::GetFullPath((Join-Path $VersionRoot $entry.path))
        if (-not $path.StartsWith($versionBase,[StringComparison]::OrdinalIgnoreCase)) { throw 'Uninstall path escaped its verified version.' }
        $files+=,$path
        $parent=[IO.Path]::GetDirectoryName($entry.path).Replace('\','/')
        while ($parent) { $null=$directories.Add($parent); $parent=[IO.Path]::GetDirectoryName($parent).Replace('\','/') }
    }
    return [pscustomobject]@{files=$files; directories=@($directories | Sort-Object Length -Descending | ForEach-Object { Join-Path $VersionRoot $_ })}
}

if ($LoadFunctionsOnly) { return }
if ($Action -eq 'Status') { Show-InstalledReviewStatus (Get-ReviewInstallRoot); return }
Assert-ReviewWindows
if (-not $AllowUnsignedReview) { throw 'This is an unsigned review script installation. Explicit -AllowUnsignedReview is required for changes.' }
$root=Get-ReviewInstallRoot
if ($Action -in @('Install','Update')) {
    if (-not $ZipPath -or -not $ZipSha256) { throw 'Install requires a locally selected -ZipPath and independently supplied -ZipSha256.' }
    Install-ReviewZip $root $ZipPath $ZipSha256 -CloseRunning:$StopRunning
} elseif ($Action -eq 'Rollback') { Undo-ReviewSelection $root $VersionHash -CloseRunning:$StopRunning }
elseif ($Action -eq 'Uninstall') { Remove-InstalledReview $root -CloseRunning:$StopRunning }
