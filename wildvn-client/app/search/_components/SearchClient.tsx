"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FloatingParticles } from "@/app/(home)/_components/Home/FloatingParticles";
import { Animal3D, HeroSearchBar, ScrollHint, SplitTextReveal, FocusCard } from "./HeroParts";
import { CategoriesSection } from "./Sections";
import { speciesApi } from "@/app/_shared/services/api";
import { getImageUrl } from "@/app/_shared/lib/media";

import "./search.css";

export default function SearchClient() {
  const [featuredSpecies, setFeaturedSpecies] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    speciesApi.getFeaturedSpecies()
      .then((response) => {
        if (mounted && response.success) {
          setFeaturedSpecies(response.data?.[0] ?? null);
        }
      })
      .catch(() => {
        // The hero remains empty until Spring provides a featured species.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const featuredImage = getImageUrl(
    featuredSpecies?.thumbnailUrl || featuredSpecies?.media?.[0]?.url,
  );

  return (
    <div style={{ background: "#0A0A0A" }}>
      {/* ═══════════ Section 1: Hero ═══════════ */}
      <section className="search-section hero-section">
        <FloatingParticles />

        <div className="hero-layout">
          <div className="hero-text">
            <motion.span
              className="hero-label"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              // Tra cứu đa dạng sinh học
            </motion.span>

            <div className="hero-title" style={{ display: 'flex', flexDirection: 'column' }}>
              <SplitTextReveal 
                text="Khám phá Thế giới Hoang dã Việt Nam" 
                delay={0.3} 
                highlightWords={["Thế", "giới", "Hoang", "dã"]}
                highlightClass="hero-title-highlight"
              />
            </div>

            <motion.p
              className="hero-desc"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Tra cứu hàng trăm loài động thực vật — từ rừng nguyên sinh đến biển sâu.
              Dữ liệu cập nhật từ IUCN Red List và Sách Đỏ Việt Nam.
            </motion.p>

            <HeroSearchBar />
          </div>

          <div className="hero-animal">
            {featuredSpecies && featuredImage && (
              <>
                <Animal3D
                  imageSrc={featuredImage}
                  alt={featuredSpecies.nameVn || featuredSpecies.name || featuredSpecies.scientificName}
                  accentColor="#2DD4A8"
                />
                <FocusCard
                  slug={featuredSpecies.slug}
                  name={featuredSpecies.nameVn || featuredSpecies.name || featuredSpecies.scientificName}
                  status={featuredSpecies.conservationStatus || "Chưa cập nhật"}
                />
              </>
            )}
          </div>
        </div>

        <ScrollHint />
      </section>

      {/* ═══════════ Section 2: Categories ═══════════ */}
      <section className="search-section categories-section">
        <CategoriesSection />
      </section>
    </div>
  );
}
