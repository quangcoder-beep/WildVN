package com.example.wildvn.domain.search.repository;

import com.example.wildvn.domain.search.entity.UserAffinity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserAffinityRepository extends JpaRepository<UserAffinity, UserAffinity.UserAffinityId> {
    List<UserAffinity> findByUserIdOrderByScoreDesc(UUID userId);
}
