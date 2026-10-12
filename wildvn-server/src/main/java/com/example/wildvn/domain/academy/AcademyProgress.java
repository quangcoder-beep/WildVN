package com.example.wildvn.domain.academy;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "academy_progress")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademyProgress {

    @Id
    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    @Column(name = "rp_points", nullable = false)
    @Builder.Default
    private Integer rpPoints = 0;

    @Column(name = "streak_days", nullable = false)
    @Builder.Default
    private Integer streakDays = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "unlocked_species", nullable = false, columnDefinition = "jsonb")
    private JsonNode unlockedSpecies;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "completed_expeditions", nullable = false, columnDefinition = "jsonb")
    private JsonNode completedExpeditions;

    @Column(name = "last_active_date", nullable = false)
    private OffsetDateTime lastActiveDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (rpPoints == null) rpPoints = 0;
        if (streakDays == null) streakDays = 0;
        if (lastActiveDate == null) lastActiveDate = now;
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
