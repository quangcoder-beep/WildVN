using System.Security.Cryptography;
using System.Text;

namespace WildVN.Application.Auth;

public sealed class ResetRecipient
{
    public required Guid UserId { get; init; }
    public required string Email { get; init; }
    public required string PasswordFingerprint { get; init; }
}

public interface IPasswordRecoveryStore
{
    Task<ResetRecipient?> FindRecipientAsync(string email, CancellationToken cancellationToken);
    Task QueueAsync(ResetRecipient recipient, string tokenHash, string encryptedMail,
        DateTimeOffset now, DateTimeOffset expires, CancellationToken cancellationToken);
    Task ResetAsync(string tokenHash, string passwordHash, DateTimeOffset now, CancellationToken cancellationToken);
}

public interface IResetMailProtector
{
    string Protect(string email, string link);
}

public sealed class PasswordRecoveryService(IPasswordRecoveryStore store, ILegacyPasswordHasher passwords,
    IResetMailProtector mail, Uri resetPage, TimeProvider clock)
{
    public const string Requested = "Nếu tài khoản phù hợp tồn tại, bạn sẽ nhận được email đặt lại mật khẩu.";
    public const string Changed = "Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.";
    public const string InvalidToken = "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.";

    public async Task RequestAsync(string email, CancellationToken cancellationToken)
    {
        var started = clock.GetTimestamp();
        var minimum = TimeSpan.FromMilliseconds(750 + RandomNumberGenerator.GetInt32(250));
        try
        {
            var recipient = await store.FindRecipientAsync(email, cancellationToken);
            if (recipient is null) return;
            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
            var now = clock.GetUtcNow();
            // Fragment never reaches web server/access logs; the client captures and clears it.
            var payload = mail.Protect(recipient.Email, resetPage.AbsoluteUri + "#token=" + token);
            await store.QueueAsync(recipient, Hash(token), payload, now, now.AddMinutes(15), cancellationToken);
        }
        finally
        {
            // Also applies to missing/ineligible accounts and suppressed cooldown requests.
            // A bounded floor masks normal DB/write differences, not unusually slow dependencies.
            var remaining = minimum - clock.GetElapsedTime(started);
            if (remaining > TimeSpan.Zero) await Task.Delay(remaining, clock, cancellationToken);
        }
    }

    public Task ResetAsync(string token, string password, CancellationToken cancellationToken) =>
        store.ResetAsync(Hash(token), passwords.Hash(password), clock.GetUtcNow(), cancellationToken);

    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
