using Microsoft.AspNetCore.DataProtection;
using WildVN.Application.Auth;
using WildVN.Infrastructure.Auth;

namespace WildVN.Api.Auth;

public sealed class PasswordRecoveryRuntime { public bool Enabled { get; init; } }

internal static class PasswordRecoveryRegistration
{
    public static void AddPasswordRecovery(this WebApplicationBuilder builder, bool authEnabled)
    {
        var section = builder.Configuration.GetSection("PasswordRecovery");
        var enabled = section.GetValue<bool>("Enabled");
        builder.Services.AddSingleton(new PasswordRecoveryRuntime { Enabled = enabled });
        if (!enabled) return;
        if (!authEnabled) throw new InvalidOperationException("Password recovery requires Auth:Enabled.");
        var resetPage = ReadResetPage(section["ResetPageUrl"], builder.Environment.IsDevelopment());
        var directory = ReadKeyDirectory(section["DataProtectionKeyDirectory"]);
        var smtp = new SmtpResetMailSettings
        {
            Host = Required(section, "Smtp:Host"), Port = section.GetValue("Smtp:Port", 587),
            FromAddress = Required(section, "Smtp:FromAddress"), Username = Required(section, "Smtp:Username"),
            Password = Required(section, "Smtp:Password"), UseSslOnConnect = section.GetValue("Smtp:UseSslOnConnect", false)
        };
        smtp.Validate(); // No SMTP/DB connection is opened during settings validation.
        builder.Services.AddDataProtection().SetApplicationName("WildVN.PasswordRecovery")
            .PersistKeysToFileSystem(directory);
        builder.Services.AddSingleton<ResetMailProtector>();
        builder.Services.AddSingleton<IResetMailProtector>(services => services.GetRequiredService<ResetMailProtector>());
        builder.Services.AddSingleton(new SmtpResetMail(smtp));
        builder.Services.AddSingleton<PasswordRecoveryLimiter>();
        builder.Services.AddScoped<IPasswordRecoveryStore, PostgresPasswordRecoveryStore>();
        builder.Services.AddScoped(services => new PasswordRecoveryService(
            services.GetRequiredService<IPasswordRecoveryStore>(), services.GetRequiredService<ILegacyPasswordHasher>(),
            services.GetRequiredService<IResetMailProtector>(), resetPage, services.GetRequiredService<TimeProvider>()));
        builder.Services.AddHostedService<ResetMailWorker>();
    }

    private static Uri ReadResetPage(string? value, bool development)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.UserInfo.Length != 0 || uri.Query.Length != 0 ||
            uri.Fragment.Length != 0 || uri.AbsolutePath != "/reset-password" ||
            uri.Scheme != "https" && !(development && uri.Scheme == "http" && uri.IsLoopback))
            throw new InvalidOperationException("Recovery reset page must be an exact HTTPS /reset-password URL (Development loopback may use HTTP).");
        return uri;
    }

    private static DirectoryInfo ReadKeyDirectory(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || !Path.IsPathFullyQualified(value) ||
            Path.GetFullPath(value) != value || value == Path.GetPathRoot(value))
            throw new InvalidOperationException("Recovery requires an absolute private persistent key directory.");
        if (OperatingSystem.IsWindows()) return Directory.CreateDirectory(value);
        var directory = Directory.CreateDirectory(value, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        const UnixFileMode shared = UnixFileMode.GroupRead | UnixFileMode.GroupWrite | UnixFileMode.GroupExecute |
            UnixFileMode.OtherRead | UnixFileMode.OtherWrite | UnixFileMode.OtherExecute;
        if ((File.GetUnixFileMode(value) & shared) != 0)
            throw new InvalidOperationException("Recovery key directory must be private to the service user (0700).");
        return directory;
    }

    private static string Required(IConfiguration section, string key) =>
        !string.IsNullOrWhiteSpace(section[key]) ? section[key]! :
        throw new InvalidOperationException("Recovery setting is required: " + key);
}
