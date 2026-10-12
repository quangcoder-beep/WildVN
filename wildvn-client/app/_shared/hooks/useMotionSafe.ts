"use client";

import { useEffect, useState } from "react";

export type AnimationTier = 0 | 1 | 2 | 3;

interface DeviceCapabilities {
  ram?: number;
  cores?: number;
  saveData?: boolean;
  effectiveType?: string;
  reducedMotion: boolean;
}

/**
 * useMotionSafe — Hook to assess hardware, network, and accessibility constraints.
 * Restricts rendering complexity dynamically to prevent battery drain and layout lag.
 * 
 * Tiers:
 * - 0: Complete animation ban (low battery mode, save-data, or extremely low-end)
 * - 1: Reduced motion (only opacity fades, zero translation/scaling, no parallax)
 * - 2: Normal motion (standard springs, fades, card entrances, layout animations)
 * - 3: Premium motion (ScrollTrigger pinning, WebGL fog, full 3D interactive loops)
 */
export function useMotionSafe() {
  const [tier, setTier] = useState<AnimationTier>(2); // Default safe tier for hydration match
  const [caps, setCaps] = useState<DeviceCapabilities>({ reducedMotion: false });

  useEffect(() => {
    // 1. Accessibility preferences
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const getReducedMotion = () => motionQuery.matches;

    // 2. Hardware specs (safely reading with navigator checks)
    const ram = (navigator as any).deviceMemory || 8; // GB
    const cores = navigator.hardwareConcurrency || 4; // CPU Cores

    // 3. Network & Battery (Save-data detection)
    const conn = (navigator as any).connection;
    const saveData = conn ? conn.saveData : false;
    const effectiveType = conn ? conn.effectiveType : "4g";

    const updateCapabilities = () => {
      const reducedMotion = getReducedMotion();
      setCaps({ ram, cores, saveData, effectiveType, reducedMotion });

      // Determine Animation Tier
      if (saveData || effectiveType === "2g" || effectiveType === "3g") {
        setTier(0); // Save bandwidth and render energy
      } else if (reducedMotion) {
        setTier(1); // Keep it static, accessibility focus
      } else if (ram < 4 || cores < 4) {
        setTier(2); // Mid-range device, standard UI animation only
      } else {
        setTier(3); // High-end hardware, WebGL and rich animations allowed
      }
    };

    updateCapabilities();

    // Event listener for reduced motion preferences change
    motionQuery.addEventListener("change", updateCapabilities);
    return () => motionQuery.removeEventListener("change", updateCapabilities);
  }, []);

  return {
    tier,
    isMotionEnabled: tier > 0,
    isReducedMotion: tier === 1,
    isPremiumEnabled: tier === 3,
    capabilities: caps,
  };
}
