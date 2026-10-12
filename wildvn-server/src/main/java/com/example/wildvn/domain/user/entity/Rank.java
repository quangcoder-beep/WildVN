package com.example.wildvn.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "ranks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rank {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "name_vn", nullable = false)
    private String nameVn;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "min_xp", nullable = false)
    private Integer minXp;

    @Column(name = "max_xp")
    private Integer maxXp;

    @Column(name = "icon_url")
    private String iconUrl;

    @Column(name = "sort_order", nullable = false, unique = true)
    private Short sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
