"use client";

import { motion } from "framer-motion";

/**
 * RevealLines — 2 đường kẻ ngang mỏng trượt từ trái sang phải
 * Xuất hiện trên và dưới tiêu đề khi slide đang active
 */
export function RevealLines() {
  return (
    <div className="flex flex-col gap-1 my-4 max-w-2xl">
      {/* Line trên */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        exit={{ scaleX: 0, opacity: 0 }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="h-[1px] bg-gradient-to-r from-white/40 via-white/20 to-transparent"
        style={{ transformOrigin: "left center" }}
      />
      {/* Line dưới */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 0.5 }}
        exit={{ scaleX: 0, opacity: 0 }}
        transition={{ delay: 0.55, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="h-[1px] bg-gradient-to-r from-white/20 via-white/10 to-transparent w-3/4"
        style={{ transformOrigin: "left center" }}
      />
    </div>
  );
}
