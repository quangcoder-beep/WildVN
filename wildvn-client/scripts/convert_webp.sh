#!/bin/bash
cd public/images
find . -name "*.png" | while read pngfile; do
  webpfile="${pngfile%.png}.webp"
  if [ ! -f "$webpfile" ]; then
    echo "Converting $pngfile to $webpfile..."
    ffmpeg -i "$pngfile" -c:v libwebp -lossless 1 "$webpfile" -y </dev/null
  fi
done
