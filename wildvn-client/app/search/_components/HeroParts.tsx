"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimation, useInView } from "framer-motion";
import { Search, Command, ChevronDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/app/_shared/hooks/useDebounce";
import { speciesApi } from "@/app/_shared/services/api";

interface SplitTextProps {
  text: string;
  delay?: number;
  highlightWords?: string[];
  highlightClass?: string;
}

export function SplitTextReveal({ text, delay = 0, highlightWords = [], highlightClass = "" }: SplitTextProps) {
  const words = text.split(" ");
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: delay * i },
    }),
  };

  const child = {
    hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring" as const, damping: 12, stiffness: 100 },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      style={{ display: "flex", flexWrap: "wrap", gap: "0.25em" }}
    >
      {words.map((word, index) => {
        const isHighlight = highlightWords.includes(word);
        return (
          <motion.span variants={child} key={index} className={isHighlight ? highlightClass : ""}>
            {word}
          </motion.span>
        );
      })}
    </motion.div>
  );
}

interface Animal3DProps {
  imageSrc: string;
  alt: string;
  accentColor: string;
}

/**
 * 3D Animal — Full viewport follow pointer (Spline NEXBOT style)
 * - Tracks mouse across entire window (not just on hover)
 * - Smooth lerp via requestAnimationFrame
 * - Idle floating animation via CSS
 */
export function Animal3D({ imageSrc, alt, accentColor }: Animal3DProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Track mouse across entire viewport
    const onMouseMove = (e: globalThis.MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;  // -1 to 1
      const y = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
      targetRef.current = { x, y };
    };

    // Smooth lerp animation loop
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const SMOOTHING = 0.06; // Lower = smoother/laggier, like NEXBOT

    const animate = () => {
      const { x: tx, y: ty } = targetRef.current;
      const cur = currentRef.current;

      cur.x = lerp(cur.x, tx, SMOOTHING);
      cur.y = lerp(cur.y, ty, SMOOTHING);

      if (stageRef.current) {
        const rotateY = cur.x * 25;  // Max ±25° horizontal
        const rotateX = -cur.y * 18; // Max ±18° vertical
        const translateX = cur.x * 8; // Slight positional shift
        const translateY = cur.y * 6;
        stageRef.current.style.transform =
          `translateX(${translateX}px) translateY(${translateY}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
      }

      // Glow follows pointer subtly
      if (glowRef.current) {
        const gx = 50 + cur.x * 15; // Shift glow center
        const gy = 50 + cur.y * 15;
        glowRef.current.style.background =
          `radial-gradient(circle at ${gx}% ${gy}%, ${accentColor}22 0%, transparent 70%)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [accentColor]);

  return (
    <motion.div
      className="animal-3d-container"
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
    >
      <div
        ref={glowRef}
        className="animal-3d-glow"
        style={{
          background: `radial-gradient(circle, ${accentColor}1A 0%, transparent 70%)`,
        }}
      />
      <div className="animal-3d-ring" />
      <div className="animal-3d-ring" />
      <div ref={stageRef} className="animal-3d-stage animal-3d-float">
        <img
          src={imageSrc}
          alt={alt}
          className="animal-3d-image"
          draggable={false}
        />
      </div>
    </motion.div>
  );
}

/** Hero Section search bar — same name/scientificName filter as Sách Đỏ */
export function HeroSearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    let mounted = true;
    const term = debouncedQuery.trim();
    if (!term) {
      setSpeciesList([]);
      return () => { mounted = false; };
    }

    speciesApi.getSpecies(1, 8, { q: term })
      .then((res) => {
        if (mounted && res.success) setSpeciesList(res.data);
      })
      .catch(() => {
        if (mounted) setSpeciesList([]);
      });
    return () => { mounted = false; };
  }, [debouncedQuery]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = speciesList;

  const goToList = (term = query) => {
    const q = term.trim();
    if (!q) return;
    router.push(`/species?q=${encodeURIComponent(q)}`);
  };

  const showPanel = focused && query.trim().length > 0;

  return (
    <motion.div
      className="search-bar-wrapper"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1 }}
    >
      <form
        className={`search-bar${focused ? " search-bar--focused" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          goToList();
        }}
        role="search"
        aria-label="Tìm kiếm loài"
      >
        <Search size={20} className="search-bar__icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-bar__input"
          placeholder="Tìm tên loài, danh pháp khoa học..."
          aria-label="Tìm kiếm loài động thực vật"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Xóa từ khóa"
            className="search-bar__clear"
          >
            XÓA
          </button>
        )}
        <kbd className="search-bar__shortcut">
          <Command size={12} />K
        </kbd>
      </form>

      {showPanel && (
        <div className="search-results" role="listbox">
          {results.length > 0 ? (
            <>
              {results.map((s) => (
                <Link
                  key={s.id}
                  href={`/species/${s.slug}`}
                  className="search-results__item"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span className="search-results__name">{s.name}</span>
                  <span className="search-results__sci">{s.scientificName}</span>
                </Link>
              ))}
              <button
                type="button"
                className="search-results__more"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goToList()}
              >
                Xem tất cả kết quả trên Sách Đỏ
                <ArrowRight size={14} />
              </button>
            </>
          ) : debouncedQuery.trim() ? (
            <div className="search-results__empty">Không có kết quả trùng khớp</div>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}

/** Scroll hint ở đáy Hero */
export function ScrollHint() {
  return (
    <motion.div
      className="scroll-hint"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.8 }}
    >
      <span className="scroll-hint__text">Cuộn để khám phá</span>
      <div className="scroll-hint__icon">
        <div className="scroll-hint__dot" />
      </div>
      <ChevronDown size={16} color="#52525B" style={{ marginTop: -4 }} />
    </motion.div>
  );
}

/** Featured Animal Card floating next to the 3D model */
export function FocusCard({ slug, name, status }: { slug: string, name: string, status: string }) {
  return (
    <motion.div
      className="hero-focus-card"
      initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.6, delay: 1.2, type: "spring", bounce: 0.4 }}
    >
      <div className="focus-card-header">
        <div className="focus-card-dot" />
        <span>Tiêu điểm</span>
      </div>
      <h3 className="focus-card-title">{name}</h3>
      <span style={{ fontSize: 12, color: "#A1A1AA", marginBottom: 2 }}>
        Phân hạng: <span style={{ color: "#E11D48", fontWeight: 600 }}>{status}</span>
      </span>
      <Link href={`/species/${slug}`} className="focus-card-cta">
        Xem hồ sơ Sách Đỏ <ArrowRight size={14} />
      </Link>
    </motion.div>
  );
}
