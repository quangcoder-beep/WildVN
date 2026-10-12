"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";


interface MuseumTextProps {
  name: string;
  scientificName: string;
  status: string;
}

export function MuseumText({ name, scientificName, status }: MuseumTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // Scientific name — single line reveal from y:110%
      gsap.from(".museum-scientific-inner", {
        y: "110%",
        duration: 1.0,
        ease: "power4.out",
        delay: 0.6,
      });

      // Name — word-by-word stagger reveal (manual split)
      gsap.from(".museum-name-word", {
        y: "115%",
        duration: 1.2,
        ease: "power4.out",
        stagger: 0.06,
        delay: 0.85,
      });

      // Status badge fade in
      gsap.from(".museum-status", {
        opacity: 0,
        y: 12,
        duration: 0.8,
        ease: "power2.out",
        delay: 1.5,
      });
    }, containerRef);

    return () => ctx.revert(); // Codegrid: cleanup on unmount
  }, { scope: containerRef });

  const safeName = name || scientificName || "Unknown Species";
  const nameWords = safeName.split(" ");

  return (
    <div ref={containerRef} className="museum-typography">
      {/* Scientific name with mask */}
      <div className="museum-scientific-mask">
        <span className="museum-scientific museum-scientific-inner">
          {scientificName}
        </span>
      </div>

      {/* Name */}
      <h1 className="museum-name" aria-label={name}>
        {nameWords.map((word, i) => (
          <span key={i} className="museum-name-mask">
            <span className="museum-name-word">{word}</span>
          </span>
        ))}
      </h1>

      {/* Status badge */}
      <div className="museum-status">
        <span className="status-dot pulse-oxide" />
        <span className="status-text">{status}</span>
      </div>
    </div>
  );
}
