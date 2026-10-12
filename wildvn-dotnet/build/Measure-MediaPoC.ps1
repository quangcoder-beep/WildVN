param(
    [Parameter(Mandatory)][string]$Executable,
    [Parameter(Mandatory)][ValidateSet('Native','WebView')][string]$Renderer,
    [Parameter(Mandatory)][ValidateSet(100,150,200)][int]$ExpectedDpiPercent,
    [Parameter(Mandatory)][string]$ImagePath,
    [Parameter(Mandatory)][string]$VideoPath,
    [string]$AudioPath,
    [ValidateRange(5,60)][int]$DurationSeconds = 30,
    [Parameter(Mandatory)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Requires Windows desktop session; never emulates device measurements.' }
function LocalFile([string]$Path, [string[]]$Extensions) {
    if (!$Path) { return $null }
    if ($Path.StartsWith('\\') -or $Path.StartsWith('//') -or ![IO.Path]::IsPathFullyQualified($Path)) { throw 'Requires explicit local files.' }
    if ([IO.Path]::GetExtension($Path).ToLowerInvariant() -notin $Extensions) { throw 'Unexpected local file type.' }
    $item = Get-Item -LiteralPath $Path
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Symbolic links are not fixture samples.' }
    return $item.FullName
}
if ($OutputPath.StartsWith('\\') -or $OutputPath.StartsWith('//') -or ![IO.Path]::IsPathFullyQualified($OutputPath)) { throw 'Output must be an explicit local artifact path.' }
if ([IO.File]::Exists($OutputPath) -or [IO.Path]::GetFileName($OutputPath) -like 'client_secret*' -or [IO.Path]::GetFileName($OutputPath) -like '.env*') { throw 'Output must be a new non-credential artifact.' }
$binary = LocalFile $Executable @('.exe')
$image = LocalFile $ImagePath @('.jpg','.jpeg','.png','.webp')
$video = LocalFile $VideoPath @('.mp4','.webm')
$audio = LocalFile $AudioPath @('.mp3','.wav','.ogg')
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class MediaPocDpi {
    [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr window);
}
'@
$variables = @('WILDVN_POC_AUTO_OPEN','WILDVN_POC_IMAGE_PATH','WILDVN_POC_VIDEO_PATH','WILDVN_POC_AUDIO_PATH')
$saved = @{}
foreach ($variable in $variables) { $saved[$variable] = [Environment]::GetEnvironmentVariable($variable, 'Process') }
$child = $null
try {
    $env:WILDVN_POC_AUTO_OPEN=$Renderer; $env:WILDVN_POC_IMAGE_PATH=$image
    $env:WILDVN_POC_VIDEO_PATH=$video; $env:WILDVN_POC_AUDIO_PATH=$audio
    $watch=[Diagnostics.Stopwatch]::StartNew()
    $child=Start-Process -FilePath $binary -PassThru
    while (!$child.HasExited -and $child.MainWindowHandle -eq 0 -and $watch.Elapsed.TotalSeconds -lt 30) {
        Start-Sleep -Milliseconds 100; $child.Refresh()
    }
    if ($child.HasExited -or $child.MainWindowHandle -eq 0) { throw 'Window did not appear within 30 seconds.' }
    $windowReadyMs=$watch.Elapsed.TotalMilliseconds
    $dpi=[MediaPocDpi]::GetDpiForWindow($child.MainWindowHandle)
    if ($dpi -ne 96*$ExpectedDpiPercent/100) { throw "Actual DPI $dpi does not match requested matrix row." }
    $peakRoot=0L; $peakTree=0L; $samples=0
    $deadline=[DateTime]::UtcNow.AddSeconds($DurationSeconds)
    Write-Host 'Use the same playback/fullscreen/resize scenario; capture codec, errors and frame metrics separately.'
    while (!$child.HasExited -and [DateTime]::UtcNow -lt $deadline) {
        $child.Refresh(); $peakRoot=[Math]::Max($peakRoot,$child.WorkingSet64)
        $ids=@($child.Id); $tree=Get-CimInstance Win32_Process
        do {
            $more=@($tree | Where-Object { $_.ParentProcessId -in $ids -and $_.ProcessId -notin $ids } | Select-Object -ExpandProperty ProcessId)
            $ids+= $more
        } while ($more.Count -gt 0)
        $total=0L
        foreach ($processId in $ids) {
            $process=Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) { $total+=$process.WorkingSet64 }
        }
        $peakTree=[Math]::Max($peakTree,$total); $samples++
        Start-Sleep -Milliseconds 200
    }
    $os=Get-CimInstance Win32_OperatingSystem
    [ordered]@{
        RecordedAtUtc=[DateTime]::UtcNow.ToString('o'); Renderer=$Renderer
        WindowsCaption=$os.Caption; Build=$os.BuildNumber; Architecture=$os.OSArchitecture
        DpiPercent=$ExpectedDpiPercent; ActualWindowDpi=$dpi
        ShellWindowReadyMs=$windowReadyMs; MediaReadyMs=$null
        PeakRootWorkingSetBytes=$peakRoot; PeakProcessTreeWorkingSetSumBytes=$peakTree
        Samples=$samples; RequestedObservationSeconds=$DurationSeconds
        ProcessExitedDuringScenario=$child.HasExited; ActualObservationSeconds=($watch.Elapsed.TotalSeconds-$windowReadyMs/1000)
        ImageSha256=(Get-FileHash -LiteralPath $image -Algorithm SHA256).Hash
        VideoSha256=(Get-FileHash -LiteralPath $video -Algorithm SHA256).Hash
        DecoderDroppedFrames=$null; VisualSnapshots=$null; LifecyclePass=$null
        Note='Window readiness differs from media readiness. Working-set sum includes shared pages; frame/codec/lifecycle/device acceptance requires separate actual evidence.'
    } | ConvertTo-Json | Set-Content -LiteralPath $OutputPath -Encoding UTF8
}
finally {
    if ($child -and !$child.HasExited) {
        [void]$child.CloseMainWindow()
        if (!$child.WaitForExit(5000)) { $child.Kill(); $child.WaitForExit() }
    }
    foreach ($variable in $variables) { [Environment]::SetEnvironmentVariable($variable,$saved[$variable],'Process') }
}
