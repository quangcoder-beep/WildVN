"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, BookOpen, Leaf } from "lucide-react";

// 3 content states that rotate through the 4 tiles
const TILE_STATES = [
  [
    { type: "logo" as const, id: "t1-1" },
    { type: "icon" as const, icon: Search, label: "Tra cứu AI", id: "t1-2" },
    { type: "text" as const, text: "10,000+\nloài", id: "t1-3" },
    { type: "icon" as const, icon: MapPin, label: "Bản đồ", id: "t1-4" },
  ],
  [
    { type: "icon" as const, icon: Leaf, label: "Bảo tồn", id: "t2-1" },
    { type: "logo" as const, id: "t2-2" },
    { type: "icon" as const, icon: BookOpen, label: "Học tập", id: "t2-3" },
    { type: "text" as const, text: "Khám phá\nthiên nhiên", id: "t2-4" },
  ],
  [
    { type: "text" as const, text: "Đa dạng\nsinh học", id: "t3-1" },
    { type: "icon" as const, icon: Leaf, label: "Bảo tồn", id: "t3-2" },
    { type: "logo" as const, id: "t3-3" },
    { type: "icon" as const, icon: Search, label: "Nhận diện", id: "t3-4" },
  ],
];

function LogoTile() {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
        <path
          d="M24 0L27.5 18.5L48 24L27.5 29.5L24 48L20.5 29.5L0 24L20.5 18.5L24 0Z"
          fill="white"
        />
      </svg>
      <span className="text-white text-base font-semibold tracking-wider">WildVN</span>
    </div>
  );
}

interface TileContentProps {
  tile: (typeof TILE_STATES)[0][0];
}

function TileContent({ tile }: TileContentProps) {
  if (tile.type === "logo") return <LogoTile />;

  if (tile.type === "icon") {
    const Icon = tile.icon!;
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <Icon className="w-8 h-8 text-white/80" strokeWidth={1.5} />
        <span className="text-white/60 text-xs font-light tracking-widest uppercase text-center">
          {tile.label}
        </span>
      </div>
    );
  }

  return (
    <p className="text-white text-lg font-medium italic text-center leading-snug whitespace-pre-line px-2">
      {tile.text}
    </p>
  );
}

export function IntroSplash({ onComplete }: { onComplete: () => void }) {
  const [stateIndex, setStateIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "tiles" | "reveal" | "done">("enter");

  useEffect(() => {
    // Prevent scrolling while intro is playing
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    // Phase 1: Enter tiles smoothly
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase("tiles"), 100)); // Start initial render
    timers.push(setTimeout(() => setStateIndex(1), 1200)); // First shuffle
    timers.push(setTimeout(() => setStateIndex(2), 2400)); // Second shuffle
    
    // Phase 2: Reveal (scale up + fade)
    timers.push(setTimeout(() => setPhase("reveal"), 3600));
    
    // Phase 3: Done
    timers.push(setTimeout(() => {
      document.body.style.overflow = previousOverflow;
      setPhase("done");
      onComplete();
    }, 4600)); // Extended duration for smoother fade out

    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete]);

  const tiles = TILE_STATES[stateIndex];

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background: "radial-gradient(ellipse at center, #0d2818 0%, #050d09 50%, #000000 100%)",
          }}
        >
          {/* Ambient glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.2, scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, #2dd4a8, transparent)" }}
          />

          <motion.div
            animate={
              phase === "reveal"
                ? { scale: 15, opacity: 0, filter: "blur(30px)" }
                : { scale: 1, opacity: 1, filter: "blur(0px)" }
            }
            transition={
              phase === "reveal"
                ? { duration: 1.2, ease: [0.65, 0, 0.35, 1] } // Expo in out
                : {}
            }
            className="relative grid grid-cols-2 grid-rows-2 gap-3"
          >
            {tiles.map((tile, i) => (
              <motion.div
                key={`tile-container-${i}`}
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.1,
                  ease: "easeOut",
                }}
                className="relative w-36 h-36 md:w-44 md:h-44 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] overflow-hidden"
                style={{
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.3)",
                }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={tile.id}
                    initial={{ opacity: 0, scale: 0.8, filter: "blur(8px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <TileContent tile={tile} />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
