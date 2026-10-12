using System.Security.Cryptography;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace WildVN.Api.Tests;

internal sealed class RecoveryHttpFactory(IReadOnlyDictionary<string, string?>? overrides = null,
    bool development = false) : WebApplicationFactory<Program>
{
    private readonly string keys = Path.Combine(Path.GetTempPath(), "wildvn-recovery-http-" + Guid.NewGuid().ToString("N"));
    protected override IHost CreateHost(IHostBuilder builder)
    {
        if (development) builder.UseEnvironment("Development");
        var settings = new Dictionary<string, string?>
        {
            ["Auth:Enabled"] = "true", ["Auth:ReplicaCount"] = "1", ["Auth:CookieSecure"] = "true",
            ["Auth:DatabaseConnection"] = "Host=127.0.0.1;Port=1;Database=disposable_unreachable;Username=recovery_test;Timeout=1",
            ["Auth:JwtCurrentKeyBase64"] = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)),
            ["Auth:JwtLegacyAcceptUntil"] = DateTimeOffset.UtcNow.AddDays(1).ToString("O"),
            ["PasswordRecovery:Enabled"] = "true", ["PasswordRecovery:ResetPageUrl"] = "https://web.example.invalid/reset-password",
            ["PasswordRecovery:DataProtectionKeyDirectory"] = keys,
            ["PasswordRecovery:Smtp:Host"] = "127.0.0.1", ["PasswordRecovery:Smtp:Port"] = "1",
            ["PasswordRecovery:Smtp:FromAddress"] = "fixture@example.invalid",
            ["PasswordRecovery:Smtp:Username"] = "fixture", ["PasswordRecovery:Smtp:Password"] = "generated-test-only"
        };
        if (overrides is not null)
            foreach (var pair in overrides) settings[pair.Key] = pair.Value;
        builder.ConfigureHostConfiguration(configuration => configuration.AddInMemoryCollection(settings));
        return base.CreateHost(builder);
    }
    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        if (Directory.Exists(keys)) Directory.Delete(keys, true);
    }
    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (Directory.Exists(keys)) Directory.Delete(keys, true);
    }
}
