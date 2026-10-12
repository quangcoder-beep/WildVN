using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace WildVN.Desktop.Media;

public sealed class NativeMediaPresenter : IDisposable
{
    private readonly Image _image = new() { Height = 160, Stretch = Stretch.Uniform };
    private readonly MediaElement _video = CreatePlayer(240);
    private readonly MediaElement _audio = CreatePlayer(0);
    private readonly TextBlock _status = new() { TextWrapping = TextWrapping.Wrap };
    private bool _disposed;
    public FrameworkElement View { get; }
    public MediaPlaybackState State { get; private set; } = new();

    public NativeMediaPresenter()
    {
        var panel = new StackPanel();
        panel.Children.Add(new TextBlock { Text = "WPF native — mẫu chi tiết / video trang chủ", FontSize = 20 });
        panel.Children.Add(_image); panel.Children.Add(_video); panel.Children.Add(_audio); panel.Children.Add(_status);
        View = panel;
        foreach (var player in new[] { _video, _audio })
        {
            player.MediaOpened += (_, _) => SetState(MediaAction.Loaded, "Sẵn sàng phát mẫu native.");
            player.MediaFailed += (_, _) => SetState(MediaAction.Fail, "Không đọc được mẫu native. Kiểm tra file và codec trên Windows.");
            player.MediaEnded += (_, _) => Apply(MediaAction.Stop);
        }
    }

    public async Task OpenAsync(string? image, string? video, string? audio, CancellationToken cancellationToken)
    {
        if (_disposed) return;
        SetState(MediaAction.Load, "Đang mở media cục bộ…");
        try
        {
            if (image is not null)
            {
                var bitmap = await Task.Run(() =>
                {
                    var decoded = new BitmapImage();
                    decoded.BeginInit(); decoded.CacheOption = BitmapCacheOption.OnLoad;
                    decoded.DecodePixelWidth = 1024;
                    decoded.UriSource = new Uri(image); decoded.EndInit(); decoded.Freeze();
                    return decoded;
                }, cancellationToken);
                if (_disposed || cancellationToken.IsCancellationRequested) return;
                _image.Source = bitmap;
            }
            _video.Source = video is null ? null : new Uri(video);
            _audio.Source = audio is null ? null : new Uri(audio);
            if (video is null && audio is null)
                SetState(MediaAction.Loaded, image is null ? "Chưa chọn mẫu media cục bộ." : "Đã mở ảnh native.");
        }
        catch (Exception error) when (error is System.IO.IOException or NotSupportedException or ArgumentException)
        {
            SetState(MediaAction.Fail, "Không đọc được ảnh. WebP và codec cần kiểm chứng trên Windows.");
        }
    }

    public void Apply(MediaAction action)
    {
        if (_disposed) return;
        if (action == MediaAction.Play && _video.Source is null && _audio.Source is null)
        {
            _status.Text = "Chưa chọn mẫu video/âm thanh để phát."; return;
        }
        State = State.Apply(action);
        foreach (var player in new[] { _video, _audio })
        {
            player.IsMuted = State.Muted;
            if (player.Source is null) continue;
            switch (action)
            {
                case MediaAction.Play: player.Play(); break;
                case MediaAction.Pause: player.Pause(); break;
                case MediaAction.Stop: player.Stop(); break;
            }
        }
        _status.Text = $"Native: {State.Status}; {(State.Muted ? "tắt tiếng" : "có tiếng")}. Giảm chuyển động: {State.ReducedMotion}.";
    }

    private void SetState(MediaAction action, string message)
    {
        if (_disposed) return;
        State = State.Apply(action); _status.Text = message;
    }

    private static MediaElement CreatePlayer(double height) => new()
    {
        Height = height, LoadedBehavior = MediaState.Manual, UnloadedBehavior = MediaState.Close,
        Stretch = Stretch.Uniform, IsMuted = true
    };

    public void Dispose()
    {
        if (_disposed) return;
        Apply(MediaAction.Stop); _disposed = true; State = State.Apply(MediaAction.Dispose);
        _video.Close(); _audio.Close(); _video.Source = null; _audio.Source = null; _image.Source = null;
    }
}
