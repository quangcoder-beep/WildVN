using System.Globalization;
using Microsoft.AspNetCore.WebUtilities;
using WildVN.Contracts;
using WildVN.Api.Auth;

// WebApplication.CreateBuilder loads environment configuration and secret providers.
// Auth is opt-in with explicit host settings; no schema creation or migration pipeline.
var builder = WebApplication.CreateBuilder(args);
builder.Services.ConfigureHttpJsonOptions(options => ContractJson.Configure(options.SerializerOptions));
builder.Services.AddSingleton<IDependencyReadinessProbe, UnverifiedDependencies>();
builder.AddWildVnAuth();
var app = builder.Build();

app.Use(AuthSecurity.ResponseHeaders);
app.Use(AuthErrors.Boundary);
app.UseRouting();
app.UseCors("AuthOrigins");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.Use(AuthSecurity.CsrfBoundary);

app.UseStatusCodePages(async context =>
{
    var response = context.HttpContext.Response;
    var reason = ReasonPhrases.GetReasonPhrase(response.StatusCode);
    await response.WriteAsJsonAsync(new ErrorResponse(
        DateTime.Now.ToString("yyyy-MM-dd'T'HH:mm:ss.fffffff", CultureInfo.InvariantCulture),
        response.StatusCode, reason,
        response.StatusCode == 404 ? "Chức năng chưa khả dụng" : "Yêu cầu không hợp lệ",
        context.HttpContext.Request.Path));
});
app.MapGet("/health/live", () => Results.Ok(new { status = "alive" }));
app.MapAuth();
app.MapGet("/health/ready", async (IDependencyReadinessProbe probe,
    ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    bool ready;
    try
    {
        ready = await probe.IsReadyAsync(cancellationToken);
    }
    catch (Exception exception) when (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
    {
        logger.LogWarning("Dependency readiness probe failed ({ExceptionType})", exception.GetType().Name);
        ready = false;
    }
    return Results.Json(new { status = ready ? "ready" : "notReady" }, statusCode: ready ? 200 : 503);
});
app.Run();

public partial class Program;

public interface IDependencyReadinessProbe
{
    ValueTask<bool> IsReadyAsync(CancellationToken cancellationToken);
}

internal sealed class UnverifiedDependencies : IDependencyReadinessProbe
{
    public ValueTask<bool> IsReadyAsync(CancellationToken cancellationToken) => ValueTask.FromResult(false);
}
