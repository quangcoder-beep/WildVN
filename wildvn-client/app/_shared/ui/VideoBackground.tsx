"use client";

import { useEffect, useRef, useState } from "react";

export interface VideoAsset {
  mp4: string;
  webm?: string;
  poster?: string;
}

interface VideoBackgroundProps {
  asset: VideoAsset;
  className?: string;
  style?: React.CSSProperties;
}

export function VideoBackground({ asset, className = "", style }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Check accessibility preference
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setShouldPlay(false);
      return;
    }

    // IntersectionObserver to pause when out of viewport to save resources
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldPlay(true);
            videoElement.play().catch((e) => {
              // Auto-play might be blocked by browser policies if not interacted yet
              console.warn("Video playback prevented:", e);
            });
          } else {
            setShouldPlay(false);
            videoElement.pause();
          }
        });
      },
      { threshold: 0 } // Trigger as soon as 1px is in/out of view
    );

    observer.observe(videoElement);

    return () => {
      observer.unobserve(videoElement);
      observer.disconnect();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={`${className} transition-opacity duration-1000 ease-out ${
        isLoaded ? "opacity-100" : "opacity-0"
      }`}
      style={style}
      muted
      loop
      playsInline
      poster={asset.poster}
      preload="none"
      onLoadedData={() => setIsLoaded(true)}
    >
      {asset.webm && <source src={asset.webm} type="video/webm" />}
      <source src={asset.mp4} type="video/mp4" />
    </video>
  );
}
