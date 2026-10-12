"use client";

import { useState, useRef, useCallback, MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SHOWCASE_ANIMALS } from "@/app/_shared/data/search";
import { CONSERVATION_LABELS } from "@/app/_shared/constants/species";

export function AnimalShowcase() {
  const [activeIdx, setActiveIdx] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const animal = SHOWCASE_ANIMALS[activeIdx];
  const badgeInfo = CONSERVATION_LABELS[animal.status];

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    stageRef.current.style.transform = `rotateY(${x * 25}deg) rotateX(${-y * 20}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (stageRef.current) stageRef.current.style.transform = "rotateY(0) rotateX(0)";
  }, []);

  return (
    <div className="showcase-wrapper">
      {/* Tabs */}
      <div className="showcase-tabs">
        {SHOWCASE_ANIMALS.map((a, i) => (
          <button
            key={a.id}
            className={`showcase-tab ${i === activeIdx ? "showcase-tab--active" : ""}`}
            style={{ "--tab-color": a.accentColor } as React.CSSProperties}
            onClick={() => setActiveIdx(i)}
          >
            {a.emoji} {a.nameVn}
          </button>
        ))}
      </div>

      {/* Stage */}
      <div className="showcase-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={animal.id}
            initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 30 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* 3D animal display */}
            <div
              className="showcase-animal-display"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "-30%",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${animal.accentColor}15 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <div
                ref={stageRef}
                style={{
                  fontSize: 180,
                  transformStyle: "preserve-3d",
                  transition: "transform 0.1s ease-out",
                  filter: `drop-shadow(0 0 40px ${animal.accentColor}30)`,
                  cursor: "grab",
                }}
              >
                {animal.emoji}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Info */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`info-${animal.id}`}
            className="showcase-info"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <h2 className="showcase-name">{animal.nameVn}</h2>
            <p className="showcase-sci">{animal.scientificName}</p>

            <span
              className="badge"
              style={{
                backgroundColor: `${badgeInfo.color}20`,
                color: badgeInfo.color,
                border: `1px solid ${badgeInfo.color}40`,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: badgeInfo.color,
                }}
                className={animal.status === "CR" ? "animate-pulse" : ""}
              />
              {animal.status} · {badgeInfo.label}
            </span>

            <p className="showcase-desc">{animal.description}</p>

            <div className="showcase-meta">
              <span>📍 {animal.habitat}</span>
              <span>👥 {animal.population}</span>
            </div>

            <button className="showcase-cta">Xem chi tiết →</button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
