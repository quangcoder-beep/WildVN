using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WildVN.Infrastructure.Data;

[Table("password_reset_requests", Schema = "public")]
public sealed class PasswordResetRow
{
    [Column("token_hash"), MaxLength(64)] public required string TokenHash { get; init; }
    [Column("user_id")] public Guid UserId { get; init; }
    [Column("password_fingerprint"), MaxLength(64)] public required string PasswordFingerprint { get; init; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; init; }
    [Column("expires_at")] public DateTimeOffset ExpiresAt { get; init; }
    [Column("consumed_at")] public DateTimeOffset? ConsumedAt { get; init; }
}

[Table("password_reset_outbox", Schema = "public")]
public sealed class PasswordResetMailRow
{
    [Column("id")] public Guid Id { get; init; }
    [Column("token_hash"), MaxLength(64)] public required string TokenHash { get; init; }
    [Column("encrypted_payload")] public required string EncryptedPayload { get; init; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; init; }
    [Column("next_attempt_at")] public DateTimeOffset NextAttemptAt { get; init; }
    [Column("lease_until")] public DateTimeOffset? LeaseUntil { get; init; }
    [Column("delivered_at")] public DateTimeOffset? DeliveredAt { get; init; }
    [Column("attempts")] public int Attempts { get; init; }
}

[Table("auth_credential_versions", Schema = "public")]
public sealed class CredentialVersionRow
{
    [Column("user_id")] public Guid UserId { get; init; }
    [Column("version")] public Guid Version { get; init; }
    [Column("changed_at")] public DateTimeOffset ChangedAt { get; init; }
}

internal static class PasswordRecoveryMappings
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<PasswordResetRow>().HasKey(row => row.TokenHash);
        model.Entity<PasswordResetRow>().HasOne<UserRow>().WithMany().HasForeignKey(row => row.UserId).OnDelete(DeleteBehavior.Cascade);
        model.Entity<PasswordResetRow>().HasIndex(row => new { row.UserId, row.CreatedAt }).IsDescending(false, true);
        model.Entity<PasswordResetRow>().HasIndex(row => row.ExpiresAt);
        model.Entity<PasswordResetMailRow>().HasKey(row => row.Id);
        model.Entity<PasswordResetMailRow>().HasOne<PasswordResetRow>().WithMany().HasForeignKey(row => row.TokenHash).OnDelete(DeleteBehavior.Cascade);
        model.Entity<PasswordResetMailRow>().HasIndex(row => row.NextAttemptAt).HasFilter("delivered_at IS NULL");
        model.Entity<CredentialVersionRow>().HasKey(row => row.UserId);
        model.Entity<CredentialVersionRow>().Property(row => row.UserId).ValueGeneratedNever();
        model.Entity<CredentialVersionRow>().HasOne<UserRow>().WithMany().HasForeignKey(row => row.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
