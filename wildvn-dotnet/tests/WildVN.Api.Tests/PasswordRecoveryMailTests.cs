using System.Diagnostics;
using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using WildVN.Api.Auth;
using WildVN.Infrastructure.Auth;
using WildVN.Infrastructure.Data;
using Xunit;

namespace WildVN.Api.Tests;

public sealed class PasswordRecoveryMailTests
{
    internal static ResetMailPayload Payload => new()
    {
        Email = "recipient@example.invalid", Link = "https://web.example.invalid/reset-password#token=" + new string('A', 43)
    };

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Sender_delivers_actual_mime_message_only_after_TLS_and_authentication(bool implicitTls)
    {
        await using var smtp = new RecoverySmtpFixture { UseImplicitTls = implicitTls };
        await smtp.CreateSender().SendAsync(Payload, CancellationToken.None);
        Assert.Equal(1, smtp.TlsConnections);
        Assert.Equal(1, smtp.AuthenticatedConnections);
        var message = Assert.Single(smtp.Messages);
        Assert.Equal("recipient@example.invalid", Assert.Single(message.To.Mailboxes).Address);
        Assert.Equal("sender@example.invalid", Assert.Single(message.From.Mailboxes).Address);
        Assert.Equal("Đặt lại mật khẩu WildVN", message.Subject);
        Assert.Contains(Payload.Link, message.TextBody);
        Assert.Contains("15 phút", message.TextBody);
        Assert.Null(message.HtmlBody);
    }

    [Fact]
    public async Task Sender_refuses_plaintext_server_without_STARTTLS()
    {
        await using var smtp = new RecoverySmtpFixture(loadCertificate: false) { AdvertiseStartTls = false };
        await Assert.ThrowsAsync<NotSupportedException>(() => smtp.CreateSender().SendAsync(Payload, CancellationToken.None));
        Assert.Empty(smtp.Messages);
        Assert.Equal(0, smtp.AuthenticatedConnections);
    }

    [Fact]
    public async Task Sender_keeps_default_certificate_validation_and_rejects_untrusted_server()
    {
        await using var smtp = new RecoverySmtpFixture(untrustedCertificate: true);
        await Assert.ThrowsAsync<MailKit.Security.SslHandshakeException>(() => smtp.CreateSender().SendAsync(Payload, CancellationToken.None));
        Assert.Empty(smtp.Messages);
        Assert.Equal(0, smtp.AuthenticatedConnections);
    }

    [Fact]
    public async Task Sender_does_not_send_when_authentication_is_rejected()
    {
        await using var smtp = new RecoverySmtpFixture { AcceptAuthentication = false };
        await Assert.ThrowsAsync<MailKit.Security.AuthenticationException>(() => smtp.CreateSender().SendAsync(Payload, CancellationToken.None));
        Assert.Empty(smtp.Messages);
        Assert.Equal(1, smtp.TlsConnections);
    }

