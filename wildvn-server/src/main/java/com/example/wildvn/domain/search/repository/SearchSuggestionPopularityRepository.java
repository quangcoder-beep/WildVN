package com.example.wildvn.domain.search.repository;

import com.example.wildvn.domain.search.entity.SearchSuggestionPopularity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchSuggestionPopularityRepository extends JpaRepository<SearchSuggestionPopularity, String> {

    @Query("SELECT s FROM SearchSuggestionPopularity s WHERE s.query LIKE :prefix% ORDER BY s.clickCount DESC, s.searchCount DESC LIMIT :limit")
    List<SearchSuggestionPopularity> findPopularSuggestions(String prefix, int limit);
}
