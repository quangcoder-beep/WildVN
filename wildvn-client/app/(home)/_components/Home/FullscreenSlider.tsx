"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import styles from "@/app/_shared/styles/glass.module.css";

/* ── Data & Types ── */
import { SLIDES, overlayVariants } from "@/app/_shared/data/slides";

/* ── Sub-components ── */
import { SplitText } from "./SplitText";
import { AnimatedCounter } from "./AnimatedCounter";
import { FloatingParticles } from "./FloatingParticles";
import { SlideNumber } from "./SlideNumber";
import { ScrollIndicator } from "./ScrollIndicator";
import { SlidePagination } from "./SlidePagination";
import { FilmGrain } from "./FilmGrain";
import { RevealLines } from "./RevealLines";
import { ParallaxLayers } from "./ParallaxLayers";
import { SpeciesFan } from "./SpeciesFan";
import { CinematicBackground } from "./CinematicBackground";
import { BioGlows } from "./BioGlows";
import { RippleTransition } from "./RippleTransition";

/* ── Seeded random scatter direction generator ── */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** Tạo offset scatter ngẫu nhiên trên vòng tròn 360° dựa trên seed */
function scatter(slideId: number, elementSeed: number) {
  const seed = slideId * 100 + elementSeed;
  const angle = seededRandom(seed) * Math.PI * 2;
  const radius = 150 + seededRandom(seed + 1) * 200; // 150-350px
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const rotate = (seededRandom(seed + 2) - 0.5) * 20; // ±10°
  return { x: Math.round(x), y: Math.round(y), rotate: Math.round(rotate) };
}


/**
 * FullscreenSlider — Main homepage slider component
 * Quản lý: scroll locking, slide navigation, layout composition
 * Tất cả UI con đều được import từ file riêng biệt
 */
