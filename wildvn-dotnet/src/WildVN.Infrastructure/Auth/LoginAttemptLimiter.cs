using System.Collections.Immutable;
using WildVN.Application.Auth;

namespace WildVN.Infrastructure.Auth;

// One process only. Host registration rejects more than one replica until a shared limiter exists.
public sealed class LoginAttemptLimiter(TimeProvider clock) : ILoginAttemptLimiter
{
    private sealed record Window(DateTimeOffset Start, int Used);
    private readonly object gate = new();
    private ImmutableDictionary<string, Window> windows = ImmutableDictionary<string, Window>.Empty;
    private DateTimeOffset lastCleanup;
    private const int MaximumKeys = 16384;

    public bool TryAcquire(string username)
    {
        var key = username.ToLowerInvariant();
        lock (gate)
        {
            var now = clock.GetUtcNow();
            if (now - lastCleanup >= TimeSpan.FromMinutes(1))
            {
                windows = windows.RemoveRange(windows.Where(pair =>
                    now - pair.Value.Start >= TimeSpan.FromMinutes(1)).Select(pair => pair.Key));
                lastCleanup = now;
            }
            if (!windows.TryGetValue(key, out var window))
            {
                if (windows.Count >= MaximumKeys) return false;
                window = new Window(now, 0);
            }
            if (now - window.Start >= TimeSpan.FromMinutes(1)) window = new Window(now, 0);
            if (window.Used >= 5) return false;
            windows = windows.SetItem(key, window with { Used = window.Used + 1 });
            return true;
        }
    }
}
