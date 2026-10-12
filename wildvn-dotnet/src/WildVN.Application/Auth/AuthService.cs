using WildVN.Contracts;

namespace WildVN.Application.Auth;

public sealed class AuthService(IAuthStore store, ILegacyPasswordHasher passwords,
    IAuthTokens tokens, ILoginAttemptLimiter attempts)
{
    public async Task<AuthSignIn> LoginAsync(string username, string password, CancellationToken cancellationToken)
    {
        if (!attempts.TryAcquire(username))
            throw new AuthFailure(429, "Vượt quá số lần thử đăng nhập. Vui lòng thử lại sau 1 phút.");
        var account = await store.FindByUsernameAsync(username, cancellationToken);
        var matches = passwords.Verify(password, account?.Provider == "LOCAL" ? account.PasswordHash : null);
        if (account is null || account.Provider != "LOCAL" || !matches)
            throw new AuthFailure(401, "Tên đăng nhập hoặc mật khẩu không đúng");
        return SignIn(account);
    }

    public async Task<AuthSignIn> RegisterAsync(string username, string email, string password,
        CancellationToken cancellationToken)
    {
        var hash = passwords.Hash(password);
        var account = await store.RegisterAsync(username, email, hash, cancellationToken);
        return SignIn(account);
    }

    public async Task<AuthResponse> GetMeAsync(string username, CancellationToken cancellationToken)
    {
        var account = await store.FindByUsernameAsync(username, cancellationToken);
        if (account is null) throw new AuthFailure(401, "Người dùng không tồn tại");
        return new AuthResponse(null, null, account.Profile);
    }

    private AuthSignIn SignIn(AuthAccount account) => new()
    {
        CookieToken = tokens.Issue(account.Profile.Username, account.CredentialVersion),
        Response = new AuthResponse(null, null, account.Profile)
    };
}
