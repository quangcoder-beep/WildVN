using System.IO;
using System.Text.Json;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace WildVN.Desktop.Media;

public sealed class IsolatedWebMediaPresenter : IDisposable
{
    private readonly WebView2 _view = new() { Height = 480, HorizontalAlignment = HorizontalAlignment.Stretch };
    private readonly MediaPolicy _policy;
    private readonly string _directory;
    private bool _disposed;
    private bool _loaded;
    public FrameworkElement View => _view;

    public IsolatedWebMediaPresenter(string directory, IEnumerable<string> assets)
    {
        _directory = directory; _policy = new MediaPolicy(assets);
    }

    public async Task OpenAsync(object samples, CancellationToken cancellationToken)
    {
        var profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "WildVN", "MediaPoC", "WebViewProfile");
        var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: profile);
        if (_disposed || cancellationToken.IsCancellationRequested) return;
        await _view.EnsureCoreWebView2Async(environment);
        if (_disposed || cancellationToken.IsCancellationRequested) return;
        var core = _view.CoreWebView2;
        core.Settings.AreHostObjectsAllowed = false;
        core.Settings.IsWebMessageEnabled = false;
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.AreDefaultScriptDialogsEnabled = false;
        core.NavigationStarting += (_, e) => e.Cancel = !_policy.IsAllowedNavigation(e.Uri);
        core.FrameNavigationStarting += (_, e) => e.Cancel = true;
        core.NewWindowRequested += (_, e) => e.Handled = true;
        core.DownloadStarting += (_, e) => e.Cancel = true;
        core.PermissionRequested += (_, e) => e.State = CoreWebView2PermissionState.Deny;
        core.SetVirtualHostNameToFolderMapping("media.wildvn.invalid", _directory, CoreWebView2HostResourceAccessKind.DenyCors);
        core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += (_, e) =>
        {
            if (!_policy.IsAllowedRequest(e.Request.Uri))
                e.Response = environment.CreateWebResourceResponse(Stream.Null, 403, "Forbidden", "Content-Type: text/plain");
        };
        var completion = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        void OnNavigation(object? sender, CoreWebView2NavigationCompletedEventArgs args)
        {
            if (args.IsSuccess) completion.TrySetResult();
            else completion.TrySetException(new InvalidOperationException("Không mở được HTML media cục bộ."));
        }
        core.NavigationCompleted += OnNavigation;
        try
        {
            core.Navigate(MediaPolicy.Document);
            await completion.Task.WaitAsync(TimeSpan.FromSeconds(15), cancellationToken);
            if (_disposed) return;
            _loaded = true;
            await ExecuteAsync("loadSamples(" + JsonSerializer.Serialize(samples) + ")");
        }
        finally { core.NavigationCompleted -= OnNavigation; }
    }

    public Task ApplyAsync(MediaAction action) => ExecuteAsync(action switch
    {
        MediaAction.Play => "play()", MediaAction.Pause => "pause()", MediaAction.Stop => "stop()",
        MediaAction.Mute => "mute(true)", MediaAction.Unmute => "mute(false)",
        MediaAction.ReduceMotion => "setReducedMotion(true)", MediaAction.AllowMotion => "setReducedMotion(false)",
        _ => throw new ArgumentOutOfRangeException(nameof(action))
    });

    public async Task<string> MetricsAsync()
    {
        if (_disposed || !_loaded || !_policy.IsAllowedNavigation(_view.CoreWebView2.Source))
            return "Chưa có số đo WebView2.";
        return await _view.ExecuteScriptAsync("window.mediaPoc.metrics()");
    }

    private async Task ExecuteAsync(string call)
    {
        if (_disposed || !_loaded) return;
        if (!_policy.IsAllowedNavigation(_view.CoreWebView2.Source))
            throw new InvalidOperationException("Nguồn WebView2 không hợp lệ.");
        await _view.ExecuteScriptAsync("window.mediaPoc." + call + ";");
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true; _loaded = false;
        _view.Dispose(); // destroys the document even while its async initialization is in flight
    }
}
