package com.example.wildvn.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Chống Brute-force tấn công vào endpoint đăng nhập bằng Bucket4j.
 *
 * Chiến lược:
 * - Mỗi username có 1 "xô" (Bucket) chứa tối đa 5 token (= 5 lần thử).
 * - Token nạp lại 5 cái mỗi 60 giây (refill rate).
 * - Khi xô cạn token → từ chối request và trả lỗi RateLimitException.
 *
 * Lưu ý: ConcurrentHashMap lưu trong RAM → reset khi restart server.
 * Để persistent qua restart, thay bằng Redis (Bucket4j có adapter Redis sẵn).
 */
@Component
public class LoginRateLimiter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * Lấy (hoặc tạo mới) Bucket cho một username/IP.
     */
    private Bucket resolveBucket(String key) {
        return buckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(5) // 5 lần thử tối đa
                        .refillIntervally(5, Duration.ofMinutes(1)) // nạp lại 5 token/phút
                        .build())
                .build());
    }

    /**
     * Kiểm tra xem key (username) có được phép thử đăng nhập không.
     *
     * @throws LoginRateLimitException nếu đã vượt quá 5 lần trong 1 phút
     */
    public void checkLoginAllowed(String username) {
        Bucket bucket = resolveBucket(username.toLowerCase());
        boolean allowed = bucket.tryConsume(1); // tiêu 1 token
        if (!allowed) {
            throw new LoginRateLimitException(
                    "Vượt quá số lần thử đăng nhập. Vui lòng thử lại sau 1 phút.");
        }
    }

    /**
     * Exception riêng để GlobalExceptionHandler bắt và trả 429 Too Many Requests.
     */
    public static class LoginRateLimitException extends RuntimeException {
        public LoginRateLimitException(String message) {
            super(message);
        }
    }
}
