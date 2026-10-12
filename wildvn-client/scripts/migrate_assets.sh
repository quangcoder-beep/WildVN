#!/bin/bash
cd public

echo "1. Creating directories..."
mkdir -p images/shared images/home images/species/portraits images/species/models-3d images/sequences/bando
mkdir -p videos/home videos/ambient

echo "2. Copying and renaming images..."
cp start.jpg images/shared/start.jpg
cp end.jpg images/shared/end.jpg
cp before-background.png images/shared/before-background.png

cp species/douc.png images/species/portraits/douc--portrait.png
cp species/saola.png images/species/portraits/saola--portrait.png
cp species/tiger.png images/species/portraits/tiger--portrait.png
cp species/ibis.png images/species/portraits/ibis--portrait.png
cp animals/saola-3d.png images/species/models-3d/saola--3d.png

# sequences/bando
cp bando/ezgif-frame-*.jpg images/sequences/bando/

echo "3. Copying and renaming videos..."
cp background-video.mp4 videos/home/hero-loop.mp4
cp background-home/1.mp4 videos/home/section-1.mp4
cp background-home/2.mp4 videos/home/section-2.mp4
cp background-home/4.mp4 videos/home/section-4.mp4
cp background-home/6.mp4 videos/home/section-6.mp4

cp background1.mp4 videos/ambient/bg-ambient-1.mp4
cp background2.mp4 videos/ambient/bg-ambient-2.mp4
cp A_second_seamless_loop_back.mp4 videos/ambient/seamless-loop.mp4
cp f_c_f_a_b_b_dmp_.mp4 videos/ambient/dmp-ambient.mp4

cp bando-animation.mp4 videos/home/bando-animation.mp4

echo "Directory structure created and files copied successfully."
