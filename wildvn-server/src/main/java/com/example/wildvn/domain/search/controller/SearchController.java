package com.example.wildvn.domain.search.controller;

import com.example.wildvn.common.dto.ApiResponse;
import com.example.wildvn.common.dto.PaginationMeta;
import com.example.wildvn.common.dto.RequestMeta;
import com.example.wildvn.domain.search.dto.SearchResultDto;
import com.example.wildvn.domain.search.dto.SuggestionDto;
import com.example.wildvn.domain.search.service.SearchCacheService;
import com.example.wildvn.domain.search.service.SearchEventConsumer;
import com.example.wildvn.domain.search.service.SearchEventProducer;
import com.example.wildvn.domain.search.service.SearchService;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;
    private final SearchCacheService cacheService;
    private final SearchEventProducer eventProducer;
    private final SearchEventConsumer eventConsumer;

    private String getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            return auth.getName(); // Usually email
        }
        return "anonymous";
    }

    @GetMapping
    public ApiResponse<SearchResultDto> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "all") String type,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        long startTime = System.currentTimeMillis();
        boolean cacheHit = true;

        String cacheKey = cacheService.generateKey("search", q, type, page, limit);
        SearchResultDto result = cacheService.get(cacheKey, new TypeReference<SearchResultDto>() {});

        if (result == null) {
            cacheHit = false;
            result = searchService.keywordSearch(q, page, limit);
            cacheService.set(cacheKey, result, Duration.ofMinutes(5));
        }

        long latencyMs = System.currentTimeMillis() - startTime;
        
        ApiResponse<SearchResultDto> response = ApiResponse.success(result);
        response.setPagination(PaginationMeta.builder()
                .page(page)
                .limit(limit)
                .total(result.getTotalHits())
                .build());
        response.setMeta(RequestMeta.builder()
                .latencyMs(latencyMs)
                .cacheHit(cacheHit)
                .build());
                
        eventProducer.trackSearch(getUserId(), q, type, result.getTotalHits(), latencyMs);
        return response;
    }

    @GetMapping("/suggest")
    public ApiResponse<List<SuggestionDto>> suggest(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int limit
    ) {
        long startTime = System.currentTimeMillis();
        boolean cacheHit = true;

        String cacheKey = cacheService.generateKey("suggest", q, limit);
        List<SuggestionDto> suggestions = cacheService.get(cacheKey, new TypeReference<List<SuggestionDto>>() {});

        if (suggestions == null) {
            cacheHit = false;
            suggestions = searchService.suggest(q, limit);
            cacheService.set(cacheKey, suggestions, Duration.ofMinutes(1));
        }

        long latencyMs = System.currentTimeMillis() - startTime;
        
        ApiResponse<List<SuggestionDto>> response = ApiResponse.success(suggestions);
        response.setMeta(RequestMeta.builder()
                .latencyMs(latencyMs)
                .cacheHit(cacheHit)
                .build());
                
        return response;
    }

    @GetMapping("/semantic")
    public ApiResponse<SearchResultDto> semanticSearch(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit
    ) {
        long startTime = System.currentTimeMillis();
        boolean cacheHit = true;

        String cacheKey = cacheService.generateKey("semantic", q, limit);
        SearchResultDto result = cacheService.get(cacheKey, new TypeReference<SearchResultDto>() {});

        if (result == null) {
            cacheHit = false;
            result = searchService.semanticSearch(q, limit);
            cacheService.set(cacheKey, result, Duration.ofMinutes(5));
        }

        long latencyMs = System.currentTimeMillis() - startTime;
        
        ApiResponse<SearchResultDto> response = ApiResponse.success(result);
        response.setPagination(PaginationMeta.builder()
                .page(1)
                .limit(limit)
                .total(result.getTotalHits())
                .build());
        response.setMeta(RequestMeta.builder()
                .latencyMs(latencyMs)
                .cacheHit(cacheHit)
                .build());
                
        eventProducer.trackSearch(getUserId(), q, "semantic", result.getTotalHits(), latencyMs);
        return response;
    }

    @GetMapping("/hybrid")
    public ApiResponse<SearchResultDto> hybridSearch(
            @RequestParam String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit
    ) {
        long startTime = System.currentTimeMillis();
        boolean cacheHit = true;

        String cacheKey = cacheService.generateKey("hybrid", q, page, limit);
        SearchResultDto result = cacheService.get(cacheKey, new TypeReference<SearchResultDto>() {});

        if (result == null) {
            cacheHit = false;
            result = searchService.hybridSearch(q, page, limit);
            cacheService.set(cacheKey, result, Duration.ofMinutes(5));
        }

        long latencyMs = System.currentTimeMillis() - startTime;
        
        ApiResponse<SearchResultDto> response = ApiResponse.success(result);
        response.setPagination(PaginationMeta.builder()
                .page(page)
                .limit(limit)
                .total(result.getTotalHits())
                .build());
        response.setMeta(RequestMeta.builder()
                .latencyMs(latencyMs)
                .cacheHit(cacheHit)
                .build());
                
        eventProducer.trackSearch(getUserId(), q, "hybrid", result.getTotalHits(), latencyMs);
        return response;
    }

    @GetMapping("/ai-suggest")
    public ApiResponse<List<SuggestionDto>> aiSuggest(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int limit
    ) {
        long startTime = System.currentTimeMillis();
        boolean cacheHit = true;

        String cacheKey = cacheService.generateKey("ai-suggest", q, limit);
        List<SuggestionDto> suggestions = cacheService.get(cacheKey, new TypeReference<List<SuggestionDto>>() {});

        if (suggestions == null) {
            cacheHit = false;
            suggestions = searchService.aiSuggest(q, limit);
            cacheService.set(cacheKey, suggestions, Duration.ofMinutes(1));
        }

        long latencyMs = System.currentTimeMillis() - startTime;
        
        ApiResponse<List<SuggestionDto>> response = ApiResponse.success(suggestions);
        response.setMeta(RequestMeta.builder()
                .latencyMs(latencyMs)
                .cacheHit(cacheHit)
                .build());
                
        return response;
    }

    @GetMapping("/trending")
    public ApiResponse<List<String>> getTrending(
            @RequestParam(defaultValue = "10") int limit
    ) {
        long startTime = System.currentTimeMillis();
        
        java.util.Set<String> trendingSet = eventConsumer.getTrendingQueries(limit);
        List<String> trendingList = trendingSet != null ? new java.util.ArrayList<>(trendingSet) : new java.util.ArrayList<>();
        
        long latencyMs = System.currentTimeMillis() - startTime;
        
        ApiResponse<List<String>> response = ApiResponse.success(trendingList);
        response.setMeta(RequestMeta.builder()
                .latencyMs(latencyMs)
                .cacheHit(true) // Always fast from Redis ZSET
                .build());
                
        return response;
    }

    @PostMapping("/track/click")
    public ApiResponse<Void> trackClick(@RequestBody ClickEventRequest request) {
        eventProducer.trackClick(getUserId(), request.query, request.entityId, request.entityType, request.rank);
        return ApiResponse.success(null);
    }

    public static class ClickEventRequest {
        public String query;
        public String entityId;
        public String entityType;
        public int rank;
    }
}
