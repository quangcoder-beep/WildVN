# WildVN local review artifact

This is an unsigned development PoC ZIP, not an installer or production release.
Windows runtime execution, clean-machine install, signing, upgrade/uninstall,
DPI/accessibility, and device playback acceptance: CHƯA KIỂM CHỨNG.
No backend, auth account, database/MinIO/OAuth credential or project configuration
is bundled. The existing five-section shell and native local-media PoC are unchanged.

## Dependencies and licenses

- Windows win-x64: .NET 10 runtime/Windows Desktop runtime bundled by self-contained
  publish. Microsoft runtime LICENSE.txt and ThirdPartyNotices.txt are included when
  emitted by publish. https://github.com/dotnet/runtime
- LibVLCSharp 3.10.1: LGPL-2.1-or-later according to the NuGet package metadata.
  https://www.nuget.org/packages/LibVLCSharp/3.10.1
- Windows native VideoLAN.LibVLC.Windows 3.0.24: package metadata LGPL-2.1-or-later;
  native libvlc.dll/libvlccore.dll and x64 plugin DLLs included. Lua/HTTP files,
  development .lib files and other architectures are omitted.
  https://www.nuget.org/packages/VideoLAN.LibVLC.Windows/3.0.24
  https://code.videolan.org/videolan/vlc/-/tree/3.0.24
- System.Text.Json 10.0.12 and portable System.* dependencies: MIT metadata;
  https://github.com/dotnet/runtime
- Mono net472: requires host Mono, X11, native LibVLC3 and plugins; no native Linux
  runtime bundled. Versions audited only as recorded in the handover.
- JPEG/MP4 samples are existing repository bytes. WAV is PCM extracted with ffmpeg
  from the MP4 AAC stream, not a business audio fixture. Source hashes are recorded
  in the build log. Ownership/redistribution clearance is not claimed.

These metadata notices do not prove a complete license audit of native plugins and
third-party codecs. License texts/source-offer and media rights review remain release
prerequisites; do not publish this artifact as a licensed/signed production release.

## Review / stop / rollback

Mono: Python3.11+ on Linux with pidfd support; run `python3 review_client.py check`
then `python3 review_client.py start --with-samples` in an X11 terminal.
Status: `python3 review_client.py status`. Prefer window X for staged media cleanup;
`python3 review_client.py stop` sends SIGTERM only to the verified child (forced stop
can leave staging). Remove stale .review-session.json only after confirming the old
client has exited; no automatic restart or stale PID kill.
Windows: `powershell -NoProfile -File .\Review-Windows.ps1 -Action Start -WithSamples`.
`-Action Check` checks manifest hashes; `-Action Status`/`Stop` manage only the child.
HTTPS defaults remain in the app. Loopback HTTP requires explicit API URL and opt-in.
Hashes detect corruption against the supplied manifest; they do not authenticate an
unsigned manifest. Compare ZIP SHA256 with the handover before extraction.
No updater is installed. Rollback rehearsal: close the current client, keep package
folders separately, and start a previously verified artifact. No DB restore/change.
Rollback and Windows runner execution still need actual Windows evidence.

## Per-user Windows review install

Windows ZIP includes Install-WindowsReview.ps1 and Start-InstalledReview.ps1. The
installer is an explicit offline script workflow in the current user's
LocalApplicationData/WildVN/Review directory, with version folders keyed by the
independently supplied ZIP SHA256. Install/Update/Rollback/Uninstall require Windows
x64 and -AllowUnsignedReview. Verify the ZIP digest from the handover before use.
Updates select another locally chosen verified ZIP; there is no automatic updater.
Previous payloads remain for rollback, and ownership metadata remains after uninstall
for safe reuse. No elevation, certificate-store or ExecutionPolicy changes occur.
This does not constitute signed production installer or clean-machine acceptance.
Verify-WindowsReview.py prepares real UIA shell/media acceptance using a separate
Windows Python environment; Linux returns unverified, never a playback pass.
