package com.example.wildvn.domain.species.service;

import com.example.wildvn.domain.media.MediaUrlService;
import com.example.wildvn.domain.species.dto.SpeciesDetailDto;
import com.example.wildvn.domain.species.dto.SpeciesMediaDto;
import com.example.wildvn.domain.species.dto.SpeciesSummaryDto;
import com.example.wildvn.domain.species.entity.ActivityPattern;
import com.example.wildvn.domain.species.entity.DietType;
import com.example.wildvn.domain.species.entity.HabitatType;
import com.example.wildvn.domain.species.entity.MediaType;
import com.example.wildvn.domain.species.entity.Species;
import com.example.wildvn.domain.species.entity.SpeciesMedia;
import com.example.wildvn.domain.species.repository.SpeciesRepository;
import com.example.wildvn.domain.taxonomy.dto.TaxonomyDto;
import com.example.wildvn.domain.taxonomy.entity.Taxonomy;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SpeciesQueryService {

    private static final ObjectMapper LEGACY_JSON_MAPPER = new ObjectMapper();

    private final SpeciesRepository speciesRepository;
    private final MediaUrlService mediaUrlService;

    public Page<SpeciesSummaryDto> list(
            String query,
            String status,
            DietType dietType,
            HabitatType habitatType,
            ActivityPattern activityPattern,
            String taxonomyClass,
            String tag,
            Pageable pageable
    ) {
        return speciesRepository.findCatalog(
                        query,
                        status,
                        dietType == null ? null : dietType.name(),
                        habitatType == null ? null : habitatType.name(),
                        activityPattern == null ? null : activityPattern.name(),
                        taxonomyClass,
                        tag,
                        pageable
                )
                .map(this::toSummary);
    }

    public SpeciesDetailDto getDetail(String slug) {
        Species species = speciesRepository.findBySlugAndDeletedAtIsNull(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy loài"));
        return toDetail(species);
    }

    public List<SpeciesSummaryDto> getFeatured() {
        List<Species> featured = speciesRepository.findByIsFeaturedTrueAndDeletedAtIsNull();
        // The imported dataset currently has no is_featured=true rows. Until curation
        // is completed, return a deterministic thumbnail-backed set instead of an empty hero.
        if (featured.isEmpty()) {
            featured = speciesRepository.findTop9ByDeletedAtIsNullAndThumbnailUrlIsNotNullOrderByNameAsc();
        }
        return featured.stream()
                .map(this::toSummary)
                .toList();
    }

    public List<SpeciesSummaryDto> getRelated(String slug) {
        Species species = speciesRepository.findBySlugAndDeletedAtIsNull(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy loài"));

        return speciesRepository.findByConservationStatusAndDeletedAtIsNull(species.getConservationStatus()).stream()
                .filter(candidate -> !candidate.getId().equals(species.getId()))
                .limit(8)
                .map(this::toSummary)
                .toList();
    }

    public SpeciesSummaryDto toSummary(Species species) {
        List<SpeciesMediaDto> media = toMedia(species);

        return SpeciesSummaryDto.builder()
                .id(species.getId())
                .name(displayName(species))
                .nameVn(species.getName())
                .nameEn(species.getNameEn())
                .slug(species.getSlug())
                .scientificName(species.getScientificName())
                .category(species.getCategory())
                .habitat(species.getHabitat())
                .habitatType(species.getHabitatTypes())
                .dietType(species.getDietType())
                .activityPattern(species.getActivityPattern())
                .thumbnailUrl(mediaUrlService.resolve(species.getThumbnailUrl()))
                .tags(species.getTags())
                .conservationStatus(species.getConservationStatus())
                .identificationDesc(species.getIdentificationDesc())
                .biologyDesc(species.getBiologyDesc())
                .conservationDesc(species.getConservationDesc())
                .shortDescription(firstNonBlank(
                        species.getIdentificationDesc(),
                        species.getBiologyDesc(),
                        species.getConservationDesc(),
                        species.getDescription()))
                .taxonomy(toTaxonomy(species.getTaxonomy()))
                .media(media)
                .images(media.stream().map(SpeciesMediaDto::getUrl).toList())
                .build();
    }

    private SpeciesDetailDto toDetail(Species species) {
        return SpeciesDetailDto.builder()
                .id(species.getId())
                .name(displayName(species))
                .nameVn(species.getName())
                .nameEn(species.getNameEn())
                .slug(species.getSlug())
                .scientificName(species.getScientificName())
                .category(species.getCategory())
                .habitat(species.getHabitat())
                .habitatType(species.getHabitatTypes())
                .dietType(species.getDietType())
                .activityPattern(species.getActivityPattern())
                .thumbnailUrl(mediaUrlService.resolve(species.getThumbnailUrl()))
                .tags(species.getTags())
                .description(species.getDescription())
                .diet(species.getDiet())
                .conservationStatus(species.getConservationStatus())
                .vnRedListStatus(species.getVnRedListStatus())
                .citesAppendix(species.getCitesAppendix())
                .vnDecreeStatus(species.getVnDecreeStatus())
                .funFacts(species.getFunFacts())
                .galleryUrls(species.getGalleryUrls())
                .authorCitation(species.getAuthorCitation())
                .synonyms(species.getSynonyms())
                .identificationDesc(species.getIdentificationDesc())
                .biologyDesc(species.getBiologyDesc())
                .threatsDesc(species.getThreatsDesc())
                .conservationDesc(species.getConservationDesc())
                .sourceReferences(sourceReferences(species.getSourceReferences()))
                .taxonomy(toTaxonomy(species.getTaxonomy()))
                .media(toMedia(species))
                .ecosystemId(species.getEcosystem() == null ? null : species.getEcosystem().getId())
                .relatedSpeciesIds(species.getRelatedSpeciesIds())
                .lessonIds(species.getLessonIds())
                .build();
    }

    private List<SpeciesMediaDto> toMedia(Species species) {
        List<SpeciesMediaDto> media = species.getMedia().stream()
                .filter(item -> item.getDeletedAt() == null)
                .sorted(Comparator.comparing(SpeciesMedia::isPrimary).reversed()
                        .thenComparing(SpeciesMedia::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toMediaDto)
                .toList();

        if (!media.isEmpty() || isBlank(species.getThumbnailUrl())) return media;

        return List.of(SpeciesMediaDto.builder()
                .type(MediaType.IMAGE)
                .url(mediaUrlService.resolve(species.getThumbnailUrl()))
                .caption(displayName(species))
                .primary(true)
                .build());
    }

    private SpeciesMediaDto toMediaDto(SpeciesMedia media) {
        return SpeciesMediaDto.builder()
                .id(media.getId())
                .type(media.getType())
                .url(mediaUrlService.resolve(media.getUrl()))
                .caption(media.getCaption())
                .primary(media.isPrimary())
                .build();
    }

    private TaxonomyDto toTaxonomy(Taxonomy taxonomy) {
        if (taxonomy == null) return null;

        return TaxonomyDto.builder()
                .id(taxonomy.getId())
                .rank(taxonomy.getRank())
                .scientificName(taxonomy.getScientificName())
                .nameVn(taxonomy.getNameVn())
                .parent(toTaxonomy(taxonomy.getParent()))
                .build();
    }

    private List<Object> sourceReferences(JsonNode sourceReferences) {
        if (sourceReferences == null || !sourceReferences.isArray()) return List.of();
        return LEGACY_JSON_MAPPER.convertValue(sourceReferences, new TypeReference<>() {});
    }

    private String displayName(Species species) {
        return isBlank(species.getName()) ? species.getScientificName() : species.getName();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) return value;
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
