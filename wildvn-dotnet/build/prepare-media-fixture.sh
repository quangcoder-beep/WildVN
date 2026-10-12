#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source_video="$repo_dir/../wildvn-client/public/videos/home/hero-loop.mp4"
test_audio="$repo_dir/TestResults/winforms-wf02/derived-audio.wav"
test -f "$source_video"
command -v ffmpeg >/dev/null
mkdir -p -- "$(dirname -- "$test_audio")"
ffmpeg -hide_banner -loglevel error -y -i "$source_video" -vn -c:a pcm_s16le "$test_audio"
echo 'Audio PoC: PCM WAV derived from repository hero-loop.mp4 AAC; not a business fixture.'
sha256sum -- "$source_video" "$test_audio"
