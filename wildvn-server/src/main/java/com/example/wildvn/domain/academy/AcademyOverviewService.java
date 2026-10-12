package com.example.wildvn.domain.academy;

import com.example.wildvn.domain.species.dto.SpeciesFacetsDto;
import com.example.wildvn.domain.species.dto.SpeciesSummaryDto;
import com.example.wildvn.domain.species.entity.PublishStatus;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import com.example.wildvn.domain.species.service.SpeciesFacetsService;
import com.example.wildvn.domain.species.service.SpeciesQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AcademyOverviewService {

    private final SpeciesRepository speciesRepository;
    private final SpeciesQueryService speciesQueryService;
    private final SpeciesFacetsService speciesFacetsService;

    public AcademyOverviewDto getOverview() {
        List<SpeciesSummaryDto> featuredSpecies = speciesQueryService.getFeatured();
        SpeciesFacetsDto facets = speciesFacetsService.getFacets();
        return AcademyOverviewDto.builder()
                .speciesCount(speciesRepository.countByPublishStatusAndDeletedAtIsNull(PublishStatus.PUBLISHED))
                .featuredSpecies(featuredSpecies)
                .facets(facets)
                .build();
    }
}
