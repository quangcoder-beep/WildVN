# Linux filesystem integration with real ZIP checks; does not certify Windows installation.
param([string]$ZipPath,[string]$ZipSha256,[string]$OutputRoot)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$selectedArchivePath=$ZipPath; $selectedArchiveHash=$ZipSha256
. (Join-Path $repo 'build/Install-WindowsReview.ps1') -LoadFunctionsOnly
if (Test-Path -LiteralPath $OutputRoot) { throw 'Use a new integration output root.' }
$null=New-Item -ItemType Directory -Path $OutputRoot
$install=Join-Path $OutputRoot 'owned-review-install'
Install-ReviewZip $install $selectedArchivePath $selectedArchiveHash
$one=(Read-ActiveReviewRecord $install).version
if ($one -cne $selectedArchiveHash) { throw 'First active ZIP hash differs.' }
# Repack the verified selected ZIP with a manifest-only review attempt annotation:
# code/sample bytes remain original, but the explicit outer hash selects a separate version.
$stage=Expand-ReviewArchive $selectedArchivePath $selectedArchiveHash
$zipTwo=Join-Path $OutputRoot 'second-review-version.zip'
try {
    $manifestPath=Join-Path $stage 'manifest.json'
    $manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $manifest | Add-Member -MemberType NoteProperty -Name acceptance_attempt -Value 'local filesystem update rehearsal; no Windows execution'
    $manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory($stage,$zipTwo)
} finally { Remove-ReviewStage $stage }
$twoHash=(Get-FileHash -LiteralPath $zipTwo).Hash.ToLowerInvariant()
Install-ReviewZip $install $zipTwo $twoHash
$active=Read-ActiveReviewRecord $install
if ($active.version -cne $twoHash -or $active.previous -cne $one) { throw 'Update selection or previous preservation failed.' }
Undo-ReviewSelection $install ''
if ((Read-ActiveReviewRecord $install).version -cne $one) { throw 'Rollback selection failed.' }
[IO.File]::WriteAllText((Join-Path $install 'user-data.txt'),'preserve unrelated data')
$rejected=$false
try { Remove-InstalledReview $install } catch { $rejected=$true }
if (-not $rejected -or [IO.File]::ReadAllText((Join-Path $install 'user-data.txt')) -cne 'preserve unrelated data') { throw 'Foreign-data uninstall guard failed.' }
Remove-Item -LiteralPath (Join-Path $install 'user-data.txt')
Remove-InstalledReview $install
Assert-ReviewRoot $install
if (@(Get-ChildItem -LiteralPath (Join-Path $install 'versions')).Count -ne 0 -or
    @(Get-ChildItem -LiteralPath (Join-Path $install 'receipts')).Count -ne 0) { throw 'Owned payload/receipts remain.' }
Write-Output "REAL_ZIP_FILESYSTEM_INTEGRATION=PASS Install/Update/Rollback/foreign-data-refusal/Uninstall"
Write-Output 'Windows entry-point mutation, UI, device and clean-machine acceptance CHUA KIEM CHUNG. Only temporary OutputRoot was modified.'
