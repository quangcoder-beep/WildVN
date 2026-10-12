"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Init Lenis with GSAP sync — Codegrid pattern
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Sync Lenis with GSAP ticker for zero conflict
    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    // Notify ScrollTrigger on scroll
    lenis.on("scroll", ScrollTrigger.update);

    // Fix Lenis after BFCache: restart scroll RAF loop on page restore
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        if (lenisRef.current) {
          lenisRef.current.stop();
          lenisRef.current.start();
        }
        // Refresh GSAP ScrollTrigger
        ScrollTrigger.refresh(true);
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      gsap.ticker.remove(ticker);
      window.removeEventListener("pageshow", handlePageShow);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
