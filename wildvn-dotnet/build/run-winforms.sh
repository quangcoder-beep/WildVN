#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$repo_dir"
if [[ -z "${DISPLAY:-}" ]]; then
  echo 'Cần chạy từ terminal trong phiên desktop X11 (DISPLAY). Không có GUI để mở WinForms.' >&2
  exit 1
fi
command -v mono >/dev/null
bash build/prepare-media-fixture.sh
export WILDVN_TEST_REPO="$repo_dir"
runner_dotnet="${DOTNET:-dotnet}"
results_dir="TestResults/WinForms-$(date +%Y%m%d-%H%M%S)"
mkdir -p -- "$results_dir"
"$runner_dotnet" build src/WildVN.Desktop/WildVN.Desktop.csproj -c Release --nologo
for project in WildVN.Api.Tests WildVN.ApiClient.Tests WildVN.Desktop.Tests; do
  "$runner_dotnet" test "tests/$project/$project.csproj" -c Release --nologo
done
"$runner_dotnet" build tests/WildVN.WinForms.Tests/WildVN.WinForms.Tests.csproj -c Release --nologo
mono tests/WildVN.WinForms.Tests/bin/Release/net472/WildVN.WinForms.Tests.exe --workers=0 --result="$results_dir/nunit.xml"
# Secure application defaults remain in DesktopStartup. Opt in to the local
# review API explicitly when invoking this script; no project config is read.
exec mono src/WildVN.Desktop/bin/Release/net472/WildVN.Desktop.exe
