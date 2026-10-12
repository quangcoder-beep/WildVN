"use client";

import { useCallback } from "react";
import { useBFCacheRestore } from "@/app/_shared/hooks/useBFCacheRestore";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { audioManager } from "@/app/_shared/lib/audio-manager";

// Đăng ký ScrollTrigger
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function BFCacheProvider({ children }: { children: React.ReactNode }) {
  const handleRestore = useCallback(() => {
    console.debug("[BFCache] Page restored from cache — CSS reapplied and libraries refreshed");
    
    // Khởi động lại hoặc làm mới GSAP ScrollTrigger
    if (typeof window !== "undefined") {
      ScrollTrigger.refresh(true);
      // Khôi phục trạng thái audio context
      audioManager.resumeAfterBFCache().catch((err) => {
        console.warn("[BFCache] AudioManager resume failed", err);
      });
    }
  }, []);

  useBFCacheRestore(handleRestore);

  return <>{children}</>;
}
