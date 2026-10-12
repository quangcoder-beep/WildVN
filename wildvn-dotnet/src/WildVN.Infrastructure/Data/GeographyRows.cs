using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WildVN.Infrastructure.Data;

// Storage rows mirror the source-derived legacy schema; relationships and keys are configured separately.

[Table("locations", Schema = "public")]
public sealed class LocationRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("name", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string Name { get; init; } = string.Empty;

    [Column("type", TypeName = "\"LocationType\"")]
    public LocationType Type { get; init; }

    [Column("latitude", TypeName = "DOUBLE PRECISION")]
    public double? Latitude { get; init; }

    [Column("longitude", TypeName = "DOUBLE PRECISION")]
    public double? Longitude { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }

    [Column("deleted_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset? DeletedAt { get; init; }

    [Column("climate", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? Climate { get; init; }

    [Column("description", TypeName = "TEXT")]
    public string? Description { get; init; }

    [Column("gallery_urls", TypeName = "JSONB")]
    public string? GalleryUrls { get; init; } = "[]";

    [Column("location_description", TypeName = "TEXT")]
    public string? LocationDescription { get; init; }

    [Column("region", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? Region { get; init; }

    [Column("slug", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string Slug { get; init; } = string.Empty;

    [Column("threats", TypeName = "TEXT")]
    public string? Threats { get; init; }

    [Column("thumbnail_url", TypeName = "TEXT")]
    public string? ThumbnailUrl { get; init; }
}

[Table("species_locations", Schema = "public")]
public sealed class SpeciesLocationRow
{
    [Column("species_id", TypeName = "UUID")]
    public Guid SpeciesId { get; init; }

    [Column("location_id", TypeName = "UUID")]
    public Guid LocationId { get; init; }

    [Column("distribution_type", TypeName = "\"DistributionType\"")]
    public DistributionType DistributionType { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }
}

[Table("conservation_history", Schema = "public")]
public sealed class ConservationHistoryRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("species_id", TypeName = "UUID")]
    public Guid SpeciesId { get; init; }

    [Column("old_status", TypeName = "\"ConservationStatus\"")]
    public ConservationStatus? OldStatus { get; init; }

    [Column("new_status", TypeName = "\"ConservationStatus\"")]
    public ConservationStatus NewStatus { get; init; }

    [Column("changed_at", TypeName = "DATE")]
    public DateOnly ChangedAt { get; init; }

    [Column("source", TypeName = "TEXT")]
    [Required]
    public string Source { get; init; } = string.Empty;

    [Column("notes", TypeName = "TEXT")]
    public string? Notes { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }
}
