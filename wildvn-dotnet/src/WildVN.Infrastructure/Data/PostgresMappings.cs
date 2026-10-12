using Microsoft.EntityFrameworkCore;

namespace WildVN.Infrastructure.Data;

internal static class PostgresMappings
{
    public static void Configure(ModelBuilder model)
    {
        model.HasDefaultSchema("public");
        ConfigureKeys(model);
        ConfigureCatalogDefaults(model);
        ConfigureAccountDefaults(model);
        ConfigureHistoryDefaults(model);
        ConfigureCatalogRelationships(model);
        ConfigureAccountRelationships(model);
        ConfigureCatalogIndexes(model);
        ConfigureAccountIndexes(model);
    }

    private static void ConfigureKeys(ModelBuilder model)
    {
        Uuid<TaxonomyRow>(model, "taxonomy", true);
        Uuid<EcosystemRow>(model, "ecosystems", true);
        Uuid<SpeciesRow>(model, "species", true);
        Uuid<SpeciesMediaRow>(model, "species_media", true);
        Uuid<LocationRow>(model, "locations", true);
        Uuid<ConservationHistoryRow>(model, "conservation_history");
        Uuid<UserRow>(model, "users", true, "NOW()");
        Uuid<UserProfileRow>(model, "user_profiles", true, "NOW()");
        Uuid<RankRow>(model, "ranks");
        Uuid<UserSessionRow>(model, "user_sessions");
        Uuid<ChatSessionRow>(model, "chat_sessions", true);
        Uuid<ChatMessageRow>(model, "chat_messages");
        Uuid<SyncFailureRow>(model, "sync_failures", true);
        model.Entity<SpeciesLocationRow>().HasKey(row => new { row.SpeciesId, row.LocationId })
            .HasName("species_locations_pkey");
        model.Entity<FavoriteRow>().HasKey(row => new { row.UserId, row.SpeciesId }).HasName("user_favorites_pkey");
        model.Entity<AcademyProgressRow>().HasKey(row => row.UserId).HasName("academy_progress_pkey");
        model.Entity<SearchSuggestionPopularityRow>().HasKey(row => row.Query).HasName("search_suggestions_popularity_pkey");
        model.Entity<UserAffinityRow>().HasKey(row => new { row.EntityType, row.EntityValue, row.UserId })
            .HasName("user_affinities_pkey");
    }

    private static void Uuid<T>(ModelBuilder model, string table, bool updated = false,
        string timestamp = "CURRENT_TIMESTAMP") where T : class
    {
        var row = model.Entity<T>();
        row.HasKey("Id").HasName(table + "_pkey");
        // UUID generation stays with the existing server default, including for new inserts.
        row.Property<Guid>("Id").HasDefaultValueSql("gen_random_uuid()");
        row.Property<DateTimeOffset>("CreatedAt").HasDefaultValueSql(timestamp);
        if (updated) row.Property<DateTimeOffset>("UpdatedAt").HasDefaultValueSql(timestamp);
    }

