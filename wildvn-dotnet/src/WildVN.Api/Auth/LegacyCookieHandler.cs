using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using WildVN.Application.Auth;

namespace WildVN.Api.Auth;

internal sealed class LegacyCookieHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger, UrlEncoder encoder, AuthRuntime runtime)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "WildVnJwtCookie";
    public const string CookieName = "wildvn-auth-token";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!runtime.Enabled || Request.Path.StartsWithSegments("/health") ||
            HttpMethods.IsPost(Request.Method) && IsPublicPost(Request.Path) ||
            !Request.Cookies.TryGetValue(CookieName, out var token))
            return AuthenticateResult.NoResult();
        var username = Context.RequestServices.GetRequiredService<IAuthTokens>().ReadUsername(token);
        if (username is null) return AuthenticateResult.Fail("Invalid or expired authentication cookie.");
        // Role is loaded from current DB state, never trusted from JWT payload or request.
        var account = await Context.RequestServices.GetRequiredService<IAuthStore>()
            .FindByUsernameAsync(username, Context.RequestAborted);
        if (account is null || !Context.RequestServices.GetRequiredService<IAuthTokens>()
            .MatchesCredentialVersion(token, account.CredentialVersion))
            return AuthenticateResult.Fail("Account or credential version unavailable.");
        var identity = new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, account.Profile.Id),
            new Claim(ClaimTypes.Name, account.Profile.Username),
            new Claim(ClaimTypes.Role, "ROLE_" + account.Role)], SchemeName);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName));
    }

    private static bool IsPublicPost(PathString path) => path.Value?.TrimEnd('/').ToLowerInvariant() is
        "/api/auth/logout" or "/api/auth/forgot-password" or "/api/auth/reset-password";

    protected override Task HandleChallengeAsync(AuthenticationProperties properties) =>
        AuthErrors.Result(Context, 401, "Vui lòng đăng nhập để tiếp tục").ExecuteAsync(Context);

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties) =>
        AuthErrors.Result(Context, 403, "Bạn không có quyền truy cập vào tài nguyên này").ExecuteAsync(Context);
}
