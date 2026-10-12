package com.example.wildvn.domain.ecosystem.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "ecosystems")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ecosystem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    private String region;
    private String climate;
    private String thumbnailUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String locationDescription;

    @Column(columnDefinition = "TEXT")
    private String threats;

    @Column(columnDefinition = "TEXT")
    private String galleryUrls;

    @Column(nullable = false)
    private Integer speciesCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (speciesCount == null) speciesCount = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
