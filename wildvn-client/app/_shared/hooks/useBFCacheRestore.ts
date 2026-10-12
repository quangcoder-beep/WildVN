"use client";

import { useEffect } from "react";

/**
 * useBFCacheRestore — Hook lắng nghe sự kiện pageshow để xử lý việc phục hồi từ BFCache.
 * 
 * Khi trang được phục hồi từ BFCache (ví dụ người dùng bấm Back/Forward):
 * 1. Thực hiện trigger reflow trên toàn bộ document để ép trình duyệt áp dụng lại Tailwind CSS.
 * 2. Gọi callback onRestore để re-initialize hoặc refresh các thư viện hoạt ảnh (Lenis, GSAP).
 */
export function useBFCacheRestore(onRestore?: () => void) {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Force CSS re-application bằng cách trigger reflow
        const originalDisplay = document.documentElement.style.display;
        document.documentElement.style.display = "none";
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        document.documentElement.offsetHeight; // trigger reflow
        document.documentElement.style.display = originalDisplay;

        // Callback để re-initialize libraries
        if (onRestore) {
          onRestore();
        }
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [onRestore]);
}
