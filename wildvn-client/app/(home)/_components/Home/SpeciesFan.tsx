"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import { speciesApi, type SpeciesSummary } from "@/app/_shared/services/api";
import { getImageUrl } from "@/app/_shared/lib/media";

const FAN_CONFIG = [
  { rotate: -15, x: -60, y: 10 },
  { rotate: 0, x: 0, y: 0 },
  { rotate: 15, x: 60, y: 10 },
];

/**
 * SpeciesFan — Hiệu ứng xòe quạt các thẻ loài vật
 * Tự động thay đổi loài vật theo slide đang active
 */
export function SpeciesFan({ activeSlide }: { activeSlide: number }) {
  const [slideSpecies, setSlideSpecies] = useState<Record<number, SpeciesSummary[]>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchFeatured = async () => {
      try {
        const res = await speciesApi.getFeaturedSpecies();
        if (res.success && isMounted) {
          const featured = res.data;
          // Split into chunks of 3
          const chunks: Record<number, SpeciesSummary[]> = {};
          chunks[0] = featured.slice(0, 3);
          chunks[1] = featured.slice(3, 6);
          chunks[2] = featured.slice(6, 9);
          setSlideSpecies(chunks);
        }
      } catch (err) {
        console.error("Failed to fetch featured species", err);
      }
    };
    fetchFeatured();
    return () => { isMounted = false; };
  }, []);

  const currentSpecies = slideSpecies[activeSlide] || [];

  return (
    <div className="absolute bottom-16 right-16 z-[15] hidden xl:block">
      <div className="relative w-40 h-56">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            className="absolute inset-0"
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {currentSpecies.map((s, i) => {
              const speciesName = s.nameVn || s.name || s.scientificName || "loài sinh vật";
              const slug = typeof s.slug === "string" ? s.slug.trim() : "";
              const mediaUrl = typeof s.media?.[0]?.url === "string" ? s.media[0].url : undefined;
              const imageSrc = getImageUrl(s.thumbnailUrl || mediaUrl);
              const card = (
                <motion.div
                  className="absolute inset-0 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/40 backdrop-blur-md"
                  variants={{
                    initial: { rotate: 0, x: 0, y: 50, opacity: 0, scale: 0.8 },
                    animate: {
                      rotate: FAN_CONFIG[i].rotate,
                      x: FAN_CONFIG[i].x,
                      y: FAN_CONFIG[i].y,
                      opacity: 1,
                      scale: 1,
                    },
                    exit: { rotate: 0, x: 0, y: 50, opacity: 0, scale: 0.8 },
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                    delay: i * 0.1,
                  }}
                  whileHover={{
                    scale: 1.1,
                    zIndex: 50,
                    y: FAN_CONFIG[i].y - 30,
                    transition: { duration: 0.2 },
                  }}
                  style={{
                    transformOrigin: "bottom center",
                    zIndex: i,
                  }}
                >
                  <div className="relative w-full h-full">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={speciesName}
                        fill
                        className="object-cover"
                        sizes="160px"
                        priority
                        loading="eager"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/[0.03]" aria-hidden="true" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                      <span className="text-white text-[8px] font-bold tracking-widest uppercase opacity-80 block truncate">
                        {speciesName}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );

              if (!slug) return <div key={s.id}>{card}</div>;

              return (
                <Link
                  key={s.id}
                  href={`/species/${encodeURIComponent(slug)}`}
                  aria-label={`Mở hồ sơ ${speciesName}`}
                  className="absolute inset-0 block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4A8] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  {card}
                </Link>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute -bottom-10 right-0 text-right w-64"
      >
        <div className="h-[1px] w-12 bg-white/40 ml-auto mb-2" />
        <span className="text-white/40 text-[9px] tracking-[0.4em] uppercase font-bold">
          Species In This Region
        </span>
      </motion.div>
    </div>
  );
}
