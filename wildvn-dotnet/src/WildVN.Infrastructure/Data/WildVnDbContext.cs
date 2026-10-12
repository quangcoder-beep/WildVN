using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;

namespace WildVN.Infrastructure.Data;

// Model existing Flyway-owned tables only. Constructing a context performs no DDL.
public sealed class WildVnDbContext(DbContextOptions<WildVnDbContext> options) : DbContext(options)
{
    public DbSet<TaxonomyRow> Taxonomy => Set<TaxonomyRow>();
    public DbSet<EcosystemRow> Ecosystems => Set<EcosystemRow>();
    public DbSet<SpeciesRow> Species => Set<SpeciesRow>();
    public DbSet<SpeciesMediaRow> SpeciesMedia => Set<SpeciesMediaRow>();
    public DbSet<LocationRow> Locations => Set<LocationRow>();
    public DbSet<SpeciesLocationRow> SpeciesLocations => Set<SpeciesLocationRow>();
    public DbSet<ConservationHistoryRow> ConservationHistory => Set<ConservationHistoryRow>();
    public DbSet<UserRow> Users => Set<UserRow>();
    public DbSet<UserProfileRow> UserProfiles => Set<UserProfileRow>();
    public DbSet<RankRow> Ranks => Set<RankRow>();
    public DbSet<UserSessionRow> UserSessions => Set<UserSessionRow>();
    public DbSet<FavoriteRow> Favorites => Set<FavoriteRow>();
    public DbSet<AcademyProgressRow> AcademyProgress => Set<AcademyProgressRow>();
    public DbSet<ChatSessionRow> ChatSessions => Set<ChatSessionRow>();
    public DbSet<ChatMessageRow> ChatMessages => Set<ChatMessageRow>();
    public DbSet<SyncFailureRow> SyncFailures => Set<SyncFailureRow>();
    public DbSet<SearchSuggestionPopularityRow> SearchSuggestionsPopularity => Set<SearchSuggestionPopularityRow>();
    public DbSet<UserAffinityRow> UserAffinities => Set<UserAffinityRow>();
    public DbSet<PasswordResetRow> PasswordResetRequests => Set<PasswordResetRow>();
    public DbSet<PasswordResetMailRow> PasswordResetOutbox => Set<PasswordResetMailRow>();
    public DbSet<CredentialVersionRow> CredentialVersions => Set<CredentialVersionRow>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);
        // Source schema indexes are explicit; do not invent indexes for every FK.
        configurationBuilder.Conventions.Remove(typeof(ForeignKeyIndexConvention));
    }

    // Attach a new replacement rather than mutating the caller's original snapshot.
    public void UpdateFromSnapshot<T>(T original, T replacement,
        IReadOnlyCollection<string> changedProperties) where T : class
    {
        ArgumentNullException.ThrowIfNull(original);
        ArgumentNullException.ThrowIfNull(replacement);
        if (ReferenceEquals(original, replacement))
            throw new ArgumentException("Updates require a new replacement row.", nameof(replacement));
        if (ChangeTracker.Entries<T>().Any(entry => ReferenceEquals(entry.Entity, original)))
            throw new InvalidOperationException("Read original update snapshots with AsNoTracking.");
        var originalEntry = Entry(original);
        var replacementEntry = Entry(replacement);
        var names = RowWritePolicy.ValidateReplacement(originalEntry, replacementEntry, changedProperties);
        var tracked = Attach(replacement);
        tracked.OriginalValues.SetValues(original);
        foreach (var name in names) tracked.Property(name).IsModified = true;
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        RowWritePolicy.Validate(ChangeTracker);
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        RowWritePolicy.Validate(ChangeTracker);
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public async Task<T> InTransactionAsync<T>(
        Func<WildVnDbContext, CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);
        if (Database.CurrentTransaction is not null)
            throw new InvalidOperationException("Nested database transactions must be composed by their owner.");
        await using var transaction = await Database.BeginTransactionAsync(cancellationToken);
        var result = await operation(this, cancellationToken);
        await SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        // An exception leaves the transaction uncommitted; disposal rolls it back.
        // The caller disposes this unit-of-work context after success or failure.
        return result;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        PostgresMappings.Configure(modelBuilder);
        PasswordRecoveryMappings.Configure(modelBuilder);
    }
}