export function FullscreenSlider() {
  const [activeSlide, setActiveSlide] = useState(0);
  const isLocked = useRef(false);
  const touchStartY = useRef(0);

  const current = SLIDES[activeSlide];

  /* ── Navigate ── */
  const goToSlide = (index: number) => {
    if (isLocked.current) return;
    if (index < 0 || index >= SLIDES.length) return;
    if (index === activeSlide) return;

    isLocked.current = true;
    setActiveSlide(index);

    setTimeout(() => {
      isLocked.current = false;
    }, 1000);
  };

  /* ── Event listeners ── */
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isLocked.current) return;
      if (e.deltaY > 30) goToSlide(activeSlide + 1);
      else if (e.deltaY < -30) goToSlide(activeSlide - 1);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isLocked.current) return;
      const delta = touchStartY.current - e.changedTouches[0].clientY;
      if (delta > 60) goToSlide(activeSlide + 1);
      else if (delta < -60) goToSlide(activeSlide - 1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goToSlide(activeSlide + 1);
      if (e.key === "ArrowUp") goToSlide(activeSlide - 1);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlide]);

  const progressPercent = ((activeSlide + 1) / SLIDES.length) * 100;

  return (
    <section className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      {/* Layer 1: Cinematic Scroll-Scrub Background */}
      <CinematicBackground activeSlide={activeSlide} />

      {/* Layer 2: Dark Overlay with Blink */}
      <motion.div
        key={`overlay-${activeSlide}`}
        className="absolute inset-0 bg-black pointer-events-none"
        variants={overlayVariants}
        animate="flash"
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />

      {/* Layer 3: Film Grain */}
      <FilmGrain />

      {/* Layer 4: Bioluminescent Glows */}
      <BioGlows accentColor={SLIDES[activeSlide].accentColor} />

      {/* Layer 5: Fog Parallax */}
      <ParallaxLayers activeSlide={activeSlide} />

      {/* Layer 6: Ripple Transition */}
      <RippleTransition activeSlide={activeSlide} accentColor={SLIDES[activeSlide].accentColor} />

      {/* Layer 7: Floating Particles */}
      <FloatingParticles />

      {/* Layer 8: Species Gallery Fan */}
      <SpeciesFan activeSlide={activeSlide} />

      {/* Layer 5: Slide Content (Scatter/Converge) */}
      <div className="absolute inset-0 z-10 flex items-center">
        <div className="relative w-full h-full">
          <AnimatePresence>
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex items-center px-8 md:px-20 lg:px-32"
            >
              <div className="max-w-4xl flex flex-col">
                {/* Subtitle — scatter from seeded random direction */}
                {(() => {
                  const s = scatter(activeSlide, 10); return (
                    <motion.p
                      initial={{ opacity: 0, x: s.x, y: s.y, rotate: s.rotate }}
                      animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                      exit={{ opacity: 0, x: -s.x * 0.6, y: -s.y * 0.6, rotate: -s.rotate }}
                      transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className="text-sm md:text-base font-medium tracking-[0.3em] uppercase mb-6"
                      style={{ color: current.accentColor }}
                    >
                  // {current.subtitle}
                    </motion.p>
                  );
                })()}

                {/* Title — each char scatters from 360° directions */}
                <SplitText text={current.title} accentColor={current.accentColor} />

                {/* Reveal Lines — slide in from left */}
                <RevealLines />

                {/* Description — scatter from seeded random direction */}
                {(() => {
                  const s = scatter(activeSlide, 20); return (
                    <motion.p
                      initial={{ opacity: 0, x: s.x, y: s.y, rotate: s.rotate }}
                      animate={{ opacity: 0.8, x: 0, y: 0, rotate: 0 }}
                      exit={{ opacity: 0, x: -s.x * 0.6, y: -s.y * 0.6, rotate: -s.rotate }}
                      transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="text-lg md:text-2xl text-white/80 font-light leading-relaxed max-w-2xl mb-6"
                    >
                      {current.desc}
                    </motion.p>
                  );
                })()}

                {/* Counter — scatter from seeded random direction */}
                {(() => {
                  const s = scatter(activeSlide, 30); return (
                    <motion.div
                      initial={{ opacity: 0, x: s.x, y: s.y, rotate: s.rotate }}
                      animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                      exit={{ opacity: 0, x: -s.x * 0.6, y: -s.y * 0.6, rotate: -s.rotate }}
                      transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <AnimatedCounter
                        value={current.stat.value}
                        label={current.stat.label}
                        accentColor={current.accentColor}
                      />
                    </motion.div>
                  );
                })()}

                {/* CTA Button — scatter from seeded random direction */}
                {(() => {
                  const s = scatter(activeSlide, 40); return (
                    <motion.div
                      initial={{ opacity: 0, x: s.x, y: s.y, rotate: s.rotate }}
                      animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                      exit={{ opacity: 0, x: -s.x * 0.6, y: -s.y * 0.6, rotate: -s.rotate }}
                      transition={{ delay: 0.55, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-10"
                    >
                      <button
                        className={`group inline-flex items-center gap-4 px-8 py-4 rounded-full ${styles.macGlass} border border-white/20 hover:border-white/40 transition-all duration-300`}
                      >
                        <span className="text-white font-medium tracking-wide">
                          {current.cta}
                        </span>
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                          style={{ backgroundColor: current.accentColor }}
                        >
                          <ArrowRight className="w-4 h-4 text-black" />
                        </span>
                      </button>
                    </motion.div>
                  );
                })()}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Layer 6: Pagination */}
      <SlidePagination
        slides={SLIDES}
        activeSlide={activeSlide}
        accentColor={current.accentColor}
        progressPercent={progressPercent}
        onSlideChange={goToSlide}
      />

      {/* Layer 7: Slide Number */}
      <SlideNumber index={activeSlide} total={SLIDES.length} />

      {/* Layer 8: Scroll Indicator */}
      <ScrollIndicator visible={activeSlide < SLIDES.length - 1} />
    </section>
  );
}
