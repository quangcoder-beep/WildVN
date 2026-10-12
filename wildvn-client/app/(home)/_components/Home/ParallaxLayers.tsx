"use client";

import { motion } from "framer-motion";

export function ParallaxLayers({ activeSlide }: { activeSlide: number }) {
  return (
    <>
      <motion.div
        className="absolute inset-0 z-[4] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.3) 100%)",
          mixBlendMode: "multiply",
        }}
        animate={{ x: activeSlide * -40, opacity: 0.5 + activeSlide * 0.1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[30vh] z-[4] pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)" }}
        animate={{ x: activeSlide * 25 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
    </>
  );
}
