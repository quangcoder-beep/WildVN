#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ApiUrl,
    [switch]$AllowLoopbackHttp,
    [switch]$WithSamples,
    [switch]$AllowUnsignedReview
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Install-WindowsReview.ps1') -LoadFunctionsOnly -AllowUnsignedReview:$AllowUnsignedReview
Assert-ReviewWindows
if (-not $AllowUnsignedReview) { throw 'Explicit -AllowUnsignedReview is required to launch this unsigned review installation.' }
$root=Get-ReviewInstallRoot
$lock=Open-ReviewInstallLock $root
try {
    $active=Read-ActiveReviewRecord $root
    $package=Assert-InstalledReviewVersion $root $active.version
    $options=@{Action='Start'; AllowLoopbackHttp=$AllowLoopbackHttp; WithSamples=$WithSamples}
    if ($ApiUrl) { $options.ApiUrl=$ApiUrl }
    & (Join-Path $package 'Review-Windows.ps1') @options
} finally { $lock.Dispose() }
