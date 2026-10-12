using System.Globalization;
using Microsoft.AspNetCore.WebUtilities;
using WildVN.Application.Auth;
using WildVN.Contracts;

namespace WildVN.Api.Auth;

internal static class AuthErrors
{
    public static IResult Result(HttpContext context, int status, string message) => Results.Json(
        new ErrorResponse(DateTime.Now.ToString("yyyy-MM-dd'T'HH:mm:ss.fffffff", CultureInfo.InvariantCulture),
            status, ReasonPhrases.GetReasonPhrase(status), message, context.Request.Path), statusCode: status);

    public static async Task Boundary(HttpContext context, RequestDelegate next)
    {
        try { await next(context); }
        catch (AuthFailure failure) { await Result(context, failure.Status, failure.Message).ExecuteAsync(context); }
        catch (BadHttpRequestException failure)
        { await Result(context, failure.StatusCode, "Dữ liệu không hợp lệ").ExecuteAsync(context); }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
        catch (Exception exception)
        {
            context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Auth")
                .LogError("Authentication request failed ({ExceptionType})", exception.GetType().Name);
            if (context.Response.HasStarted) throw;
            await Result(context, 503, "Dịch vụ xác thực chưa khả dụng, vui lòng thử lại sau").ExecuteAsync(context);
        }
    }
}
