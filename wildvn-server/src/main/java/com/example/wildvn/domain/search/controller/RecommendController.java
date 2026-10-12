package com.example.wildvn.domain.search.controller;

import com.example.wildvn.common.dto.ApiResponse;
import com.example.wildvn.common.dto.RequestMeta;
import com.example.wildvn.domain.search.dto.SearchItemDto;
import com.example.wildvn.domain.search.service.RecommendService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recommend")
@RequiredArgsConstructor
public class RecommendController {

    private final RecommendService recommendService;

    @GetMapping("/similar/{entityId}")
    public ApiResponse<List<SearchItemDto>> getSimilar(
            @PathVariable String entityId,
            @RequestParam(defaultValue = "species") String type,
            @RequestParam(defaultValue = "10") int limit
    ) {
        long startTime = System.currentTimeMillis();
        
        List<SearchItemDto> recommendations = recommendService.getSimilar(entityId, type, limit);
        
        long latencyMs = System.currentTimeMillis() - startTime;
        
        ApiResponse<List<SearchItemDto>> response = ApiResponse.success(recommendations);
        response.setMeta(RequestMeta.builder()
                .latencyMs(latencyMs)
                .cacheHit(false) // Not cached in F3 explicitly for recommendations yet
                .build());
                
        return response;
    }

    @GetMapping("/for-you")
    public ApiResponse<List<SearchItemDto>> getForYou(
            @RequestParam(defaultValue = "10") int limit
    ) {
        long startTime = System.currentTimeMillis();
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return ApiResponse.error("UNAUTHORIZED", "User must be authenticated for personalized recommendations.");
        }
        
        String email = auth.getName();
        List<SearchItemDto> recommendations = recommendService.getForYou(email, limit);
        
        long latencyMs = System.currentTimeMillis() - startTime;
        
        ApiResponse<List<SearchItemDto>> response = ApiResponse.success(recommendations);
        response.setMeta(RequestMeta.builder()
                .latencyMs(latencyMs)
                .cacheHit(false)
                .build());
                
        return response;
    }
}
