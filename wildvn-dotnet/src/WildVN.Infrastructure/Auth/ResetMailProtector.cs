using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using MimeKit;
using WildVN.Application.Auth;

namespace WildVN.Infrastructure.Auth;

// A class deliberately avoids a record-generated ToString exposing the reset link.
public sealed class ResetMailPayload
{
    public required string Email { get; init; }
    public required string Link { get; init; }

    internal void Validate()
    {
        ValidateEmail(Email);
        if (string.IsNullOrWhiteSpace(Link) || Link.Length > 2048 || Link.Contains('\r') || Link.Contains('\n') ||
            !Uri.TryCreate(Link, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && !(uri.Scheme == Uri.UriSchemeHttp && uri.IsLoopback)) ||
            uri.UserInfo.Length != 0 || uri.Query.Length != 0 || !uri.Fragment.StartsWith("#token=", StringComparison.Ordinal))
            throw new ArgumentException("Invalid password recovery link.");
        var token = uri.Fragment[7..];
        if (token.Length != 43 || token.Any(character =>
                !(char.IsAsciiLetterOrDigit(character) || character is '-' or '_')))
            throw new ArgumentException("Invalid password recovery link.");
    }

    internal static void ValidateEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254 || email.Contains('\r') || email.Contains('\n') ||
            !MailboxAddress.TryParse(email, out var mailbox) || mailbox.Address != email || !email.Contains('@'))
            throw new ArgumentException("Invalid recovery mailbox address.");
    }
}

public sealed class ResetMailProtector : IResetMailProtector
{
    private readonly IDataProtector protector;

    public ResetMailProtector(IDataProtectionProvider provider)
    {
        ArgumentNullException.ThrowIfNull(provider);
        protector = provider.CreateProtector("WildVN.PasswordRecovery.Outbox.v1");
    }

    public string Protect(string email, string link)
    {
        var payload = new ResetMailPayload { Email = email, Link = link };
        payload.Validate();
        return protector.Protect(JsonSerializer.Serialize(payload));
    }

    public ResetMailPayload Unprotect(string encryptedPayload)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(encryptedPayload);
        var payload = JsonSerializer.Deserialize<ResetMailPayload>(protector.Unprotect(encryptedPayload))
            ?? throw new CryptographicException("Invalid recovery mail payload.");
        payload.Validate();
        return payload;
    }
}
