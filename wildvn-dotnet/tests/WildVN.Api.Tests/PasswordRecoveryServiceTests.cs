using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using WildVN.Application.Auth;
using Xunit;

namespace WildVN.Api.Tests;

public sealed class PasswordRecoveryServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 11, 0, 0, 0, TimeSpan.Zero);
    private static readonly ResetRecipient Recipient = new()
    {
        UserId = Guid.NewGuid(), Email = "reader@example.invalid", PasswordFingerprint = "old-password-fingerprint"
    };

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Known_and_unknown_requests_have_a_response_floor_and_only_eligible_users_are_queued(bool exists)
    {
        var store = new RecoveryStore { Recipient = exists ? Recipient : null };
        var mail = new MailProtector();
        var service = Service(store, mail: mail);
        var elapsed = Stopwatch.StartNew();

        await service.RequestAsync(Recipient.Email, CancellationToken.None);

        Assert.True(elapsed.Elapsed >= TimeSpan.FromMilliseconds(740), "Account lookup must not bypass the response floor.");
        Assert.Equal(Recipient.Email, store.LookupEmail);
        Assert.Equal(exists ? 1 : 0, store.QueueCalls);
        Assert.Equal(exists ? 1 : 0, mail.Calls);
    }

    [Fact]
    public async Task Request_queues_only_token_digest_and_protected_email_with_fifteen_minute_expiry()
    {
        var store = new RecoveryStore { Recipient = Recipient };
        var mail = new MailProtector();

        await Service(store, mail: mail).RequestAsync(Recipient.Email, CancellationToken.None);

        Assert.Equal(Recipient, store.QueuedRecipient);
        Assert.Equal(Recipient.Email, mail.Email);
        var link = new Uri(Assert.IsType<string>(mail.Link));
        Assert.Equal("https://wildvn.example/reset-password", link.GetLeftPart(UriPartial.Path));
        Assert.Equal("", link.Query);
        Assert.StartsWith("#token=", link.Fragment);
        var token = link.Fragment[7..];
        Assert.Matches("^[A-Za-z0-9_-]{43}$", token);
        Assert.Equal(32, Convert.FromBase64String(token.Replace('-', '+').Replace('_', '/') + "=").Length);
        Assert.Equal(Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))), store.TokenHash);
        Assert.Equal("protected-mail", store.EncryptedMail);
        Assert.DoesNotContain(token, store.EncryptedMail!);
        Assert.Equal(Now, store.Created);
        Assert.Equal(Now.AddMinutes(15), store.Expires);
    }

    [Fact]
    public async Task Repeated_requests_generate_independent_tokens()
    {
        var store = new RecoveryStore { Recipient = Recipient };
        var mail = new MailProtector();
        var service = Service(store, mail: mail);
        await service.RequestAsync(Recipient.Email, CancellationToken.None);
        var firstLink = mail.Link;
        var firstDigest = store.TokenHash;

        await service.RequestAsync(Recipient.Email, CancellationToken.None);

        Assert.NotEqual(firstLink, mail.Link);
        Assert.NotEqual(firstDigest, store.TokenHash);
    }

    [Fact]
    public async Task Request_preserves_dependency_failure_after_response_floor()
    {
        var failure = new InvalidOperationException("synthetic unavailable queue");
        var store = new RecoveryStore { Recipient = Recipient, QueueFailure = failure };
        var elapsed = Stopwatch.StartNew();

        var caught = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Service(store).RequestAsync(Recipient.Email, CancellationToken.None));

        Assert.Same(failure, caught);
        Assert.True(elapsed.Elapsed >= TimeSpan.FromMilliseconds(740));
    }

    [Fact]
    public async Task Cancelled_request_never_queues_or_waits_for_the_response_floor()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var store = new RecoveryStore { Recipient = Recipient };

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            Service(store).RequestAsync(Recipient.Email, cancellation.Token));

        Assert.Equal(0, store.QueueCalls);
        Assert.Equal(cancellation.Token, store.LastCancellation);
    }

    [Fact]
    public async Task Reset_passes_only_digest_and_password_hash_to_store_and_preserves_rejection()
    {
        const string token = "token-is-synthetic";
        const string password = "new-password-is-synthetic";
        var rejection = new AuthFailure(400, PasswordRecoveryService.InvalidToken);
        var store = new RecoveryStore { ResetFailure = rejection };
        var hasher = new PasswordHasher();
        using var cancellation = new CancellationTokenSource();

        var caught = await Assert.ThrowsAsync<AuthFailure>(() =>
            Service(store, hasher).ResetAsync(token, password, cancellation.Token));

        Assert.Same(rejection, caught);
        Assert.Equal(password, hasher.LastPassword);
        Assert.Equal(Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))), store.TokenHash);
        Assert.Equal("argon2-test-hash", store.PasswordHash);
        Assert.Equal(Now, store.Created);
        Assert.Equal(cancellation.Token, store.LastCancellation);
    }

    [Fact]
    public async Task Reset_success_completes_store_operation_without_issuing_a_session()
    {
        var store = new RecoveryStore();

        await Service(store).ResetAsync("synthetic-token", "synthetic-password", CancellationToken.None);

        Assert.Equal(1, store.ResetCalls);
        Assert.Equal(0, store.QueueCalls);
        Assert.Null(store.LookupEmail);
    }

    private static PasswordRecoveryService Service(RecoveryStore store, PasswordHasher? passwords = null,
        MailProtector? mail = null) => new(store, passwords ?? new PasswordHasher(), mail ?? new MailProtector(),
        new Uri("https://wildvn.example/reset-password"), new FixedClock());

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class PasswordHasher : ILegacyPasswordHasher
    {
        public string? LastPassword { get; private set; }
        public string Hash(string password) { LastPassword = password; return "argon2-test-hash"; }
        public bool Verify(string password, string? encodedHash) => throw new NotSupportedException();
    }

    private sealed class MailProtector : IResetMailProtector
    {
        public string? Email { get; private set; }
        public string? Link { get; private set; }
        public int Calls { get; private set; }
        public string Protect(string email, string link)
        {
            Email = email; Link = link; Calls++;
            return "protected-mail";
        }
    }

    private sealed class RecoveryStore : IPasswordRecoveryStore
    {
        public ResetRecipient? Recipient { get; init; }
        public Exception? QueueFailure { get; init; }
        public Exception? ResetFailure { get; init; }
        public string? LookupEmail { get; private set; }
        public ResetRecipient? QueuedRecipient { get; private set; }
        public string? TokenHash { get; private set; }
        public string? EncryptedMail { get; private set; }
        public string? PasswordHash { get; private set; }
        public DateTimeOffset Created { get; private set; }
        public DateTimeOffset Expires { get; private set; }
        public CancellationToken LastCancellation { get; private set; }
        public int QueueCalls { get; private set; }
        public int ResetCalls { get; private set; }

        public Task<ResetRecipient?> FindRecipientAsync(string email, CancellationToken cancellationToken)
        {
            LookupEmail = email; LastCancellation = cancellationToken;
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult(Recipient);
        }

        public Task QueueAsync(ResetRecipient recipient, string tokenHash, string encryptedMail,
            DateTimeOffset now, DateTimeOffset expires, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            QueuedRecipient = recipient; TokenHash = tokenHash; EncryptedMail = encryptedMail;
            Created = now; Expires = expires; LastCancellation = cancellationToken; QueueCalls++;
            return QueueFailure is null ? Task.CompletedTask : Task.FromException(QueueFailure);
        }

        public Task ResetAsync(string tokenHash, string passwordHash, DateTimeOffset now, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            TokenHash = tokenHash; PasswordHash = passwordHash; Created = now;
            LastCancellation = cancellationToken; ResetCalls++;
            return ResetFailure is null ? Task.CompletedTask : Task.FromException(ResetFailure);
        }
    }
}
