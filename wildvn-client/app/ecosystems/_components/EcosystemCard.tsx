"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, MapPin, CloudSun } from "lucide-react";
import { getImageUrl } from '@/app/_shared/lib/media';
import styles from "@/app/_shared/styles/glass.module.css";

export function EcosystemCard({ ecosystem, index }: { ecosystem: any; index: number }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hasPointerEvents, setHasPointerEvents] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      setHasPointerEvents(true);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasPointerEvents || shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 2 - 1;
    const y = (e.clientY - rect.top) / rect.height * 2 - 1;
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  const tiltStyle = hasPointerEvents && !shouldReduceMotion && isHovered ? {
    "--rotate-x": `${-mousePosition.y * 5}deg`,
    "--rotate-y": `${mousePosition.x * 5}deg`,
    transform: "perspective(1000px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg)) scale3d(1.02, 1.02, 1.02)",
    transition: "transform 0.1s ease-out",
  } : {
    transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    transition: "transform 0.4s ease-out",
  };

  const color = "#10b981"; // emerald-500

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : index * 0.05 }}
    >
      <Link 
        href={`/ecosystems/${ecosystem.slug}`}
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group block relative overflow-hidden rounded-[2rem] ${styles.macGlass} bg-black/40 border border-white/5 shadow-xl will-change-transform min-h-[400px] flex flex-col`}
        style={tiltStyle as React.CSSProperties}
      >
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-[0.15] transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${isHovered && hasPointerEvents ? `${(mousePosition.x + 1)/2 * 100}% ${(mousePosition.y + 1)/2 * 100}%` : '50% 50%'}, ${color} 0%, transparent 70%)`
          }}
        />

        <div 
          className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 1px ${color}40, 0 0 20px ${color}20` }}
        />

        {/* Thumbnail Image Background */}
        <div className="absolute inset-0 z-0">
          <img src={getImageUrl(ecosystem.thumbnailUrl)} alt={ecosystem.name} className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>

        <article className="p-6 md:p-8 flex flex-col h-full relative z-10">
          <header className="flex items-center justify-between mb-8">
            <div className="px-3 py-1 rounded-full text-xs font-bold tracking-wider text-black bg-white shadow-md">
              {ecosystem.speciesCount} LOÀI
            </div>
          </header>

          <div className="mb-6 flex-1 mt-auto">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 transition-colors duration-300 group-hover:text-emerald-400">
              {ecosystem.name}
            </h2>
            
            <div className="flex flex-col gap-2 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span>{ecosystem.region}</span>
              </div>
              <div className="flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-amber-500" />
                <span>{ecosystem.climate}</span>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">
              Khám phá khu vực
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
