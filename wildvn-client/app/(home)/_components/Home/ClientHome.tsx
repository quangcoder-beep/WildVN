"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { IntroSplash } from "../Intro/IntroSplash";
import { claimIntroSession } from "../Intro/intro-session";
import { FullscreenSlider } from "./FullscreenSlider";

/**
 * ClientHome — Client Component wrapper cho trang chủ
 * Chứa logic tương tác (IntroSplash state) để page.tsx vẫn là Server Component
 */
export function ClientHome() {
  const [introState, setIntroState] = useState<"checking" | "playing" | "complete">("checking");
  const introInitializedRef = useRef(false);

  useEffect(() => {
    // React Strict Mode replays effects in development; claim only once per mount.
    if (introInitializedRef.current) return;
    introInitializedRef.current = true;
    setIntroState(claimIntroSession() ? "playing" : "complete");
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroState("complete");
  }, []);

  return (
    <>
      {/* Intro Splash (plays once on first load) */}
      {introState === "playing" && <IntroSplash onComplete={handleIntroComplete} />}

      {/* The Entire Homepage is now a 3-slide Fullscreen Slider */}
      <FullscreenSlider />
    </>
  );
}
