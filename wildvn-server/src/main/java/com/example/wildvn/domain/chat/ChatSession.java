package com.example.wildvn.domain.chat;

import com.example.wildvn.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_sessions", indexes = {
        @Index(name = "idx_chat_sessions_user_updated", columnList = "user_id,updated_at"),
        @Index(name = "idx_chat_sessions_expires_at", columnList = "expires_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @Column(nullable = false)
    private OffsetDateTime expiresAt;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (expiresAt == null) expiresAt = ChatHistoryRetention.expiresAt(now);
    }

    public void touch(OffsetDateTime now) {
        updatedAt = now;
        expiresAt = ChatHistoryRetention.expiresAt(now);
    }
}
