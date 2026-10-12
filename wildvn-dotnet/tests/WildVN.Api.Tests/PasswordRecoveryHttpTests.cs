using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using WildVN.Application.Auth;
using WildVN.Contracts;
using Xunit;

namespace WildVN.Api.Tests;

public sealed class PasswordRecoveryHttpTests
{
    [Theory]
    [InlineData("/api/auth/forgot-password", "{\"email\":\"nobody@example.invalid\"}")]
    [InlineData("/api/auth/reset-password", "{\"token\":\"invalid\",\"password\":\"fixture-password\"}")]
    public async Task Disabled_recovery_is_unavailable_without_database_access(string path, string json)
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        using var response = await client.PostAsync(path, new StringContent(json, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        Assert.DoesNotContain("fixture-password", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("/api/auth/forgot-password", "{\"email\":\"not-an-email\"}", 400)]
    [InlineData("/api/auth/forgot-password", "{\"email\":\"Display <a@example.invalid>\"}", 400)]
    [InlineData("/api/auth/reset-password", "{\"token\":\"invalid\",\"password\":\"fixture-password\"}", 400)]
    [InlineData("/api/auth/forgot-password", "{broken", 400)]
    public async Task Enabled_recovery_validates_before_opening_database(string path, string json, int status)
    {
        await using var factory = new RecoveryHttpFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        using var response = await client.PostAsync(path, new StringContent(json, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(status, (int)response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Equal(status, error!.Status);
    }

    [Fact]
    public async Task Foreign_origin_is_rejected_before_database_access()
    {
        await using var factory = new RecoveryHttpFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Add("Origin", "https://untrusted.example.invalid");
        var response = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email = "nobody@example.invalid" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }


    [Fact]
    public async Task Recovery_IP_bucket_rejects_sixth_reset_attempt()
    {
        await using var factory = new RecoveryHttpFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/reset-password",
                new { token = "invalid", password = "fixture-password" })).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostAsJsonAsync("/api/auth/reset-password",
            new { token = "invalid", password = "fixture-password" })).StatusCode);
    }

    [Fact]
    public async Task Forgot_email_bucket_is_case_normalized_and_rejects_fourth_attempt()
    {
        await using var configured = new RecoveryHttpFactory();
        await using var factory = configured.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.Replace(ServiceDescriptor.Scoped<IPasswordRecoveryStore, EmptyRecoveryStore>())));
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        for (var i = 0; i < 3; i++)
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/forgot-password",
                new { email = i == 0 ? "fixture@example.invalid" : "FIXTURE@example.invalid" })).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostAsJsonAsync("/api/auth/forgot-password",
            new { email = "fixture@example.invalid" })).StatusCode);
    }

    [Theory]
    [InlineData("     ")]
    [InlineData("short")]
    public async Task Reset_rejects_invalid_password_before_hash_or_database(string password)
    {
        await using var factory = new RecoveryHttpFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/reset-password",
            new { token = new string('A', 43), password })).StatusCode);
    }

    private sealed class EmptyRecoveryStore : IPasswordRecoveryStore
    {
        public Task<ResetRecipient?> FindRecipientAsync(string email, CancellationToken ct) => Task.FromResult<ResetRecipient?>(null);
        public Task QueueAsync(ResetRecipient recipient, string tokenHash, string encryptedMail, DateTimeOffset now, DateTimeOffset expires, CancellationToken ct) => throw new InvalidOperationException("Unknown email must not queue.");
        public Task ResetAsync(string tokenHash, string passwordHash, DateTimeOffset now, CancellationToken ct) => throw new InvalidOperationException("Invalid requests must not reset.");
    }
}
