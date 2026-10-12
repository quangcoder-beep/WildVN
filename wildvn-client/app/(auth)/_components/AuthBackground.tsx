"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { VIDEOS } from "@/app/_shared/constants/assets";

export function AuthBackground() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-black overflow-hidden">
      {/* Video Background */}
      {isMounted && (
        <motion.video
          suppressHydrationWarning
          autoPlay
          loop
          muted
          playsInline
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.35) saturate(1.3)" }}
          poster={VIDEOS.ambient.seamlessLoop.poster}
        >
          {VIDEOS.ambient.seamlessLoop.webm && (
            <source src={VIDEOS.ambient.seamlessLoop.webm} type="video/webm" />
          )}
          <source src={VIDEOS.ambient.seamlessLoop.mp4} type="video/mp4" />
        </motion.video>
      )}

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-[1]" />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </div>
  );
}
