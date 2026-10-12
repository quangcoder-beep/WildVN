package com.example.wildvn.domain.favorite;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserFavoriteId implements Serializable {

    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    @Column(name = "species_id", nullable = false)
    private UUID speciesId;
}
