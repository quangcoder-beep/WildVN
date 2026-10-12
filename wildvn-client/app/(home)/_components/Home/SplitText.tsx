"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  text: string;
  accentColor: string;
}

/* ── Seeded random scatter (Dùng lại logic từ FullscreenSlider) ── */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function getScatter(slideId: number, elementSeed: number) {
  const seed = slideId * 100 + elementSeed;
  const angle = seededRandom(seed) * Math.PI * 2;
  const radius = 200 + seededRandom(seed + 1) * 300; 
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const rotate = (seededRandom(seed + 2) - 0.5) * 40;
  return { x: Math.round(x), y: Math.round(y), rotate: Math.round(rotate) };
}

export function SplitText({ text, accentColor }: Props) {
  const [mounted, setMounted] = useState(false);
  const [scatterValues, setScatterValues] = useState<{x: number, y: number, rotate: number}[]>([]);

  useEffect(() => {
    // Chỉ tính toán giá trị ngẫu nhiên trên Client để tránh Hydration Error
    const values = text.split("").map((_, i) => getScatter(0, i));
    setScatterValues(values);
    setMounted(true);
  }, [text]);

  // Nếu chưa mounted hoặc chưa có giá trị, render text bình thường (không animate) để SEO
  if (!mounted || scatterValues.length === 0) {
    return (
      <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight mb-8">
        {text}
      </h1>
    );
  }

  return (
    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight mb-8 flex flex-wrap">
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ 
            opacity: 0, 
            x: scatterValues[i]?.x || 0, 
            y: scatterValues[i]?.y || 0, 
            rotate: scatterValues[i]?.rotate || 0 
          }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          transition={{
            duration: 0.8,
            delay: i * 0.02,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ color: char === " " ? "transparent" : "inherit", whiteSpace: "pre" }}
        >
          {char}
        </motion.span>
      ))}
    </h1>
  );
}
