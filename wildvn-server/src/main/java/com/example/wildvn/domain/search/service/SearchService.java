package com.example.wildvn.domain.search.service;

import com.example.wildvn.domain.search.client.MlServiceClient;
import com.example.wildvn.domain.search.client.QdrantClient;
import com.example.wildvn.domain.search.document.SpeciesDocument;
import com.example.wildvn.domain.search.dto.SearchItemDto;
import com.example.wildvn.domain.search.dto.SearchResultDto;
import com.example.wildvn.domain.search.dto.SuggestionDto;
import com.example.wildvn.domain.search.entity.SearchSuggestionPopularity;
import com.example.wildvn.domain.search.repository.SearchSuggestionPopularityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.example.wildvn.domain.search.entity.UserAffinity;
import com.example.wildvn.domain.user.entity.User;
import com.example.wildvn.domain.user.repository.UserRepository;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    @Autowired(required = false)
    private ElasticsearchOperations elasticsearchOperations;

    @Autowired(required = false)
    private StringRedisTemplate stringRedisTemplate;

    private final SearchSuggestionPopularityRepository popularityRepository;
    private final MlServiceClient mlServiceClient;
    private final QdrantClient qdrantClient;
    private final UserRepository userRepository;
    private final com.example.wildvn.domain.search.repository.UserAffinityRepository userAffinityRepository;

    public SearchResultDto keywordSearch(String query, int page, int limit) {
        if (elasticsearchOperations == null) {
            return SearchResultDto.builder().results(java.util.Collections.emptyList()).searchType("keyword").totalHits(0).build();
        }
        // Multi-match query with fuzzy logic (typo tolerance <= 2)
        NativeQuery nativeQuery = NativeQuery.builder()
                .withQuery(q -> q.multiMatch(m -> m
                        .fields("name^3", "nameVn^3", "description", "tags^2", "habitat")
                        .query(query)
                        .fuzziness("AUTO:4,6") // Levenshtein distance <= 2 for words > 6 chars
                        .prefixLength(2)
                ))
                .withPageable(PageRequest.of(page - 1, limit))
                .build();

        SearchHits<SpeciesDocument> searchHits;
        try {
            searchHits = elasticsearchOperations.search(nativeQuery, SpeciesDocument.class);
        } catch (Exception e) {
            return SearchResultDto.builder().results(java.util.Collections.emptyList()).searchType("keyword").totalHits(0).build();
        }

        List<SearchItemDto> items = searchHits.getSearchHits().stream()
                .map(hit -> {
                    Map<String, Object> meta = new HashMap<>();
                    meta.put("category", hit.getContent().getCategory());
                    meta.put("habitat", hit.getContent().getHabitat());
                    if (hit.getContent().getTags() != null) {
                        meta.put("tags", Arrays.asList(hit.getContent().getTags()));
                    }
                    return SearchItemDto.builder()
                        .id(hit.getContent().getId())
                        .title(hit.getContent().getNameVn() != null ? hit.getContent().getNameVn() : hit.getContent().getName())
                        .description(hit.getContent().getDescription())
                        .type("species")
                        .score((float) hit.getScore())
                        .metadata(meta)
                        .build();
                })
                .collect(Collectors.toList());

        return SearchResultDto.builder()
                .results(items)
                .searchType("keyword")
                .totalHits(searchHits.getTotalHits())
                .build();
    }

    public List<SuggestionDto> suggest(String prefix, int limit) {
        if (elasticsearchOperations == null) {
            return java.util.Collections.emptyList();
        }
        List<SuggestionDto> suggestions = new ArrayList<>();

        // 1. Get popular queries from Postgres/Redis based on prefix
        List<SearchSuggestionPopularity> popularQueries = popularityRepository.findPopularSuggestions(prefix, limit / 2);
        popularQueries.forEach(pq -> suggestions.add(new SuggestionDto(pq.getQuery(), "query")));

        // 2. Fallback / supplement with Elasticsearch prefix match if not enough suggestions
        if (suggestions.size() < limit) {
            NativeQuery suggestQuery = NativeQuery.builder()
                    .withQuery(q -> q.matchPhrasePrefix(m -> m
                            .field("name")
                            .query(prefix)
                    ))
                    .withPageable(PageRequest.of(0, limit - suggestions.size()))
                    .build();

            try {
                SearchHits<SpeciesDocument> searchHits = elasticsearchOperations.search(suggestQuery, SpeciesDocument.class);
                searchHits.getSearchHits().forEach(hit -> {
                    suggestions.add(new SuggestionDto(hit.getContent().getName(), "species"));
                });
            } catch (Exception e) {
                // Ignore and return what we have
            }
        }

        return suggestions;
    }

    public SearchResultDto semanticSearch(String query, int limit) {
        if (elasticsearchOperations == null) {
            return SearchResultDto.builder().results(java.util.Collections.emptyList()).searchType("semantic").totalHits(0).build();
        }
        List<SearchItemDto> items = new ArrayList<>();
        try {
            // 1. Generate embedding using FastAPI
            MlServiceClient.EmbedResponse embedResponse = mlServiceClient.embed(query);

            // 2. Query Qdrant for ANN search with threshold 0.72
            QdrantClient.SearchResult qdrantResult = qdrantClient.search(embedResponse.getVector(), limit, 0.72f);

            // 3. Map to SearchItemDto
            if (qdrantResult != null && qdrantResult.getResult() != null) {
                items = qdrantResult.getResult().stream().map(point -> {
                    Map<String, Object> payload = point.getPayload();
                    return SearchItemDto.builder()
                            .id(point.getId())
                            .title(payload.getOrDefault("title", "").toString())
                            .description(payload.getOrDefault("description", "").toString())
                            .type(payload.getOrDefault("type", "species").toString())
                            .score(point.getScore())
                            .metadata(payload)
                            .build();
                }).collect(Collectors.toList());
            }
        } catch (Exception e) {
            // Ignore if ML or Qdrant is down
        }

        return SearchResultDto.builder()
                .results(items)
                .searchType("semantic")
                .totalHits(items.size()) // Qdrant doesn't return total matches easily for filtered queries, use size
                .build();
    }

    public SearchResultDto hybridSearch(String query, int page, int limit) {
        int fetchLimit = limit * 2; // Fetch more for better reranking
        
        // 1. Fetch Keyword & Semantic results
        List<SearchItemDto> keywordResults = keywordSearch(query, 1, fetchLimit).getResults();
        List<SearchItemDto> semanticResults = semanticSearch(query, fetchLimit).getResults();

        // 2. Reciprocal Rank Fusion (RRF)
        Map<String, SearchItemDto> mergedItems = new HashMap<>();
        Map<String, Float> rrfScores = new HashMap<>();
        
        applyRrf(keywordResults, mergedItems, rrfScores);
        applyRrf(semanticResults, mergedItems, rrfScores);

        // 3. Prepare candidates for Reranking
        List<SearchItemDto> candidates = new ArrayList<>(mergedItems.values());
        List<String> candidateTexts = candidates.stream()
                .map(item -> item.getTitle() + " " + item.getDescription())
                .collect(Collectors.toList());

        // 4. Rerank via ML Service
        if (!candidateTexts.isEmpty()) {
            try {
                MlServiceClient.RerankResponse rerankResponse = mlServiceClient.rerank(query, candidateTexts);
                List<Float> rerankScores = rerankResponse.getScores();

                // 5. Final Score = RRF_Score * Reranker_Score
                for (int i = 0; i < candidates.size(); i++) {
                    SearchItemDto item = candidates.get(i);
                    float rrfScore = rrfScores.getOrDefault(item.getId(), 0f);
                    float rerankScore = i < rerankScores.size() ? rerankScores.get(i) : 0.01f;
                    item.setScore(rrfScore * rerankScore);
                }
            } catch (Exception e) {
                // If reranker fails, fallback to pure RRF score
                candidates.forEach(item -> item.setScore(rrfScores.getOrDefault(item.getId(), 0f)));
            }
        }

        // 6. Apply Personalization Boost (P3)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            User user = userRepository.findByEmailAndDeletedAtIsNull(auth.getName()).orElse(null);
            if (user != null) {
                List<UserAffinity> affinities = userAffinityRepository.findByUserIdOrderByScoreDesc(user.getId());
                for (SearchItemDto item : candidates) {
                    Map<String, Object> meta = item.getMetadata();
                    if (meta == null) continue;
                    
                    float boost = 1.0f;
                    for (UserAffinity affinity : affinities) {
                        String type = affinity.getEntityType();
                        String value = affinity.getEntityValue();
                        float score = affinity.getScore().floatValue();
                        
                        if ("habitat".equals(type) && value.equals(meta.get("habitat"))) {
                            boost += score * 0.5f; // Up to 50% boost
                        } else if ("category".equals(type) && value.equals(meta.get("category"))) {
                            boost += score * 0.5f;
                        } else if ("tag".equals(type) && meta.containsKey("tags")) {
                            Object tagsObj = meta.get("tags");
                            if (tagsObj instanceof List && ((List<?>) tagsObj).contains(value)) {
                                boost += score * 0.5f;
                            }
                        }
                    }
                    item.setScore(item.getScore() * boost);
                }
            }
        }

        // 7. Sort & Paginate
        candidates.sort((a, b) -> Float.compare(b.getScore(), a.getScore()));
        
        int start = (page - 1) * limit;
        int end = Math.min(start + limit, candidates.size());
        List<SearchItemDto> paginated = start < candidates.size() ? candidates.subList(start, end) : Collections.emptyList();

        return SearchResultDto.builder()
                .results(paginated)
                .searchType("hybrid")
                .totalHits(candidates.size())
                .build();
    }

    private void applyRrf(List<SearchItemDto> results, Map<String, SearchItemDto> mergedItems, Map<String, Float> rrfScores) {
        int rank = 1;
        for (SearchItemDto item : results) {
            mergedItems.putIfAbsent(item.getId(), item);
            float currentScore = rrfScores.getOrDefault(item.getId(), 0f);
            float rrfScore = 1.0f / (60.0f + rank);
            rrfScores.put(item.getId(), currentScore + rrfScore);
            rank++;
        }
    }

    public List<SuggestionDto> aiSuggest(String prefix, int limit) {
        if (prefix == null || prefix.length() < 2) {
            return Collections.emptyList();
        }

        List<String> candidates = new ArrayList<>();

        // 1. Fetch from Redis Trending
        try {
            var trending = stringRedisTemplate.opsForZSet().reverseRange("trending:queries:hourly", 0, 50);
            if (trending != null) {
                for (String t : trending) {
                    if (t.toLowerCase().startsWith(prefix.toLowerCase()) && !candidates.contains(t)) {
                        candidates.add(t);
                    }
                }
            }
        } catch (Exception e) {
            // Redis error fallback
        }

        // 2. Fetch from Historical/Co-search Patterns (DB)
        if (candidates.size() < limit * 3) {
            List<SearchSuggestionPopularity> popularQueries = popularityRepository.findPopularSuggestions(prefix, limit * 3);
            for (SearchSuggestionPopularity pq : popularQueries) {
                if (!candidates.contains(pq.getQuery())) {
                    candidates.add(pq.getQuery());
                }
            }
        }

        if (candidates.isEmpty()) {
            return Collections.emptyList();
        }

        // 3. AI Reranking to find most semantically relevant completions
        List<SuggestionDto> finalSuggestions = new ArrayList<>();
        try {
            MlServiceClient.RerankResponse rerankResponse = mlServiceClient.rerank(prefix, candidates);
            List<Integer> rankedIndices = rerankResponse.getRanked_indices();
            
            for (int i = 0; i < Math.min(limit, rankedIndices.size()); i++) {
                int originalIndex = rankedIndices.get(i);
                finalSuggestions.add(new SuggestionDto(candidates.get(originalIndex), "ai_query"));
            }
        } catch (Exception e) {
            // Fallback to frequency based sorting if ML fails
            for (int i = 0; i < Math.min(limit, candidates.size()); i++) {
                finalSuggestions.add(new SuggestionDto(candidates.get(i), "ai_query"));
            }
        }

        return finalSuggestions;
    }
}
