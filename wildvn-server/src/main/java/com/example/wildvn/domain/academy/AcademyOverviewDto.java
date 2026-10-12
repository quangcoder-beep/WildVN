package com.example.wildvn.domain.academy;

import com.example.wildvn.domain.species.dto.SpeciesFacetsDto;
import com.example.wildvn.domain.species.dto.SpeciesSummaryDto;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AcademyOverviewDto {
    private long speciesCount;
    private List<SpeciesSummaryDto> featuredSpecies;
    private SpeciesFacetsDto facets;
}
