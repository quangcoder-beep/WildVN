package com.example.wildvn.domain.ecosystem.controller;

import com.example.wildvn.common.dto.ApiResponse;
import com.example.wildvn.common.dto.PaginationMeta;
import com.example.wildvn.domain.ecosystem.dto.EcosystemDetailDto;
import com.example.wildvn.domain.ecosystem.dto.EcosystemSummaryDto;
import com.example.wildvn.domain.ecosystem.entity.Ecosystem;
import com.example.wildvn.domain.ecosystem.repository.EcosystemRepository;
import com.example.wildvn.domain.media.MediaUrlService;
import com.example.wildvn.domain.species.dto.SpeciesSummaryDto;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import com.example.wildvn.domain.species.service.SpeciesQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ecosystems")
@RequiredArgsConstructor
public class EcosystemController {

    private final EcosystemRepository ecosystemRepository;
    private final SpeciesRepository speciesRepository;
    private final SpeciesQueryService speciesQueryService;
    private final MediaUrlService mediaUrlService;

    @GetMapping
    public ApiResponse<List<EcosystemSummaryDto>> getEcosystems(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String climate
    ) {
        if (page < 1) throw new IllegalArgumentException("page phải lớn hơn hoặc bằng 1");
        if (limit < 1 || limit > 100) throw new IllegalArgumentException("limit phải nằm trong khoảng từ 1 đến 100");
        Specification<Ecosystem> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (region != null && !region.isEmpty() && !"ALL".equalsIgnoreCase(region)) {
                predicates.add(cb.equal(root.get("region"), region));
            }
            if (climate != null && !climate.isEmpty() && !"ALL".equalsIgnoreCase(climate)) {
                predicates.add(cb.equal(root.get("climate"), climate));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Ecosystem> ecosystemPage = ecosystemRepository.findAll(
                spec, PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.ASC, "name")));

        List<EcosystemSummaryDto> dtos = ecosystemPage.getContent().stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());

        ApiResponse<List<EcosystemSummaryDto>> response = ApiResponse.success(dtos);
        response.setPagination(PaginationMeta.builder()
                .page(page)
                .limit(limit)
                .total(ecosystemPage.getTotalElements())
                .build());

        return response;
    }

    @GetMapping("/{slug}")
    public ApiResponse<EcosystemDetailDto> getEcosystemDetail(@PathVariable String slug) {
        Ecosystem ecosystem = ecosystemRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hệ sinh thái"));
                
        List<SpeciesSummaryDto> speciesDtos = speciesRepository.findByEcosystemId(ecosystem.getId()).stream()
                .map(speciesQueryService::toSummary)
                .collect(Collectors.toList());

        EcosystemDetailDto detailDto = EcosystemDetailDto.builder()
                .id(ecosystem.getId())
                .name(ecosystem.getName())
                .slug(ecosystem.getSlug())
                .region(ecosystem.getRegion())
                .climate(ecosystem.getClimate())
                .thumbnailUrl(mediaUrlService.resolve(ecosystem.getThumbnailUrl()))
                .speciesCount(ecosystem.getSpeciesCount())
                .description(ecosystem.getDescription())
                .locationDescription(ecosystem.getLocationDescription())
                .threats(ecosystem.getThreats())
                .galleryUrls(ecosystem.getGalleryUrls())
                .species(speciesDtos)
                .build();
                
        return ApiResponse.success(detailDto);
    }

    private EcosystemSummaryDto mapToSummary(Ecosystem e) {
        return EcosystemSummaryDto.builder()
                .id(e.getId())
                .name(e.getName())
                .slug(e.getSlug())
                .region(e.getRegion())
                .climate(e.getClimate())
                .thumbnailUrl(mediaUrlService.resolve(e.getThumbnailUrl()))
                .speciesCount(e.getSpeciesCount())
                .build();
    }
}
