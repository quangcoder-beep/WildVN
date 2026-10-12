package com.example.wildvn.domain.auth.controller;

import com.example.wildvn.domain.auth.dto.AuthResponse;
import com.example.wildvn.domain.auth.dto.LoginRequest;
import com.example.wildvn.domain.auth.dto.RegisterRequest;
import com.example.wildvn.domain.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Tên cookie phải khớp với JwtAuthFilter.COOKIE_NAME và middleware.ts
    private static final String COOKIE_NAME = "wildvn-auth-token";

    @Value("${wildvn.security.cookie-secure:false}")
    private boolean cookieSecure;

    @Value("${wildvn.security.cookie-same-site:Lax}")
    private String cookieSameSite;

    // ── Đăng nhập ──────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse authResponse = authService.login(request);

        // Tạo HttpOnly Cookie chứa JWT — JavaScript KHÔNG thể đọc được cookie này → chống XSS
        ResponseCookie cookie = buildAuthCookie(authResponse.getAccessToken());

        // Trả body chỉ chứa thông tin User (KHÔNG gửi token ra body)
        // Frontend chỉ cần dữ liệu user để hiển thị UI; token được xử lý tự động qua cookie.
        AuthResponse safeResponse = AuthResponse.builder()
                .user(authResponse.getUser())
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(safeResponse);
    }

    // ── Đăng ký ────────────────────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse authResponse = authService.register(request);

        // Set cookie ngay sau khi đăng ký (auto-login)
        ResponseCookie cookie = buildAuthCookie(authResponse.getAccessToken());

        AuthResponse safeResponse = AuthResponse.builder()
                .user(authResponse.getUser())
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(safeResponse);
    }

    // ── Đăng xuất ──────────────────────────────────────────────────────────────
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // Xóa cookie bằng cách set Max-Age = 0 → trình duyệt lập tức xóa
        ResponseCookie expiredCookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(0)      // maxAge = 0 → xóa cookie ngay lập tức
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, expiredCookie.toString())
                .build();
    }

    // ── Lấy thông tin User hiện tại ────────────────────────────────────────────
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getMe(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        
        AuthResponse authResponse = authService.getMe(authentication.getName());
        return ResponseEntity.ok(authResponse);
    }

    // ── Helper: tạo cookie chuẩn bảo mật ──────────────────────────────────────
    private ResponseCookie buildAuthCookie(String token) {
        return ResponseCookie.from(COOKIE_NAME, token)
                // HttpOnly: JavaScript không đọc được → chống XSS token theft
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                // 30 ngày — khớp với JWT expiration trong JwtUtil
                .maxAge(30L * 24 * 60 * 60)
                .build();
    }
}
