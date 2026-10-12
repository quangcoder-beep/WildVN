using System.Net;
using System.Net.Http.Headers;

namespace WildVN.ApiClient;

public sealed record ApiClientOptions(Uri BaseAddress, TimeSpan RequestTimeout,
    bool AllowLoopbackHttp = false, int SafeGetRetries = 0);

public enum ApiError { Unauthorized, Forbidden, InvalidResponse, Unavailable, Timeout, Network }

public sealed class ApiClientException(ApiError error, string message) : Exception(message)
{
    public ApiError Error { get; } = error;
}

/// <summary>In-memory desktop HTTP transport. Auth/XSRF and SSE are later migration slices.</summary>
public sealed class ApiClient : IDisposable
{
    private const HttpStatusCode TooManyRequests = (HttpStatusCode)429;
    private readonly HttpClient _http;
    private readonly ApiClientOptions _options;
    private bool _disposed;

    public CookieContainer? Cookies { get; }

    public ApiClient(ApiClientOptions options, HttpMessageHandler handler)
    {
        Validate(options);
        _options = options;
        Cookies = (handler as HttpClientHandler)?.CookieContainer;
        _http = new HttpClient(handler, disposeHandler: true)
        {
            BaseAddress = options.BaseAddress,
            Timeout = options.RequestTimeout
        };
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public static ApiClient Create(ApiClientOptions options)
    {
        Validate(options);
        return new ApiClient(options, new HttpClientHandler
        {
            UseCookies = true,
            CookieContainer = new CookieContainer(),
            AllowAutoRedirect = false
        });
    }

    public async Task CheckHealthAsync(CancellationToken cancellationToken = default)
    {
        using var response = await SendAsync(HttpMethod.Get, "health/live",
            retrySafeGet: true, cancellationToken: cancellationToken);
    }

    // Caller owns a successful response; this method consumes request content once.
    // The caller must establish GET safety before opting in (GET /api/search writes analytics).
    public async Task<HttpResponseMessage> SendAsync(HttpMethod method, string relativePath,
        HttpContent? content = null, bool retrySafeGet = false, CancellationToken cancellationToken = default)
    {
        if (_disposed) throw new ObjectDisposedException(typeof(ApiClient).FullName);
        if (method is null) throw new ArgumentNullException(nameof(method));
        ValidateRelativePath(relativePath);
        var retries = method == HttpMethod.Get && retrySafeGet && content is null ? _options.SafeGetRetries : 0;
        for (var attempt = 0; ; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            using var request = new HttpRequestMessage(method, relativePath) { Content = content };
            HttpResponseMessage response;
            try
            {
                response = await _http.SendAsync(request, cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                throw new ApiClientException(ApiError.Timeout, "Kết nối quá thời gian cho phép. Vui lòng thử lại.");
            }
            catch (HttpRequestException)
            {
                throw new ApiClientException(ApiError.Network, "Không thể kết nối API. Vui lòng kiểm tra mạng và địa chỉ API.");
            }
            if (response.IsSuccessStatusCode) return response;
            var status = response.StatusCode;
            response.Dispose();
            if (attempt < retries && IsTransient(status)) continue;
            throw MapError(status);
        }
    }

    private static void Validate(ApiClientOptions options)
    {
        if (options is null) throw new ArgumentNullException(nameof(options));
        var address = options.BaseAddress;
        if (address is null || !address.IsAbsoluteUri ||
            !(address.Scheme == Uri.UriSchemeHttps ||
                options.AllowLoopbackHttp && address.Scheme == Uri.UriSchemeHttp && address.IsLoopback) ||
            !string.IsNullOrEmpty(address.UserInfo) || !string.IsNullOrEmpty(address.Fragment) ||
            !string.IsNullOrEmpty(address.Query))
            throw new ArgumentException("Địa chỉ API phải dùng HTTPS; HTTP chỉ dành cho fixture loopback được bật rõ ràng.", nameof(options));
        if (options.RequestTimeout <= TimeSpan.Zero || options.RequestTimeout > TimeSpan.FromMinutes(2))
            throw new ArgumentOutOfRangeException(nameof(options), "Timeout phải lớn hơn 0 và không quá 2 phút.");
        if (options.SafeGetRetries is < 0 or > 2)
            throw new ArgumentOutOfRangeException(nameof(options), "Số lần retry phải từ 0 đến 2.");
    }

    private static void ValidateRelativePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || path.StartsWith("/", StringComparison.Ordinal) || path.IndexOf('\\') >= 0 || path.IndexOf('#') >= 0 ||
            !Uri.TryCreate(path, UriKind.Relative, out _))
            throw new ArgumentException("Endpoint phải là đường dẫn tương đối trong API đã cấu hình.", nameof(path));
    }

    private static bool IsTransient(HttpStatusCode status) => status is HttpStatusCode.RequestTimeout or
        TooManyRequests or HttpStatusCode.BadGateway or HttpStatusCode.ServiceUnavailable or HttpStatusCode.GatewayTimeout;

    private static ApiClientException MapError(HttpStatusCode status) => status switch
    {
        HttpStatusCode.Unauthorized => new(ApiError.Unauthorized, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."),
        HttpStatusCode.Forbidden => new(ApiError.Forbidden, "Bạn không có quyền thực hiện thao tác này."),
        _ when (int)status >= 500 || status == TooManyRequests =>
            new(ApiError.Unavailable, "API tạm thời không khả dụng. Vui lòng thử lại sau."),
        _ => new(ApiError.InvalidResponse, "API trả về phản hồi không hợp lệ cho thao tác này.")
    };

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _http.Dispose();
    }
}
