package com.example.wildvn.domain.search.service;

import com.example.wildvn.domain.search.document.SpeciesDocument;
import com.example.wildvn.domain.search.dto.SearchItemDto;
import com.example.wildvn.domain.search.entity.UserAffinity;
import com.example.wildvn.domain.search.repository.SpeciesSearchRepository;
import com.example.wildvn.domain.search.repository.UserAffinityRepository;
import com.example.wildvn.domain.user.entity.User;
import com.example.wildvn.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendService {

    @Autowired(required = false)
    private SpeciesSearchRepository speciesRepository;

    @Autowired(required = false)
    private ElasticsearchOperations elasticsearchOperations;

    private final UserAffinityRepository userAffinityRepository;
    private final UserRepository userRepository;

    public List<SearchItemDto> getSimilar(String entityId, String type, int limit) {
        if (elasticsearchOperations == null || speciesRepository == null) {
            return new ArrayList<>();
        }
        if ("species".equalsIgnoreCase(type)) {
            return getSimilarSpecies(entityId, limit);
        }
        
        // Return empty for other types for now
        return new ArrayList<>();
    }

    private List<SearchItemDto> getSimilarSpecies(String entityId, int limit) {
        SpeciesDocument target = speciesRepository.findById(entityId).orElse(null);
        if (target == null) {
            return new ArrayList<>();
        }

        // Content-based recommendation using Boolean Query
        NativeQuery query = NativeQuery.builder()
                .withQuery(q -> q.bool(b -> {
                    // Must not be the target item itself
                    b.mustNot(mn -> mn.term(t -> t.field("_id").value(entityId)));

                    // Should match habitat (high boost)
                    if (target.getHabitat() != null) {
                        b.should(s -> s.term(t -> t.field("habitat").value(target.getHabitat()).boost(3.0f)));
                    }

                    // Should match category (medium boost)
                    if (target.getCategory() != null) {
                        b.should(s -> s.term(t -> t.field("category").value(target.getCategory()).boost(2.0f)));
                    }

                    // Should match tags (normal boost)
                    if (target.getTags() != null && target.getTags().length > 0) {
                        for (String tag : target.getTags()) {
                            b.should(s -> s.term(t -> t.field("tags").value(tag).boost(1.0f)));
                        }
                    }

                    return b;
                }))
                .withPageable(PageRequest.of(0, limit))
                .build();

        SearchHits<SpeciesDocument> searchHits = elasticsearchOperations.search(query, SpeciesDocument.class);

        return searchHits.getSearchHits().stream()
                .map(hit -> SearchItemDto.builder()
                        .id(hit.getContent().getId())
                        .title(hit.getContent().getNameVn() != null ? hit.getContent().getNameVn() : hit.getContent().getName())
                        .description(hit.getContent().getDescription())
                        .type("species")
                        .score((float) hit.getScore())
                        .build())
                .collect(Collectors.toList());
    }

    public List<SearchItemDto> getForYou(String email, int limit) {
        if (elasticsearchOperations == null) {
            return new ArrayList<>();
        }
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElse(null);
        if (user == null) {
            return new ArrayList<>();
        }

        // Get top affinities
        List<UserAffinity> affinities = userAffinityRepository.findByUserIdOrderByScoreDesc(user.getId());
        if (affinities.isEmpty()) {
            // Cold start: return just generic match_all or random
            NativeQuery fallbackQuery = NativeQuery.builder()
                    .withQuery(q -> q.matchAll(m -> m))
                    .withPageable(PageRequest.of(0, limit))
                    .build();
            return mapHits(elasticsearchOperations.search(fallbackQuery, SpeciesDocument.class));
        }

        // Build boolean query boosting based on user affinities
        NativeQuery personalizedQuery = NativeQuery.builder()
                .withQuery(q -> q.bool(b -> {
                    for (UserAffinity affinity : affinities) {
                        float boost = affinity.getScore().floatValue() * 5.0f; // Scale up score
                        switch (affinity.getEntityType()) {
                            case "habitat":
                                b.should(s -> s.term(t -> t.field("habitat").value(affinity.getEntityValue()).boost(boost)));
                                break;
                            case "category":
                                b.should(s -> s.term(t -> t.field("category").value(affinity.getEntityValue()).boost(boost)));
                                break;
                            case "tag":
                                b.should(s -> s.term(t -> t.field("tags").value(affinity.getEntityValue()).boost(boost)));
                                break;
                        }
                    }
                    return b;
                }))
                .withPageable(PageRequest.of(0, limit))
                .build();

        return mapHits(elasticsearchOperations.search(personalizedQuery, SpeciesDocument.class));
    }

    private List<SearchItemDto> mapHits(SearchHits<SpeciesDocument> searchHits) {
        return searchHits.getSearchHits().stream()
                .map(hit -> SearchItemDto.builder()
                        .id(hit.getContent().getId())
                        .title(hit.getContent().getNameVn() != null ? hit.getContent().getNameVn() : hit.getContent().getName())
                        .description(hit.getContent().getDescription())
                        .type("species")
                        .score((float) hit.getScore())
                        .build())
                .collect(Collectors.toList());
    }
}
