using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;
using System.Data.Common;
using WildVN.Application.Auth;
using WildVN.Infrastructure.Auth;
using WildVN.Infrastructure.Data;
using Xunit;

namespace WildVN.Api.Tests;

[Collection(RecoveryDatabaseCollection.Name)]
public sealed class PasswordRecoveryDatabaseTests(RecoveryDatabaseFixture fixture)
{
    private static readonly CancellationToken Cancel = CancellationToken.None;

    [Fact]
    public async Task Queue_persists_hash_and_encrypted_outbox_with_fifteen_minute_expiry()
    {
        var clock = new RecoveryTestClock();
        var user = await SeedUser();
        await using var db = fixture.CreateContext();
        var store = new PostgresPasswordRecoveryStore(db, clock);
        var recipient = await store.FindRecipientAsync(user.Email.ToUpperInvariant(), Cancel);
        Assert.NotNull(recipient);
        var tokenHash = PasswordRecoveryService.Hash("synthetic-secret-token");
        await Queue(store, recipient, tokenHash, clock);
        var row = await db.PasswordResetRequests.AsNoTracking().SingleAsync(row => row.TokenHash == tokenHash);
        var mail = await db.PasswordResetOutbox.AsNoTracking().SingleAsync(row => row.TokenHash == tokenHash);
        Assert.Equal(clock.GetUtcNow(), row.CreatedAt);
        Assert.Equal(clock.GetUtcNow().AddMinutes(15), row.ExpiresAt);
        Assert.Equal(PasswordRecoveryService.Hash(user.PasswordHash + "\0" + user.Email), row.PasswordFingerprint);
        Assert.Equal("encrypted-test-payload", mail.EncryptedPayload);
        Assert.Equal(0, mail.Attempts);
        Assert.Null(mail.DeliveredAt);
        Assert.DoesNotContain("synthetic-secret-token", row.TokenHash);
    }

    [Fact]
    public async Task Requests_inside_sixty_seconds_do_not_queue_more_mail()
    {
        var clock = new RecoveryTestClock();
        var user = await SeedUser();
        await using var db = fixture.CreateContext();
        var store = new PostgresPasswordRecoveryStore(db, clock);
        var recipient = (await store.FindRecipientAsync(user.Email, Cancel))!;
        await Queue(store, recipient, NewToken(), clock);
        clock.Advance(TimeSpan.FromSeconds(59));
        await Queue(store, recipient, NewToken(), clock);
        Assert.Equal(1, await db.PasswordResetRequests.CountAsync(row => row.UserId == user.Id));
        clock.Advance(TimeSpan.FromSeconds(1));
        await Queue(store, recipient, NewToken(), clock);
        Assert.Equal(2, await db.PasswordResetRequests.CountAsync(row => row.UserId == user.Id));
    }

    [Fact]
    public async Task Unknown_social_deleted_and_ambiguous_case_addresses_are_ineligible()
    {
        var social = await SeedUser(provider: AuthProvider.GOOGLE);
        var deleted = await SeedUser(deleted: true);
        var noPassword = await SeedUser(password: null);
        var ambiguous = await SeedUser();
        await SeedUser(email: ambiguous.Email.ToUpperInvariant());
        await using var db = fixture.CreateContext();
        var store = new PostgresPasswordRecoveryStore(db, new RecoveryTestClock());
        foreach (var email in new[] { "absent-" + Guid.NewGuid() + "@example.invalid", social.Email, deleted.Email, noPassword.Email, ambiguous.Email })
            Assert.Null(await store.FindRecipientAsync(email, Cancel));
    }

