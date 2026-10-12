using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using WildVN.Application.Auth;

namespace WildVN.Infrastructure.Auth;

public sealed class LegacyJwtSettings
{
    public required string CurrentKeyBase64 { get; init; }
    public required DateTimeOffset LegacyAcceptUntil { get; init; }
    public string? PreviousKeyBase64 { get; init; }
    public DateTimeOffset? PreviousKeyAcceptUntil { get; init; }
}

public sealed class LegacyJwtTokens : IAuthTokens
{
    private sealed record Key(SymmetricSecurityKey Value, string Algorithm);
    private readonly Key current;
    private readonly Key? previous;
    private readonly DateTimeOffset legacyUntil;
    private readonly DateTimeOffset? previousUntil;
    private readonly TimeProvider clock;
    private readonly JwtSecurityTokenHandler handler = new() { MapInboundClaims = false, MaximumTokenSizeInBytes = 4096 };
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(30);

    public LegacyJwtTokens(LegacyJwtSettings settings, TimeProvider clock)
    {
        this.clock = clock;
        var now = clock.GetUtcNow();
        if (settings.LegacyAcceptUntil.Offset != TimeSpan.Zero || settings.LegacyAcceptUntil > now + Lifetime)
            throw new ArgumentException("Legacy JWT acceptance needs a finite UTC deadline within 30 days.");
        current = ReadKey(settings.CurrentKeyBase64);
        legacyUntil = settings.LegacyAcceptUntil;
        if ((settings.PreviousKeyBase64 is null) != (settings.PreviousKeyAcceptUntil is null))
            throw new ArgumentException("Previous JWT key and its UTC deadline must be supplied together.");
        if (settings.PreviousKeyBase64 is not null)
        {
            if (settings.PreviousKeyAcceptUntil!.Value.Offset != TimeSpan.Zero || settings.PreviousKeyAcceptUntil > now + Lifetime)
                throw new ArgumentException("Previous JWT key acceptance needs a finite UTC deadline within 30 days.");
            previous = ReadKey(settings.PreviousKeyBase64);
            previousUntil = settings.PreviousKeyAcceptUntil;
        }
    }

    public string Issue(string username, Guid? credentialVersion = null)
    {
        if (string.IsNullOrWhiteSpace(username) || username.Length > 255) throw new ArgumentException("Username is invalid.");
        var now = clock.GetUtcNow().ToUnixTimeSeconds();
        var payload = new JwtPayload { ["sub"] = username, ["iat"] = now, ["exp"] = now + (long)Lifetime.TotalSeconds };
        if (credentialVersion is { } version) payload["pwdv"] = version.ToString("D");
        var header = new JwtHeader(new SigningCredentials(current.Value, current.Algorithm)) { ["kid"] = "wildvn-v1" };
        return handler.WriteToken(new JwtSecurityToken(header, payload));
    }

    public string? ReadUsername(string token)
    {
        if (string.IsNullOrEmpty(token) || token.Length > 4096) return null;
        try
        {
            var jwt = handler.ReadJwtToken(token);
            var now = clock.GetUtcNow();
            if (jwt.Header.Kid is not null and not "wildvn-v1" || jwt.Header.Kid is null && now >= legacyUntil) return null;
            var keys = previous is not null && now < previousUntil ? new[] { current, previous } : new[] { current };
            foreach (var key in keys)
                if (Validate(token, jwt, key, now) is { } subject) return subject;
        }
        catch (Exception exception) when (exception is ArgumentException or SecurityTokenException) { }
        return null;
    }

    public bool MatchesCredentialVersion(string token, Guid? credentialVersion)
    {
        // Revalidate signature/lifetime; an untrusted decoded claim cannot authorize a session.
        if (ReadUsername(token) is null) return false;
        var payload = handler.ReadJwtToken(token).Payload;
        if (credentialVersion is null) return !payload.ContainsKey("pwdv");
        return payload.TryGetValue("pwdv", out var value) && value is string text &&
            Guid.TryParseExact(text, "D", out var parsed) && parsed == credentialVersion;
    }

    private string? Validate(string token, JwtSecurityToken jwt, Key key, DateTimeOffset now)
    {
        if (jwt.Header.Alg != key.Algorithm) return null;
        try
        {
            var parameters = new TokenValidationParameters { IssuerSigningKey = key.Value,
                ValidAlgorithms = [key.Algorithm], ValidateIssuerSigningKey = true, RequireSignedTokens = true,
                ValidateIssuer = false, ValidateAudience = false, RequireExpirationTime = true,
                ValidateLifetime = true, ClockSkew = TimeSpan.Zero,
                LifetimeValidator = (notBefore, expires, _, _) => expires is not null &&
                    expires.Value > now.UtcDateTime && (notBefore is null || notBefore <= now.UtcDateTime) };
            handler.ValidateToken(token, parameters, out _);
            if (!TryNumber(jwt.Payload, "iat", out var issued) || !TryNumber(jwt.Payload, "exp", out var expires) ||
                issued > now.ToUnixTimeSeconds() || expires <= issued ||
                issued > long.MaxValue - (long)Lifetime.TotalSeconds || expires > issued + (long)Lifetime.TotalSeconds ||
                string.IsNullOrWhiteSpace(jwt.Subject) || jwt.Subject.Length > 255) return null;
            return jwt.Subject;
        }
        catch (Exception exception) when (exception is ArgumentException or SecurityTokenException) { return null; }
    }

    private static bool TryNumber(JwtPayload payload, string name, out long result)
    {
        result = 0;
        return payload.TryGetValue(name, out var value) && value is long or int &&
            long.TryParse(value.ToString(), System.Globalization.NumberStyles.None,
                System.Globalization.CultureInfo.InvariantCulture, out result);
    }

    private static Key ReadKey(string encoded)
    {
        byte[] bytes;
        try { bytes = Convert.FromBase64String(encoded); }
        catch (Exception exception) when (exception is FormatException or ArgumentNullException)
        { throw new ArgumentException("JWT signing key must be valid Base64 with at least 32 bytes."); }
        if (bytes.Length < 32 || bytes.Length > 256)
            throw new ArgumentException("JWT signing key must contain 32 to 256 bytes.");
        return new Key(new SymmetricSecurityKey(bytes), bytes.Length >= 64 ? SecurityAlgorithms.HmacSha512 :
            bytes.Length >= 48 ? SecurityAlgorithms.HmacSha384 : SecurityAlgorithms.HmacSha256);
    }
}
