package com.example.wildvn.domain.search.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;

@Entity
@Table(name = "search_suggestions_popularity")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchSuggestionPopularity {

    @Id
    @Column(length = 500)
    private String query;

    @Column(name = "search_count")
    @Builder.Default
    private Long searchCount = 0L;

    @Column(name = "click_count")
    @Builder.Default
    private Long clickCount = 0L;

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
}
