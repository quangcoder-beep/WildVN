using System.Windows;
using System.Windows.Controls;
using WildVN.Desktop.Media;
using Client = WildVN.ApiClient.ApiClient;

namespace WildVN.Desktop;

public partial class MainWindow : Window
{
    private readonly ShellViewModel _shell;

    public MainWindow(Client client)
    {
        InitializeComponent();
        _shell = new ShellViewModel(client.CheckHealthAsync);
        DataContext = _shell;
        var defaultContent = PageContent.Content;
        MediaPoCView? media = null;
        void OpenMedia(string mode)
        {
            media?.Dispose();
            media = new MediaPoCView(mode);
            PageContent.Content = media;
        }
        var button = new Button { Content = "PoC media", Margin = new Thickness(0, 12, 0, 0) };
        button.Click += (_, _) => OpenMedia("Native");
        NavigationPanel.Children.Add(button);
        NavigationPanel.AddHandler(Button.ClickEvent, new RoutedEventHandler((_, args) =>
        {
            if (args.Source is not Button navigation || navigation.Command != _shell.NavigateCommand || media is null) return;
            media.Dispose(); media = null; PageContent.Content = defaultContent;
        }));
        Loaded += (_, _) =>
        {
            var mode = Environment.GetEnvironmentVariable("WILDVN_POC_AUTO_OPEN");
            if (mode is "Native" or "WebView") OpenMedia(mode);
        };
        Closed += (_, _) => { media?.Dispose(); _shell.Dispose(); };
    }
}