    [Fact]
    public async Task Reset_changes_password_rotates_version_and_revokes_all_sessions_and_tokens()
    {
        var clock = new RecoveryTestClock();
        var user = await SeedUser();
        var token = await SeedRequest(user, clock);
        clock.Advance(TimeSpan.FromMinutes(1));
        var second = await SeedRequest(user, clock);
        var previousVersion = Guid.NewGuid();
        await using (var seed = fixture.CreateContext())
        {
            seed.CredentialVersions.Add(new CredentialVersionRow { UserId = user.Id, Version = previousVersion, ChangedAt = clock.GetUtcNow() });
            seed.UserSessions.Add(new UserSessionRow { Id = Guid.NewGuid(), UserId = user.Id, RefreshTokenHash = Guid.NewGuid().ToString(), CreatedAt = clock.GetUtcNow(), ExpiresAt = clock.GetUtcNow().AddDays(1) });
            await seed.SaveChangesAsync();
        }
        clock.Advance(TimeSpan.FromSeconds(2));
        await using (var reset = fixture.CreateContext())
            await new PostgresPasswordRecoveryStore(reset, clock).ResetAsync(token, "replacement-hash", clock.GetUtcNow(), Cancel);
        await using var db = fixture.CreateContext();
        var changed = await db.Users.AsNoTracking().SingleAsync(row => row.Id == user.Id);
        Assert.Equal("replacement-hash", changed.PasswordHash);
        Assert.Equal(clock.GetUtcNow(), changed.UpdatedAt);
        var version = await db.CredentialVersions.AsNoTracking().SingleAsync(row => row.UserId == user.Id);
        Assert.NotEqual(previousVersion, version.Version);
        Assert.Equal(clock.GetUtcNow(), version.ChangedAt);
        Assert.All(await db.UserSessions.Where(row => row.UserId == user.Id).ToListAsync(), row => Assert.Equal(clock.GetUtcNow(), row.RevokedAt));
        Assert.All(await db.PasswordResetRequests.Where(row => row.UserId == user.Id).ToListAsync(), row => Assert.Equal(clock.GetUtcNow(), row.ConsumedAt));
        Assert.Equal(2, await db.PasswordResetRequests.CountAsync(row => row.TokenHash == token || row.TokenHash == second));
        var account = await new PostgresAuthStore(db).FindByUsernameAsync(user.Username, Cancel);
        Assert.NotNull(account);
        Assert.Equal(changed.PasswordHash, account.PasswordHash);
        Assert.Equal(version.Version, account.CredentialVersion);
    }

    [Fact]
    public async Task Concurrent_reset_of_same_token_has_exactly_one_winner()
    {
        var clock = new RecoveryTestClock();
        var user = await SeedUser();
        var token = await SeedRequest(user, clock);
        async Task<bool> Attempt(string hash)
        {
            await using var db = fixture.CreateContext();
            try { await new PostgresPasswordRecoveryStore(db, clock).ResetAsync(token, hash, clock.GetUtcNow(), Cancel); return true; }
            catch (AuthFailure failure) { Assert.Equal(400, failure.Status); return false; }
        }
        var results = await Task.WhenAll(Attempt("first-hash"), Attempt("second-hash"));
        Assert.Equal(1, results.Count(success => success));
        await using var check = fixture.CreateContext();
        var hash = await check.Users.Where(row => row.Id == user.Id).Select(row => row.PasswordHash).SingleAsync();
        Assert.Equal(results[0] ? "first-hash" : "second-hash", hash);
    }

    [Fact]
    public async Task Expired_and_consumed_tokens_are_rejected_without_password_changes()
    {
        var clock = new RecoveryTestClock();
        var user = await SeedUser();
        var token = await SeedRequest(user, clock);
        clock.Advance(TimeSpan.FromMinutes(15));
        await using var db = fixture.CreateContext();
        var failure = await Assert.ThrowsAsync<AuthFailure>(() => new PostgresPasswordRecoveryStore(db, clock).ResetAsync(token, "new-hash", clock.GetUtcNow(), Cancel));
        Assert.Equal(400, failure.Status);
        Assert.Equal(user.PasswordHash, await db.Users.Where(row => row.Id == user.Id).Select(row => row.PasswordHash).SingleAsync());
        Assert.Null(await db.PasswordResetRequests.Where(row => row.TokenHash == token).Select(row => row.ConsumedAt).SingleAsync());
        var freshUser = await SeedUser();
        var freshToken = await SeedRequest(freshUser, clock);
        await using (var first = fixture.CreateContext())
            await new PostgresPasswordRecoveryStore(first, clock).ResetAsync(freshToken, "first-hash", clock.GetUtcNow(), Cancel);
        await using var retry = fixture.CreateContext();
        await Assert.ThrowsAsync<AuthFailure>(() => new PostgresPasswordRecoveryStore(retry, clock).ResetAsync(freshToken, "second-hash", clock.GetUtcNow(), Cancel));
    }

