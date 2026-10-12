package com.example.wildvn.domain.species.entity;

import com.example.wildvn.domain.ecosystem.entity.Ecosystem;
import com.example.wildvn.domain.taxonomy.entity.Taxonomy;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "species")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Species {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name_vn", nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "scientific_name", nullable = false, unique = true)
    private String scientificName;

    @Column(name = "name_en")
    private String nameEn;

    private String category;
    private String habitat;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    private String tags;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String diet;

    @Column(name = "conservation_status", nullable = false)
    private String conservationStatus;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "diet_type")
    private DietType dietType;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "habitat_type", columnDefinition = "\"HabitatType\"[]")
    private HabitatType[] habitatTypes;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "activity_pattern")
    private ActivityPattern activityPattern;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "vn_redlist_status")
    private VnRedListStatus vnRedListStatus;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "cites_appendix")
    private CitesAppendix citesAppendix;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "vn_decree_status")
    private VnDecreeStatus vnDecreeStatus;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "publish_status", nullable = false)
    private PublishStatus publishStatus;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_references", columnDefinition = "jsonb")
    private JsonNode sourceReferences;

    @Column(columnDefinition = "TEXT")
    private String funFacts;

    @Column(columnDefinition = "TEXT")
    private String galleryUrls;

    @Column(name = "author_citation")
    private String authorCitation;

    @Column(columnDefinition = "text[]")
    private String[] synonyms;

    @Column(name = "identification_desc", columnDefinition = "TEXT")
    private String identificationDesc;

    @Column(name = "biology_desc", columnDefinition = "TEXT")
    private String biologyDesc;

    @Column(name = "threats_desc", columnDefinition = "TEXT")
    private String threatsDesc;

    @Column(name = "conservation_desc", columnDefinition = "TEXT")
    private String conservationDesc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ecosystem_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Ecosystem ecosystem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxonomy_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Taxonomy taxonomy;

    @OneToMany(mappedBy = "species", fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<SpeciesMedia> media = new ArrayList<>();

    private String relatedSpeciesIds;
    private String lessonIds;
    
    @Column(name = "is_featured", nullable = false)
    private Boolean isFeatured;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (isFeatured == null) isFeatured = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
