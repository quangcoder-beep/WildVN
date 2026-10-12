# T05 — media PoC implementation; Windows acceptance pending

**Decision is provisional:** retain WPF native as the plan's default. WebView2 is a local
presentation candidate only. No measured Windows result supports a final renderer/codec/
cinematic fidelity/packaging decision yet. T05 is not fully accepted on this Linux machine.

## Implemented and actually checked

- Native Image/MediaElement and isolated WebView2 prototypes are wired into the shell's
  “PoC media” button; ordinary navigation closes/disposes the presenter. Both use identical
  selected image/video/audio files copied into one private temporary staging directory.
  No Next/Node runtime, no website navigation, no automatic real API/MinIO request.
- Explicit local file configuration only: selected media extensions, no UNC/device/stream
  paths or symlinks/parent symlinks; max128 MiB per file. Only selected media plus bundled
  HTML are staged/mapped, never the source folder/root/credential directory. Assets are not
  included wholesale in the installer. No standalone audio clip was found in repo assets;
  MP4 AAC and WebM Opus audio tracks can be tested; separate audio needs an approved sample.
- Native has play/pause/stop/mute, source-error/loading messages, close/clear sources;
  native prototype uses static presentation for reduced motion. Image decode runs off the
  UI thread and downsamples to1024px width; retain that setting in comparisons. Local HTML has equivalent
  controls, reduced-motion option and visibility/pagehide cleanup. Chromium document is
  destroyed with WebView2.Dispose even while async initialization is cancelled.
- WebView2 exact local document navigation, named staged-resource allowlist, denied frame
  navigation/new windows/downloads/permissions, no host objects or web message bridge;
  origin checked before ExecuteScript. CSP blocks network/frames and uses exact inline
  script/style hashes. Based on [Microsoft security guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/security).
- [RED](../evidence/t05-red.txt): policy/HTML absent, then stream-path regression failed.
  [GREEN](../evidence/t05-green.txt): 62 desktop tests (18 shell +44 media), 3 HTML tests,
  zero skips; build WPF net10.0-windows on Linux zero warnings/errors. Policy coverage:
  100% lines /91.17% branches; playback state 100%/100%. Native/WebView adapters are not
  measured/executed by those Linux tests. DOM stub runs the actual JS script but proves
  logic only, not real browser/codec/lifecycle behavior. No global T27 coverage claim.
- Actual Linux ffprobe/ffmpeg metadata +3-frame decode of source samples:

| Local source sample | Size | Metadata observed | Windows native/WebView2 |
|---|---:|---|---|
| wildvn-client/public/videos/home/hero-loop.mp4 | 7,127,367 B | H.264 1280×720 24fps, AAC, 8s | pending |
| wildvn-client/public/videos/home/hero-loop.webm | 1,462,823 B | VP9 1280×720 24fps, Opus, 8.008s | pending |
| wildvn-client/public/videos/home/hero-loop-poster.jpg | 315,926 B | JPEG 1280×720 | pending |

Hashes are in the GREEN log. Successful FFmpeg decoding on Linux does not establish WPF
or WebView2 Windows support. WebP/standalone audio/MinIO presigned expiry were not tested.

## Reproduce the same dataset on Windows

From wildvn-dotnet, build/publish the app; set absolute selected local files. Supply an
approved offline MinIO sample later to satisfy that source criterion; current home assets
are repository files, not proof that a MinIO object was fetched or reachable.

```powershell
$env:WILDVN_POC_IMAGE_PATH = (Resolve-Path '../wildvn-client/public/videos/home/hero-loop-poster.jpg').Path
$env:WILDVN_POC_VIDEO_PATH = (Resolve-Path '../wildvn-client/public/videos/home/hero-loop.mp4').Path
# Set WILDVN_POC_AUDIO_PATH only for an approved local sample.
dotnet run --project src/WildVN.Desktop/WildVN.Desktop.csproj
```

Open PoC media, switch Native/WebView2, play30s, pause/mute/stop, toggle motion, resize,
navigate away/back20 times, then close during loading/playback. Verify no background
sound/video, no retained presenter/file locks, keyboard/focus and error states. Repeat
with WebM, WebP/audio and approved MinIO downloads; explicitly check expired/presigned
URL handling later with an isolated media server (this PoC currently rejects remote URLs).
The static prototypes do not recreate all Next cinematic transitions or production detail
DTO; compare desired home/detail fidelity with screenshots before expanding UI.

## Device matrix — no fabricated measurements

Windows 10 is conditional on an edition/lifecycle and .NET10/WebView2 runtime supported
combination; determine against [the official OS matrix](https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md).
Windows 11 version/build and clean-machine prerequisites also require actual recording.

| OS / edition | DPI | Native codec/UI | WebView2 codec/UI | Startup / RAM / decoder drops | Lifecycle / snapshots |
|---|---:|---|---|---|---|
| Windows 11 supported version, machine not supplied | 100% | not run | not run | not measured | not run |
| Windows 11 supported version, machine not supplied | 150% | not run | not run | not measured | not run |
| Windows 11 supported version, machine not supplied | 200% | not run | not run | not measured | not run |
| Windows 10 eligible edition/lifecycle not established | 100% | not run | not run | not measured | not run |
| Windows 10 eligible edition/lifecycle not established | 150% | not run | not run | not measured | not run |
| Windows 10 eligible edition/lifecycle not established | 200% | not run | not run | not measured | not run |

`build/Measure-MediaPoC.ps1` is prepared for a Windows desktop session and is **not run or
PowerShell-parsed here** (pwsh absent). It records actual window DPI, shell-window-ready
latency, root/process-tree working-set sum and sample hashes, restores process env vars,
and closes only its own child. It leaves media-ready time/decoder frame drops/lifecycle
null. Window creation is not media-ready time; working-set sum double-counts shared pages.
Use WPR/ETW/device instrumentation for native decoder drops and compare with WebView2
`getVideoPlaybackQuality()`/frame callbacks via the explicit metrics button, with the same
scenario and startup definitions. Do not fill missing values with estimates or zeros.

## Runtime packaging still open

WebView2 SDK pinned 1.0.4258.31; NuGet audit found no advisory in current feeds. Runtime is
separate: candidate Evergreen with presence detection/provisioning by the later installer,
following [Microsoft distribution guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).
No runtime installer was executed/downloaded into user config and no final packaging
choice is asserted. Native avoids that browser runtime but requires real codec testing.
Dedicated WebView profile contains no app session/API credentials; temporary media cleanup
warns if locks persist and must be verified over repeated navigation on Windows.