    [Fact]
    public async Task Sender_can_be_cancelled_while_server_stalls()
    {
        await using var smtp = new RecoverySmtpFixture(loadCertificate: false) { StallGreeting = true };
        using var cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => smtp.CreateSender().SendAsync(Payload, cancellation.Token));
        Assert.Empty(smtp.Messages);
    }

    [Fact]
    public async Task Sender_times_out_without_waiting_indefinitely_for_server_greeting()
    {
        await using var smtp = new RecoverySmtpFixture(loadCertificate: false) { StallGreeting = true };
        var elapsed = Stopwatch.StartNew();
        var exception = await Record.ExceptionAsync(() => smtp.CreateSender().SendAsync(Payload, CancellationToken.None));
        Assert.IsType<TimeoutException>(exception);
        Assert.InRange(elapsed.Elapsed.TotalSeconds, 8, 18);
        Assert.Empty(smtp.Messages);
    }

    [Fact]
    public void Protected_mail_survives_keyring_reload_and_detects_tampering()
    {
        var directory = Path.Combine(Path.GetTempPath(), "wildvn-mail-keys-" + Guid.NewGuid().ToString("N"));
        try
        {
            var first = new ResetMailProtector(DataProtectionProvider.Create(new DirectoryInfo(directory)));
            var encrypted = first.Protect(Payload.Email, Payload.Link);
            Assert.DoesNotContain(Payload.Email, encrypted);
            Assert.DoesNotContain(new string('A', 43), encrypted);
            var restarted = new ResetMailProtector(DataProtectionProvider.Create(new DirectoryInfo(directory)));
            var restored = restarted.Unprotect(encrypted);
            Assert.Equal(Payload.Email, restored.Email);
            Assert.Equal(Payload.Link, restored.Link);
            var middle = encrypted.Length / 2;
            var changed = encrypted[..middle] + (encrypted[middle] == 'A' ? "B" : "A") + encrypted[(middle + 1)..];
            Assert.Throws<CryptographicException>(() => restarted.Unprotect(changed));
            Assert.Throws<CryptographicException>(() => new ResetMailProtector(new EphemeralDataProtectionProvider()).Unprotect(encrypted));
        }
        finally { if (Directory.Exists(directory)) Directory.Delete(directory, true); }
    }

    [Theory]
    [InlineData("Name <recipient@example.invalid>", "https://web.example.invalid/reset-password#token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("a@example.invalid\r\nBcc: leak@example.invalid", "https://web.example.invalid/reset-password#token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("recipient@example.invalid", "http://external.example/reset-password#token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("recipient@example.invalid", "https://web.example.invalid/reset-password?token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("recipient@example.invalid", "https://web.example.invalid/reset-password#token=short")]
    public void Protector_rejects_mailbox_injection_and_unsafe_or_invalid_links(string email, string link)
    {
        var protector = new ResetMailProtector(new EphemeralDataProtectionProvider());
        Assert.Throws<ArgumentException>(() => protector.Protect(email, link));
    }

    [Theory]
    [InlineData("not a host", 587, "sender@example.invalid", "fixture", "fixture")]
    [InlineData("localhost", 0, "sender@example.invalid", "fixture", "fixture")]
    [InlineData("localhost", 65536, "sender@example.invalid", "fixture", "fixture")]
    [InlineData("localhost", 587, "sender@example.invalid\r\nBcc: leak@example.invalid", "fixture", "fixture")]
    [InlineData("localhost", 587, "sender@example.invalid", "", "fixture")]
    [InlineData("localhost", 587, "sender@example.invalid", "fixture", "")]
    [InlineData("localhost", 587, "sender@example.invalid", "fixture\r\n", "fixture")]
    [InlineData("localhost", 587, "sender@example.invalid", "fixture", "fixture\n")]
    public void Sender_rejects_invalid_or_injected_settings_before_network_access(
        string host, int port, string from, string username, string password)
    {
        Assert.Throws<ArgumentException>(() => new SmtpResetMail(new()
        {
            Host = host, Port = port, FromAddress = from, Username = username, Password = password
        }));
    }

    [Fact]
    public async Task Sender_and_protector_reject_missing_payloads_before_network_access()
    {
        var protector = new ResetMailProtector(new EphemeralDataProtectionProvider());
        Assert.Throws<ArgumentNullException>(() => new ResetMailProtector(null!));
        Assert.Throws<ArgumentException>(() => protector.Unprotect(""));
        Assert.Throws<ArgumentNullException>(() => new SmtpResetMail(null!));
        var sender = new SmtpResetMail(new()
        {
            Host = "localhost", Port = 1, FromAddress = "sender@example.invalid", Username = "fixture", Password = "fixture"
        });
        await Assert.ThrowsAsync<ArgumentNullException>(() => sender.SendAsync(null!, CancellationToken.None));
    }
}

[Collection(RecoveryDatabaseCollection.Name)]
public sealed class PasswordRecoveryMailWorkerTests(RecoveryDatabaseFixture fixture)
{
    [Fact]
    public async Task Competing_workers_deliver_once_and_wipe_the_encrypted_payload()
    {
        var clock = new RecoveryTestClock();
        var protector = new ResetMailProtector(new EphemeralDataProtectionProvider());
        var id = await QueueAsync(clock, protector);
        await using var smtp = new RecoverySmtpFixture();
        await using var provider = Provider(smtp, protector);
        using var first = Worker(provider, clock);
        using var second = Worker(provider, clock);
        await first.StartAsync(CancellationToken.None);
        await second.StartAsync(CancellationToken.None);
        try { await WaitAsync(async () => (await JobAsync(id)).DeliveredAt != null); }
        finally { await first.StopAsync(CancellationToken.None); await second.StopAsync(CancellationToken.None); }
        var job = await JobAsync(id);
        Assert.Single(smtp.Messages);
        Assert.Equal(1, job.Attempts);
        Assert.Equal("", job.EncryptedPayload);
        Assert.Null(job.LeaseUntil);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Expired_or_consumed_requests_are_suppressed_without_SMTP_connections(bool consumed)
    {
        var clock = new RecoveryTestClock();
        var protector = new ResetMailProtector(new EphemeralDataProtectionProvider());
        var id = await QueueAsync(clock, protector, consumed: consumed, expired: !consumed);
        await using var smtp = new RecoverySmtpFixture();
        await using var provider = Provider(smtp, protector);
        using var worker = Worker(provider, clock);
        await worker.StartAsync(CancellationToken.None);
        try { await WaitAsync(async () => (await JobAsync(id)).DeliveredAt != null); }
        finally { await worker.StopAsync(CancellationToken.None); }
        Assert.Equal(0, smtp.Connections);
        Assert.Equal("", (await JobAsync(id)).EncryptedPayload);
    }

    [Fact]
    public async Task Failed_delivery_is_retried_with_same_payload_then_wiped_after_success()
    {
        var clock = new RecoveryTestClock();
        var protector = new ResetMailProtector(new EphemeralDataProtectionProvider());
        var id = await QueueAsync(clock, protector);
        await using (var rejected = new RecoverySmtpFixture { AcceptAuthentication = false })
        {
            await using var provider = Provider(rejected, protector);
            using var worker = Worker(provider, clock);
            await worker.StartAsync(CancellationToken.None);
            try { await WaitAsync(async () => { var row = await JobAsync(id); return row.Attempts == 1 && row.LeaseUntil == null; }); }
            finally { await worker.StopAsync(CancellationToken.None); }
            Assert.Empty(rejected.Messages);
        }
        var failed = await JobAsync(id);
        Assert.Null(failed.DeliveredAt);
        Assert.Equal(clock.GetUtcNow().AddMinutes(1), failed.NextAttemptAt);
        Assert.NotEmpty(failed.EncryptedPayload);
        clock.Advance(TimeSpan.FromMinutes(1));
        await using var accepted = new RecoverySmtpFixture();
        await using var secondProvider = Provider(accepted, protector);
        using var retry = Worker(secondProvider, clock);
        await retry.StartAsync(CancellationToken.None);
        try { await WaitAsync(async () => (await JobAsync(id)).DeliveredAt != null); }
        finally { await retry.StopAsync(CancellationToken.None); }
        var delivered = await JobAsync(id);
        Assert.Equal(2, delivered.Attempts);
        Assert.Equal("", delivered.EncryptedPayload);
        Assert.Contains(protector.Unprotect(failed.EncryptedPayload).Link, Assert.Single(accepted.Messages).TextBody);
    }

    [Fact]
    public async Task Fifth_delivery_failure_is_terminal_and_wipes_payload()
    {
        var clock = new RecoveryTestClock();
        var protector = new ResetMailProtector(new EphemeralDataProtectionProvider());
        var id = await QueueAsync(clock, protector, attempts: 4);
        await using var smtp = new RecoverySmtpFixture { AcceptAuthentication = false };
        await using var provider = Provider(smtp, protector);
        using var worker = Worker(provider, clock);
        await worker.StartAsync(CancellationToken.None);
        try { await WaitAsync(async () => (await JobAsync(id)).DeliveredAt != null); }
        finally { await worker.StopAsync(CancellationToken.None); }
        var job = await JobAsync(id);
        Assert.Equal(5, job.Attempts);
        Assert.Equal("", job.EncryptedPayload);
        Assert.Null(job.LeaseUntil);
        Assert.Empty(smtp.Messages);
    }

    [Fact]
    public async Task Exhausted_unleased_job_is_abandoned_without_another_delivery_attempt()
    {
        var clock = new RecoveryTestClock();
        var protector = new ResetMailProtector(new EphemeralDataProtectionProvider());
        var id = await QueueAsync(clock, protector, attempts: 5);
        await using var smtp = new RecoverySmtpFixture();
        await using var provider = Provider(smtp, protector);
        using var worker = Worker(provider, clock);
        await worker.StartAsync(CancellationToken.None);
        try { await WaitAsync(async () => (await JobAsync(id)).DeliveredAt != null); }
        finally { await worker.StopAsync(CancellationToken.None); }
        var job = await JobAsync(id);
        Assert.Equal(5, job.Attempts);
        Assert.Equal("", job.EncryptedPayload);
        Assert.Null(job.LeaseUntil);
        Assert.Equal(0, smtp.Connections);
    }

    [Fact]
    public async Task Shutdown_during_delivery_preserves_payload_and_lease_for_recovery()
    {
        var clock = new RecoveryTestClock();
        var protector = new ResetMailProtector(new EphemeralDataProtectionProvider());
        var id = await QueueAsync(clock, protector);
        await using var smtp = new RecoverySmtpFixture(loadCertificate: false) { StallGreeting = true };
        await using var provider = Provider(smtp, protector);
        using var worker = Worker(provider, clock);
        await worker.StartAsync(CancellationToken.None);
        try { await WaitAsync(() => Task.FromResult(smtp.Connections > 0)); }
        finally { await worker.StopAsync(CancellationToken.None); }
        var job = await JobAsync(id);
        Assert.Null(job.DeliveredAt);
        Assert.NotEmpty(job.EncryptedPayload);
        Assert.Equal(clock.GetUtcNow().AddSeconds(60), job.LeaseUntil);
    }

    [Fact]
    public async Task Retention_deletes_old_requests_and_outbox_but_preserves_credential_versions()
    {
        var clock = new RecoveryTestClock();
        var protector = new ResetMailProtector(new EphemeralDataProtectionProvider());
        var id = await QueueAsync(clock, protector, retentionExpired: true);
        Guid userId;
        await using (var context = fixture.CreateContext())
        {
            var job = await context.PasswordResetOutbox.SingleAsync(row => row.Id == id);
            userId = (await context.PasswordResetRequests.SingleAsync(row => row.TokenHash == job.TokenHash)).UserId;
            context.CredentialVersions.Add(new() { UserId = userId, Version = Guid.NewGuid(), ChangedAt = clock.GetUtcNow() });
            await context.SaveChangesAsync();
        }
        await using var smtp = new RecoverySmtpFixture();
        await using var provider = Provider(smtp, protector);
        using var worker = Worker(provider, clock);
        await worker.StartAsync(CancellationToken.None);
        try
        {
            await WaitAsync(async () => { await using var context = fixture.CreateContext(); return !await context.PasswordResetOutbox.AnyAsync(row => row.Id == id); });
        }
        finally { await worker.StopAsync(CancellationToken.None); }
        await using var verify = fixture.CreateContext();
        Assert.False(await verify.PasswordResetRequests.AnyAsync(row => row.UserId == userId));
        Assert.True(await verify.CredentialVersions.AnyAsync(row => row.UserId == userId));
        Assert.Equal(0, smtp.Connections);
    }

    private async Task<Guid> QueueAsync(RecoveryTestClock clock, ResetMailProtector protector,
        bool expired = false, bool consumed = false, int attempts = 0, bool retentionExpired = false)
    {
        await using var context = fixture.CreateContext();
        // All DB recovery tests share a non-parallel collection; isolate worker queues.
        await context.PasswordResetRequests.ExecuteDeleteAsync();
        var now = clock.GetUtcNow();
        var userId = Guid.NewGuid();
        var email = userId.ToString("N") + "@example.invalid";
        var tokenHash = WildVN.Application.Auth.PasswordRecoveryService.Hash(new string('A', 43));
        context.Users.Add(new()
        {
            Id = userId, Username = "mail_" + userId.ToString("N"), Email = email,
            PasswordHash = "synthetic-only-password-hash", AuthProvider = AuthProvider.LOCAL,
            Role = UserRole.USER, CreatedAt = now, UpdatedAt = now
        });
        context.PasswordResetRequests.Add(new()
        {
            TokenHash = tokenHash, UserId = userId,
            PasswordFingerprint = WildVN.Application.Auth.PasswordRecoveryService.Hash("synthetic-only-password-hash"),
            CreatedAt = retentionExpired ? now.AddHours(-26) : now.AddMinutes(-1),
            ExpiresAt = retentionExpired ? now.AddHours(-25) : expired ? now : now.AddMinutes(15),
            ConsumedAt = consumed ? now : null
        });
        var id = Guid.NewGuid();
        context.PasswordResetOutbox.Add(new()
        {
            Id = id, TokenHash = tokenHash, EncryptedPayload = protector.Protect(email,
                PasswordRecoveryMailTests.Payload.Link), CreatedAt = now, NextAttemptAt = now, Attempts = attempts
        });
        await context.SaveChangesAsync();
        return id;
    }

    private ServiceProvider Provider(RecoverySmtpFixture smtp, ResetMailProtector protector) => new ServiceCollection()
        .AddScoped(_ => fixture.CreateContext()).AddSingleton(protector).AddSingleton(smtp.CreateSender()).BuildServiceProvider();

    private static ResetMailWorker Worker(IServiceProvider provider, TimeProvider clock) => new(
        provider.GetRequiredService<IServiceScopeFactory>(), NullLogger<ResetMailWorker>.Instance, clock);

    private async Task<PasswordResetMailRow> JobAsync(Guid id)
    {
        await using var context = fixture.CreateContext();
        return await context.PasswordResetOutbox.AsNoTracking().SingleAsync(row => row.Id == id);
    }

    private static async Task WaitAsync(Func<Task<bool>> condition)
    {
        var elapsed = Stopwatch.StartNew();
        while (elapsed.Elapsed < TimeSpan.FromSeconds(8))
        {
            if (await condition()) return;
            await Task.Delay(50);
        }
        throw new TimeoutException("Recovery mail worker did not reach the expected durable state.");
    }
}
