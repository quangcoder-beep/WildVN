"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Network } from "lucide-react";
import { CONSERVATION_LABELS, HABITAT_LABELS } from "@/app/_shared/constants/species";
import styles from "@/app/_shared/styles/glass.module.css";
import FavoriteButton from "@/app/_shared/components/FavoriteButton";

export function SpecimenCard({ species, index }: { species: any; index: number }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hasPointerEvents, setHasPointerEvents] = useState(false);

  const labelKey = species.conservationStatus;
  const labelData = CONSERVATION_LABELS[labelKey] || { label: species.conservationStatus || "UNK", color: "#6B7280", description: "" };
  const specimenId = `#SP-${(index + 1).toString().padStart(3, "0")}`;

  // Detect coarse pointers (touch devices)
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      setHasPointerEvents(true);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasPointerEvents || shouldReduceMotion || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    // Calculate normalized mouse position from -1 to 1
    const x = (e.clientX - rect.left) / rect.width * 2 - 1;
    const y = (e.clientY - rect.top) / rect.height * 2 - 1;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  // Safe 3D Tilt calculation using CSS variables to avoid inline style thrashing
  const tiltStyle = hasPointerEvents && !shouldReduceMotion && isHovered ? {
    "--rotate-x": `${-mousePosition.y * 5}deg`,
    "--rotate-y": `${mousePosition.x * 5}deg`,
    transform: "perspective(1000px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg)) scale3d(1.02, 1.02, 1.02)",
    transition: "transform 0.1s ease-out",
  } : {
    transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    transition: "transform 0.4s ease-out",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : index * 0.05 }}
    >
      <Link 
        href={`/species/${species.slug}`}
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group block relative overflow-hidden rounded-[2rem] ${styles.macGlass} bg-black/40 border border-white/5 shadow-xl will-change-transform`}
        style={tiltStyle as React.CSSProperties}
        aria-label={`Xem chi tiết hồ sơ ${species.name}`}
      >
        {/* Dynamic Glow Background based on Conservation Status */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-[0.15] transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${isHovered && hasPointerEvents ? `${(mousePosition.x + 1)/2 * 100}% ${(mousePosition.y + 1)/2 * 100}%` : '50% 50%'}, ${labelData.color} 0%, transparent 70%)`
          }}
        />

        {/* Dynamic Neon Border */}
        <div 
          className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 1px ${labelData.color}40, 0 0 20px ${labelData.color}20`
          }}
        />

        <article className="p-6 md:p-8 flex flex-col h-full relative z-10">
          
          {/* Header: Specimen ID & Status */}
          <header className="flex items-center justify-between mb-8">
            <span className="font-mono text-xs tracking-widest text-white/40">
              {specimenId}
            </span>
            <div className="flex items-center gap-3">
              <div 
                className="px-3 py-1 rounded-full text-xs font-bold tracking-wider text-black flex items-center shadow-md"
                style={{
                  backgroundColor: labelData.color,
                  boxShadow: `0 0 12px ${labelData.color}60`
                }}
              >
                {species.conservationStatus}
              </div>
              <div className="pointer-events-auto">
                <FavoriteButton speciesId={species.id} className="scale-90 hover:scale-100 active:scale-95" />
              </div>
            </div>
          </header>

          {/* Names */}
          <div className="mb-6 flex-1">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2 transition-colors duration-300"
                style={{ color: isHovered ? labelData.color : "white" }}>
              {species.name}
            </h2>
            <p className="text-sm md:text-base italic text-white/50 font-light font-serif">
              {species.scientificName}
            </p>
          </div>

          {/* Taxonomy Tree (Semantic Display) */}
          <div className="mt-auto mb-6 bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Network className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest font-medium">
                <span className="text-white/60">Phân loại: {species.taxonomy?.nameVn || species.taxonomy?.scientificName || "Đang cập nhật"}</span>
                <span className="text-white/20">/</span>
                <span className="text-white/80">
                  Môi trường: {species.habitatType?.length 
                    ? species.habitatType.map((h: string) => HABITAT_LABELS[h] || h).join(', ') 
                    : 'Chưa rõ'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <footer className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
              Đọc hồ sơ chi tiết
            </span>
            <span className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white group-hover:text-black flex items-center justify-center transition-all duration-300 transform group-hover:rotate-45">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </footer>

        </article>
      </Link>
    </motion.div>
  );
}
