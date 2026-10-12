using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WildVN.Infrastructure.Data;

// Storage rows mirror the source-derived legacy schema; relationships and keys are configured separately.

[Table("users", Schema = "public")]
public sealed class UserRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("username", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string Username { get; init; } = string.Empty;

    [Column("email", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string Email { get; init; } = string.Empty;

    [Column("password_hash", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? PasswordHash { get; init; }

    [Column("auth_provider", TypeName = "auth_provider")]
    public AuthProvider AuthProvider { get; init; }

    [Column("provider_id", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? ProviderId { get; init; }

    [Column("role", TypeName = "user_role")]
    public UserRole Role { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }

    [Column("deleted_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset? DeletedAt { get; init; }
}

[Table("user_profiles", Schema = "public")]
public sealed class UserProfileRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("user_id", TypeName = "UUID")]
    public Guid UserId { get; init; }

    [Column("avatar_url", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? AvatarUrl { get; init; }

    [Column("bio", TypeName = "TEXT")]
    public string? Bio { get; init; }

    [Column("conservation_identity", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? ConservationIdentity { get; init; }

    [Column("headphone_preference", TypeName = "BOOLEAN")]
    public bool HeadphonePreference { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }
}

[Table("ranks", Schema = "public")]
public sealed class RankRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("icon_url", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? IconUrl { get; init; }

    [Column("max_xp", TypeName = "INTEGER")]
    public int? MaxXp { get; init; }

    [Column("min_xp", TypeName = "INTEGER")]
    public int MinXp { get; init; }

    [Column("name", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string Name { get; init; } = string.Empty;

    [Column("name_vn", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string NameVn { get; init; } = string.Empty;

    [Column("slug", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string Slug { get; init; } = string.Empty;

    [Column("sort_order", TypeName = "SMALLINT")]
    public short SortOrder { get; init; }
}

[Table("user_sessions", Schema = "public")]
public sealed class UserSessionRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("device_info", TypeName = "JSONB")]
    public string? DeviceInfo { get; init; }

    [Column("expires_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset ExpiresAt { get; init; }

    [Column("ip_address", TypeName = "VARCHAR(255)")]
    [MaxLength(255)]
    public string? IpAddress { get; init; }

    [Column("refresh_token_hash", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string RefreshTokenHash { get; init; } = string.Empty;

    [Column("revoked_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset? RevokedAt { get; init; }

    [Column("user_id", TypeName = "UUID")]
    public Guid UserId { get; init; }
}

[Table("user_favorites", Schema = "public")]
public sealed class FavoriteRow
{
    [Column("user_id", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string UserId { get; init; } = string.Empty;

    [Column("species_id", TypeName = "UUID")]
    public Guid SpeciesId { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }
}

[Table("academy_progress", Schema = "public")]
public sealed class AcademyProgressRow
{
    [Column("user_id", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string UserId { get; init; } = string.Empty;

    [Column("rp_points", TypeName = "INTEGER")]
    public int RpPoints { get; init; }

    [Column("streak_days", TypeName = "INTEGER")]
    public int StreakDays { get; init; }

    [Column("unlocked_species", TypeName = "JSONB")]
    [Required]
    public string UnlockedSpecies { get; init; } = "[]";

    [Column("last_active_date", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset LastActiveDate { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }

    [Column("completed_expeditions", TypeName = "JSONB")]
    [Required]
    public string CompletedExpeditions { get; init; } = "[]";
}
