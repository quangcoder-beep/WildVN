"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { SlideNumberProps } from "@/app/_shared/types";

/**
 * SlideNumber — Số slide dạng cinematic "01 / 03"
 * Lật số kiểu đồng hồ khi đổi slide
 */
export function SlideNumber({ index, total }: SlideNumberProps) {
  return (
    <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 z-20 flex items-end gap-1 select-none pointer-events-none">
      <div className="overflow-hidden h-[60px] md:h-[80px]">
        <AnimatePresence initial={false}>
          <motion.span
            key={index}
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: -60 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="block text-[60px] md:text-[80px] font-bold italic text-white/10 leading-none tabular-nums"
          >
            0{index + 1}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-lg md:text-xl text-white/10 font-light mb-2 md:mb-3">
        / 0{total}
      </span>
    </div>
  );
}
