using System.Windows;
using WildVN.ApiClient;
using Client = WildVN.ApiClient.ApiClient;

namespace WildVN.Desktop;

public partial class App : System.Windows.Application
{
    private Client? _apiClient;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        try
        {
            var address = Environment.GetEnvironmentVariable("WILDVN_API_BASE_URL") ?? "https://localhost:5123/";
            var allowFixtureHttp = Environment.GetEnvironmentVariable("WILDVN_ALLOW_LOOPBACK_HTTP") == "1";
            _apiClient = Client.Create(new ApiClientOptions(new Uri(address), TimeSpan.FromSeconds(15), allowFixtureHttp));
            MainWindow = new MainWindow(_apiClient);
            MainWindow.Show();
        }
        catch (Exception error) when (error is ArgumentException or UriFormatException)
        {
            MessageBox.Show("Cấu hình API không hợp lệ. Dùng địa chỉ HTTPS; HTTP chỉ được bật rõ ràng cho fixture loopback.",
                "WildVN — cấu hình", MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown(1);
        }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _apiClient?.Dispose();
        base.OnExit(e);
    }
}
