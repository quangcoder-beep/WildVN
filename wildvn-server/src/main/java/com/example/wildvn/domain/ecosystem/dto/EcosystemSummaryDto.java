package com.example.wildvn.domain.ecosystem.dto;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class EcosystemSummaryDto {
    private UUID id;
    private String name;
    private String slug;
    private String region;
    private String climate;
    private String thumbnailUrl;
    private Integer speciesCount;
}
