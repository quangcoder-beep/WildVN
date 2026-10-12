using System.Collections.Concurrent;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using MimeKit;
using WildVN.Infrastructure.Auth;

namespace WildVN.Api.Tests;

// Isolated loopback SMTP server. It never forwards messages or records credentials.
public sealed class RecoverySmtpFixture : IAsyncDisposable
{
    private readonly TcpListener listener = new(IPAddress.Loopback, 0);
    private readonly CancellationTokenSource stopping = new();
    private readonly ConcurrentBag<Task> connections = [];
    private readonly X509Certificate2? certificate;
    private readonly Task accepting;
    public ConcurrentQueue<MimeMessage> Messages { get; } = new();
    public bool AdvertiseStartTls { get; init; } = true;
    public bool AcceptAuthentication { get; init; } = true;
    public bool StallGreeting { get; init; }
    public bool UseImplicitTls { get; init; }
    public int TlsConnections;
    public int AuthenticatedConnections;
    public int Connections;
    public int Port => ((IPEndPoint)listener.LocalEndpoint).Port;

    public RecoverySmtpFixture(bool untrustedCertificate = false, bool loadCertificate = true)
    {
        if (loadCertificate) certificate = untrustedCertificate ? CreateUntrustedCertificate() : LoadCertificate();
        listener.Start();
        accepting = AcceptAsync();
    }

    public SmtpResetMail CreateSender() => new(new SmtpResetMailSettings
    {
        Host = "localhost", Port = Port, FromAddress = "sender@example.invalid",
        Username = "synthetic-fixture-user", Password = "synthetic-fixture-password", UseSslOnConnect = UseImplicitTls
    });

    private async Task AcceptAsync()
    {
        try
        {
            while (!stopping.IsCancellationRequested)
            {
                var client = await listener.AcceptTcpClientAsync(stopping.Token);
                Interlocked.Increment(ref Connections);
                connections.Add(ServeAsync(client));
            }
        }
        catch (OperationCanceledException) when (stopping.IsCancellationRequested) { }
        catch (SocketException) when (stopping.IsCancellationRequested) { }
    }

    private async Task ServeAsync(TcpClient client)
    {
        using (client)
        {
            try
            {
                if (StallGreeting) { await Task.Delay(Timeout.Infinite, stopping.Token); return; }
                Stream stream = client.GetStream();
                if (UseImplicitTls) stream = await UpgradeAsync(stream);
                var reader = Reader(stream);
                await ReplyAsync(stream, "220 localhost isolated recovery fixture");
                var secured = UseImplicitTls;
                var authenticated = false;
                while (await reader.ReadLineAsync(stopping.Token) is { } line)
                {
                    var verb = line.Split(' ', 2)[0].ToUpperInvariant();
                    if (verb is "EHLO" or "HELO")
                        await ReplyAsync(stream, "250-localhost\r\n" +
                            (!secured && AdvertiseStartTls ? "250-STARTTLS\r\n" : "") + "250 AUTH PLAIN LOGIN");
                    else if (verb == "STARTTLS")
                    {
                        await ReplyAsync(stream, "220 Ready for TLS");
                        stream = await UpgradeAsync(stream);
                        reader = Reader(stream);
                        secured = true;
                    }
                    else if (verb == "AUTH")
                    {
                        if (line.StartsWith("AUTH LOGIN", StringComparison.OrdinalIgnoreCase))
                        {
                            await ReplyAsync(stream, "334 VXNlcm5hbWU6");
                            _ = await reader.ReadLineAsync(stopping.Token);
                            await ReplyAsync(stream, "334 UGFzc3dvcmQ6");
                            _ = await reader.ReadLineAsync(stopping.Token);
                        }
                        else if (line.Equals("AUTH PLAIN", StringComparison.OrdinalIgnoreCase))
                        {
                            await ReplyAsync(stream, "334 ");
                            _ = await reader.ReadLineAsync(stopping.Token);
                        }
                        authenticated = secured && AcceptAuthentication;
                        if (authenticated) Interlocked.Increment(ref AuthenticatedConnections);
                        await ReplyAsync(stream, authenticated ? "235 2.7.0 Authenticated" : "535 5.7.8 Authentication rejected");
                    }
                    else if (verb is "MAIL" or "RCPT")
                        await ReplyAsync(stream, authenticated ? "250 2.1.0 Accepted" : "530 Authenticate first");
                    else if (verb == "DATA" && authenticated)
                        await ReceiveMessageAsync(stream, reader);
                    else if (verb == "QUIT")
                    { await ReplyAsync(stream, "221 Bye"); break; }
                    else if (verb == "RSET") await ReplyAsync(stream, "250 Reset");
                    else await ReplyAsync(stream, "500 Unsupported fixture command");
                }
                await stream.DisposeAsync();
            }
            catch (Exception exception) when (exception is IOException or AuthenticationException or
                OperationCanceledException or SocketException) { /* Expected negative-case disconnections. */ }
        }
    }

    private async Task ReceiveMessageAsync(Stream stream, StreamReader reader)
    {
        await ReplyAsync(stream, "354 End with dot");
        var body = new StringBuilder();
        while (await reader.ReadLineAsync(stopping.Token) is { } line && line != ".")
            body.Append(line.StartsWith("..", StringComparison.Ordinal) ? line[1..] : line).Append("\r\n");
        using var source = new MemoryStream(Encoding.UTF8.GetBytes(body.ToString()));
        Messages.Enqueue(await MimeMessage.LoadAsync(source, stopping.Token));
        await ReplyAsync(stream, "250 2.0.0 Stored locally");
    }

    private async Task<SslStream> UpgradeAsync(Stream stream)
    {
        var ssl = new SslStream(stream, leaveInnerStreamOpen: false);
        await ssl.AuthenticateAsServerAsync(new SslServerAuthenticationOptions
        {
            ServerCertificate = certificate, EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13
        }, stopping.Token);
        Interlocked.Increment(ref TlsConnections);
        return ssl;
    }

    private static StreamReader Reader(Stream stream) => new(stream, Encoding.UTF8, false, 4096, true);
    private async Task ReplyAsync(Stream stream, string text)
    {
        await stream.WriteAsync(Encoding.ASCII.GetBytes(text + "\r\n"), stopping.Token);
        await stream.FlushAsync(stopping.Token);
    }

    private static X509Certificate2 LoadCertificate()
    {
        var cert = Environment.GetEnvironmentVariable("WILDVN_RECOVERY_TEST_CERT");
        var key = Environment.GetEnvironmentVariable("WILDVN_RECOVERY_TEST_KEY");
        if (string.IsNullOrWhiteSpace(cert) || string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("NOT RUN: provide isolated localhost TLS fixture PEM certificate and key.");
        return X509Certificate2.CreateFromPemFile(cert, key);
    }

    private static X509Certificate2 CreateUntrustedCertificate()
    {
        using var key = RSA.Create(2048);
        var request = new CertificateRequest("CN=localhost", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        var names = new SubjectAlternativeNameBuilder();
        names.AddDnsName("localhost");
        request.CertificateExtensions.Add(names.Build());
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, true));
        return request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(1));
    }

    public async ValueTask DisposeAsync()
    {
        await stopping.CancelAsync();
        listener.Stop();
        await accepting;
        await Task.WhenAll(connections);
        certificate?.Dispose();
        stopping.Dispose();
    }
}
