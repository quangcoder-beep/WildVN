package com.example.wildvn.domain.taxonomy.dto;

import com.example.wildvn.domain.taxonomy.entity.TaxonomyRank;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class TaxonomyDto {
    private UUID id;
    private TaxonomyRank rank;
    private String scientificName;
    private String nameVn;
    private TaxonomyDto parent;
}
