"use client";

import { motion, AnimatePresence } from "framer-motion";

export function RippleTransition({ activeSlide, accentColor }: { activeSlide: number; accentColor: string }) {
  return (
    <AnimatePresence>
      <div key={`ripple-${activeSlide}`} className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ border: `1px solid ${accentColor}`, width: 40, height: 40 }}
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: [0, 4], opacity: [0.3, 0] }}
            transition={{ duration: 1.2, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}
