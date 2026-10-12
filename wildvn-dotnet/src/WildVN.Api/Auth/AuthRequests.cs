using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.RegularExpressions;
using WildVN.Application.Auth;

namespace WildVN.Api.Auth;

public sealed class LoginRequest
{
    public string? Username { get; init; }
    public string? Password { get; init; }
}

public sealed class RegisterRequest
{
    public string? Username { get; init; }
    public string? Email { get; init; }
    public string? Password { get; init; }
}

internal static partial class AuthRequestValidation
{
    public static void Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username)) throw new AuthFailure(400, "Username is required");
        if (request.Username.Length > 255) throw new AuthFailure(400, "Username is too long");
        Password(request.Password, false);
    }

    public static void Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username)) throw new AuthFailure(400, "Username is required");
        if (!UsernamePattern().IsMatch(request.Username))
            throw new AuthFailure(400, "Username must be 3-30 characters, alphanumeric or underscore");
        if (string.IsNullOrWhiteSpace(request.Email)) throw new AuthFailure(400, "Email is required");
        if (request.Email.Length > 255 || !new EmailAddressAttribute().IsValid(request.Email))
            throw new AuthFailure(400, "Email is not valid");
        Password(request.Password, true);
    }

    private static void Password(string? password, bool registration)
    {
        if (string.IsNullOrWhiteSpace(password)) throw new AuthFailure(400, "Password is required");
        if (registration && password.Length < 6) throw new AuthFailure(400, "Password must be at least 6 characters");
        if (Encoding.UTF8.GetByteCount(password) > 1024) throw new AuthFailure(400, "Password is too long");
    }

    [GeneratedRegex("\\A[a-zA-Z0-9_]{3,30}\\z", RegexOptions.CultureInvariant)]
    private static partial Regex UsernamePattern();
}
