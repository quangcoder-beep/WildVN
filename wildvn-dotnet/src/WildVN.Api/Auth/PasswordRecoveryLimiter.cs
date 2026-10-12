using System.Collections.Immutable;
using WildVN.Application.Auth;

namespace WildVN.Api.Auth;

// Bounded, one-process limiter: registration requires Auth:ReplicaCount=1.
internal sealed class PasswordRecoveryLimiter(TimeProvider clock)
{
    private sealed record Window(DateTimeOffset Start, int Used);
    private readonly object gate = new();
    private ImmutableDictionary<string, Window> windows = ImmutableDictionary<string, Window>.Empty;

    public void Acquire(string address, string? email)
    {
        var keys = email is null ? new[] { "ip:" + address } :
            new[] { "ip:" + address, "mail:" + PasswordRecoveryService.Hash(email.ToLowerInvariant()) };
        lock (gate)
        {
            var now = clock.GetUtcNow();
            windows = windows.RemoveRange(windows.Where(pair => now - pair.Value.Start >= TimeSpan.FromHours(1))
                .Select(pair => pair.Key));
            if (windows.Count + keys.Count(key => !windows.ContainsKey(key)) > 16384 ||
                keys.Any(key => windows.TryGetValue(key, out var value) && value.Used >= (key.StartsWith("mail:") ? 3 : 5)))
                throw new AuthFailure(429, "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một giờ rồi thử lại.");
            foreach (var key in keys)
            {
                var previous = windows.TryGetValue(key, out var value) ? value : new Window(now, 0);
                windows = windows.SetItem(key, previous with { Used = previous.Used + 1 });
            }
        }
    }
}
