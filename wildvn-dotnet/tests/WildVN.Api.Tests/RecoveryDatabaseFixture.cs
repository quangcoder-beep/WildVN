using Microsoft.EntityFrameworkCore;
using Npgsql;
using WildVN.Infrastructure.Data;
using Xunit;

namespace WildVN.Api.Tests;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class RecoveryDatabaseCollection : ICollectionFixture<RecoveryDatabaseFixture>
{
    public const string Name = "isolated password recovery PostgreSQL";
}

// This fixture never reads appsettings, credentials, or a project database. The
// caller must explicitly provide an isolated PostgreSQL server with CREATEDB.
public sealed class RecoveryDatabaseFixture : IAsyncLifetime
{
    private string? adminConnection;
    private string? database;
    public string ConnectionString { get; private set; } = string.Empty;

    public async Task InitializeAsync()
    {
        var supplied = Environment.GetEnvironmentVariable("WILDVN_RECOVERY_TEST_DB");
        if (string.IsNullOrWhiteSpace(supplied))
            throw new InvalidOperationException("NOT RUN: WILDVN_RECOVERY_TEST_DB must identify the disposable local test PostgreSQL server.");
        var builder = new NpgsqlConnectionStringBuilder(supplied);
        if (builder.Host is not ("127.0.0.1" or "localhost") || builder.Port == 5432)
            throw new InvalidOperationException("Recovery tests require the isolated loopback PostgreSQL server on a non-default port.");
        adminConnection = builder.ConnectionString;
        database = "recovery_tests_" + Guid.NewGuid().ToString("N");
        await using (var admin = new NpgsqlConnection(adminConnection))
        {
            await admin.OpenAsync();
            await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        }
        builder.Database = database;
        builder.ApplicationName = "WildVN.PasswordRecovery.Tests";
        ConnectionString = builder.ConnectionString;
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        var root = FindRepository();
        await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root, "tests/Fixtures/schema.sql")), connection)
            .ExecuteNonQueryAsync();
        // Exercise the exact deployment artifact rather than EF-generated DDL.
        await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root, "docs/sql/password-recovery.sql")), connection)
            .ExecuteNonQueryAsync();
    }

    public WildVnDbContext CreateContext() => new(PostgresConfiguration.CreateOptions(ConnectionString));

    public async Task DisposeAsync()
    {
        if (adminConnection is null || database is null) return;
        NpgsqlConnection.ClearAllPools();
        await using var admin = new NpgsqlConnection(adminConnection);
        await admin.OpenAsync();
        await new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
    }

    public async Task WaitForUserLockAsync()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        for (var attempt = 0; attempt < 100; attempt++)
        {
            await using var command = new NpgsqlCommand("SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FOR UPDATE%')", connection);
            if (await command.ExecuteScalarAsync() is true) return;
            await Task.Delay(50);
        }
        throw new TimeoutException("Reset did not reach the expected PostgreSQL user-row lock.");
    }

    private static string FindRepository()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
            if (File.Exists(Path.Combine(directory.FullName, "docs/sql/password-recovery.sql"))) return directory.FullName;
        throw new DirectoryNotFoundException("Cannot locate the committed recovery SQL fixture.");
    }
}

public sealed class RecoveryTestClock : TimeProvider
{
    private long ticks = new DateTimeOffset(2026, 10, 11, 12, 0, 0, TimeSpan.Zero).UtcTicks;
    public override DateTimeOffset GetUtcNow() => new(Interlocked.Read(ref ticks), TimeSpan.Zero);
    public void Advance(TimeSpan duration) => Interlocked.Add(ref ticks, duration.Ticks);
}
