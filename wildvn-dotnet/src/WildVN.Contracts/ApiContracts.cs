using System.Text.Json;
using System.Text.Json.Serialization;

namespace WildVN.Contracts;

// Only the envelope excludes nulls in Spring. Auth and nested DTOs keep them.
public sealed record ApiResponse<T>(
    bool Success,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] T? Data = default,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Message = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ErrorCode = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] PaginationMeta? Pagination = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] RequestMeta? Meta = null);

public sealed record PaginationMeta(int Page, int Limit, long Total);
public sealed record RequestMeta(long LatencyMs, bool? CacheHit);
public sealed record AuthResponse(string? AccessToken, string? RefreshToken, UserProfile? User);
public sealed record UserProfile(string Id, string Username, string Email, string? AvatarUrl,
    string? Bio, string? ConservationIdentity, bool? HeadphonePreference);
public sealed record ErrorResponse(string Timestamp, int Status, string Error, string Message, string Path);

public enum DietType { CARNIVORE, HERBIVORE, OMNIVORE, INSECTIVORE, AUTOTROPH }
public enum HabitatType { TERRESTRIAL, FRESHWATER, MARINE, CANOPY }
public enum ActivityPattern { DIURNAL, NOCTURNAL, CREPUSCULAR }

public static class ContractJson
{
    public static JsonSerializerOptions CreateOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        Configure(options);
        return options;
    }

    public static void Configure(JsonSerializerOptions options) =>
        options.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
}
