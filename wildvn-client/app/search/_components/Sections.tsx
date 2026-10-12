"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { CATEGORIES, STATS } from "@/app/_shared/data/search";
import { Search, Command } from "lucide-react";

const MotionLink = motion.create(Link);

/** Section 3: Category Grid */
export function CategoriesSection() {
  return (
    <div className="categories-wrapper">
      <motion.h2
        className="categories-title"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6 }}
      >
        Khám phá theo nhóm loài
      </motion.h2>

      <div className="categories-grid">
        {CATEGORIES.map((cat, i) => (
          <MotionLink
            key={cat.slug}
            href={`/species?group=${cat.slug}`}
            className="category-card"
            style={{ background: cat.gradient }}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              duration: 0.5,
              delay: i * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span className="category-card__emoji">{cat.emoji}</span>
            <span className="category-card__name">{cat.name}</span>
            <span className="category-card__count">
              <CountUp target={cat.count} /> loài
            </span>
          </MotionLink>
        ))}
      </div>
    </div>
  );
}

/** Section 4: Stats + CTA */
export function StatsSection() {
  return (
    <>
      <motion.h2
        className="stats-title"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6 }}
      >
        Đa dạng sinh học Việt Nam
      </motion.h2>

      <div className="stats-grid">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="stat-item"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <span className="stat-value">
              <CountUp target={stat.value} />
              {stat.suffix}
            </span>
            <span className="stat-label">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="stats-cta"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <p className="stats-cta-text">Sẵn sàng khám phá?</p>
        <div className="search-bar-wrapper">
          <div className="search-bar">
            <Search size={20} className="search-bar__icon" />
            <input
              type="text"
              className="search-bar__input"
              placeholder="Bắt đầu tra cứu ngay..."
              aria-label="Tìm kiếm loài động thực vật"
              onFocus={(e) => e.currentTarget.closest(".search-bar")?.classList.add("search-bar--focused")}
              onBlur={(e) => e.currentTarget.closest(".search-bar")?.classList.remove("search-bar--focused")}
            />
            <kbd className="search-bar__shortcut">
              <Command size={12} />K
            </kbd>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/** Animated counter — counts from 0 to target when in view */
function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [hasStarted, target]);

  return <span ref={ref}>{count.toLocaleString("vi-VN")}</span>;
}
