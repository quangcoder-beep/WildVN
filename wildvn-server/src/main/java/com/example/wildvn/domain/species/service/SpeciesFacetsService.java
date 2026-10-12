package com.example.wildvn.domain.species.service;

import com.example.wildvn.domain.species.dto.SpeciesFacetOptionDto;
import com.example.wildvn.domain.species.dto.SpeciesFacetsDto;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SpeciesFacetsService {

    private final SpeciesRepository speciesRepository;

    public SpeciesFacetsDto getFacets() {
        return SpeciesFacetsDto.builder()
                .statuses(toOptions(speciesRepository.findConservationStatusFacets()))
                .categories(toOptions(speciesRepository.findCategoryFacets()))
                .diets(toOptions(speciesRepository.findDietFacets()))
                .habitats(toOptions(speciesRepository.findHabitatFacets()))
                .activityPatterns(toOptions(speciesRepository.findActivityPatternFacets()))
                .build();
    }

    private List<SpeciesFacetOptionDto> toOptions(List<Object[]> rows) {
        return rows.stream()
                .filter(row -> row.length >= 2 && row[0] != null && row[1] instanceof Number)
                .map(row -> new SpeciesFacetOptionDto(String.valueOf(row[0]), ((Number) row[1]).longValue()))
                .toList();
    }
}
