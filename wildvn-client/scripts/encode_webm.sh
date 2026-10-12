#!/bin/bash
cd public/videos

find . -name "*.mp4" | while read mp4file; do
  webmfile="${mp4file%.mp4}.webm"
  if [ ! -f "$webmfile" ]; then
    echo "Converting $mp4file to $webmfile..."
    ffmpeg -i "$mp4file" -c:v libvpx-vp9 -b:v 0 -crf 33 "$webmfile" </dev/null
  else
    echo "Skipping $mp4file, $webmfile already exists."
  fi
done
echo "WebM encoding completed."
