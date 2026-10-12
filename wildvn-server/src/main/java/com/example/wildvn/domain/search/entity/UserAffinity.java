package com.example.wildvn.domain.search.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_affinities")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(UserAffinity.UserAffinityId.class)
public class UserAffinity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "entity_type", length = 50)
    private String entityType; // 'category' | 'tag' | 'habitat'

    @Id
    @Column(name = "entity_value", length = 255)
    private String entityValue;

    @Column(precision = 5, scale = 4)
    private BigDecimal score;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserAffinityId implements Serializable {
        private UUID userId;
        private String entityType;
        private String entityValue;
    }
}
