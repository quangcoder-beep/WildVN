"use client";

import { motion } from "framer-motion";
import type { SlidePaginationProps } from "@/app/_shared/types";

/**
 * SlidePagination — Pagination dots + Progress bar bên phải màn hình
 * Component tự quản lý hiển thị, nhận callback onSlideChange từ parent
 */
export function SlidePagination({
  slides,
  activeSlide,
  accentColor,
  progressPercent,
  onSlideChange,
}: SlidePaginationProps) {
  return (
    <nav className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end gap-5">
      {/* Progress track */}
      <div className="absolute right-[1px] top-0 bottom-0 w-[2px] bg-white/5 rounded-full">
        <motion.div
          className="w-full rounded-full"
          style={{ backgroundColor: accentColor }}
          animate={{ height: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {slides.map((slide, i) => {
        const isActive = activeSlide === i;
        return (
          <button
            key={slide.id}
            onClick={() => onSlideChange(i)}
            className="group relative flex items-center gap-3 cursor-pointer z-10"
            aria-label={`Go to slide ${i + 1}`}
          >
            <span
              className={`text-xs font-mono tracking-widest transition-all duration-500 ${
                isActive
                  ? "text-white opacity-100 translate-x-0"
                  : "text-white opacity-0 translate-x-3"
              }`}
            >
              0{i + 1}
            </span>
            <div
              className={`rounded-full transition-all duration-500 ${
                isActive
                  ? "w-[3px] h-12"
                  : "w-[2px] h-5 group-hover:h-8"
              }`}
              style={{
                backgroundColor: isActive ? accentColor : "rgba(255,255,255,0.3)",
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}
