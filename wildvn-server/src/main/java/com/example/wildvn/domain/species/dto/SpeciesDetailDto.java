package com.example.wildvn.domain.species.dto;

import com.example.wildvn.domain.species.entity.ActivityPattern;
import com.example.wildvn.domain.species.entity.CitesAppendix;
import com.example.wildvn.domain.species.entity.DietType;
import com.example.wildvn.domain.species.entity.HabitatType;
import com.example.wildvn.domain.species.entity.VnDecreeStatus;
import com.example.wildvn.domain.species.entity.VnRedListStatus;
import com.example.wildvn.domain.taxonomy.dto.TaxonomyDto;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SpeciesDetailDto {
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

    private String description;
    private String diet;
    private String conservationStatus;
    private VnRedListStatus vnRedListStatus;
    private CitesAppendix citesAppendix;
    private VnDecreeStatus vnDecreeStatus;
    private String funFacts;
    private String galleryUrls;
    
    private String authorCitation;
    private String[] synonyms;
    private String identificationDesc;
    private String biologyDesc;
    private String threatsDesc;
    private String conservationDesc;
    private List<Object> sourceReferences;
    private TaxonomyDto taxonomy;
    private List<SpeciesMediaDto> media;

    private UUID ecosystemId;
    private String relatedSpeciesIds;
    private String lessonIds;
}
