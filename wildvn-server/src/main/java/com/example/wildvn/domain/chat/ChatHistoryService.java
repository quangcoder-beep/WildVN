package com.example.wildvn.domain.chat;

import com.example.wildvn.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatHistoryService {

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final Clock clock;
    private final ChatProperties properties;

    @Transactional
    public UUID append(User user, UUID requestedSessionId, String userContent, String assistantContent) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        ChatSession session = requestedSessionId == null
                ? newSession(user, now)
                : sessionRepository.findByIdAndUserIdAndExpiresAtAfter(requestedSessionId, user.getId(), now)
                .orElseThrow(() -> new IllegalArgumentException("Phiên chat không tồn tại hoặc đã hết hạn"));

        session.touch(now);
        session = sessionRepository.save(session);
        messageRepository.save(ChatMessageEntity.builder().session(session).role("user").content(userContent).build());
        if (assistantContent != null && !assistantContent.isBlank()) {
            messageRepository.save(ChatMessageEntity.builder().session(session).role("assistant").content(assistantContent).build());
        }
        return session.getId();
    }

    @Transactional(readOnly = true)
    public List<ChatSessionSummary> list(User user) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        return sessionRepository.findAllByUserIdAndExpiresAtAfterOrderByUpdatedAtDesc(user.getId(), now)
                .stream()
                .map(session -> new ChatSessionSummary(session.getId(), session.getUpdatedAt(), session.getExpiresAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessage> messages(User user, UUID sessionId) {
        ChatSession session = ownedSession(user, sessionId);
        return messageRepository.findAllBySessionIdOrderByCreatedAtAsc(session.getId())
                .stream()
                .map(message -> new ChatMessage(message.getRole(), message.getContent()))
                .toList();
    }

    @Transactional
    public void delete(User user, UUID sessionId) {
        sessionRepository.delete(ownedSession(user, sessionId));
    }

    @Transactional
    public int deleteExpired() {
        return sessionRepository.deleteExpired(OffsetDateTime.now(clock));
    }

    private ChatSession ownedSession(User user, UUID sessionId) {
        return sessionRepository.findByIdAndUserIdAndExpiresAtAfter(sessionId, user.getId(), OffsetDateTime.now(clock))
                .orElseThrow(() -> new IllegalArgumentException("Phiên chat không tồn tại hoặc đã hết hạn"));
    }

    private ChatSession newSession(User user, OffsetDateTime now) {
        return ChatSession.builder()
                .user(user)
                .createdAt(now)
                .updatedAt(now)
                .expiresAt(ChatHistoryRetention.expiresAt(now, properties.getRetentionDays()))
                .build();
    }
}
