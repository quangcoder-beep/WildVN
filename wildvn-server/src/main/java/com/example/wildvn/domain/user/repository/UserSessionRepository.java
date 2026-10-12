package com.example.wildvn.domain.user.repository;

import com.example.wildvn.domain.user.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    Optional<UserSession> findByRefreshTokenHashAndRevokedAtIsNull(String refreshTokenHash);
}
