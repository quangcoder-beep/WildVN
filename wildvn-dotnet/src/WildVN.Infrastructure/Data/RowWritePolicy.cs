using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace WildVN.Infrastructure.Data;

internal static class RowWritePolicy
{
    public static string[] ValidateReplacement(EntityEntry original, EntityEntry replacement,
        IReadOnlyCollection<string> changedProperties)
    {
        ArgumentNullException.ThrowIfNull(changedProperties);
        if (original.Metadata != replacement.Metadata || changedProperties.Count == 0 ||
            changedProperties.Any(string.IsNullOrWhiteSpace))
            throw new ArgumentException("A replacement of the same row type and explicit changed properties are required.");
        var names = changedProperties.Distinct(StringComparer.Ordinal).ToArray();
        foreach (var name in names)
        {
            var property = original.Metadata.FindProperty(name);
            if (property is null || property.IsPrimaryKey() || name == "CreatedAt")
                throw new ArgumentException("Changed properties must be mapped non-key fields other than CreatedAt.");
        }
        foreach (var property in original.Metadata.GetProperties())
        {
            if (names.Contains(property.Name, StringComparer.Ordinal)) continue;
            var previous = original.Property(property.Name).CurrentValue;
            var current = replacement.Property(property.Name).CurrentValue;
            var comparer = property.GetValueComparer();
            if (!(comparer?.Equals(previous, current) ?? Equals(previous, current)))
                throw new ArgumentException("Replacement rows must preserve every property not explicitly changed.");
        }
        return names;
    }

    public static void Validate(ChangeTracker tracker)
    {
        tracker.DetectChanges();
        foreach (var entry in tracker.Entries().Where(entry =>
                     entry.State is EntityState.Added or EntityState.Modified))
        {
            foreach (var property in entry.Properties)
                if (property.CurrentValue is DateTimeOffset timestamp &&
                    (timestamp.Offset != TimeSpan.Zero ||
                     (entry.State == EntityState.Modified && property.IsModified &&
                      timestamp == default && !Equals(property.CurrentValue, property.OriginalValue))))
                    throw new InvalidOperationException(
                        $"Timestamp {entry.Metadata.ClrType.Name}.{property.Metadata.Name} must use UTC and cannot change to the year-1 sentinel.");
            if (entry.State == EntityState.Modified && entry.Metadata.FindProperty("UpdatedAt") is not null)
            {
                var updated = entry.Property("UpdatedAt");
                if (!updated.IsModified || updated.CurrentValue is not DateTimeOffset timestamp ||
                    timestamp == default || Equals(updated.CurrentValue, updated.OriginalValue))
                    throw new InvalidOperationException(
                        "Modified rows require a new UTC UpdatedAt in their replacement snapshot.");
            }
        }
    }
}
