using System.Net.Mail;
using System.Text;
using WildVN.Application.Auth;
using WildVN.Contracts;

namespace WildVN.Api.Auth;

public sealed class ForgotPasswordRequest { public string? Email { get; init; } }
public sealed class ResetPasswordRequest
{
    public string? Token { get; init; }
    public string? Password { get; init; }
}

internal static class PasswordRecoveryEndpoints
{
    public static void MapPasswordRecovery(this WebApplication app)
    {
        app.MapPost("/api/auth/forgot-password", Forgot).RequireRateLimiting("auth-password");
        app.MapPost("/api/auth/reset-password", Reset).RequireRateLimiting("auth-password");
    }

    private static async Task<IResult> Forgot(ForgotPasswordRequest request, HttpContext context,
        AuthRuntime auth, PasswordRecoveryRuntime recovery)
    {
        EnsureAvailable(context, auth, recovery);
        var email = request.Email?.Trim();
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254 || email.Contains('\r') || email.Contains('\n') ||
            !MailAddress.TryCreate(email, out var mailbox) || mailbox.Address != email || !email.Contains('@'))
            throw new AuthFailure(400, "Địa chỉ email không hợp lệ.");
        context.RequestServices.GetRequiredService<PasswordRecoveryLimiter>().Acquire(Address(context), email);
        await context.RequestServices.GetRequiredService<PasswordRecoveryService>().RequestAsync(email, context.RequestAborted);
        return Results.Ok(new ApiResponse<object>(true, Message: PasswordRecoveryService.Requested));
    }

    private static async Task<IResult> Reset(ResetPasswordRequest request, HttpContext context,
        AuthRuntime auth, PasswordRecoveryRuntime recovery)
    {
        EnsureAvailable(context, auth, recovery);
        context.RequestServices.GetRequiredService<PasswordRecoveryLimiter>().Acquire(Address(context), null);
        if (request.Token is not { Length: 43 } token ||
            token.Any(character => !(char.IsAsciiLetterOrDigit(character) || character is '-' or '_')))
            throw new AuthFailure(400, PasswordRecoveryService.InvalidToken);
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6 ||
            Encoding.UTF8.GetByteCount(request.Password) > 1024)
            throw new AuthFailure(400, "Mật khẩu cần ít nhất 6 ký tự và tối đa 1024 byte UTF-8.");
        await context.RequestServices.GetRequiredService<PasswordRecoveryService>()
            .ResetAsync(token, request.Password, context.RequestAborted);
        context.Response.Cookies.Append(LegacyCookieHandler.CookieName, "", AuthSecurity.Cookie(auth, TimeSpan.Zero));
        AuthEndpoints.ClearCsrf(context, auth);
        return Results.Ok(new ApiResponse<object>(true, Message: PasswordRecoveryService.Changed));
    }

    private static string Address(HttpContext context) => context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private static void EnsureAvailable(HttpContext context, AuthRuntime auth, PasswordRecoveryRuntime recovery)
    {
        AuthEndpoints.EnsureAvailable(context, auth);
        if (!recovery.Enabled) throw new AuthFailure(503, "Dịch vụ đặt lại mật khẩu chưa được cấu hình.");
    }
}
