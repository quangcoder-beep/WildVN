package com.example.wildvn.domain.favorite;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserFavoriteRepository extends JpaRepository<UserFavorite, UserFavoriteId> {

    List<UserFavorite> findByUserIdOrderByCreatedAtDesc(String userId);

    boolean existsByUserIdAndSpeciesId(String userId, UUID speciesId);
}
