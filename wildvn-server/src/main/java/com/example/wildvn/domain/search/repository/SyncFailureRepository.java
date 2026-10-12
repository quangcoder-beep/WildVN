package com.example.wildvn.domain.search.repository;

import com.example.wildvn.domain.search.entity.SyncFailure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SyncFailureRepository extends JpaRepository<SyncFailure, UUID> {
    List<SyncFailure> findByResolvedFalse();
}
