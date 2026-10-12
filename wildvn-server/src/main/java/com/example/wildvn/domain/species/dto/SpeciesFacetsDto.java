package com.example.wildvn.domain.species.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SpeciesFacetsDto {
    private List<SpeciesFacetOptionDto> statuses;
    private List<SpeciesFacetOptionDto> categories;
    private List<SpeciesFacetOptionDto> diets;
    private List<SpeciesFacetOptionDto> habitats;
    private List<SpeciesFacetOptionDto> activityPatterns;
}
