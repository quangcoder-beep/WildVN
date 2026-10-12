using System.Security.Authentication;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace WildVN.Infrastructure.Auth;

public sealed class SmtpResetMailSettings
{
    public required string Host { get; init; }
    public int Port { get; init; } = 587;
    public required string FromAddress { get; init; }
    public required string Username { get; init; }
    public required string Password { get; init; }
    public bool UseSslOnConnect { get; init; }

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(Host) || Host.Contains('\r') || Host.Contains('\n') ||
            Uri.CheckHostName(Host) == UriHostNameType.Unknown || Port is < 1 or > 65535)
            throw new ArgumentException("Invalid recovery SMTP host or port.");
        ResetMailPayload.ValidateEmail(FromAddress);
        if (string.IsNullOrWhiteSpace(Username) || Username.Contains('\r') || Username.Contains('\n') ||
            string.IsNullOrWhiteSpace(Password) || Password.Contains('\r') || Password.Contains('\n'))
            throw new ArgumentException("Recovery SMTP authentication is required.");
    }
}

public sealed class SmtpResetMail
{
    private readonly SmtpResetMailSettings settings;

    public SmtpResetMail(SmtpResetMailSettings settings)
    {
        ArgumentNullException.ThrowIfNull(settings);
        settings.Validate();
        this.settings = settings;
    }

    public async Task SendAsync(ResetMailPayload payload, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(payload);
        payload.Validate();
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("WildVN", settings.FromAddress));
        message.To.Add(MailboxAddress.Parse(payload.Email));
        message.Subject = "Đặt lại mật khẩu WildVN";
        message.Body = new TextPart("plain")
        {
            Text = "Bạn đã yêu cầu đặt lại mật khẩu WildVN.\n\n" + payload.Link +
                "\n\nLiên kết chỉ dùng một lần và hết hạn sau 15 phút kể từ lúc yêu cầu. " +
                "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email."
        };
        using var client = new SmtpClient { Timeout = 10_000, SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13 };
        // MailKit's normal certificate validation remains enabled; STARTTLS is mandatory.
        await client.ConnectAsync(settings.Host, settings.Port,
            settings.UseSslOnConnect ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls,
            cancellationToken);
        await client.AuthenticateAsync(settings.Username, settings.Password, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}
