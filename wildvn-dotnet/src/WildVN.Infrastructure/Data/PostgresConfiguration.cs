using Microsoft.EntityFrameworkCore;
using Npgsql;
using Npgsql.EntityFrameworkCore.PostgreSQL.Infrastructure;
using Npgsql.NameTranslation;

namespace WildVN.Infrastructure.Data;

public static class PostgresConfiguration
{
    private static readonly NpgsqlNullNameTranslator Labels = new();
    // Explicit caller input only: do not read project configuration or connect here.
    public static DbContextOptions<WildVnDbContext> CreateOptions(string connectionString)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(connectionString);
        NpgsqlConnectionStringBuilder connection;
        try { connection = new NpgsqlConnectionStringBuilder(connectionString); }
        catch (ArgumentException)
        {
            // Do not include the raw connection string or inner exception in this error.
            throw new ArgumentException("PostgreSQL connection settings are invalid.", nameof(connectionString));
        }
        if (string.IsNullOrWhiteSpace(connection.Host) || string.IsNullOrWhiteSpace(connection.Database) ||
            string.IsNullOrWhiteSpace(connection.Username))
            throw new ArgumentException("PostgreSQL host, database and username are required.", nameof(connectionString));
        if (connection.IncludeErrorDetail || connection.LogParameters || connection.PersistSecurityInfo)
            throw new ArgumentException("Database error details, parameter logging and persisted security info must be disabled.", nameof(connectionString));

        return new DbContextOptionsBuilder<WildVnDbContext>()
            .UseNpgsql(connection.ConnectionString, ConfigureProvider)
            .Options;
    }

    private static void ConfigureProvider(NpgsqlDbContextOptionsBuilder provider)
    {
        provider.SetPostgresVersion(15, 0);
        var labels = Labels;
        provider.MapEnum<TaxonomyRank>("TaxonomyRank", "public", labels);
        provider.MapEnum<ConservationStatus>("ConservationStatus", "public", labels);
        provider.MapEnum<MediaType>("MediaType", "public", labels);
        provider.MapEnum<LocationType>("LocationType", "public", labels);
        provider.MapEnum<DistributionType>("DistributionType", "public", labels);
        provider.MapEnum<VnRedListStatus>("VnRedListStatus", "public", labels);
        provider.MapEnum<CitesAppendix>("CitesAppendix", "public", labels);
        provider.MapEnum<VnDecreeStatus>("VnDecreeStatus", "public", labels);
        provider.MapEnum<DietType>("DietType", "public", labels);
        provider.MapEnum<HabitatType>("HabitatType", "public", labels);
        provider.MapEnum<ActivityPattern>("ActivityPattern", "public", labels);
        provider.MapEnum<PublishStatus>("PublishStatus", "public", labels);
        provider.MapEnum<UserRole>("user_role", "public", labels);
        provider.MapEnum<AuthProvider>("auth_provider", "public", labels);
    }
}
