package com.example.wildvn.domain.ecosystem.repository;

import com.example.wildvn.domain.ecosystem.entity.Ecosystem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EcosystemRepository extends JpaRepository<Ecosystem, UUID>, JpaSpecificationExecutor<Ecosystem> {
    Optional<Ecosystem> findBySlug(String slug);
}
