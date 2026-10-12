using Microsoft.EntityFrameworkCore;
using WildVN.Infrastructure.Auth;
using WildVN.Infrastructure.Data;

namespace WildVN.Api.Auth;

// SMTP and the database cannot commit atomically: delivery is at least once.
// Retries always deliver the same one-time token, never create a replacement token.
public sealed class ResetMailWorker(IServiceScopeFactory scopes, ILogger<ResetMailWorker> logger,
    TimeProvider clock) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogWarning("Recovery mail worker failed ({ExceptionType})", exception.GetType().Name);
            }
            try { await Task.Delay(TimeSpan.FromSeconds(5), clock, stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }

    private async Task ProcessAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopes.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<WildVnDbContext>();
        var now = clock.GetUtcNow();
        await PurgeAsync(database, now, cancellationToken);
        await database.PasswordResetOutbox.Where(row => row.DeliveredAt == null && row.Attempts >= 5 &&
                (row.LeaseUntil == null || row.LeaseUntil <= now))
            .ExecuteUpdateAsync(update => update.SetProperty(row => row.DeliveredAt, now)
                .SetProperty(row => row.EncryptedPayload, "").SetProperty(row => row.LeaseUntil, (DateTimeOffset?)null),
                cancellationToken);
        var candidate = await database.PasswordResetOutbox.AsNoTracking().Where(row => row.DeliveredAt == null &&
                row.NextAttemptAt <= now && (row.LeaseUntil == null || row.LeaseUntil <= now) && row.Attempts < 5)
            .OrderBy(row => row.NextAttemptAt).ThenBy(row => row.CreatedAt).ThenBy(row => row.Id)
            .Select(row => (Guid?)row.Id).FirstOrDefaultAsync(cancellationToken);
        if (candidate is null) return;
        var lease = now.AddSeconds(60);
        var claimed = await database.PasswordResetOutbox.Where(row => row.Id == candidate.Value &&
                row.DeliveredAt == null && row.NextAttemptAt <= now && row.Attempts < 5 &&
                (row.LeaseUntil == null || row.LeaseUntil <= now))
            .ExecuteUpdateAsync(update => update.SetProperty(row => row.Attempts, row => row.Attempts + 1)
                .SetProperty(row => row.LeaseUntil, lease), cancellationToken);
        if (claimed == 0) return;
        var job = await database.PasswordResetOutbox.AsNoTracking()
            .SingleAsync(row => row.Id == candidate.Value && row.LeaseUntil == lease, cancellationToken);
        await DeliverAsync(scope.ServiceProvider, database, job, lease, cancellationToken);
    }

    private async Task DeliverAsync(IServiceProvider services, WildVnDbContext database,
        PasswordResetMailRow job, DateTimeOffset lease, CancellationToken stoppingToken)
    {
        var now = clock.GetUtcNow();
        if (!await database.PasswordResetRequests.AsNoTracking().AnyAsync(row => row.TokenHash == job.TokenHash &&
                row.ConsumedAt == null && row.ExpiresAt > now, stoppingToken))
        {
            await FinishAsync(database, job.Id, lease, true, stoppingToken);
            return;
        }
        try
        {
            var payload = services.GetRequiredService<ResetMailProtector>().Unprotect(job.EncryptedPayload);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(20));
            await services.GetRequiredService<SmtpResetMail>().SendAsync(payload, timeout.Token);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Do not acknowledge shutdown: the lease permits another worker to retry.
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning("Recovery mail delivery failed ({ExceptionType})", exception.GetType().Name);
            await FinishAsync(database, job.Id, lease, job.Attempts >= 5, stoppingToken);
            return;
        }
        await FinishAsync(database, job.Id, lease, true, stoppingToken);
    }

    private Task<int> FinishAsync(WildVnDbContext database, Guid id, DateTimeOffset lease,
        bool terminal, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var owned = database.PasswordResetOutbox.Where(row => row.Id == id && row.LeaseUntil == lease && row.DeliveredAt == null);
        return terminal
            ? owned.ExecuteUpdateAsync(update => update.SetProperty(row => row.DeliveredAt, now)
                .SetProperty(row => row.EncryptedPayload, "").SetProperty(row => row.LeaseUntil, (DateTimeOffset?)null), cancellationToken)
            : owned.ExecuteUpdateAsync(update => update.SetProperty(row => row.NextAttemptAt, now.AddMinutes(1))
                .SetProperty(row => row.LeaseUntil, (DateTimeOffset?)null), cancellationToken);
    }

    private static async Task PurgeAsync(WildVnDbContext database, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var cutoff = now.AddHours(-24);
        var expired = await database.PasswordResetRequests.AsNoTracking().Where(row => row.ExpiresAt < cutoff)
            .OrderBy(row => row.ExpiresAt).Select(row => row.TokenHash).Take(100).ToArrayAsync(cancellationToken);
        if (expired.Length > 0)
            await database.PasswordResetRequests.Where(row => expired.Contains(row.TokenHash)).ExecuteDeleteAsync(cancellationToken);
    }
}
