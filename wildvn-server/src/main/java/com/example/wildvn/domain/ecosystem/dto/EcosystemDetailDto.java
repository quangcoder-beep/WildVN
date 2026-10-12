package com.example.wildvn.domain.ecosystem.dto;

import com.example.wildvn.domain.species.dto.SpeciesSummaryDto;
import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class EcosystemDetailDto {
    private UUID id;
    private String name;
    private String slug;
    private String region;
    private String climate;
    private String thumbnailUrl;
    private Integer speciesCount;
    
    private String description;
    private String locationDescription;
    private String threats;
    private String galleryUrls;
    
    private List<SpeciesSummaryDto> species;
}
