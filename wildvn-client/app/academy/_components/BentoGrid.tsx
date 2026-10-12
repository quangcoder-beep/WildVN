"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useMotionSafe } from "@/app/_shared/hooks/useMotionSafe";
import { MOTION_SPRINGS } from "@/app/_shared/lib/motion-tokens";

interface BentoCardProps {
  title: string;
  subtitle: string;
  description: string;
  href?: string;
  badge?: string;
  disabled?: boolean;
  className?: string;
  index: number;
}

export function BentoCard({
  title,
  subtitle,
  description,
  href,
  badge,
  disabled = false,
  className = "",
  index,
}: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { tier } = useMotionSafe();

  // Motion values for magnetic card tilt (Tier 3 only)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useMotionValue(0), MOTION_SPRINGS.SNAPPY);
  const rotateY = useSpring(useMotionValue(0), MOTION_SPRINGS.SNAPPY);

  const spotlightBackground = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(45, 212, 168, 0.06), transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tier < 3 || disabled || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height / 2;

    // Calculate rotation limits (max 8 degrees)
    const factorX = -(y / (height / 2)) * 8;
    const factorY = (x / (width / 2)) * 8;

    rotateX.set(factorX);
    rotateY.set(factorY);

    // Spotlight glow coordinates
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const style = tier >= 3 ? {
    rotateX,
    rotateY,
    transformStyle: "preserve-3d" as const,
  } : undefined;

  // Stagger entry animation configurations
  const entryVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number], // OUT_EXPO
        delay: index * 0.08, // Stagger delay matching motion budget rules
      },
    },
  };

  const cardContent = (
    <div className="relative h-full flex flex-col justify-between p-6 md:p-8">
      {/* Dynamic spotlight hover mask (Tier 3 only) */}
      {tier >= 3 && !disabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
          style={{
            background: spotlightBackground,
          }}
        />
      )}

      {/* Header section */}
      <div className="flex flex-col gap-3 z-10">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] text-[#9A8F7E] tracking-widest uppercase">
            {subtitle}
          </span>
          {badge && (
            <span className="font-mono text-[9px] bg-[rgba(232,220,200,0.06)] border border-[rgba(232,220,200,0.12)] text-[#2DD4A8] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        <h3 className="font-serif text-2xl md:text-3xl text-white group-hover:text-[#2DD4A8] transition-colors duration-300">
          {title}
        </h3>
        <p className="font-sans text-xs md:text-sm text-[#9A8F7E] leading-relaxed mt-1">
          {description}
        </p>
      </div>

      {/* Call to action trigger */}
      <div className="flex justify-end items-center mt-6 z-10">
        {!disabled && href ? (
          <span className="font-mono text-xs text-white border border-[rgba(232,220,200,0.15)] px-4 py-2 rounded-lg group-hover:bg-white group-hover:text-black transition-all duration-300">
            Khám phá →
          </span>
        ) : (
          <span className="font-mono text-xs text-[#52525B] border border-[rgba(232,220,200,0.06)] px-4 py-2 rounded-lg cursor-not-allowed">
            Sắp ra mắt
          </span>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      variants={entryVariants}
      className={`relative w-full rounded-2xl bg-[#0A0A0A] border border-[rgba(232,220,200,0.06)] overflow-hidden group transition-all duration-300 hover:border-[rgba(200,64,26,0.35)] ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
    >
      {!disabled && href ? (
        <Link href={href} className="block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4A8] rounded-2xl">
          {cardContent}
        </Link>
      ) : (
        <div className="h-full w-full">{cardContent}</div>
      )}
    </motion.div>
  );
}

interface BentoGridProps {
  children: React.ReactNode;
}

export function BentoGrid({ children }: BentoGridProps) {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-24 w-full"
    >
      {children}
    </motion.section>
  );
}
