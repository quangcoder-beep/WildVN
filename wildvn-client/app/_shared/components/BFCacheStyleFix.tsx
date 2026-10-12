"use client";

import { useEffect } from "react";

export function BFCacheStyleFix() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      // event.persisted = true → trang đang restore từ BFCache

      // Strategy 1: Re-trigger tất cả <link rel="stylesheet">
      const styleLinks = document.querySelectorAll<HTMLLinkElement>(
        'link[rel="stylesheet"]'
      );

      styleLinks.forEach((link) => {
        const originalHref = link.href;
        link.href = "";
        requestAnimationFrame(() => {
          link.href = originalHref;
        });
      });

      // Strategy 2: Force reflow để browser re-apply <style> inline tags
      const originalDisplay = document.body.style.display;
      document.body.style.display = "none";
      // Truy cập offsetHeight để trigger synchronous layout
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      document.body.offsetHeight;
      document.body.style.display = originalDisplay;
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null; // Component này không render gì
}