    [Fact]
    public async Task Token_expiring_while_waiting_for_user_lock_is_rejected()
    {
        var clock = new RecoveryTestClock();
        var user = await SeedUser();
        var token = await SeedRequest(user, clock);
        await using var connection = new NpgsqlConnection(fixture.ConnectionString);
        await connection.OpenAsync();
        await using var blocker = await connection.BeginTransactionAsync();
        await using var command = new NpgsqlCommand("SELECT id FROM public.users WHERE id = @id FOR UPDATE", connection, blocker);
        command.Parameters.AddWithValue("id", user.Id);
        await command.ExecuteScalarAsync();
        await using var db = fixture.CreateContext();
        var resetting = new PostgresPasswordRecoveryStore(db, clock).ResetAsync(token, "new-hash", clock.GetUtcNow(), Cancel);
        await fixture.WaitForUserLockAsync();
        clock.Advance(TimeSpan.FromMinutes(15));
        await blocker.CommitAsync();
        await Assert.ThrowsAsync<AuthFailure>(() => resetting);
        Assert.Equal(user.PasswordHash, await db.Users.Where(row => row.Id == user.Id).Select(row => row.PasswordHash).SingleAsync());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Password_or_email_change_invalidates_recipient_snapshot_and_queued_link(bool changeEmail)
    {
        var clock = new RecoveryTestClock();
        var user = await SeedUser();
        var token = await SeedRequest(user, clock);
        await using var db = fixture.CreateContext();
        var store = new PostgresPasswordRecoveryStore(db, clock);
        var stale = (await store.FindRecipientAsync(user.Email, Cancel))!;
        if (changeEmail) await db.Users.Where(row => row.Id == user.Id).ExecuteUpdateAsync(update => update.SetProperty(row => row.Email, "changed-" + user.Email));
        else await db.Users.Where(row => row.Id == user.Id).ExecuteUpdateAsync(update => update.SetProperty(row => row.PasswordHash, "changed-hash"));
        clock.Advance(TimeSpan.FromMinutes(1));
        var newToken = NewToken();
        await Queue(store, stale, newToken, clock);
        Assert.False(await db.PasswordResetRequests.AnyAsync(row => row.TokenHash == newToken));
        await Assert.ThrowsAsync<AuthFailure>(() => store.ResetAsync(token, "replacement-hash", clock.GetUtcNow(), Cancel));
        Assert.Null(await db.PasswordResetRequests.Where(row => row.TokenHash == token).Select(row => row.ConsumedAt).SingleAsync());
    }

    [Fact]
    public async Task Database_failure_after_token_claim_rolls_back_claim_and_password()
    {
        var clock = new RecoveryTestClock();
        var user = await SeedUser();
        var token = await SeedRequest(user, clock);
        await using var db = fixture.CreateContext();
        var name = "recovery_atomic_" + Guid.NewGuid().ToString("N");
        await using var ddl = new NpgsqlConnection(fixture.ConnectionString);
        await ddl.OpenAsync();
        // Identifiers and UUIDs are fixture-generated typed values, never input.
        await new NpgsqlCommand($"ALTER TABLE public.users ADD CONSTRAINT {name} CHECK (id <> '{user.Id}'::uuid OR password_hash <> 'blocked-hash')", ddl)
            .ExecuteNonQueryAsync();
        try
        {
            await Assert.ThrowsAsync<PostgresException>(() => new PostgresPasswordRecoveryStore(db, clock).ResetAsync(token, "blocked-hash", clock.GetUtcNow(), Cancel));
            Assert.Null(await db.PasswordResetRequests.Where(row => row.TokenHash == token).Select(row => row.ConsumedAt).SingleAsync());
            Assert.Equal(user.PasswordHash, await db.Users.Where(row => row.Id == user.Id).Select(row => row.PasswordHash).SingleAsync());
            Assert.False(await db.CredentialVersions.AnyAsync(row => row.UserId == user.Id));
        }
        finally { await new NpgsqlCommand($"ALTER TABLE public.users DROP CONSTRAINT {name}", ddl).ExecuteNonQueryAsync(); }
    }

    [Fact]
    public async Task Login_read_never_pairs_old_password_with_new_credential_version_during_reset()
    {
        var clock = new RecoveryTestClock();
        var user = await SeedUser();
        var token = await SeedRequest(user, clock);
        var interceptor = new ResetDuringLoginRead(async () =>
        {
            await using var resetting = fixture.CreateContext();
            await new PostgresPasswordRecoveryStore(resetting, clock).ResetAsync(token, "replacement-hash", clock.GetUtcNow(), Cancel);
        });
        var options = new DbContextOptionsBuilder<WildVnDbContext>(PostgresConfiguration.CreateOptions(fixture.ConnectionString))
            .AddInterceptors(interceptor).Options;
        await using var db = new WildVnDbContext(options);
        var account = await new PostgresAuthStore(db).FindByUsernameAsync(user.Username, Cancel);
        Assert.NotNull(account);
        Assert.True(interceptor.Triggered);
        Assert.Equal(user.PasswordHash, account.PasswordHash);
        Assert.Null(account.CredentialVersion);
        await using var fresh = fixture.CreateContext();
        var current = await new PostgresAuthStore(fresh).FindByUsernameAsync(user.Username, Cancel);
        Assert.NotNull(current);
        Assert.Equal("replacement-hash", current.PasswordHash);
        Assert.NotNull(current.CredentialVersion);
    }

    private async Task<UserRow> SeedUser(string? email = null, AuthProvider provider = AuthProvider.LOCAL,
        bool deleted = false, string? password = "original-hash")
    {
        var id = Guid.NewGuid();
        var now = new RecoveryTestClock().GetUtcNow();
        var user = new UserRow { Id = id, Username = "reader-" + id.ToString("N"), Email = email ?? id.ToString("N") + "@example.invalid",
            PasswordHash = password, AuthProvider = provider, Role = UserRole.USER, CreatedAt = now,
            UpdatedAt = now, DeletedAt = deleted ? now : null };
        await using var db = fixture.CreateContext();
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private async Task<string> SeedRequest(UserRow user, RecoveryTestClock clock)
    {
        await using var db = fixture.CreateContext();
        var store = new PostgresPasswordRecoveryStore(db, clock);
        var recipient = (await store.FindRecipientAsync(user.Email, Cancel))!;
        var token = NewToken();
        await Queue(store, recipient, token, clock);
        return token;
    }

    private static string NewToken() => PasswordRecoveryService.Hash(Guid.NewGuid().ToString());
    private static Task Queue(PostgresPasswordRecoveryStore store, ResetRecipient recipient, string token, RecoveryTestClock clock) =>
        store.QueueAsync(recipient, token, "encrypted-test-payload", clock.GetUtcNow(), clock.GetUtcNow().AddMinutes(15), Cancel);

    private sealed class ResetDuringLoginRead(Func<Task> reset) : DbCommandInterceptor
    {
        private int triggered;
        public bool Triggered => Volatile.Read(ref triggered) == 1;

        public override async ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command,
            CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("FROM public.users", StringComparison.Ordinal) &&
                Interlocked.CompareExchange(ref triggered, 1, 0) == 0)
                await reset();
            return result;
        }
    }
}
