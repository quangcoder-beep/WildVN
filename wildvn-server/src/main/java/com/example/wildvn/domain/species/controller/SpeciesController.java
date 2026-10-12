package com.example.wildvn.domain.species.controller;

import com.example.wildvn.common.dto.ApiResponse;
import com.example.wildvn.common.dto.PaginationMeta;
import com.example.wildvn.domain.species.dto.SpeciesDetailDto;
import com.example.wildvn.domain.species.dto.SpeciesFacetsDto;
import com.example.wildvn.domain.species.dto.SpeciesSummaryDto;
import com.example.wildvn.domain.species.entity.ActivityPattern;
import com.example.wildvn.domain.species.entity.DietType;
import com.example.wildvn.domain.species.entity.HabitatType;
import com.example.wildvn.domain.species.service.SpeciesQueryService;
import com.example.wildvn.domain.species.service.SpeciesFacetsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/species")
@RequiredArgsConstructor
public class SpeciesController {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> CONSERVATION_STATUSES = Set.of("EX", "EW", "CR", "EN", "VU", "NT", "LC", "DD", "NE");
    private static final Map<String, String> CATEGORY_TO_CLASS = Map.of(
            "Thú", "Mammalia",
            "Chim", "Aves",
            "Bò sát", "Reptilia",
            "Lưỡng cư", "Amphibia",
            "Cá", "Actinopterygii"
    );

    private final SpeciesQueryService speciesQueryService;
    private final SpeciesFacetsService speciesFacetsService;

    @GetMapping
    public ApiResponse<List<SpeciesSummaryDto>> getSpecies(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String group,
            @RequestParam(required = false) String habitat,
            @RequestParam(required = false) String diet,
            @RequestParam(required = false) String activityPattern,
            @RequestParam(required = false) String tag
    ) {
        validatePagination(page, limit);
        String normalizedStatus = normalizeStatus(status);
        DietType normalizedDiet = parseEnum(diet, DietType.class, "diet");
        HabitatType normalizedHabitat = parseEnum(habitat, HabitatType.class, "habitat");
        ActivityPattern normalizedActivity = parseEnum(activityPattern, ActivityPattern.class, "activityPattern");
        String taxonomyClass = normalizeCategory(firstPresent(group, category));

        Page<SpeciesSummaryDto> speciesPage = speciesQueryService.list(
                normalizeText(query, "q", 100),
                normalizedStatus,
                normalizedDiet,
                normalizedHabitat,
                normalizedActivity,
                taxonomyClass,
                normalizeText(tag, "tag", 100),
                PageRequest.of(page - 1, limit)
        );

        ApiResponse<List<SpeciesSummaryDto>> response = ApiResponse.success(speciesPage.getContent());
        response.setPagination(PaginationMeta.builder()
                .page(page)
                .limit(limit)
                .total(speciesPage.getTotalElements())
                .build());
        return response;
    }

    @GetMapping("/featured")
    public ApiResponse<List<SpeciesSummaryDto>> getFeaturedSpecies() {
        return ApiResponse.success(speciesQueryService.getFeatured());
    }

    @GetMapping("/facets")
    public ApiResponse<SpeciesFacetsDto> getSpeciesFacets() {
        return ApiResponse.success(speciesFacetsService.getFacets());
    }

    @GetMapping("/{slug}")
    public ApiResponse<SpeciesDetailDto> getSpeciesDetail(@PathVariable String slug) {
        return ApiResponse.success(speciesQueryService.getDetail(slug));
    }

    @GetMapping("/{slug}/related")
    public ApiResponse<List<SpeciesSummaryDto>> getRelatedSpecies(@PathVariable String slug) {
        return ApiResponse.success(speciesQueryService.getRelated(slug));
    }

    private void validatePagination(int page, int limit) {
        if (page < 1) throw new IllegalArgumentException("page phải lớn hơn hoặc bằng 1");
        if (limit < 1 || limit > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("limit phải nằm trong khoảng từ 1 đến " + MAX_PAGE_SIZE);
        }
    }

    private String normalizeStatus(String status) {
        String normalized = normalizeOptional(status);
        if (normalized == null) return null;
        String upperCaseStatus = normalized.toUpperCase();
        if (!CONSERVATION_STATUSES.contains(upperCaseStatus)) {
            throw new IllegalArgumentException("status không hợp lệ");
        }
        return upperCaseStatus;
    }

    private String normalizeCategory(String category) {
        String normalized = normalizeOptional(category);
        if (normalized == null) return null;
        String taxonomyClass = CATEGORY_TO_CLASS.get(normalized);
        if (taxonomyClass == null) throw new IllegalArgumentException("category không hợp lệ");
        return taxonomyClass;
    }

    private <T extends Enum<T>> T parseEnum(String value, Class<T> enumType, String parameterName) {
        String normalized = normalizeOptional(value);
        if (normalized == null) return null;
        try {
            return Enum.valueOf(enumType, normalized.toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(parameterName + " không hợp lệ");
        }
    }

    private String normalizeText(String value, String parameterName, int maxLength) {
        String normalized = normalizeOptional(value);
        if (normalized != null && normalized.length() > maxLength) {
            throw new IllegalArgumentException(parameterName + " không được dài quá " + maxLength + " ký tự");
        }
        return normalized;
    }

    private String firstPresent(String first, String second) {
        return normalizeOptional(first) == null ? second : first;
    }

    private String normalizeOptional(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() || "ALL".equalsIgnoreCase(normalized) ? null : normalized;
    }
}
