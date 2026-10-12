# Parser/unit/file-system mocks only; never claim Windows desktop acceptance.
param([string]$Installer = (Join-Path $PSScriptRoot '../build/Install-WindowsReview.ps1'),
      [string]$Launcher = (Join-Path $PSScriptRoot '../build/Start-InstalledReview.ps1'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$checks = 0
$failures = @()
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('wildvn-install-test-' + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $testRoot | Out-Null
function Assert-True([bool]$Condition, [string]$Label) { if (-not $Condition) { throw $Label } }
function Test-Case([string]$Label, [scriptblock]$Call) {
    try { & $Call | Out-Null; $script:checks++; Write-Output "PASS: $Label" }
    catch { $script:failures += "$Label :: $_"; Write-Output "FAIL: $Label :: $_" }
}
function Must-Reject([scriptblock]$Call, [string]$Label) {
    # Do not wrap $Call inside Test-Case's identically named dynamic-scope parameter.
    $rejected=$false
    try { & $Call | Out-Null } catch { $rejected=$true }
    if ($rejected) { $script:checks++; Write-Output "PASS reject: $Label" }
    else { $script:failures += "$Label :: Unsafe input accepted"; Write-Output "FAIL: $Label :: Unsafe input accepted" }
}
function Write-TestZip([string]$Path, [object[]]$Entries) {
    $file=[IO.File]::Open($Path,[IO.FileMode]::CreateNew)
    $zip=New-Object IO.Compression.ZipArchive($file,[IO.Compression.ZipArchiveMode]::Create,$true)
    try {
        foreach ($item in $Entries) {
            $entry=$zip.CreateEntry($item.name)
            if ($item.ContainsKey('attributes')) { $entry.ExternalAttributes=$item.attributes }
            $stream=$entry.Open()
            try { $bytes=[Text.Encoding]::UTF8.GetBytes($item.text); $stream.Write($bytes,0,$bytes.Length) }
            finally { $stream.Dispose() }
        }
    } finally { $zip.Dispose(); $file.Dispose() }
}
try {
    foreach ($path in @($Installer,$Launcher)) {
        Test-Case ('PowerShell parser: ' + (Split-Path $path -Leaf)) {
            $tokens=$null; $errors=$null
            $null=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
            Assert-True ($errors.Count -eq 0) ($errors | Out-String)
        }
    }
    . $Installer -LoadFunctionsOnly
    Add-Type -AssemblyName System.IO.Compression
    $root=Join-Path $testRoot 'owned'
    Test-Case 'create fixed-layout ownership marker and obtain exclusive lock' {
        Initialize-ReviewRoot $root
        $lock=Open-ReviewInstallLock $root
        try { Must-Reject { Open-ReviewInstallLock $root } 'second lock is rejected' }
        finally { $lock.Dispose() }
        Assert-ReviewRoot $root
    }
    $unowned=Join-Path $testRoot 'unowned'
    New-Item -ItemType Directory -Path $unowned | Out-Null
    [IO.File]::WriteAllText((Join-Path $unowned 'private.txt'),'user data')
    Must-Reject { Initialize-ReviewRoot $unowned } 'pre-existing unowned directory is preserved'
    Test-Case 'unowned file remains unchanged' { Assert-True ([IO.File]::ReadAllText((Join-Path $unowned 'private.txt')) -eq 'user data') 'User data changed' }
    foreach ($name in @('../escape.dll','/escape.dll','C:/escape.dll','a\\b.dll','a//b.dll','a/./b.dll','a/../b.dll','con.dll','nul.txt','foo.dll.','private token.dll','.env','client.log','.review-session.json')) {
        Must-Reject { Assert-ReviewArchiveName $name } ("unsafe ZIP path: $name")
    }
    Test-Case 'safe nested archive path is accepted' { Assert-ReviewArchiveName 'libvlc/win-x64/plugins/codec/example.dll' }
    foreach ($entries in @(
        @(@{name='../escape.dll';text='bad'}),
        @(@{name='a.dll';text='one'},@{name='A.dll';text='two'}),
        @(@{name='manifest.json';text='{}'},@{name='linked.dll';text='target';attributes=(-1610612736)}),
        @(@{name='manifest.json';text='{}'},@{name='dir/';text=''}),
        @(@{name='manifest.json';text='{}'},@{name='dir/a.dll';text='a'},@{name='DIR/b.dll';text='b'}),
        @(@{name='manifest.json';text='{}'},@{name='dir';text='a'},@{name='dir/b.dll';text='b'}),
        @(@{name='manifest.json';text='{}'},@{name='a.dll';text='a';attributes=16}))) {
        $zipPath=Join-Path $testRoot ([Guid]::NewGuid().ToString()+'.zip')
        Write-TestZip $zipPath $entries
        $hash=(Get-FileHash -LiteralPath $zipPath).Hash
        Must-Reject { Expand-ReviewArchive $zipPath $hash } 'unsafe archive rejected before install mutation'
    }
    $zipPath=Join-Path $testRoot 'good.zip'
    Write-TestZip $zipPath @(@{name='manifest.json';text='{}'},@{name='a.dll';text='fixture'})
    Must-Reject { Expand-ReviewArchive $zipPath ('0'*64) } 'outer ZIP hash mismatch'
    Must-Reject { Expand-ReviewArchive $zipPath 'not-a-sha256' } 'malformed outer ZIP hash'
    $hash=(Get-FileHash -LiteralPath $zipPath).Hash
    Test-Case 'safe archive extracts into a fresh isolated staging directory' {
        $stage=Expand-ReviewArchive $zipPath $hash
        try { Assert-True ([IO.File]::ReadAllText((Join-Path $stage 'a.dll')) -eq 'fixture') 'Extracted bytes differ' }
        finally { Remove-ReviewStage $stage }
    }
    $inventory=Join-Path $testRoot 'inventory'
    New-Item -ItemType Directory -Path (Join-Path $inventory 'nested') -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $inventory 'manifest.json'),'{}')
    [IO.File]::WriteAllText((Join-Path $inventory 'nested/a.dll'),'fixture')
    $inventoryNames=New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    $null=$inventoryNames.Add('nested/a.dll')
    Test-Case 'independent physical inventory permits only expected files and parents' { Assert-ReviewPhysicalInventory $inventory $inventoryNames }
    Must-Reject { Read-ReviewManifest (Join-Path $inventory 'manifest.json') ('0'*64) } 'fresh manifest bytes must match the receipt hash before deletion planning'
    foreach ($path in @('../outside','/outside','C:/outside','nested/../outside')) {
        $badManifest=[pscustomobject]@{files=@([pscustomobject]@{path=$path})}
        Must-Reject { Get-ReviewRemovalPlan $inventory $badManifest } ('uninstall deletion plan rejects fresh tampered manifest path '+$path)
    }
    Test-Case 'uninstall deletion plan contains only fully bounded canonical paths' {
        $plan=Get-ReviewRemovalPlan $inventory ([pscustomobject]@{files=@([pscustomobject]@{path='nested/a.dll'})})
        Assert-True ($plan.files.Count -eq 1 -and $plan.files[0] -eq (Join-Path $inventory 'nested/a.dll')) 'Deletion file plan differs'
        Assert-True ($plan.directories.Count -eq 1 -and $plan.directories[0] -eq (Join-Path $inventory 'nested')) 'Deletion directory plan differs'
    }
    [IO.File]::WriteAllText((Join-Path $inventory 'extra.ps1'),'throw "must not run"')
    Must-Reject { Assert-ReviewPhysicalInventory $inventory $inventoryNames } 'unlisted script rejected before invoking archive runner'
    Remove-Item -LiteralPath (Join-Path $inventory 'extra.ps1')
    New-Item -ItemType Directory -Path (Join-Path $inventory 'private') | Out-Null
    Must-Reject { Assert-ReviewPhysicalInventory $inventory $inventoryNames } 'unlisted directory rejected before invoking archive runner'
    Remove-Item -LiteralPath (Join-Path $inventory 'private')
    foreach ($runtime in @('client.log','.review-session.json')) {
        [IO.File]::WriteAllText((Join-Path $inventory $runtime),'runtime')
        Test-Case ('installed inventory allows regular runtime file '+$runtime) { Assert-ReviewPhysicalInventory $inventory $inventoryNames }
        Remove-Item -LiteralPath (Join-Path $inventory $runtime) -Force
    }
    foreach ($version in @('..','ABC','../versions','C:\\outside',('A'*64))) {
        Must-Reject { Assert-ReviewVersionHash $version } "invalid version key: $version"
    }
    $v1='1'*64; $v2='2'*64
    # Mock package checking only for pointer/lifecycle tests; real ZIP verification is separate.
    $realPackageCheck=(Get-Item Function:Assert-InstalledReviewVersion).ScriptBlock
    function Assert-InstalledReviewVersion { param([string]$Root,[string]$VersionHash) Assert-ReviewVersionHash $VersionHash; return (Join-Path (Join-Path $Root 'versions') $VersionHash) }
    Test-Case 'atomic active version records preserve previous selection' {
        Set-ActiveReviewVersion $root $v1
        Set-ActiveReviewVersion $root $v2
        $active=Read-ActiveReviewRecord $root
        Assert-True ($active.version -eq $v2 -and $active.previous -eq $v1) 'Previous version lost'
        $backup=Read-ActiveReviewRecord $root -Backup
        Assert-True ($backup.version -eq $v1) 'Atomic replacement backup missing'
    }
    Test-Case 'rollback selection restores a verified version and preserves alternate' {
        Set-ActiveReviewVersion $root $v1
        $active=Read-ActiveReviewRecord $root
        Assert-True ($active.version -eq $v1 -and $active.previous -eq $v2) 'Rollback pointer incorrect'
    }
    [IO.File]::WriteAllText((Join-Path $root '.active.pending.json'),'{"schema":1,"version":"pending"}')
    Must-Reject { Set-ActiveReviewVersion $root $v1 } 'same-hash selection cannot bypass interrupted pointer guard'
    Remove-Item -LiteralPath (Join-Path $root '.active.pending.json') -Force
    [IO.File]::WriteAllText((Join-Path $root 'active.json'),'{broken')
    Must-Reject { Read-ActiveReviewRecord $root } 'corrupted active pointer fails closed'
    Test-Case 'explicit verified rollback can recover a corrupt pointer' {
        Set-ActiveReviewVersion $root $v2 -Recover
        Assert-True ((Read-ActiveReviewRecord $root).version -eq $v2) 'Pointer recovery failed'
    }
    Set-Item Function:Assert-InstalledReviewVersion $realPackageCheck
    $v3='3'*64
    $copySource=Join-Path $testRoot 'copy-source'
    New-Item -ItemType Directory -Path $copySource | Out-Null
    [IO.File]::WriteAllText((Join-Path $copySource 'a.dll'),'complete source bytes')
    $realReviewCheck=(Get-Item Function:Assert-ReviewPackage).ScriptBlock
    function Assert-ReviewPackage { param([string]$PackageRoot,[string]$ManifestSha256) Assert-ReviewTreeUnlinked $PackageRoot }
    Test-Case 'same-volume staging copies byte-for-byte and preserves source' {
        $stage=Copy-ReviewStageToInstall $root $copySource $v3 ('4'*64)
        Assert-True ([IO.File]::ReadAllText((Join-Path $stage 'a.dll')) -eq 'complete source bytes') 'Copy differed'
        Assert-True (Test-Path -LiteralPath (Join-Path $copySource 'a.dll')) 'Source moved instead of copied'
    }
    [IO.File]::WriteAllText((Join-Path (Join-Path (Join-Path $root 'staging') $v3) 'a.dll'),'partial')
    Test-Case 'reselected identical ZIP can repair its partial known staged copy' {
        $stage=Copy-ReviewStageToInstall $root $copySource $v3 ('4'*64)
        Assert-True ([IO.File]::ReadAllText((Join-Path $stage 'a.dll')) -eq 'complete source bytes') 'Partial staged copy not repaired'
    }
    [IO.File]::WriteAllText((Join-Path (Join-Path (Join-Path $root 'staging') $v3) 'private.txt'),'preserve')
    Must-Reject { Copy-ReviewStageToInstall $root $copySource $v3 ('4'*64) } 'partial staging with foreign name is preserved'
    Test-Case 'foreign staging data was not swept up' {
        Assert-True ([IO.File]::ReadAllText((Join-Path (Join-Path (Join-Path $root 'staging') $v3) 'private.txt')) -eq 'preserve') 'Foreign staged data changed'
    }
    Set-Item Function:Assert-ReviewPackage $realReviewCheck
    $lifeRoot=Join-Path $testRoot 'lifecycle'
    $zipOne=Join-Path $testRoot 'version-one.zip'; $zipTwo=Join-Path $testRoot 'version-two.zip'
    foreach ($zipInfo in @(@{path=$zipOne;text='version one'},@{path=$zipTwo;text='version two'})) {
        $manifestText=@{schema=1;flavour='win-x64';signed=$false;files=@(@{path='a.dll';size=$zipInfo.text.Length;sha256=('0'*64)})} | ConvertTo-Json -Depth 8
        Write-TestZip $zipInfo.path @(@{name='manifest.json';text=$manifestText},@{name='a.dll';text=$zipInfo.text})
    }
    $oneHash=(Get-FileHash -LiteralPath $zipOne).Hash.ToLowerInvariant()
    $twoHash=(Get-FileHash -LiteralPath $zipTwo).Hash.ToLowerInvariant()
    # Synthetic fixtures are not executables. Mock only package execution checks;
    # ZIP digests, root layout, receipts, file copies, pointers and uninstall run real.
    function Assert-ReviewPackage {
        param([string]$PackageRoot,[string]$ManifestSha256)
        Assert-ReviewTreeUnlinked $PackageRoot
        $path=Join-Path $PackageRoot 'manifest.json'
        if ($ManifestSha256 -and (Get-FileHash -LiteralPath $path).Hash -ne $ManifestSha256) { throw 'Mock receipt mismatch' }
        $names=New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
        $null=$names.Add('a.dll')
        Assert-ReviewPhysicalInventory $PackageRoot $names
        if (-not (Test-Path -LiteralPath (Join-Path $PackageRoot 'a.dll'))) { throw 'Mock payload missing' }
        return (Read-ReviewManifest $path $ManifestSha256)
    }
    Test-Case 'offline Install creates receipt and active selection without starting process' {
        Install-ReviewZip $lifeRoot $zipOne $oneHash
        Assert-True ((Read-ActiveReviewRecord $lifeRoot).version -eq $oneHash) 'First active selection missing'
        Assert-True (Test-Path -LiteralPath (Join-Path (Join-Path $lifeRoot 'receipts') ($oneHash+'.json'))) 'Receipt absent'
    }
    $session=Join-Path (Join-Path (Join-Path $lifeRoot 'versions') $oneHash) '.review-session.json'
    [IO.File]::WriteAllText($session,'mock stale session, never a real process')
    Must-Reject { Install-ReviewZip $lifeRoot $zipTwo $twoHash } 'install refuses pointer change while owned session requires review'
    Test-Case 'refused pointer change preserves previous active selection' {
        Assert-True ((Read-ActiveReviewRecord $lifeRoot).version -eq $oneHash) 'Active changed with unresolved session'
    }
    Remove-Item -LiteralPath $session -Force
    Test-Case 'offline update selects new ZIP while keeping old verified artifact' {
        Install-ReviewZip $lifeRoot $zipTwo $twoHash
        $record=Read-ActiveReviewRecord $lifeRoot
        Assert-True ($record.version -eq $twoHash -and $record.previous -eq $oneHash) 'Update pointer wrong'
        Assert-True ([IO.File]::ReadAllText((Join-Path (Join-Path (Join-Path $lifeRoot 'versions') $oneHash) 'a.dll')) -eq 'version one') 'Previous payload changed'
    }
    Test-Case 'rollback orchestration selects retained receipt-verified previous version' {
        Undo-ReviewSelection $lifeRoot ''
        Assert-True ((Read-ActiveReviewRecord $lifeRoot).version -eq $oneHash) 'Rollback did not select previous'
    }
    [IO.File]::WriteAllText((Join-Path $lifeRoot 'user-data.txt'),'preserve')
    Must-Reject { Remove-InstalledReview $lifeRoot } 'uninstall refuses foreign root data without deleting versions'
    Test-Case 'refused uninstall preserves foreign data and installed versions' {
        Assert-True ([IO.File]::ReadAllText((Join-Path $lifeRoot 'user-data.txt')) -eq 'preserve') 'User data altered'
        Assert-True (Test-Path -LiteralPath (Join-Path (Join-Path $lifeRoot 'versions') $oneHash)) 'Owned version deleted before preflight'
    }
    Remove-Item -LiteralPath (Join-Path $lifeRoot 'user-data.txt')
    Test-Case 'uninstall removes only verified artifacts and preserves reusable owner layout' {
        Remove-InstalledReview $lifeRoot
        Assert-True (@(Get-ChildItem -LiteralPath (Join-Path $lifeRoot 'versions')).Count -eq 0) 'Payload remains'
        Assert-True (@(Get-ChildItem -LiteralPath (Join-Path $lifeRoot 'receipts')).Count -eq 0) 'Receipts remain'
        Assert-True (-not (Test-Path -LiteralPath (Join-Path $lifeRoot 'active.json'))) 'Active pointer remains'
        Assert-ReviewRoot $lifeRoot
    }
    Set-Item Function:Assert-ReviewPackage $realReviewCheck
    $foreign=Join-Path $root 'private.txt'
    [IO.File]::WriteAllText($foreign,'preserve')
    Must-Reject { Assert-ReviewRoot $root } 'foreign root file prevents destructive ownership assumptions'
    Remove-Item -LiteralPath $foreign
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        foreach ($action in @('Install','Update','Rollback','Uninstall')) {
            Must-Reject { & $Installer -Action $action -AllowUnsignedReview -ZipPath $zipPath -ZipSha256 $hash -VersionHash $v1 } "Linux $action cannot claim Windows mutation"
        }
        Must-Reject { & $Launcher -AllowUnsignedReview } 'Linux installed launcher cannot claim Windows execution'
        $linked=Join-Path $testRoot 'linked'
        New-Item -ItemType SymbolicLink -Path $linked -Target $root | Out-Null
        Must-Reject { Assert-ReviewRoot $linked } 'linked install root rejected'
        Remove-Item -LiteralPath $linked
    }
    if ($failures.Count) { throw ("INSTALL_CHECKS=$checks FAIL=$($failures.Count)`n" + ($failures -join "`n")) }
    Write-Output "INSTALL_CHECKS=$checks PASS (parser/file-system mocks only; Windows install E2E CHUA KIEM CHUNG)"
} finally { Remove-Item -LiteralPath $testRoot -Recurse -Force }
