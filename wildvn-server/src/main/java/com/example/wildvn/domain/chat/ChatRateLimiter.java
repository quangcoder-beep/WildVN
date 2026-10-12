package com.example.wildvn.domain.chat;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatRateLimiter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public void checkAllowed(String key) {
        String normalizedKey = key == null || key.isBlank() ? "unknown" : key;
        Bucket bucket = buckets.computeIfAbsent(normalizedKey, ignored -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(30)
                        .refillIntervally(30, Duration.ofMinutes(1))
                        .build())
                .build());
        if (!bucket.tryConsume(1)) {
            throw new ChatRateLimitException("Bạn đã gửi quá nhiều câu hỏi. Vui lòng thử lại sau một phút.");
        }
    }

    public static class ChatRateLimitException extends RuntimeException {
        public ChatRateLimitException(String message) {
            super(message);
        }
    }
}
