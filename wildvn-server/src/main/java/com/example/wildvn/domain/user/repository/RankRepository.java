package com.example.wildvn.domain.user.repository;

import com.example.wildvn.domain.user.entity.Rank;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface RankRepository extends JpaRepository<Rank, UUID> {
    Optional<Rank> findBySortOrder(Short sortOrder);
}
