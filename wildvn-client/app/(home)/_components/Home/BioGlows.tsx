"use client";

import { motion } from "framer-motion";

export function BioGlows({ accentColor }: { accentColor: string }) {
  return (
    <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "50vw",
          height: "50vw",
          right: "-10vw",
          top: "-10vw",
          filter: "blur(120px)",
          background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -25, 15, 0],
          scale: [1, 1.15, 0.9, 1],
          opacity: [0.4, 0.6, 0.35, 0.4],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "35vw",
          height: "35vw",
          left: "-5vw",
          bottom: "5vh",
          filter: "blur(100px)",
          background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
        }}
        animate={{
          x: [0, -20, 30, 0],
          y: [0, 20, -15, 0],
          scale: [0.9, 1.1, 1, 0.9],
          opacity: [0.3, 0.5, 0.25, 0.3],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}
