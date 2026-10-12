package com.example.wildvn.domain.chat;

import java.time.Clock;
import java.time.OffsetDateTime;

public final class ChatHistoryRetention {

    private ChatHistoryRetention() {
    }

    public static OffsetDateTime expiresAt(OffsetDateTime lastActivityAt) {
        return expiresAt(lastActivityAt, 5);
    }

    public static OffsetDateTime expiresAt(OffsetDateTime lastActivityAt, int retentionDays) {
        return lastActivityAt.plusDays(Math.max(1, retentionDays));
    }

    public static boolean isExpired(OffsetDateTime expiresAt, Clock clock) {
        return !expiresAt.isAfter(OffsetDateTime.now(clock));
    }
}
