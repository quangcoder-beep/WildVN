using Microsoft.EntityFrameworkCore;
using WildVN.Application.Auth;
using WildVN.Infrastructure.Data;

namespace WildVN.Infrastructure.Auth;

public sealed class PostgresPasswordRecoveryStore(WildVnDbContext context, TimeProvider clock) : IPasswordRecoveryStore
{
    public async Task<ResetRecipient?> FindRecipientAsync(string email, CancellationToken cancellationToken)
    {
        var normalized = email.ToLowerInvariant();
        var users = await context.Users.AsNoTracking().Where(row => row.Email.ToLower() == normalized &&
            row.DeletedAt == null && row.AuthProvider == AuthProvider.LOCAL && row.PasswordHash != null)
            .Take(2).ToListAsync(cancellationToken);
        if (users.Count != 1) return null; // Ambiguous legacy case variants must not select an arbitrary account.
        return new ResetRecipient { UserId = users[0].Id, Email = users[0].Email,
            PasswordFingerprint = Fingerprint(users[0]) };
    }

    public async Task QueueAsync(ResetRecipient recipient, string tokenHash, string encryptedMail,
        DateTimeOffset now, DateTimeOffset expires, CancellationToken cancellationToken)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        // Serialize requests/resets for this user; interpolation is parameterized by EF.
        var user = await LockedUser(recipient.UserId, cancellationToken);
        if (user is null || Fingerprint(user) != recipient.PasswordFingerprint) return;
        now = clock.GetUtcNow();
        expires = now.AddMinutes(15);
        if (await context.PasswordResetRequests.AnyAsync(row => row.UserId == user.Id &&
            row.CreatedAt > now.AddMinutes(-1), cancellationToken)) return;
        context.PasswordResetRequests.Add(new PasswordResetRow { TokenHash = tokenHash, UserId = user.Id,
            PasswordFingerprint = recipient.PasswordFingerprint, CreatedAt = now, ExpiresAt = expires });
        context.PasswordResetOutbox.Add(new PasswordResetMailRow { Id = Guid.NewGuid(), TokenHash = tokenHash,
            EncryptedPayload = encryptedMail, CreatedAt = now, NextAttemptAt = now });
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task ResetAsync(string tokenHash, string passwordHash, DateTimeOffset now, CancellationToken cancellationToken)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        var request = await context.PasswordResetRequests.AsNoTracking().SingleOrDefaultAsync(row =>
            row.TokenHash == tokenHash && row.ConsumedAt == null && row.ExpiresAt > now, cancellationToken);
        if (request is null) throw Invalid();
        var user = await LockedUser(request.UserId, cancellationToken);
        if (user is null || Fingerprint(user) != request.PasswordFingerprint) throw Invalid();
        now = clock.GetUtcNow(); // Recheck expiry after hashing and waiting for the user lock.
        var claimed = await context.PasswordResetRequests.Where(row => row.TokenHash == tokenHash &&
            row.ConsumedAt == null && row.ExpiresAt > now).ExecuteUpdateAsync(update =>
                update.SetProperty(row => row.ConsumedAt, now), cancellationToken);
        if (claimed != 1) throw Invalid();
        await context.Users.Where(row => row.Id == user.Id).ExecuteUpdateAsync(update =>
            update.SetProperty(row => row.PasswordHash, passwordHash).SetProperty(row => row.UpdatedAt, now), cancellationToken);
        await RotateVersion(user.Id, now, cancellationToken);
        await context.UserSessions.Where(row => row.UserId == user.Id && row.RevokedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(row => row.RevokedAt, now), cancellationToken);
        await context.PasswordResetRequests.Where(row => row.UserId == user.Id && row.ConsumedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(row => row.ConsumedAt, now), cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private async Task RotateVersion(Guid userId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var version = Guid.NewGuid();
        var changed = await context.CredentialVersions.Where(row => row.UserId == userId).ExecuteUpdateAsync(update =>
            update.SetProperty(row => row.Version, version).SetProperty(row => row.ChangedAt, now), cancellationToken);
        if (changed == 0) context.CredentialVersions.Add(new CredentialVersionRow { UserId = userId,
            Version = version, ChangedAt = now });
    }

    private Task<UserRow?> LockedUser(Guid id, CancellationToken cancellationToken) => context.Users.FromSqlInterpolated(
        $"SELECT * FROM public.users WHERE id = {id} AND deleted_at IS NULL AND auth_provider = 'LOCAL'::public.auth_provider AND password_hash IS NOT NULL FOR UPDATE")
        .AsNoTracking().SingleOrDefaultAsync(cancellationToken);

    // Email changes also invalidate previously queued links, even when the password is unchanged.
    private static string Fingerprint(UserRow user) => PasswordRecoveryService.Hash(user.PasswordHash + "\0" + user.Email);

    private static AuthFailure Invalid() => new(400, PasswordRecoveryService.InvalidToken);
}
