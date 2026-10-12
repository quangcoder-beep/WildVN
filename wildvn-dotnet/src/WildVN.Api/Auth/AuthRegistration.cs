using System.Collections.Frozen;
using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.RateLimiting;
using WildVN.Application.Auth;
using WildVN.Infrastructure.Auth;
using WildVN.Infrastructure.Data;

namespace WildVN.Api.Auth;

public sealed class AuthRuntime
{
    public bool Enabled { get; init; }
    public bool CookieSecure { get; init; } = true;
    public SameSiteMode CookieSameSite { get; init; } = SameSiteMode.Lax;
    public IReadOnlySet<string> AllowedOrigins { get; init; } = new HashSet<string>();
}

internal static class AuthRegistration
{
    public static void AddWildVnAuth(this WebApplicationBuilder builder)
    {
        var section = builder.Configuration.GetSection("Auth");
        var enabled = section.GetValue<bool>("Enabled");
        var secure = section.GetValue("CookieSecure", true);
        var site = section.GetValue("CookieSameSite", "Lax");
        if (!Enum.TryParse<SameSiteMode>(site, false, out var sameSite) ||
            sameSite is not (SameSiteMode.Lax or SameSiteMode.Strict or SameSiteMode.None) ||
            sameSite == SameSiteMode.None && !secure)
            throw new InvalidOperationException("Auth cookie SameSite must be Lax, Strict or secure None.");
        if (!secure && !builder.Environment.IsDevelopment())
            throw new InvalidOperationException("Insecure auth cookies are restricted to Development loopback.");
        var origins = ReadOrigins(section);
        var runtime = new AuthRuntime { Enabled = enabled, CookieSecure = secure, CookieSameSite = sameSite,
            AllowedOrigins = origins };
        builder.Services.AddSingleton(runtime);
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddAuthentication(LegacyCookieHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, LegacyCookieHandler>(LegacyCookieHandler.SchemeName, _ => { });
        builder.Services.AddAuthorization(options => options.AddPolicy("Admin", policy =>
            policy.RequireAuthenticatedUser().RequireRole("ROLE_ADMIN")));
        builder.Services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-XSRF-TOKEN";
            options.Cookie.Name = "WildVN-XSRF";
            options.Cookie.HttpOnly = true;
            options.Cookie.Path = "/";
            options.Cookie.SameSite = sameSite;
            options.Cookie.SecurePolicy = secure ? CookieSecurePolicy.Always : CookieSecurePolicy.None;
        });
        AddRateLimits(builder.Services);
        builder.Services.AddCors(options => options.AddPolicy("AuthOrigins", policy =>
        {
            if (origins.Count > 0) policy.WithOrigins(origins.ToArray()).WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .WithHeaders("Content-Type", "X-XSRF-TOKEN").AllowCredentials();
        }));
        if (enabled) AddEnabledServices(builder.Services, section);
        builder.AddPasswordRecovery(enabled);
    }

    private static void AddEnabledServices(IServiceCollection services, IConfiguration section)
    {
        if (section.GetValue<int?>("ReplicaCount") != 1)
            throw new InvalidOperationException("Auth requires explicit ReplicaCount=1 until shared throttling is implemented.");
        var connection = section["DatabaseConnection"] ?? throw new InvalidOperationException("Auth database connection is required.");
        var options = PostgresConfiguration.CreateOptions(connection);
        var settings = new LegacyJwtSettings
        {
            CurrentKeyBase64 = section["JwtCurrentKeyBase64"] ?? throw new InvalidOperationException("Auth JWT key is required."),
            LegacyAcceptUntil = Deadline(section["JwtLegacyAcceptUntil"]),
            PreviousKeyBase64 = section["JwtPreviousKeyBase64"],
            PreviousKeyAcceptUntil = section["JwtPreviousKeyAcceptUntil"] is { } deadline ? Deadline(deadline) : null
        };
        // Validate keys/deadlines at startup; this does not open a DB connection.
        services.AddSingleton<IAuthTokens>(new LegacyJwtTokens(settings, TimeProvider.System));
        services.AddScoped(_ => new WildVnDbContext(options));
        services.AddScoped<IAuthStore, PostgresAuthStore>();
        services.AddSingleton<ILegacyPasswordHasher, LegacyArgon2PasswordVerifier>();
        services.AddSingleton<ILoginAttemptLimiter, LoginAttemptLimiter>();
        services.AddScoped<AuthService>();
    }

    private static DateTimeOffset Deadline(string? value)
    {
        if (!DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var result) ||
            result == default || result.Offset != TimeSpan.Zero)
            throw new InvalidOperationException("JWT acceptance deadlines must be explicit UTC timestamps.");
        return result;
    }

    private static IReadOnlySet<string> ReadOrigins(IConfiguration section)
    {
        var values = section.GetSection("AllowedOrigins").Get<string[]>() ?? [];
        foreach (var value in values)
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme is not "https" and not "http" ||
                uri.UserInfo.Length != 0 || value.Contains('*') || value != uri.GetLeftPart(UriPartial.Authority) ||
                uri.Scheme == "http" && !uri.IsLoopback)
                throw new InvalidOperationException("Auth origins must be exact HTTPS origins or HTTP loopback origins.");
        return values.ToFrozenSet(StringComparer.Ordinal);
    }

    private static void AddRateLimits(IServiceCollection services) => services.AddRateLimiter(options =>
    {
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            !context.Request.Path.StartsWithSegments("/api") ? RateLimitPartition.GetNoLimiter("health") :
            RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ =>
                new FixedWindowRateLimiterOptions { PermitLimit = 100, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
        options.AddConcurrencyLimiter("auth-password", limiter => { limiter.PermitLimit = 2; limiter.QueueLimit = 0; });
        options.OnRejected = async (context, _) => await AuthErrors.Result(context.HttpContext, 429,
            "Vượt quá số lần thử đăng nhập. Vui lòng thử lại sau 1 phút.").ExecuteAsync(context.HttpContext);
    });
}
