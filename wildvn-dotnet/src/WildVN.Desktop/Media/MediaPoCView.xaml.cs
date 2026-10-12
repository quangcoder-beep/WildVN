using System.IO;
using System.Windows;
using System.Windows.Controls;

namespace WildVN.Desktop.Media;

public partial class MediaPoCView : UserControl, IDisposable
{
    private NativeMediaPresenter? _native;
    private IsolatedWebMediaPresenter? _web;
    private readonly CancellationTokenSource _closing = new();
    private string? _directory;
    private string? _image;
    private string? _video;
    private string? _audio;
    private bool _busy;
    private bool _disposed;
    private readonly string _initialMode;

    public MediaPoCView(string initialMode = "Native")
    {
        InitializeComponent(); _initialMode = initialMode;
        Loaded += OnLoaded;
        Unloaded += (_, _) => Dispose();
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        Loaded -= OnLoaded;
        await RunAsync(async () =>
        {
            StatusText.Text = "Đang chuẩn bị mẫu cục bộ…";
            await Task.Run(StageSelectedFiles, _closing.Token);
            if (_disposed) return;
            if (_initialMode == "WebView") await ShowWebAsync(); else await ShowNativeAsync();
        });
    }

    private void StageSelectedFiles()
    {
        // Expose only these selected media files and the bundled HTML, never a source folder.
        var sources = new[] {
            (MediaKind.Image, "image", "WILDVN_POC_IMAGE_PATH"),
            (MediaKind.Video, "video", "WILDVN_POC_VIDEO_PATH"),
            (MediaKind.Audio, "audio", "WILDVN_POC_AUDIO_PATH") };
        _directory = Path.Combine(Path.GetTempPath(), "wildvn-media-poc-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_directory);
        File.Copy(Path.Combine(AppContext.BaseDirectory, "Media/Assets/media-poc.html"), Path.Combine(_directory, "media-poc.html"));
        foreach (var (kind, name, variable) in sources)
        {
            _closing.Token.ThrowIfCancellationRequested();
            var path = MediaPolicy.ValidateLocalPath(Environment.GetEnvironmentVariable(variable), kind);
            if (path is null) continue;
            if (new FileInfo(path).Length > 128 * 1024 * 1024)
                throw new ArgumentException("Mẫu PoC vượt giới hạn 128 MiB mỗi file.");
            var target = Path.Combine(_directory, name + Path.GetExtension(path).ToLowerInvariant());
            File.Copy(path, target);
            switch (kind) { case MediaKind.Image: _image = target; break; case MediaKind.Video: _video = target; break; case MediaKind.Audio: _audio = target; break; }
        }
    }

    private async Task ShowNativeAsync()
    {
        ReleasePresenters(); MutedToggle.IsChecked = true; MotionToggle.IsChecked = true; _native = new NativeMediaPresenter();
        PresenterHost.Content = _native.View; await _native.OpenAsync(_image, _video, _audio, _closing.Token);
        if (!_disposed) StatusText.Text = "Native đã được tạo; xem trạng thái từng media. Codec cần thử trên Windows.";
    }

    private async Task ShowWebAsync()
    {
        ReleasePresenters(); MutedToggle.IsChecked = true; MotionToggle.IsChecked = true;
        var names = new[] { _image, _video, _audio }.Where(path => path is not null).Select(path => Path.GetFileName(path!)).ToArray();
        _web = new IsolatedWebMediaPresenter(_directory!, names);
        PresenterHost.Content = _web.View;
        await _web.OpenAsync(new { image = FileName(_image), video = FileName(_video), audio = FileName(_audio) }, _closing.Token);
        if (!_disposed) StatusText.Text = "WebView2 cục bộ đã mở; xem loading/lỗi trong mẫu. Chưa có số đo codec.";
    }

    private static string? FileName(string? path) => path is null ? null : Path.GetFileName(path);
    private async void Native_Click(object sender, RoutedEventArgs e) => await RunAsync(ShowNativeAsync);
    private async void Web_Click(object sender, RoutedEventArgs e) => await RunAsync(ShowWebAsync);
    private async void Playback_Click(object sender, RoutedEventArgs e) => await ApplyAsync(Enum.Parse<MediaAction>((string)((Button)sender).Tag));
    private async void Mute_Click(object sender, RoutedEventArgs e) => await ApplyAsync(((CheckBox)sender).IsChecked == true ? MediaAction.Mute : MediaAction.Unmute);
    private async void Motion_Click(object sender, RoutedEventArgs e) => await ApplyAsync(((CheckBox)sender).IsChecked == true ? MediaAction.ReduceMotion : MediaAction.AllowMotion);
    private async void Metrics_Click(object sender, RoutedEventArgs e) => await RunAsync(async () =>
    {
        var metrics = _web is null ? "Native decoder frame drops cần công cụ ETW/thiết bị; không có số đo ở đây." : await _web.MetricsAsync();
        if (!_disposed) StatusText.Text = metrics;
    });
    private Task ApplyAsync(MediaAction action) => RunAsync(async () =>
    {
        _native?.Apply(action);
        if (_web is not null) await _web.ApplyAsync(action);
    });

    private async Task RunAsync(Func<Task> action)
    {
        if (_disposed || _busy) return;
        _busy = true;
        try { await action(); }
        catch (Exception) { if (!_disposed) StatusText.Text = "Không mở được media. Kiểm tra mẫu cục bộ, codec hoặc WebView2 Runtime; không dùng URL môi trường thật."; }
        finally
        {
            _busy = false;
            if (_disposed) { RemoveStagedFiles(); _closing.Dispose(); }
        }
    }

    private void ReleasePresenters()
    {
        _native?.Dispose(); _native = null; _web?.Dispose(); _web = null; PresenterHost.Content = null;
    }

    private void RemoveStagedFiles()
    {
        if (_directory is null) return;
        try { Directory.Delete(_directory, recursive: true); _directory = null; }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException)
        {
            System.Diagnostics.Trace.TraceWarning("Media PoC staging cleanup pending; files may still be locked.");
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true; _closing.Cancel(); ReleasePresenters();
        if (!_busy) { RemoveStagedFiles(); _closing.Dispose(); }
    }
}
