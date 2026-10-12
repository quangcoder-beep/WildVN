"use client";

import { useEffect } from "react";

/**
 * BFCacheHandler — Xử lý lỗi màn hình trắng/đen khi bấm nút "Back"
 *
 * Vấn đề: Khi trình duyệt phục hồi trang từ bộ nhớ tạm (Back-Forward Cache),
 * Tailwind v4 CSS đôi khi không được inject lại, khiến trang hiển thị không có style.
 *
 * Giải pháp: Lắng nghe sự kiện "pageshow". Nếu trang được phục hồi từ BFCache
 * (event.persisted === true), buộc trình duyệt tải lại trang để CSS được nạp đúng.
 */
export function BFCacheHandler() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Trang được phục hồi từ BFCache — tải lại để đảm bảo CSS được inject
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
