#!/bin/bash
cd public/videos
find . -name "*.mp4" | while read mp4file; do
  posterfile="${mp4file%.mp4}-poster.jpg"
  if [ ! -f "$posterfile" ]; then
    echo "Generating poster for $mp4file..."
    ffmpeg -i "$mp4file" -ss 00:00:00.000 -vframes 1 -q:v 2 "$posterfile" -y </dev/null
  fi
done
