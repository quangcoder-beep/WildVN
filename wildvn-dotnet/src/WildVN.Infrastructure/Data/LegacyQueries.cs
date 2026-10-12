using Microsoft.EntityFrameworkCore;

namespace WildVN.Infrastructure.Data;

// Filters are explicit per use case. No global filter hides rows used by legacy paths.
public static class LegacyQueries
{
    public static IQueryable<SpeciesRow> NonDeletedSpecies(this WildVnDbContext context) =>
        context.Species.AsNoTracking().Where(row => row.DeletedAt == null);

    public static IQueryable<SpeciesRow> PublishedSpecies(this WildVnDbContext context) =>
        context.NonDeletedSpecies().Where(row => row.PublishStatus == PublishStatus.PUBLISHED);

    public static IQueryable<FavoriteRow> FavoritesForUsername(this WildVnDbContext context, string username)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(username);
        // Do not normalize or convert this persisted legacy username key to a UUID.
        return context.Favorites.AsNoTracking().Where(row => row.UserId == username)
            .OrderByDescending(row => row.CreatedAt);
    }

    public static IQueryable<AcademyProgressRow> ProgressForUsername(this WildVnDbContext context, string username)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(username);
        return context.AcademyProgress.AsNoTracking().Where(row => row.UserId == username);
    }

    public static IQueryable<ChatSessionRow> ActiveChatSessionsForUser(
        this WildVnDbContext context, Guid userId, DateTimeOffset utcNow)
    {
        if (userId == Guid.Empty) throw new ArgumentException("User identity is required.", nameof(userId));
        if (utcNow.Offset != TimeSpan.Zero) throw new ArgumentException("Timestamp must be UTC.", nameof(utcNow));
        return context.ChatSessions.AsNoTracking().Where(row => row.UserId == userId && row.ExpiresAt > utcNow)
            .OrderByDescending(row => row.UpdatedAt);
    }
}
