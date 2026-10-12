package com.example.wildvn.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Utility để trích xuất thông tin định danh người dùng từ SecurityContextHolder.
 *
 * Tại sao cần class này?
 *  - Các API bảo mật (VD: thêm/xóa Yêu thích) cần biết ĐANG là ai đang gọi.
 *  - KHÔNG nhận userId qua @RequestBody vì người dùng có thể giả mạo.
 *  - Luôn lấy từ SecurityContextHolder — Spring đã xác thực JWT và inject vào đây.
 *
 * Cách dùng trong Controller/Service:
 *   String username = SecurityUtils.getCurrentUsername();
 *   // Sau đó dùng username để query DB lấy entity User
 */
public final class SecurityUtils {

    private SecurityUtils() {} // Utility class — không khởi tạo

    /**
     * Trả về username (= subject trong JWT) của người dùng đang đăng nhập.
     *
     * @throws IllegalStateException nếu chưa xác thực (endpoint không nên gọi hàm này khi không auth)
     */
    public static String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("Không tìm thấy thông tin xác thực");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails ud) {
            return ud.getUsername();
        }
        return principal.toString();
    }

    /**
     * Kiểm tra người dùng có role cụ thể không.
     * Ví dụ: SecurityUtils.hasRole("ADMIN")
     */
    public static boolean hasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }
}
