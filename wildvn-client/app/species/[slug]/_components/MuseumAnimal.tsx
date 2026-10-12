"use client";

import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

gsap.registerPlugin();

interface MuseumAnimalProps {
  imageSrc: string;
  alt: string;
}

export function MuseumAnimal({ imageSrc, alt }: MuseumAnimalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // GSAP entrance: blur-from-smoke (Codegrid pattern: scale + blur → clear)
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!imgRef.current) return;
    gsap.from(imgRef.current, {
      scale: 1.15,
      filter: "blur(24px)",
      opacity: 0,
      duration: 2,
      ease: "power4.out",
      delay: 0.2,
    });
  }, { scope: wrapperRef });

  // Mouse parallax — Codegrid: map pixel coords → normalized -1 to 1
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const img = imgRef.current;
    if (!wrapper || !img) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId: number;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 → 1
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const tick = () => {
      // Lerp for organic follow — Codegrid smooth damp
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;

      const rotateY = currentX * 6;   // max 6deg tilt
      const rotateX = -currentY * 4;  // max 4deg vertical tilt
      const translateX = currentX * 10; // max 10px drift

      gsap.set(img, {
        rotateY,
        rotateX,
        x: translateX,
        transformPerspective: 900,
        transformOrigin: "center bottom",
      });

      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", handleMouseMove);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="museum-animal-wrapper" aria-hidden="true">
      {imageSrc ? (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className="museum-animal-img breath-anim"
          draggable={false}
        />
      ) : (
        <div className="museum-animal-img bg-white/[0.03]" aria-label="Ảnh loài chưa cập nhật" />
      )}
    </div>
  );
}
