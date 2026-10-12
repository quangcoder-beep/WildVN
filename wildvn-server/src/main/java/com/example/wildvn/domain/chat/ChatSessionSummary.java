package com.example.wildvn.domain.chat;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatSessionSummary(UUID id, OffsetDateTime updatedAt, OffsetDateTime expiresAt) {
}
