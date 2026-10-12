"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { AnimatedCounterProps } from "@/app/_shared/types";

/**
 * AnimatedCounter — Số đếm từ 0 lên giá trị thực
 * Sử dụng useMotionValue để render hiệu năng cao (không re-render React)
 */
export function AnimatedCounter({ value, label, accentColor }: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    Math.round(v).toLocaleString("vi-VN")
  );
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    count.set(0);
    const controls = animate(count, value, {
      duration: 2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, count]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (displayRef.current) displayRef.current.textContent = v;
    });
    return unsubscribe;
  }, [rounded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="flex items-baseline gap-3 mt-2"
    >
      <span
        ref={displayRef}
        className="text-3xl md:text-4xl font-bold tabular-nums"
        style={{ color: accentColor }}
      >
        0
      </span>
      <span className="text-sm md:text-base text-white/50 font-light">
        {label}
      </span>
    </motion.div>
  );
}
