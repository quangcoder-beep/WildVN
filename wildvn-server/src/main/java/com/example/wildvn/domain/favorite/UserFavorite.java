package com.example.wildvn.domain.favorite;

import com.example.wildvn.domain.species.entity.Species;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.MapsId;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_favorites")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFavorite {

    @EmbeddedId
    private UserFavoriteId id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("speciesId")
    @JoinColumn(name = "species_id")
    private Species species;

    public UserFavorite(UserFavoriteId id) {
        this.id = id;
    }

    public UserFavoriteId getId() {
        return id;
    }

    public String getUserId() {
        return id == null ? null : id.getUserId();
    }

    public UUID getSpeciesId() {
        return id == null ? null : id.getSpeciesId();
    }

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
