using System.Net;
using System.Net.Http;
using System.Text.Json;
using NUnit.Framework;
using WildVN.ApiClient;
using WildVN.Contracts;
using WildVN.Desktop;
using Client = WildVN.ApiClient.ApiClient;

namespace WildVN.WinForms.Tests;

[TestFixture, Apartment(ApartmentState.STA)]
public sealed class StartupTests
{
    [TestCase(null, null, "https://localhost:5123/", false)]
    [TestCase("https://api.example.invalid/", "1", "https://api.example.invalid/", true)]
    [TestCase("http://127.0.0.1:5080/", "1", "http://127.0.0.1:5080/", true)]
    [TestCase(null, "true", "https://localhost:5123/", false)]
    public void Options_read_only_explicit_environment_and_preserve_secure_defaults(
        string? address, string? optIn, string expected, bool httpAllowed)
    {
        var keys = new List<string>();
        var options = DesktopStartup.ReadOptions(key =>
        {
            keys.Add(key);
            return key == "WILDVN_API_BASE_URL" ? address : optIn;
        });
        Assert.That(options.BaseAddress.AbsoluteUri, Is.EqualTo(expected));
        Assert.That(options.AllowLoopbackHttp, Is.EqualTo(httpAllowed));
        Assert.That(options.RequestTimeout, Is.EqualTo(TimeSpan.FromSeconds(15)));
        Assert.That(keys, Is.EquivalentTo(new[] { "WILDVN_API_BASE_URL", "WILDVN_ALLOW_LOOPBACK_HTTP" }));
    }

    [Test]
    public void Null_environment_reader_and_bad_URI_fail_before_creating_a_form()
    {
        Assert.Throws<ArgumentNullException>(() => DesktopStartup.ReadOptions(null!));
        Assert.Throws<UriFormatException>(() => DesktopStartup.ReadOptions(_ => "not an absolute URI"));
    }

    [TestCase("http://remote.example.invalid/", "1")]
    [TestCase("http://127.0.0.1:5080/", null)]
    [TestCase("https://user:password@example.invalid/", null)]
    [TestCase("https://example.invalid/#fragment", null)]
    public void Unsafe_configuration_is_rejected_without_any_request(string address, string? optIn)
    {
        using var handler = new RecordingHandler();
        Assert.Throws<ArgumentException>(() => DesktopStartup.CreateForm(
            key => key == "WILDVN_API_BASE_URL" ? address : optIn, handler));
        Assert.That(handler.Requests, Is.Empty);
    }

    [Test]
    public void Production_transport_keeps_cookie_jar_and_performs_no_request_at_startup()
    {
        using var client = Client.Create(DesktopStartup.ReadOptions(_ => null));
        Assert.That(client.Cookies, Is.Not.Null);
        using var form = DesktopStartup.CreateForm(_ => null);
        Assert.That(form.Text, Does.Contain("WinForms"));
    }

    [Test]
    public void Null_method_options_and_disposed_client_keep_the_same_guards_on_Mono()
    {
        using var handler = new RecordingHandler();
        Assert.Throws<ArgumentNullException>(() => new Client(null!, handler));
        using var client = new Client(DesktopStartup.ReadOptions(_ => null), handler);
        Assert.ThrowsAsync<ArgumentNullException>(async () => await client.SendAsync(null!, "health/live"));
        client.Dispose();
        Assert.ThrowsAsync<ObjectDisposedException>(async () => await client.CheckHealthAsync());
    }

    [Test]
    public void JSON_contract_null_handling_and_enum_casing_match_P0_on_Mono()
    {
        var options = ContractJson.CreateOptions();
        Assert.That(JsonSerializer.Serialize(new ApiResponse<object>(true), options), Is.EqualTo("{\"success\":true}"));
        Assert.That(JsonSerializer.Serialize(new AuthResponse(null, null, null), options),
            Is.EqualTo("{\"accessToken\":null,\"refreshToken\":null,\"user\":null}"));
        Assert.That(JsonSerializer.Serialize(DietType.OMNIVORE, options), Is.EqualTo("\"OMNIVORE\""));
    }

    [Test]
    public void Desktop_runtime_does_not_reference_WPF_assemblies()
    {
        var references = typeof(MainForm).Assembly.GetReferencedAssemblies().Select(a => a.Name).ToArray();
        Assert.That(references, Does.Contain("System.Windows.Forms"));
        Assert.That(references, Does.Not.Contain("PresentationFramework"));
        Assert.That(references, Does.Not.Contain("PresentationCore"));
    }

    [Test]
    public void Disposed_shell_commands_cannot_start_HTTP_or_change_navigation_on_Mono()
    {
        var requests = 0;
        var shell = new ShellViewModel(_ => { requests++; return Task.CompletedTask; });
        shell.Dispose();
        var state = shell.State;
        Assert.That(shell.CheckConnectionCommand.CanExecute(null), Is.False);
        Assert.That(shell.CancelConnectionCommand.CanExecute(null), Is.False);
        Assert.That(shell.NavigateCommand.CanExecute(ShellSection.Chat), Is.False);
        shell.CheckConnectionCommand.Execute(null);
        shell.CancelConnectionCommand.Execute(null);
        shell.NavigateCommand.Execute(ShellSection.Chat);
        Assert.That(requests, Is.Zero);
        Assert.That(shell.State, Is.EqualTo(state));
    }
}

internal sealed class RecordingHandler : HttpMessageHandler
{
    public List<string> Requests { get; } = new();
    public Func<CancellationToken, Task<HttpResponseMessage>> Response { get; set; } =
        _ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
    public bool WasDisposed { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
    {
        Requests.Add(request.Method + " " + request.RequestUri!.AbsoluteUri);
        return Response(token);
    }

    protected override void Dispose(bool disposing)
    {
        WasDisposed = true;
        base.Dispose(disposing);
    }
}
