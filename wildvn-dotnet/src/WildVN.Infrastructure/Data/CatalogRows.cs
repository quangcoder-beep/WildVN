using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WildVN.Infrastructure.Data;

// Storage rows mirror the source-derived legacy schema; relationships and keys are configured separately.

[Table("taxonomy", Schema = "public")]
public sealed class TaxonomyRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("parent_id", TypeName = "UUID")]
    public Guid? ParentId { get; init; }

    [Column("rank", TypeName = "\"TaxonomyRank\"")]
    public TaxonomyRank Rank { get; init; }

    [Column("scientific_name", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string ScientificName { get; init; } = string.Empty;

    [Column("name_vn", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? NameVn { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }

    [Column("deleted_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset? DeletedAt { get; init; }
}

[Table("ecosystems", Schema = "public")]
public sealed class EcosystemRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("climate", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? Climate { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("description", TypeName = "TEXT")]
    public string? Description { get; init; }

    [Column("gallery_urls", TypeName = "TEXT")]
    public string? GalleryUrls { get; init; }

    [Column("location_description", TypeName = "TEXT")]
    public string? LocationDescription { get; init; }

    [Column("name", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string Name { get; init; } = string.Empty;

    [Column("region", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? Region { get; init; }

    [Column("slug", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string Slug { get; init; } = string.Empty;

    [Column("species_count", TypeName = "INTEGER")]
    public int SpeciesCount { get; init; }

    [Column("threats", TypeName = "TEXT")]
    public string? Threats { get; init; }

    [Column("thumbnail_url", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? ThumbnailUrl { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }
}

[Table("species", Schema = "public")]
public sealed class SpeciesRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("taxonomy_id", TypeName = "UUID")]
    public Guid TaxonomyId { get; init; }

    [Column("slug", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string Slug { get; init; } = string.Empty;

    [Column("scientific_name", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string ScientificName { get; init; } = string.Empty;

    [Column("name_vn", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string NameVn { get; init; } = string.Empty;

    [Column("name_en", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? NameEn { get; init; }

    [Column("author_citation", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? AuthorCitation { get; init; }

    [Column("synonyms", TypeName = "TEXT[]")]
    public string[]? Synonyms { get; init; } = Array.Empty<string>();

    [Column("identification_desc", TypeName = "TEXT")]
    public string? IdentificationDesc { get; init; }

    [Column("biology_desc", TypeName = "TEXT")]
    public string? BiologyDesc { get; init; }

    [Column("threats_desc", TypeName = "TEXT")]
    public string? ThreatsDesc { get; init; }

    [Column("conservation_desc", TypeName = "TEXT")]
    public string? ConservationDesc { get; init; }

    [Column("diet_type", TypeName = "\"DietType\"")]
    public DietType? DietType { get; init; }

    [Column("habitat_type", TypeName = "\"HabitatType\"[]")]
    public HabitatType[]? HabitatType { get; init; } = Array.Empty<HabitatType>();

    [Column("activity_pattern", TypeName = "\"ActivityPattern\"")]
    public ActivityPattern? ActivityPattern { get; init; }

    [Column("conservation_status", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string ConservationStatus { get; init; } = string.Empty;

    [Column("vn_redlist_status", TypeName = "\"VnRedListStatus\"")]
    public VnRedListStatus? VnRedlistStatus { get; init; }

    [Column("cites_appendix", TypeName = "\"CitesAppendix\"")]
    public CitesAppendix? CitesAppendix { get; init; } = global::WildVN.Infrastructure.Data.CitesAppendix.NONE;

    [Column("vn_decree_status", TypeName = "\"VnDecreeStatus\"")]
    public VnDecreeStatus? VnDecreeStatus { get; init; } = global::WildVN.Infrastructure.Data.VnDecreeStatus.NONE;

    [Column("publish_status", TypeName = "\"PublishStatus\"")]
    public PublishStatus PublishStatus { get; init; }

    [Column("source_references", TypeName = "JSONB")]
    public string? SourceReferences { get; init; } = "[]";

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }

    [Column("deleted_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset? DeletedAt { get; init; }

    [Column("is_featured", TypeName = "BOOLEAN")]
    public bool IsFeatured { get; init; }

    [Column("category", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? Category { get; init; }

    [Column("description", TypeName = "TEXT")]
    public string? Description { get; init; }

    [Column("diet", TypeName = "TEXT")]
    public string? Diet { get; init; }

    [Column("fun_facts", TypeName = "TEXT")]
    public string? FunFacts { get; init; }

    [Column("gallery_urls", TypeName = "TEXT")]
    public string? GalleryUrls { get; init; }

    [Column("habitat", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? Habitat { get; init; }

    [Column("lesson_ids", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? LessonIds { get; init; }

    [Column("related_species_ids", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? RelatedSpeciesIds { get; init; }

    [Column("tags", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? Tags { get; init; }

    [Column("thumbnail_url", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? ThumbnailUrl { get; init; }

    [Column("ecosystem_id", TypeName = "UUID")]
    public Guid? EcosystemId { get; init; }
}

[Table("species_media", Schema = "public")]
public sealed class SpeciesMediaRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("species_id", TypeName = "UUID")]
    public Guid SpeciesId { get; init; }

    [Column("type", TypeName = "\"MediaType\"")]
    public MediaType Type { get; init; }

    [Column("url", TypeName = "TEXT")]
    [Required]
    public string Url { get; init; } = string.Empty;

    [Column("caption", TypeName = "TEXT")]
    public string? Caption { get; init; }

    [Column("is_primary", TypeName = "BOOLEAN")]
    public bool IsPrimary { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }

    [Column("deleted_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset? DeletedAt { get; init; }
}
