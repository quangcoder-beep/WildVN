package com.example.wildvn.domain.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    List<ChatSession> findAllByUserIdAndExpiresAtAfterOrderByUpdatedAtDesc(UUID userId, OffsetDateTime now);

    Optional<ChatSession> findByIdAndUserIdAndExpiresAtAfter(UUID id, UUID userId, OffsetDateTime now);

    @Modifying
    @Query("delete from ChatSession session where session.expiresAt <= :now")
    int deleteExpired(@Param("now") OffsetDateTime now);
}
