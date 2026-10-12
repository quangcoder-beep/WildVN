package com.example.wildvn.domain.chat;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class ChatHistoryRetentionTest {

    private static final Instant NOW = Instant.parse("2026-08-28T00:00:00Z");
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void newSessionExpiresFiveDaysAfterLastActivity() {
        OffsetDateTime lastActivity = OffsetDateTime.now(clock);

        assertThat(ChatHistoryRetention.expiresAt(lastActivity))
                .isEqualTo(lastActivity.plusDays(5));
    }

    @Test
    void sessionIsExpiredAtTheExpiryBoundary() {
        OffsetDateTime expiresAt = OffsetDateTime.now(clock).plusDays(5);

        assertThat(ChatHistoryRetention.isExpired(expiresAt, clock)).isFalse();
        Clock atBoundary = Clock.fixed(NOW.plusSeconds(5 * 24 * 60 * 60), ZoneOffset.UTC);
        assertThat(ChatHistoryRetention.isExpired(expiresAt, atBoundary)).isTrue();
    }
}
