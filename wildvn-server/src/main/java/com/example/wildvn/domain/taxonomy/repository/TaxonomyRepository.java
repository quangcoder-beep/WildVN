package com.example.wildvn.domain.taxonomy.repository;

import com.example.wildvn.domain.taxonomy.entity.Taxonomy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TaxonomyRepository extends JpaRepository<Taxonomy, UUID> {
}
