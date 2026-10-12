using System.Net.Http;
using WildVN.ApiClient;
using Client = WildVN.ApiClient.ApiClient;

namespace WildVN.Desktop;

public static class DesktopStartup
{
    public static ApiClientOptions ReadOptions(Func<string, string?> readEnvironment)
    {
        if (readEnvironment is null) throw new ArgumentNullException(nameof(readEnvironment));
        var address = readEnvironment("WILDVN_API_BASE_URL") ?? "https://localhost:5123/";
        var allowFixtureHttp = readEnvironment("WILDVN_ALLOW_LOOPBACK_HTTP") == "1";
        return new ApiClientOptions(new Uri(address, UriKind.Absolute), TimeSpan.FromSeconds(15), allowFixtureHttp);
    }

    public static MainForm CreateForm(Func<string, string?> readEnvironment, HttpMessageHandler? handler = null)
    {
        var options = ReadOptions(readEnvironment);
        var client = handler is null ? Client.Create(options) : new Client(options, handler);
        try { return new MainForm(client, Media.MediaSamplePaths.FromEnvironment(readEnvironment)); }
        catch { client.Dispose(); throw; }
    }
}
