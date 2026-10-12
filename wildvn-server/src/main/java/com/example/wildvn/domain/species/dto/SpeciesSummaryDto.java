package com.example.wildvn.domain.species.dto;

import com.example.wildvn.domain.species.entity.ActivityPattern;
import com.example.wildvn.domain.species.entity.DietType;
import com.example.wildvn.domain.species.entity.HabitatType;
import com.example.wildvn.domain.taxonomy.dto.TaxonomyDto;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SpeciesSummaryDto {
    private UUID id;
    private String name;
    private String nameVn;
    private String nameEn;
    private String slug;
    private String scientificName;
    private String category;
    private String habitat;
    private HabitatType[] habitatType;
    private DietType dietType;
    private ActivityPattern activityPattern;
    private String thumbnailUrl;
    private String tags;
    private String conservationStatus;
    private String identificationDesc;
    private String biologyDesc;
    private String conservationDesc;
    private String shortDescription;
    private TaxonomyDto taxonomy;
    private List<SpeciesMediaDto> media;
    private List<String> images;
}
