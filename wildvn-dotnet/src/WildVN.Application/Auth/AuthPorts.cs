using WildVN.Contracts;

namespace WildVN.Application.Auth;

// Classes avoid generated ToString exposing credentials or JWTs.
public sealed class AuthAccount
{
    public required UserProfile Profile { get; init; }
    public string? PasswordHash { get; init; }
    public required string Provider { get; init; }
    public required string Role { get; init; }
    public Guid? CredentialVersion { get; init; }
}

public sealed class AuthSignIn
{
    public required string CookieToken { get; init; }
    public required AuthResponse Response { get; init; }
}

public interface IAuthStore
{
    Task<AuthAccount?> FindByUsernameAsync(string username, CancellationToken cancellationToken);
    Task<AuthAccount> RegisterAsync(string username, string email, string passwordHash, CancellationToken cancellationToken);
}

public interface ILegacyPasswordHasher
{
    bool Verify(string password, string? encodedHash);
    string Hash(string password);
}

public interface IAuthTokens
{
    string Issue(string username, Guid? credentialVersion = null);
    string? ReadUsername(string token);
    bool MatchesCredentialVersion(string token, Guid? credentialVersion);
}

public interface ILoginAttemptLimiter
{
    bool TryAcquire(string username);
}

public sealed class AuthFailure(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