    private static void ConfigureCatalogDefaults(ModelBuilder model)
    {
        var species = model.Entity<SpeciesRow>();
        // Nullable defaults must not replace an explicitly supplied SQL NULL on insert.
        species.Property(row => row.Synonyms).HasDefaultValueSql("ARRAY[]::TEXT[]").ValueGeneratedNever();
        species.Property(row => row.HabitatType).HasDefaultValueSql("ARRAY[]::\"HabitatType\"[]").ValueGeneratedNever();
        species.Property(row => row.SourceReferences).HasDefaultValueSql("'[]'::jsonb").ValueGeneratedNever();
        species.Property(row => row.CitesAppendix).HasDefaultValueSql("'NONE'::\"CitesAppendix\"").ValueGeneratedNever();
        species.Property(row => row.VnDecreeStatus).HasDefaultValueSql("'NONE'::\"VnDecreeStatus\"").ValueGeneratedNever();
        species.Property(row => row.PublishStatus).HasDefaultValueSql("'DRAFT'::\"PublishStatus\"");
        species.Property(row => row.IsFeatured).HasDefaultValue(false);
        model.Entity<SpeciesMediaRow>().Property(row => row.IsPrimary).HasDefaultValue(false);
        model.Entity<EcosystemRow>().Property(row => row.SpeciesCount).HasDefaultValue(0);
        model.Entity<LocationRow>().Property(row => row.GalleryUrls).HasDefaultValueSql("'[]'::jsonb").ValueGeneratedNever();
        model.Entity<SpeciesLocationRow>().Property(row => row.DistributionType)
            .HasDefaultValueSql("'NATIVE'::\"DistributionType\"");
        model.Entity<SpeciesLocationRow>().Property(row => row.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
    }

    private static void ConfigureAccountDefaults(ModelBuilder model)
    {
        model.Entity<UserRow>().Property(row => row.Role).HasDefaultValueSql("'USER'::user_role");
        model.Entity<UserRow>().Property(row => row.AuthProvider).HasDefaultValueSql("'LOCAL'::auth_provider");
        model.Entity<UserProfileRow>().Property(row => row.HeadphonePreference).HasDefaultValue(false);
        model.Entity<RankRow>().Property(row => row.MinXp).HasDefaultValue(0);
        model.Entity<FavoriteRow>().Property(row => row.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        var progress = model.Entity<AcademyProgressRow>();
        progress.Property(row => row.RpPoints).HasDefaultValue(0);
        progress.Property(row => row.StreakDays).HasDefaultValue(0);
        progress.Property(row => row.UnlockedSpecies).HasDefaultValueSql("'[]'::jsonb");
        progress.Property(row => row.CompletedExpeditions).HasDefaultValueSql("'[]'::jsonb");
        progress.Property(row => row.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        progress.Property(row => row.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        progress.Property(row => row.LastActiveDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
    }

    private static void ConfigureHistoryDefaults(ModelBuilder model)
    {
        model.Entity<SyncFailureRow>().Property(row => row.Resolved).HasDefaultValue(false).ValueGeneratedNever();
        model.Entity<SyncFailureRow>().Property(row => row.RetryCount).HasDefaultValue(0).ValueGeneratedNever();
        var suggestions = model.Entity<SearchSuggestionPopularityRow>();
        suggestions.Property(row => row.ClickCount).HasDefaultValue(0L).ValueGeneratedNever();
        suggestions.Property(row => row.SearchCount).HasDefaultValue(0L).ValueGeneratedNever();
        suggestions.Property(row => row.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        model.Entity<UserAffinityRow>().Property(row => row.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        model.Entity<UserAffinityRow>().Property(row => row.Score).HasPrecision(5, 4);
        model.Entity<ChatMessageRow>().ToTable("chat_messages", "public", table =>
            table.HasCheckConstraint("chat_messages_role_check", "role IN ('user', 'assistant')"));
    }

    private static void ConfigureCatalogRelationships(ModelBuilder model)
    {
        model.Entity<TaxonomyRow>().HasOne<TaxonomyRow>().WithMany().HasForeignKey(row => row.ParentId)
            .OnDelete(DeleteBehavior.Restrict).HasConstraintName("taxonomy_parent_id_fkey");
        model.Entity<SpeciesRow>().HasOne<TaxonomyRow>().WithMany().HasForeignKey(row => row.TaxonomyId)
            .OnDelete(DeleteBehavior.Restrict).HasConstraintName("species_taxonomy_id_fkey");
        model.Entity<SpeciesRow>().HasOne<EcosystemRow>().WithMany().HasForeignKey(row => row.EcosystemId)
            .OnDelete(DeleteBehavior.SetNull).HasConstraintName("species_ecosystem_id_fkey");
        model.Entity<SpeciesMediaRow>().HasOne<SpeciesRow>().WithMany().HasForeignKey(row => row.SpeciesId)
            .OnDelete(DeleteBehavior.Cascade).HasConstraintName("species_media_species_id_fkey");
        model.Entity<SpeciesLocationRow>().HasOne<SpeciesRow>().WithMany().HasForeignKey(row => row.SpeciesId)
            .OnDelete(DeleteBehavior.Cascade).HasConstraintName("species_locations_species_id_fkey");
        model.Entity<SpeciesLocationRow>().HasOne<LocationRow>().WithMany().HasForeignKey(row => row.LocationId)
            .OnDelete(DeleteBehavior.Cascade).HasConstraintName("species_locations_location_id_fkey");
        model.Entity<ConservationHistoryRow>().HasOne<SpeciesRow>().WithMany().HasForeignKey(row => row.SpeciesId)
            .OnDelete(DeleteBehavior.Cascade).HasConstraintName("conservation_history_species_id_fkey");
        model.Entity<FavoriteRow>().HasOne<SpeciesRow>().WithMany().HasForeignKey(row => row.SpeciesId)
            .OnDelete(DeleteBehavior.Cascade).HasConstraintName("user_favorites_species_id_fkey");
    }

    private static void ConfigureAccountRelationships(ModelBuilder model)
    {
        model.Entity<UserProfileRow>().HasOne<UserRow>().WithOne().HasForeignKey<UserProfileRow>(row => row.UserId)
            .OnDelete(DeleteBehavior.Cascade).HasConstraintName("user_profiles_user_id_fkey");
        model.Entity<UserSessionRow>().HasOne<UserRow>().WithMany().HasForeignKey(row => row.UserId)
            .OnDelete(DeleteBehavior.Cascade).HasConstraintName("user_sessions_user_id_fkey");
        model.Entity<ChatSessionRow>().HasOne<UserRow>().WithMany().HasForeignKey(row => row.UserId)
            .OnDelete(DeleteBehavior.Cascade).HasConstraintName("chat_sessions_user_id_fkey");
        model.Entity<ChatMessageRow>().HasOne<ChatSessionRow>().WithMany().HasForeignKey(row => row.SessionId)
            .OnDelete(DeleteBehavior.Cascade).HasConstraintName("chat_messages_session_id_fkey");
        // No users FK on username-keyed Favorites/Academy or UUID user_affinities: source has none.
    }

    private static void ConfigureCatalogIndexes(ModelBuilder model)
    {
        model.Entity<TaxonomyRow>().HasIndex(row => new { row.ParentId, row.ScientificName, row.Rank })
            .IsUnique().HasDatabaseName("idx_taxonomy_unique_node");
        model.Entity<TaxonomyRow>().HasIndex(row => row.ParentId).HasDatabaseName("idx_taxonomy_parent_id");
        model.Entity<SpeciesRow>().HasIndex(row => new { row.TaxonomyId, row.ConservationStatus })
            .HasDatabaseName("idx_species_taxonomy_status");
        model.Entity<SpeciesRow>().HasIndex(row => row.CreatedAt).IsDescending().HasDatabaseName("idx_species_created_at_desc");
        model.Entity<SpeciesMediaRow>().HasIndex(row => row.SpeciesId).HasDatabaseName("idx_species_media_species_id");
        model.Entity<SpeciesLocationRow>().HasIndex(row => new { row.LocationId, row.SpeciesId })
            .HasDatabaseName("idx_species_locations_lookup");
        model.Entity<ConservationHistoryRow>().HasIndex(row => new { row.SpeciesId, row.ChangedAt })
            .IsDescending(false, true).HasDatabaseName("idx_conservation_history_species");
        model.Entity<FavoriteRow>().HasIndex(row => row.UserId).HasDatabaseName("idx_user_favorites_user_id");
        model.Entity<EcosystemRow>().HasIndex(row => row.Slug).IsUnique().HasDatabaseName("idx_ecosystems_slug");
        model.Entity<LocationRow>().HasIndex(row => row.Slug).IsUnique().HasDatabaseName("idx_locations_slug");
    }

    private static void ConfigureAccountIndexes(ModelBuilder model)
    {
        // Unique columns are not EF entity identities: email/rank/session hash can change.
        // These names refer to the existing constraint-backed indexes; no DDL is emitted.
        model.Entity<UserRow>().HasIndex(row => row.Username).IsUnique().HasDatabaseName("users_username_key");
        model.Entity<UserRow>().HasIndex(row => row.Email).IsUnique().HasDatabaseName("users_email_key");
        model.Entity<UserProfileRow>().HasIndex(row => row.UserId).IsUnique().HasDatabaseName("user_profiles_user_id_key");
        model.Entity<RankRow>().HasIndex(row => row.Name).IsUnique().HasDatabaseName("ranks_name_key");
        model.Entity<RankRow>().HasIndex(row => row.Slug).IsUnique().HasDatabaseName("ranks_slug_key");
        model.Entity<RankRow>().HasIndex(row => row.SortOrder).IsUnique().HasDatabaseName("ranks_sort_order_key");
        model.Entity<UserSessionRow>().HasIndex(row => row.RefreshTokenHash).IsUnique().HasDatabaseName("user_sessions_refresh_token_hash_key");
        model.Entity<ChatSessionRow>().HasIndex(row => new { row.UserId, row.UpdatedAt })
            .IsDescending(false, true).HasDatabaseName("idx_chat_sessions_user_updated");
        model.Entity<ChatSessionRow>().HasIndex(row => row.ExpiresAt).HasDatabaseName("idx_chat_sessions_expires_at");
        model.Entity<ChatMessageRow>().HasIndex(row => new { row.SessionId, row.CreatedAt })
            .IsDescending(false, false).HasDatabaseName("idx_chat_messages_session_created");
        model.Entity<UserSessionRow>().HasIndex(row => new { row.UserId, row.CreatedAt })
            .IsDescending(false, true).HasDatabaseName("idx_user_sessions_user_id");
        model.Entity<UserSessionRow>().HasIndex(row => row.UserId).HasFilter("revoked_at IS NULL")
            .HasDatabaseName("idx_user_sessions_active");
        model.Entity<SyncFailureRow>().HasIndex(row => new { row.Target, row.Resolved }).HasDatabaseName("idx_sync_failures_target");
        model.Entity<UserAffinityRow>().HasIndex(row => row.UserId).HasDatabaseName("idx_user_affinities_user_id");
    }
}
