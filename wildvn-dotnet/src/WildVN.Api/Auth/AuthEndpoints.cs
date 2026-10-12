using System.Net;
using System.Security.Claims;
using WildVN.Application.Auth;

namespace WildVN.Api.Auth;

internal static class AuthEndpoints
{
    public static void MapAuth(this WebApplication app)
    {
        app.MapPasswordRecovery();
        app.MapPost("/api/auth/login", Login).RequireRateLimiting("auth-password");
        app.MapPost("/api/auth/register", Register).RequireRateLimiting("auth-password");
        app.MapGet("/api/auth/me", Me);
        app.MapPost("/api/auth/logout", Logout);
        app.MapGet("/api/auth/csrf", (HttpContext context, AuthRuntime runtime) =>
        {
            EnsureAvailable(context, runtime);
            AuthSecurity.Bootstrap(context, runtime);
            return Results.NoContent();
        });
    }

    private static async Task<IResult> Login(LoginRequest request, HttpContext context, AuthRuntime runtime)
    {
        EnsureAvailable(context, runtime);
        AuthRequestValidation.Login(request);
        var result = await context.RequestServices.GetRequiredService<AuthService>()
            .LoginAsync(request.Username!, request.Password!, context.RequestAborted);
        SetSignInCookie(context, runtime, result.CookieToken);
        return Results.Ok(result.Response);
    }

    private static async Task<IResult> Register(RegisterRequest request, HttpContext context, AuthRuntime runtime)
    {
        EnsureAvailable(context, runtime);
        AuthRequestValidation.Register(request);
        var result = await context.RequestServices.GetRequiredService<AuthService>()
            .RegisterAsync(request.Username!, request.Email!, request.Password!, context.RequestAborted);
        SetSignInCookie(context, runtime, result.CookieToken);
        return Results.Ok(result.Response);
    }

    private static async Task<IResult> Me(HttpContext context, AuthRuntime runtime)
    {
        EnsureAvailable(context, runtime);
        if (context.User.Identity?.IsAuthenticated != true) return new EmptyUnauthorized();
        var response = await context.RequestServices.GetRequiredService<AuthService>()
            .GetMeAsync(context.User.FindFirstValue(ClaimTypes.Name)!, context.RequestAborted);
        return Results.Ok(response);
    }

    private static IResult Logout(HttpContext context, AuthRuntime runtime)
    {
        EnsureAvailable(context, runtime);
        context.Response.Cookies.Append(LegacyCookieHandler.CookieName, "", AuthSecurity.Cookie(runtime, TimeSpan.Zero));
        ClearCsrf(context, runtime);
        return Results.Ok();
    }

    private static void SetSignInCookie(HttpContext context, AuthRuntime runtime, string token)
    {
        context.Response.Cookies.Append(LegacyCookieHandler.CookieName, token,
            AuthSecurity.Cookie(runtime, TimeSpan.FromDays(30)));
        ClearCsrf(context, runtime);
    }

    internal static void ClearCsrf(HttpContext context, AuthRuntime runtime)
    {
        context.Response.Cookies.Delete("XSRF-TOKEN", AuthSecurity.Cookie(runtime, httpOnly: false));
        context.Response.Cookies.Delete("WildVN-XSRF", AuthSecurity.Cookie(runtime));
    }

    internal static void EnsureAvailable(HttpContext context, AuthRuntime runtime)
    {
        if (!runtime.Enabled) throw new AuthFailure(503, "Dịch vụ xác thực chưa được cấu hình");
        if (runtime.CookieSecure && !context.Request.IsHttps || !runtime.CookieSecure &&
            (context.Connection.RemoteIpAddress is not { } address || !IPAddress.IsLoopback(address)))
            throw new AuthFailure(400, "Kết nối xác thực phải dùng HTTPS hoặc Development loopback được chọn rõ");
        if (context.Request.Headers.Origin is { Count: > 0 } origins &&
            (origins.Count != 1 || origins[0] != $"{context.Request.Scheme}://{context.Request.Host}" &&
             !runtime.AllowedOrigins.Contains(origins[0]!)))
            throw new AuthFailure(403, "Bạn không có quyền truy cập vào tài nguyên này");
    }

    // Preserve Spring's empty 401 /me; global status pages must not add an error DTO here.
    private sealed class EmptyUnauthorized : IResult
    {
        public Task ExecuteAsync(HttpContext context)
        {
            var statusPages = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IStatusCodePagesFeature>();
            if (statusPages is not null) statusPages.Enabled = false;
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        }
    }
}
