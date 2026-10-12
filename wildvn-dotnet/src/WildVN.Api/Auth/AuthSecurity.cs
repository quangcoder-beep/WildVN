using Microsoft.AspNetCore.Antiforgery;
using WildVN.Application.Auth;

namespace WildVN.Api.Auth;

internal static class AuthSecurity
{
    public static CookieOptions Cookie(AuthRuntime runtime, TimeSpan? maxAge = null, bool httpOnly = true) => new()
    {
        HttpOnly = httpOnly, Secure = runtime.CookieSecure, SameSite = runtime.CookieSameSite,
        Path = "/", MaxAge = maxAge, IsEssential = true
    };

    public static void Bootstrap(HttpContext context, AuthRuntime runtime)
    {
        var tokens = context.RequestServices.GetRequiredService<IAntiforgery>().GetAndStoreTokens(context);
        context.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, Cookie(runtime, httpOnly: false));
    }

    public static async Task CsrfBoundary(HttpContext context, RequestDelegate next)
    {
        // Legacy auth routes are exempt. Desktop gets fresh XSRF via /api/auth/csrf after sign-in.
        if (context.Request.Path.StartsWithSegments("/api") &&
            !context.Request.Path.StartsWithSegments("/api/auth") &&
            !HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method) &&
            !HttpMethods.IsOptions(context.Request.Method) && !HttpMethods.IsTrace(context.Request.Method))
        {
            try { await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context); }
            catch (AntiforgeryValidationException)
            { throw new AuthFailure(403, "Bạn không có quyền truy cập vào tài nguyên này"); }
        }
        await next(context);
    }

    public static async Task ResponseHeaders(HttpContext context, RequestDelegate next)
    {
        context.Response.Headers.XContentTypeOptions = "nosniff";
        context.Response.Headers.XFrameOptions = "DENY";
        context.Response.Headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        if (context.Request.IsHttps) context.Response.Headers.StrictTransportSecurity = "max-age=31536000";
        if (context.Request.Path.StartsWithSegments("/api/auth"))
        {
            context.Response.Headers.CacheControl = "no-store";
            var limit = context.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpMaxRequestBodySizeFeature>();
            if (limit is { IsReadOnly: false }) limit.MaxRequestBodySize = 16384;
        }
        await next(context);
    }
}
