using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using WildVN.Contracts;
using Xunit;

namespace WildVN.Api.Tests;

public sealed class ApiBootstrapTests
{
    private static readonly JsonSerializerOptions Json = ContractJson.CreateOptions();

    [Fact]
    public void Auth_is_bare_and_preserves_null_token_and_user_fields()
    {
        var user = new UserProfile("00000000-0000-0000-0000-000000000001", "fixture-reader", "reader@example.invalid", null, null, null, false);
        using var body = JsonDocument.Parse(JsonSerializer.Serialize(new AuthResponse(null, null, user), Json));
        Assert.False(body.RootElement.TryGetProperty("success", out _));
        Assert.Equal(JsonValueKind.Null, body.RootElement.GetProperty("accessToken").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.RootElement.GetProperty("refreshToken").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.RootElement.GetProperty("user").GetProperty("avatarUrl").ValueKind);
        Assert.Equal("fixture-reader", body.RootElement.GetProperty("user").GetProperty("username").GetString());
    }

    [Fact]
    public void Envelope_omits_only_optional_null_members_and_keeps_one_based_pagination()
    {
        var response = new ApiResponse<string[]>(true, [], Pagination: new PaginationMeta(1, 20, 0));
        using var body = JsonDocument.Parse(JsonSerializer.Serialize(response, Json));
        Assert.Equal("{\"success\":true,\"data\":[],\"pagination\":{\"page\":1,\"limit\":20,\"total\":0}}", body.RootElement.GetRawText());
        Assert.Equal(response, JsonSerializer.Deserialize<ApiResponse<string[]>>(body.RootElement.GetRawText(), Json)! with { Data = response.Data });
    }

    [Fact]
    public void Enums_are_named_strings_and_reject_numbers_or_unknown_values()
    {
        Assert.Equal("\"HERBIVORE\"", JsonSerializer.Serialize(DietType.HERBIVORE, Json));
        Assert.Equal("[\"TERRESTRIAL\",\"CANOPY\"]", JsonSerializer.Serialize(new[] { HabitatType.TERRESTRIAL, HabitatType.CANOPY }, Json));
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<DietType>("999", Json));
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<DietType>("\"invented\"", Json));
    }

    [Fact]
    public async Task Liveness_does_not_claim_dependencies_are_ready()
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();
        var live = await client.GetAsync("/health/live");
        var ready = await client.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.OK, live.StatusCode);
        Assert.Equal("{\"status\":\"alive\"}", await live.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.ServiceUnavailable, ready.StatusCode);
        Assert.Equal("{\"status\":\"notReady\"}", await ready.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Readiness_can_be_verified_by_an_injected_dependency_probe()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureServices(services => services.Replace(ServiceDescriptor.Singleton<IDependencyReadinessProbe>(new ReadyProbe()))));
        using var client = factory.CreateClient();
        var ready = await client.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.OK, ready.StatusCode);
        Assert.Equal("{\"status\":\"ready\"}", await ready.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Probe_failure_has_safe_status_without_private_configuration()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureServices(services => services.Replace(ServiceDescriptor.Singleton<IDependencyReadinessProbe>(new ThrowingProbe()))));
        using var client = factory.CreateClient();
        var ready = await client.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, ready.StatusCode);
        Assert.Equal("{\"status\":\"notReady\"}", await ready.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("GET", "/api/species", 404, "Not Found")]
    [InlineData("POST", "/health/live", 405, "Method Not Allowed")]
    public async Task Missing_or_invalid_method_returns_legacy_error_shape(string method, string path, int expectedStatus, string reason)
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();
        using var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), path));
        var error = JsonSerializer.Deserialize<ErrorResponse>(await response.Content.ReadAsStringAsync(), Json)!;
        Assert.Equal(expectedStatus, (int)response.StatusCode);
        Assert.Equal(expectedStatus, error.Status);
        Assert.Equal(path, error.Path);
        Assert.Equal(reason, error.Error);
        Assert.False(string.IsNullOrWhiteSpace(error.Message));
        Assert.DoesNotContain("Z", error.Timestamp);
        Assert.True(DateTime.TryParse(error.Timestamp, out _));
    }

    [Fact]
    public void Frozen_auth_envelopes_and_errors_roundtrip_with_shared_contracts()
    {
        using var fixture = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures/api-contracts.json")));
        foreach (var endpoint in fixture.RootElement.GetProperty("endpoints").EnumerateArray())
        {
            var response = endpoint.GetProperty("response");
            var family = response.GetProperty("family").GetString();
            var body = response.GetProperty("body");
            object? contract = family switch
            {
                "auth" => body.Deserialize<AuthResponse>(Json),
                "envelope" => body.Deserialize<ApiResponse<JsonElement?>>(Json),
                _ => null
            };
            if (contract is null) continue;
            Assert.True(System.Text.Json.Nodes.JsonNode.DeepEquals(
                System.Text.Json.Nodes.JsonNode.Parse(body.GetRawText()),
                System.Text.Json.Nodes.JsonNode.Parse(JsonSerializer.Serialize(contract, Json))), endpoint.GetProperty("path").GetString());
        }
        foreach (var error in fixture.RootElement.GetProperty("errors").EnumerateArray())
        {
            if (error.GetProperty("family").GetString() != "error") continue;
            var body = error.GetProperty("body");
            Assert.True(System.Text.Json.Nodes.JsonNode.DeepEquals(
                System.Text.Json.Nodes.JsonNode.Parse(body.GetRawText()),
                System.Text.Json.Nodes.JsonNode.Parse(JsonSerializer.Serialize(body.Deserialize<ErrorResponse>(Json), Json))));
        }
    }

    [Fact]
    public void Shared_enum_values_equal_source_snapshot_sets()
    {
        using var fixture = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures/api-contracts.json")));
        var enums = fixture.RootElement.GetProperty("enums");
        foreach (var type in new[] { typeof(DietType), typeof(HabitatType), typeof(ActivityPattern) })
            Assert.Equal(Enum.GetNames(type), enums.GetProperty(type.Name).GetProperty("values").EnumerateArray().Select(value => value.GetString()));
    }

    private sealed class ReadyProbe : IDependencyReadinessProbe
    {
        public ValueTask<bool> IsReadyAsync(CancellationToken cancellationToken) => ValueTask.FromResult(true);
    }
    private sealed class ThrowingProbe : IDependencyReadinessProbe
    {
        public ValueTask<bool> IsReadyAsync(CancellationToken cancellationToken) => throw new InvalidOperationException("private credential diagnostic");
    }
}
