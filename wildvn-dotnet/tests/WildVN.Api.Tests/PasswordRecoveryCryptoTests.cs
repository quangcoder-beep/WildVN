using System.Security.Cryptography;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using WildVN.Infrastructure.Auth;
using WildVN.Application.Auth;
using Xunit;

namespace WildVN.Api.Tests;

public sealed class PasswordRecoveryCryptoTests
{
    [Fact]
    public void Password_version_rejects_every_token_issued_before_reset_and_accepts_current_login()
    {
        var clock = new RecoveryTestClock();
        var tokens = Tokens(clock);
        var old = tokens.Issue("fixture-user");
        var version = Guid.NewGuid();
        var fresh = tokens.Issue("fixture-user", version);
        Assert.Equal("fixture-user", tokens.ReadUsername(old));
        Assert.True(tokens.MatchesCredentialVersion(old, null));
        Assert.False(tokens.MatchesCredentialVersion(old, version));
        Assert.False(tokens.MatchesCredentialVersion(fresh, null));
        Assert.False(tokens.MatchesCredentialVersion(fresh, Guid.NewGuid()));
        Assert.True(tokens.MatchesCredentialVersion(fresh, version));
        Assert.False(tokens.MatchesCredentialVersion("malformed", version));
        clock.Advance(TimeSpan.FromDays(30));
        Assert.Null(tokens.ReadUsername(fresh));
        Assert.False(tokens.MatchesCredentialVersion(fresh, version));
    }

    [Theory]
    [InlineData(32, "HS256")]
    [InlineData(48, "HS384")]
    [InlineData(64, "HS512")]
    public void Issuance_uses_key_appropriate_algorithm_and_rejects_signature_tampering(int size, string algorithm)
    {
        var tokens = Tokens(new RecoveryTestClock(), size);
        var value = tokens.Issue("fixture-user", Guid.NewGuid());
        Assert.Equal(algorithm, new JwtSecurityTokenHandler().ReadJwtToken(value).Header.Alg);
        var parts = value.Split('.');
        parts[2] = (parts[2][0] == 'A' ? 'B' : 'A') + parts[2][1..];
        Assert.Null(tokens.ReadUsername(string.Join('.', parts)));
        Assert.Null(tokens.ReadUsername(new string('A', 4097)));
        Assert.Throws<ArgumentException>(() => tokens.Issue(" "));
    }

    [Theory]
    [InlineData("not-base64")]
    [InlineData("")]
    public void Signing_key_validation_never_accepts_invalid_input(string key)
    {
        var clock = new RecoveryTestClock();
        Assert.Throws<ArgumentException>(() => new LegacyJwtTokens(new() { CurrentKeyBase64 = key,
            LegacyAcceptUntil = clock.GetUtcNow().AddDays(1) }, clock));
    }

    [Fact]
    public void Legacy_tokens_only_work_before_explicit_cutoff_and_resets_require_version()
    {
        var clock = new RecoveryTestClock();
        var key = RandomNumberGenerator.GetBytes(32);
        var settings = new LegacyJwtSettings { CurrentKeyBase64 = Convert.ToBase64String(key), LegacyAcceptUntil = clock.GetUtcNow().AddMinutes(1) };
        var tokens = new LegacyJwtTokens(settings, clock);
        var now = clock.GetUtcNow().ToUnixTimeSeconds();
        var legacy = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            new JwtHeader(new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256)),
            new JwtPayload { ["sub"] = "fixture-user", ["iat"] = now, ["exp"] = now + 3600 }));
        Assert.Equal("fixture-user", tokens.ReadUsername(legacy));
        Assert.False(tokens.MatchesCredentialVersion(legacy, Guid.NewGuid()));
        clock.Advance(TimeSpan.FromMinutes(1));
        Assert.Null(tokens.ReadUsername(legacy));
    }

    [Fact]
    public void New_unicode_password_hash_uses_fresh_salt_and_real_Argon2_roundtrip()
    {
        var hasher = new LegacyArgon2PasswordVerifier();
        const string password = "mật-khẩu-thử-🔐";
        var first = hasher.Hash(password);
        var second = hasher.Hash(password);
        Assert.NotEqual(first, second);
        Assert.StartsWith("$argon2id$v=19$m=65536,t=3,p=1$", first);
        Assert.True(hasher.Verify(password, first));
        Assert.False(hasher.Verify("incorrect-fixture", first));
        Assert.Throws<AuthFailure>(() => hasher.Hash(new string('é', 513)));
    }

    [Fact]
    public void Repeated_options_do_not_allocate_a_new_EF_internal_provider_per_context()
    {
        for (var i = 0; i < 30; i++)
        {
            using var context = new WildVN.Infrastructure.Data.WildVnDbContext(
                WildVN.Infrastructure.Data.PostgresConfiguration.CreateOptions(
                    "Host=127.0.0.1;Port=1;Database=disposable_unreachable;Username=recovery_test"));
            Assert.NotNull(context.Model.FindEntityType(typeof(WildVN.Infrastructure.Data.PasswordResetRow)));
        }
    }

    private static LegacyJwtTokens Tokens(RecoveryTestClock clock, int size = 32) => new(new LegacyJwtSettings
    { CurrentKeyBase64 = Convert.ToBase64String(RandomNumberGenerator.GetBytes(size)), LegacyAcceptUntil = clock.GetUtcNow().AddDays(1) }, clock);
}
