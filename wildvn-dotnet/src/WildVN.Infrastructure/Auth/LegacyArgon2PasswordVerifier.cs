using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;
using WildVN.Application.Auth;

namespace WildVN.Infrastructure.Auth;

public sealed class LegacyArgon2PasswordVerifier : ILegacyPasswordHasher
{
    private readonly Lazy<string> dummy;

    public LegacyArgon2PasswordVerifier() => dummy = new Lazy<string>(() =>
        Hash(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))));

    public string Hash(string password)
    {
        ValidatePassword(password);
        var salt = RandomNumberGenerator.GetBytes(16);
        var digest = Derive(password, salt, 65536, 3, 1, 32);
        try { return $"$argon2id$v=19$m=65536,t=3,p=1${Encode(salt)}${Encode(digest)}"; }
        finally { CryptographicOperations.ZeroMemory(digest); }
    }

    public bool Verify(string password, string? encodedHash)
    {
        ValidatePassword(password);
        var valid = TryParse(encodedHash, out var salt, out var expected, out var memory,
            out var iterations, out var parallelism);
        if (!valid) TryParse(dummy.Value, out salt, out expected, out memory, out iterations, out parallelism);
        var actual = Derive(password, salt, memory, iterations, parallelism, expected.Length);
        try { return CryptographicOperations.FixedTimeEquals(actual, expected) && valid; }
        finally { CryptographicOperations.ZeroMemory(actual); }
    }

    private static bool TryParse(string? value, out byte[] salt, out byte[] digest,
        out int memory, out int iterations, out int parallelism)
    {
        salt = digest = [];
        memory = iterations = parallelism = 0;
        if (value is null || value.Length > 255) return false;
        var fields = value.Split('$');
        if (fields.Length != 6 || fields[0] != "" || fields[1] != "argon2id" || fields[2] != "v=19") return false;
        var parameters = fields[3].Split(',');
        if (parameters.Length != 3 || !ReadParameter(parameters[0], "m=", out memory) ||
            !ReadParameter(parameters[1], "t=", out iterations) || !ReadParameter(parameters[2], "p=", out parallelism) ||
            memory is < 8192 or > 65536 || iterations is < 1 or > 3 || parallelism is < 1 or > 4) return false;
        try
        {
            salt = Decode(fields[4]); digest = Decode(fields[5]);
            return salt.Length is >= 8 and <= 32 && digest.Length is >= 16 and <= 64;
        }
        catch (FormatException) { return false; }
    }

    private static bool ReadParameter(string text, string prefix, out int value)
    {
        value = 0;
        return text.StartsWith(prefix, StringComparison.Ordinal) &&
            int.TryParse(text.AsSpan(prefix.Length), System.Globalization.NumberStyles.None,
                System.Globalization.CultureInfo.InvariantCulture, out value);
    }

    private static byte[] Decode(string value)
    {
        if (value.Length == 0 || value.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not '+' and not '/'))
            throw new FormatException();
        return Convert.FromBase64String(value.PadRight((value.Length + 3) / 4 * 4, '='));
    }

    private static string Encode(byte[] value) => Convert.ToBase64String(value).TrimEnd('=');

    private static void ValidatePassword(string password)
    {
        ArgumentNullException.ThrowIfNull(password);
        if (Encoding.UTF8.GetByteCount(password) > 1024) throw new AuthFailure(400, "Password is too long");
    }

    private static byte[] Derive(string password, byte[] salt, int memory, int iterations, int parallelism, int length)
    {
        var bytes = Encoding.UTF8.GetBytes(password);
        try
        {
            using var argon = new Argon2id(bytes) { Salt = salt, MemorySize = memory,
                Iterations = iterations, DegreeOfParallelism = parallelism };
            return argon.GetBytes(length);
        }
        finally { CryptographicOperations.ZeroMemory(bytes); }
    }
}
