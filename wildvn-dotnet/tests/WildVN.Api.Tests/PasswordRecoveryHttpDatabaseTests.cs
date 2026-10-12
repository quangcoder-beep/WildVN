using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WildVN.Application.Auth;
using WildVN.Infrastructure.Auth;
using WildVN.Infrastructure.Data;
using Xunit;

namespace WildVN.Api.Tests;

[Collection(RecoveryDatabaseCollection.Name)]
public sealed class PasswordRecoveryHttpDatabaseTests(RecoveryDatabaseFixture database)
{
    [Fact]
    public async Task Register_forgot_reset_revokes_old_cookie_and_only_new_password_can_login()
    {
        await using var factory = new RecoveryHttpFactory(new Dictionary<string, string?>
            { ["Auth:DatabaseConnection"] = database.ConnectionString });
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost"), HandleCookies = false });
        var name = "web_" + Guid.NewGuid().ToString("N")[..12];
        var email = name + "@example.invalid";
        var registration = await client.PostAsJsonAsync("/api/auth/register", new { username = name, email, password = "old-fixture-password" });
        Assert.Equal(HttpStatusCode.OK, registration.StatusCode);
        var oldCookie = registration.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("wildvn-auth-token=")).Split(';')[0];
        client.DefaultRequestHeaders.Add("Cookie", oldCookie);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
        var forgot = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email });
        Assert.Equal(HttpStatusCode.OK, forgot.StatusCode);
        var body = await forgot.Content.ReadFromJsonAsync<WildVN.Contracts.ApiResponse<object>>();
        Assert.True(body!.Success);
        Assert.Equal(PasswordRecoveryService.Requested, body.Message);
        string token;
        using (var scope = factory.Services.CreateScope())
        {
            var store = scope.ServiceProvider.GetRequiredService<WildVnDbContext>();
            var user = await store.Users.SingleAsync(row => row.Username == name);
            var job = await store.PasswordResetOutbox.AsNoTracking().SingleAsync(row =>
                store.PasswordResetRequests.Any(request => request.TokenHash == row.TokenHash && request.UserId == user.Id));
            token = new Uri(scope.ServiceProvider.GetRequiredService<ResetMailProtector>().Unprotect(job.EncryptedPayload).Link).Fragment[7..];
        }
        var reset = await client.PostAsJsonAsync("/api/auth/reset-password", new { token, password = "new-fixture-password" });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        Assert.Contains(reset.Headers.GetValues("Set-Cookie"), value => value.StartsWith("wildvn-auth-token=;") && value.Contains("max-age=0"));
        var revoked = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, revoked.StatusCode);
        Assert.Equal("", await revoked.Content.ReadAsStringAsync());
        var oldLogin = await client.PostAsJsonAsync("/api/auth/login", new { username = name, password = "old-fixture-password" });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);
        var login = await client.PostAsJsonAsync("/api/auth/login", new { username = name, password = "new-fixture-password" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        client.DefaultRequestHeaders.Remove("Cookie");
        client.DefaultRequestHeaders.Add("Cookie", login.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("wildvn-auth-token=")).Split(';')[0]);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/reset-password", new { token, password = "another-fixture-password" })).StatusCode);
    }
}
