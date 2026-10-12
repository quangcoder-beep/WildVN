package com.example.wildvn.domain.favorite;

import com.example.wildvn.common.dto.ApiResponse;
import com.example.wildvn.domain.species.dto.SpeciesSummaryDto;
import com.example.wildvn.domain.species.service.SpeciesQueryService;
import com.example.wildvn.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;
    private final SpeciesQueryService speciesQueryService;

    @GetMapping
    public ApiResponse<List<FavoriteDto>> list() {
        String userId = SecurityUtils.getCurrentUsername();
        return ApiResponse.success(favoriteService.list(userId).stream()
                .map(item -> new FavoriteDto(item.getSpeciesId(), item.getCreatedAt(), speciesQueryService.toSummary(item.getSpecies())))
                .toList());
    }

    @GetMapping("/{speciesId}")
    public ApiResponse<FavoriteStatusDto> status(@PathVariable UUID speciesId) {
        return ApiResponse.success(FavoriteStatusDto.builder()
                .favorited(favoriteService.isFavorited(SecurityUtils.getCurrentUsername(), speciesId))
                .build());
    }

    @PostMapping
    public ApiResponse<FavoriteStatusDto> toggle(@Valid @RequestBody ToggleFavoriteRequest request) {
        boolean favorited = favoriteService.toggle(SecurityUtils.getCurrentUsername(), request.getSpeciesId());
        return ApiResponse.success(FavoriteStatusDto.builder().favorited(favorited).build());
    }

    @Value
    private static class ToggleFavoriteRequest {
        @NotNull
        UUID speciesId;
    }

    public record FavoriteDto(UUID speciesId, java.time.OffsetDateTime createdAt, SpeciesSummaryDto species) {
    }
}
