"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ScrollIndicatorProps } from "@/app/_shared/types";

/**
 * ScrollIndicator — Biểu tượng chuột cuộn + mũi tên chevron
 * Ẩn đi khi ở slide cuối
 */
export function ScrollIndicator({ visible }: ScrollIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3"
        >
          {/* Animated Mouse Icon */}
          <div className="w-6 h-10 rounded-full border-2 border-white/40 flex justify-center pt-2 relative">
            <motion.div
              animate={{ y: [0, 10, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-[3px] h-[6px] rounded-full bg-white/70"
            />
          </div>

          {/* Label */}
          <span className="text-white/50 text-[11px] tracking-[0.25em] uppercase select-none font-medium">
            Cuộn để khám phá
          </span>

          {/* Bouncing Chevrons */}
          <div className="flex flex-col items-center -mt-1">
            <motion.svg
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              width="16" height="8" viewBox="0 0 16 8" fill="none"
              className="text-white/50"
            >
              <path d="M1 1L8 7L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
            <motion.svg
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              width="16" height="8" viewBox="0 0 16 8" fill="none"
              className="text-white/30 -mt-1"
            >
              <path d="M1 1L8 7L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
