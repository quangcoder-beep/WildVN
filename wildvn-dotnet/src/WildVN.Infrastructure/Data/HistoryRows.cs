using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WildVN.Infrastructure.Data;

// Storage rows mirror the source-derived legacy schema; relationships and keys are configured separately.

[Table("chat_sessions", Schema = "public")]
public sealed class ChatSessionRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("user_id", TypeName = "UUID")]
    public Guid UserId { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }

    [Column("expires_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset ExpiresAt { get; init; }
}

[Table("chat_messages", Schema = "public")]
public sealed class ChatMessageRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("session_id", TypeName = "UUID")]
    public Guid SessionId { get; init; }

    [Column("role", TypeName = "VARCHAR(20)")]
    [Required]
    [MaxLength(20)]
    public string Role { get; init; } = string.Empty;

    [Column("content", TypeName = "TEXT")]
    [Required]
    public string Content { get; init; } = string.Empty;

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }
}

[Table("sync_failures", Schema = "public")]
public sealed class SyncFailureRow
{
    [Column("id", TypeName = "UUID")]
    public Guid Id { get; init; }

    [Column("created_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset CreatedAt { get; init; }

    [Column("entity_id", TypeName = "UUID")]
    public Guid EntityId { get; init; }

    [Column("entity_type", TypeName = "VARCHAR(50)")]
    [Required]
    [MaxLength(50)]
    public string EntityType { get; init; } = string.Empty;

    [Column("error_message", TypeName = "TEXT")]
    public string? ErrorMessage { get; init; }

    [Column("resolved", TypeName = "BOOLEAN")]
    public bool? Resolved { get; init; } = false;

    [Column("retry_count", TypeName = "INTEGER")]
    public int? RetryCount { get; init; } = 0;

    [Column("target", TypeName = "VARCHAR(50)")]
    [Required]
    [MaxLength(50)]
    public string Target { get; init; } = string.Empty;

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }
}

[Table("search_suggestions_popularity", Schema = "public")]
public sealed class SearchSuggestionPopularityRow
{
    [Column("query", TypeName = "VARCHAR(500)")]
    [Required]
    [MaxLength(500)]
    public string Query { get; init; } = string.Empty;

    [Column("click_count", TypeName = "BIGINT")]
    public long? ClickCount { get; init; } = 0;

    [Column("search_count", TypeName = "BIGINT")]
    public long? SearchCount { get; init; } = 0;

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }
}

[Table("user_affinities", Schema = "public")]
public sealed class UserAffinityRow
{
    [Column("entity_type", TypeName = "VARCHAR(50)")]
    [Required]
    [MaxLength(50)]
    public string EntityType { get; init; } = string.Empty;

    [Column("entity_value", TypeName = "VARCHAR(255)")]
    [Required]
    [MaxLength(255)]
    public string EntityValue { get; init; } = string.Empty;

    [Column("user_id", TypeName = "UUID")]
    public Guid UserId { get; init; }

    [Column("score", TypeName = "NUMERIC(5, 4)")]
    public decimal? Score { get; init; }

    [Column("updated_at", TypeName = "TIMESTAMPTZ")]
    public DateTimeOffset UpdatedAt { get; init; }
}
