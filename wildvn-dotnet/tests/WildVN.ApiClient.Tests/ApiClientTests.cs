using System.Net;
using System.Net.Http.Headers;
using WildVN.ApiClient;
using Xunit;
using Client = WildVN.ApiClient.ApiClient;

namespace WildVN.ApiClient.Tests;

public sealed class ApiClientTests
{
    private static ApiClientOptions Options(int retries = 0, TimeSpan? timeout = null) =>
        new(new Uri("https://fixture.invalid/"), timeout ?? TimeSpan.FromSeconds(2), SafeGetRetries: retries);

    [Fact]
    public async Task Health_uses_configured_origin_and_does_not_send_until_explicitly_requested()
    {
        using var handler = new FakeHandler((request, _) =>
        {
            Assert.Equal(HttpMethod.Get, request.Method);
            Assert.Equal("https://fixture.invalid/health/live", request.RequestUri!.AbsoluteUri);
            Assert.Contains(new MediaTypeWithQualityHeaderValue("application/json"), request.Headers.Accept);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        });
        using var client = new Client(Options(), handler);

        Assert.Equal(0, handler.Requests);
        await client.CheckHealthAsync();
        Assert.Equal(1, handler.Requests);
    }

    [Theory]
    [InlineData("http://fixture.invalid/", false)]
    [InlineData("http://localhost/", false)]
    [InlineData("http://localhost.evil.invalid/", true)]
    [InlineData("ftp://fixture.invalid/", false)]
    [InlineData("https://user:private@fixture.invalid/", false)]
    [InlineData("https://fixture.invalid/#secret", false)]
    [InlineData("https://fixture.invalid/?token=private", false)]
    public void Unsafe_base_address_is_rejected(string address, bool allowLoopback)
    {
        using var handler = new FakeHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));
        Assert.Throws<ArgumentException>(() => new Client(
            new ApiClientOptions(new Uri(address), TimeSpan.FromSeconds(1), allowLoopback), handler));
        Assert.Equal(0, handler.Requests);
    }

    [Theory]
    [InlineData("http://localhost:5123/")]
    [InlineData("http://127.0.0.1:5123/")]
    [InlineData("http://[::1]:5123/")]
    public async Task Http_requires_explicit_loopback_fixture_opt_in(string address)
    {
        using var handler = new FakeHandler((request, _) =>
        {
            Assert.Equal(new Uri(new Uri(address), "health/live"), request.RequestUri);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        });
        using var client = new Client(new(new Uri(address), TimeSpan.FromSeconds(1), true), handler);
        await client.CheckHealthAsync();
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(-1, 0)]
    [InlineData(121000, 0)]
    [InlineData(1000, -1)]
    [InlineData(1000, 3)]
    public void Invalid_timeout_and_retry_limit_are_rejected(int milliseconds, int retries)
    {
        using var handler = new FakeHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));
        Assert.Throws<ArgumentOutOfRangeException>(() => new Client(Options(retries, TimeSpan.FromMilliseconds(milliseconds)), handler));
    }

    [Fact]
    public async Task Timeout_has_safe_Vietnamese_error_without_upstream_diagnostics()
    {
        using var handler = new FakeHandler(async (_, token) =>
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, token);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        using var client = new Client(Options(timeout: TimeSpan.FromMilliseconds(30)), handler);

        var error = await Assert.ThrowsAsync<ApiClientException>(() => client.CheckHealthAsync());

        Assert.Equal(ApiError.Timeout, error.Error);
        Assert.Contains("quá thời gian", error.Message);
        Assert.Null(error.InnerException);
    }

    [Fact]
    public async Task Caller_cancellation_is_preserved_and_not_retried()
    {
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var handler = new FakeHandler(async (_, token) =>
        {
            started.SetResult();
            await Task.Delay(Timeout.InfiniteTimeSpan, token);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        using var client = new Client(Options(retries: 2), handler);
        using var cancel = new CancellationTokenSource();
        var request = client.CheckHealthAsync(cancel.Token);
        await started.Task;
        cancel.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => request);
        Assert.Equal(1, handler.Requests);
    }

    [Theory]
    [InlineData(401, ApiError.Unauthorized, "đăng nhập")]
    [InlineData(403, ApiError.Forbidden, "quyền")]
    [InlineData(404, ApiError.InvalidResponse, "phản hồi")]
    [InlineData(500, ApiError.Unavailable, "tạm thời")]
    [InlineData(503, ApiError.Unavailable, "tạm thời")]
    public async Task Http_error_maps_status_and_never_exposes_server_body(int status, ApiError kind, string expectedMessage)
    {
        using var handler = new FakeHandler((_, _) => Task.FromResult(new HttpResponseMessage((HttpStatusCode)status)
        {
            Content = new StringContent("private-password-token diagnostics")
        }));
        using var client = new Client(Options(), handler);

        var error = await Assert.ThrowsAsync<ApiClientException>(() => client.CheckHealthAsync());

        Assert.Equal(kind, error.Error);
        Assert.Contains(expectedMessage, error.Message);
        Assert.DoesNotContain("private", error.ToString());
        Assert.Equal(1, handler.Requests);
    }

    [Fact]
    public async Task Transport_errors_are_safe_and_default_requests_are_not_retried()
    {
        using var handler = new FakeHandler((_, _) => throw new HttpRequestException("private upstream host/token"));
        using var client = new Client(Options(), handler);

        var error = await Assert.ThrowsAsync<ApiClientException>(() => client.CheckHealthAsync());

        Assert.Equal(ApiError.Network, error.Error);
        Assert.Contains("Không thể kết nối", error.Message);
        Assert.DoesNotContain("private", error.ToString());
        Assert.Equal(1, handler.Requests);
    }

    [Fact]
    public async Task Retry_requires_safe_get_opt_in_and_explicit_nonzero_budget()
    {
        using var handler = new FakeHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)));
        using var client = new Client(Options(retries: 2), handler);

        await Assert.ThrowsAsync<ApiClientException>(() => client.SendAsync(HttpMethod.Get, "api/search"));
        Assert.Equal(1, handler.Requests);

        await Assert.ThrowsAsync<ApiClientException>(() => client.CheckHealthAsync());
        Assert.Equal(4, handler.Requests);
    }

    [Fact]
    public async Task Safe_get_can_recover_after_transient_status()
    {
        var attempt = 0;
        using var handler = new FakeHandler((_, _) => Task.FromResult(new HttpResponseMessage(
            ++attempt == 1 ? HttpStatusCode.BadGateway : HttpStatusCode.OK)));
        using var client = new Client(Options(retries: 1), handler);

        await client.CheckHealthAsync();

        Assert.Equal(2, handler.Requests);
    }

    [Fact]
    public async Task Post_never_retries_even_when_safe_retry_flag_is_requested()
    {
        using var handler = new FakeHandler((request, _) =>
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        });
        using var client = new Client(Options(retries: 2), handler);

        await Assert.ThrowsAsync<ApiClientException>(() => client.SendAsync(HttpMethod.Post,
            "api/favorites/fixture/toggle", new StringContent("{}"), retrySafeGet: true));

        Assert.Equal(1, handler.Requests);
    }

    [Theory]
    [InlineData("https://other.invalid/health/live")]
    [InlineData("//other.invalid/health/live")]
    [InlineData("health/live#secret")]
    [InlineData("\\\\other.invalid\\health")]
    public async Task Per_request_address_cannot_escape_configured_origin(string path)
    {
        using var handler = new FakeHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));
        using var client = new Client(Options(), handler);

        await Assert.ThrowsAsync<ArgumentException>(() => client.SendAsync(HttpMethod.Get, path));

        Assert.Equal(0, handler.Requests);
    }

    [Fact]
    public void Production_handler_keeps_cookie_jar_in_memory_and_disables_redirects()
    {
        using var client = Client.Create(Options());
        Assert.NotNull(client.Cookies);
        Assert.Empty(client.Cookies!.GetAllCookies().Cast<Cookie>());
    }

    [Fact]
    public async Task Disposed_client_rejects_further_requests()
    {
        using var handler = new FakeHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));
        var client = new Client(Options(), handler);
        client.Dispose();
        client.Dispose();

        await Assert.ThrowsAsync<ObjectDisposedException>(() => client.CheckHealthAsync());
        Assert.Equal(0, handler.Requests);
    }

    private sealed class FakeHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        public int Requests { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests++;
            return send(request, cancellationToken);
        }
    }
}
