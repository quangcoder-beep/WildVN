"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VIDEOS, IMAGES } from "@/app/_shared/constants/assets";

interface Props {
  activeSlide: number; // 0, 1, 2
}

const BG_VIDEOS = [
  VIDEOS.home.section2, // Slide 1 (original 2.mp4)
  VIDEOS.home.section3, // Slide 2 (original 4.mp4)
  VIDEOS.home.section4, // Slide 3 (original 6.mp4)
];

const FRAMES_DIR = [
  { path: IMAGES.sequences.home3.path, count: IMAGES.sequences.home3.count }, // 0 -> 1
  { path: IMAGES.sequences.home5.path, count: IMAGES.sequences.home5.count }, // 1 -> 2
];

const pad = (num: number) => String(num).padStart(3, "0");

export const CinematicBackground = memo(function CinematicBackground({ activeSlide }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [images, setImages] = useState<Record<number, HTMLImageElement[]>>({});
  const prevSlide = useRef(activeSlide);
  const rafId = useRef<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Preload all transition frames into memory
  useEffect(() => {
    const preloaded: Record<number, HTMLImageElement[]> = {};

    FRAMES_DIR.forEach((dir, index) => {
      preloaded[index] = [];
      for (let i = 1; i <= dir.count; i++) {
        const img = new Image();
        img.src = `${dir.path}/ezgif-frame-${pad(i)}.jpg`;
        preloaded[index].push(img);
      }
    });

    setImages(preloaded);
  }, []);

  // Handle slide changes
  useEffect(() => {
    if (activeSlide === prevSlide.current) return;

    setIsTransitioning(true);
    const isScrollingDown = activeSlide > prevSlide.current;

    // Determine which transition sequence to use
    let transitionIndex = 0;
    if ((prevSlide.current === 0 && activeSlide === 1) || (prevSlide.current === 1 && activeSlide === 0)) {
      transitionIndex = 0;
    } else if ((prevSlide.current === 1 && activeSlide === 2) || (prevSlide.current === 2 && activeSlide === 1)) {
      transitionIndex = 1;
    }

    const sequence = images[transitionIndex] || [];

    // Cleanup any existing animation
    if (rafId.current) cancelAnimationFrame(rafId.current);

    // If images haven't loaded yet, fallback to instant swap
    if (sequence.length === 0) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        prevSlide.current = activeSlide;
      }, 600);
      return () => clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });

    if (canvas && ctx) {
      canvas.width = 1920;
      canvas.height = 1080;

      let frame = 0;
      const totalFrames = sequence.length;

      const playFrames = () => {
        const imgIndex = isScrollingDown ? frame : totalFrames - 1 - frame;
        const img = sequence[imgIndex];

        if (img && img.complete) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        frame++;
        if (frame < totalFrames) {
          rafId.current = requestAnimationFrame(playFrames);
        } else {
          setIsTransitioning(false);
          prevSlide.current = activeSlide;
          rafId.current = null;
        }
      };

      rafId.current = requestAnimationFrame(playFrames);
    }

    // Optimization Rule 2: Cleanup function
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [activeSlide, images]);

  return (
    <div className="absolute inset-0 z-0 bg-black overflow-hidden pointer-events-none">
      {/* 1. Canvas for high-speed scrolling transition */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isTransitioning ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        style={{ filter: "brightness(0.6) saturate(1.2)" }}
      />

      {/* 2. Looping Video for idle states */}
      <AnimatePresence mode="wait">
        {isMounted && !isTransitioning && (
          <motion.video
            suppressHydrationWarning
            key={`video-${activeSlide}`}
            poster={BG_VIDEOS[activeSlide].poster}
            autoPlay
            loop
            muted
            playsInline
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ filter: "brightness(0.6) saturate(1.2)" }}
          >
            {BG_VIDEOS[activeSlide].webm && (
              <source src={BG_VIDEOS[activeSlide].webm} type="video/webm" />
            )}
            <source src={BG_VIDEOS[activeSlide].mp4} type="video/mp4" />
          </motion.video>
        )}
      </AnimatePresence>
    </div>
  );
});
