using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace WildVN.Api.Tests;

[Collection(RecoveryDatabaseCollection.Name)]
public sealed class PasswordRecoveryBrowserTests(RecoveryDatabaseFixture database)
{
    [Fact]
    public async Task Real_browser_forgets_receives_TLS_email_resets_and_logs_in_again()
    {
        var runtime = Environment.GetEnvironmentVariable("WILDVN_RECOVERY_BROWSER_RUNTIME") ??
            throw new InvalidOperationException("NOT RUN: isolated Next browser runtime is required.");
        using var state = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(runtime, "state.json")));
        var apiPort = state.RootElement.GetProperty("api_port").GetInt32();
        var web = "http://127.0.0.1:" + state.RootElement.GetProperty("web_port").GetInt32();
        await using var smtp = new RecoverySmtpFixture();
        await using var factory = new RecoveryHttpFactory(new Dictionary<string, string?>
        {
            ["Auth:DatabaseConnection"] = database.ConnectionString, ["Auth:CookieSecure"] = "false",
            ["Auth:AllowedOrigins:0"] = web, ["PasswordRecovery:ResetPageUrl"] = web + "/reset-password",
            ["PasswordRecovery:Smtp:Host"] = "localhost", ["PasswordRecovery:Smtp:Port"] = smtp.Port.ToString()
        }, development: true);
        factory.UseKestrel(apiPort);
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("http://127.0.0.1:" + apiPort) });
        var name = "browser_" + Guid.NewGuid().ToString("N")[..12];
        var email = name + "@example.invalid";
        var registered = await client.PostAsJsonAsync("/api/auth/register", new { username = name, email, password = "old-browser-fixture" });
        Assert.Equal(HttpStatusCode.OK, registered.StatusCode);
        var cookie = registered.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("wildvn-auth-token=")).Split(';')[0].Split('=', 2)[1];
        var process = new ProcessStartInfo("node") { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true };
        process.ArgumentList.Add(Path.Combine(RepositoryRoot(), "tests/browser/password-recovery.e2e.cjs"));
        process.Environment["RECOVERY_RUNTIME"] = runtime;
        process.Environment["RECOVERY_WEB"] = web;
        process.Environment["RECOVERY_API"] = "http://127.0.0.1:" + apiPort;
        process.Environment["RECOVERY_EMAIL"] = email;
        process.Environment["RECOVERY_USERNAME"] = name;
        process.Environment["RECOVERY_OLD_COOKIE"] = cookie;
        var linkFile = Path.Combine(runtime, "captured-test-link.txt");
        process.Environment["RECOVERY_LINK_FILE"] = linkFile;
        if (File.Exists(linkFile)) File.Delete(linkFile);
        using var node = Process.Start(process)!;
        var stdout = node.StandardOutput.ReadToEndAsync();
        var stderr = node.StandardError.ReadToEndAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(2));
        try
        {
            while (!node.HasExited && !smtp.Messages.TryPeek(out _)) await Task.Delay(100, timeout.Token);
            if (smtp.Messages.TryPeek(out var mail))
            {
                var link = (mail.TextBody ?? throw new InvalidOperationException("Fixture email has no plaintext body."))
                    .Split('\n').Select(line => line.Trim()).Single(line => line.StartsWith(web + "/reset-password#token="));
                await File.WriteAllTextAsync(linkFile, link);
            }
            await node.WaitForExitAsync(timeout.Token);
            var output = await stdout;
            var errors = await stderr;
            await File.WriteAllTextAsync(Path.Combine(runtime, "browser-results.txt"), output + errors);
            Assert.True(node.ExitCode == 0, output + errors);
            Assert.NotEmpty(smtp.Messages);
            Assert.Equal(1, smtp.TlsConnections);
        }
        finally
        {
            if (!node.HasExited) { node.Kill(entireProcessTree: true); await node.WaitForExitAsync(); }
            if (File.Exists(linkFile)) File.Delete(linkFile);
        }
    }
    private static string RepositoryRoot()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
            if (File.Exists(Path.Combine(directory.FullName, "tests/browser/password-recovery.e2e.cjs"))) return directory.FullName;
        throw new DirectoryNotFoundException("Recovery browser fixture script is missing.");
    }
}
