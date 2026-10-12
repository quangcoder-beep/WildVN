package com.example.wildvn.domain.search.repository;

import com.example.wildvn.domain.search.document.SpeciesDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpeciesSearchRepository extends ElasticsearchRepository<SpeciesDocument, String> {
    Page<SpeciesDocument> findByNameOrNameVnOrDescription(String name, String nameVn, String description, Pageable pageable);
}
