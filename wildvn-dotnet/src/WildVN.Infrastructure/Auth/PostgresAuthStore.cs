using Microsoft.EntityFrameworkCore;
using Npgsql;
using WildVN.Application.Auth;
using WildVN.Infrastructure.Data;

namespace WildVN.Infrastructure.Auth;

public sealed class PostgresAuthStore(WildVnDbContext context) : IAuthStore
{
    public async Task<AuthAccount?> FindByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        // Password hash and version must share one DB statement/snapshot: a reset
        // between separate reads must never pair the old hash with the new version.
        var snapshot = await context.Users.AsNoTracking().Where(row => row.Username == username && row.DeletedAt == null)
            .Select(row => new { User = row, Version = context.CredentialVersions.Where(version => version.UserId == row.Id)
                .Select(version => (Guid?)version.Version).FirstOrDefault() }).SingleOrDefaultAsync(cancellationToken);
        if (snapshot is null) return null;
        var profile = await context.UserProfiles.AsNoTracking().SingleOrDefaultAsync(
            row => row.UserId == snapshot.User.Id, cancellationToken);
        return ToAccount(snapshot.User, profile, snapshot.Version);
    }

    public async Task<AuthAccount> RegisterAsync(string username, string email, string passwordHash,
        CancellationToken cancellationToken)
    {
        if (await context.Users.AnyAsync(row => row.Username == username && row.DeletedAt == null, cancellationToken))
            throw new AuthFailure(409, "Tên người dùng đã tồn tại");
        if (await context.Users.AnyAsync(row => row.Email == email && row.DeletedAt == null, cancellationToken))
            throw new AuthFailure(409, "Email đã được sử dụng");
        // Explicit new IDs link two immutable rows; existing UUIDs and hashes are never rewritten.
        var user = new UserRow { Id = Guid.NewGuid(), Username = username, Email = email,
            PasswordHash = passwordHash, Role = UserRole.USER, AuthProvider = AuthProvider.LOCAL };
        var profile = new UserProfileRow { Id = Guid.NewGuid(), UserId = user.Id, HeadphonePreference = false };
        try
        {
            return await context.InTransactionAsync((db, _) =>
            {
                db.Users.Add(user);
                db.UserProfiles.Add(profile);
                return Task.FromResult(ToAccount(user, profile));
            }, cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation } postgres &&
            postgres.ConstraintName is "users_username_key" or "users_email_key")
        {
            // Handles races and soft-deleted rows still covered by source unique constraints.
            throw new AuthFailure(409, postgres.ConstraintName == "users_username_key"
                ? "Tên người dùng đã tồn tại" : "Email đã được sử dụng");
        }
    }

    private static AuthAccount ToAccount(UserRow user, UserProfileRow? profile, Guid? version = null) => new()
    {
        Provider = user.AuthProvider.ToString(), Role = user.Role.ToString(), PasswordHash = user.PasswordHash,
        CredentialVersion = version,
        Profile = new WildVN.Contracts.UserProfile(user.Id.ToString(), user.Username, user.Email,
            profile?.AvatarUrl, profile?.Bio, profile?.ConservationIdentity, profile?.HeadphonePreference ?? false)
    };
}
