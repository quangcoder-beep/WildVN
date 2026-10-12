using LibVLCSharp.Shared;

namespace WildVN.Desktop.Media;

public sealed record MediaMetrics(long TimeMs = 0, int DecodedVideo = 0, int DecodedAudio = 0, string NativeState = "Idle");

/// <summary>LibVLC native adapter. It never accepts a URL, playlist, or arbitrary VLC option.</summary>
public sealed class LocalMediaPlayer : IDisposable
{
    private readonly LibVLC _vlc;
    private readonly MediaPlayer _player;
    private LibVLCSharp.Shared.Media? _media;
    private bool _disposed;

    public LocalMediaPlayer(IntPtr surface)
    {
        if (surface == IntPtr.Zero) throw new ArgumentException("Cần surface đã tạo.", nameof(surface));
        Core.Initialize();
        var options = new[] { "--ignore-config", "--no-metadata-network-access", "--no-lua", "--no-video-title-show", "--no-sub-autodetect-file" };
        _vlc = new LibVLC(options);
        try
        {
            _player = new MediaPlayer(_vlc) { Mute = true };
            if (Environment.OSVersion.Platform == PlatformID.Unix) _player.XWindow = checked((uint)surface.ToInt64());
            else _player.Hwnd = surface;
        }
        catch { _vlc.Dispose(); throw; }
    }

    public void Open(string path, MediaKind kind)
    {
        ThrowIfDisposed();
        if (kind == MediaKind.Image) throw new ArgumentException("Ảnh dùng PictureBox.", nameof(kind));
        var local = MediaPolicy.ValidateLocalPath(path, kind) ?? throw new ArgumentException("Chưa chọn mẫu media.", nameof(path));
        Stop(); _player.Media = null; _media?.Dispose();
        _media = new LibVLCSharp.Shared.Media(_vlc, local, FromType.FromPath);
        // Force the chosen container demux, preventing renamed playlists from being followed.
        var extension = System.IO.Path.GetExtension(local).ToLowerInvariant();
        _media.AddOption(":demux=" + (extension == ".mp4" ? "mp4" : extension == ".webm" ? "mkv" : extension == ".wav" ? "wav" : extension == ".ogg" ? "ogg" : "mpga"));
        _player.Media = _media;
        _player.Mute = true;
    }

    public void Play()
    {
        ThrowIfDisposed();
        if (_media is null) throw new InvalidOperationException("Chưa chọn mẫu media.");
        if (!_player.Play()) throw new InvalidOperationException("Không thể phát mẫu media.");
    }
    public void Pause() { ThrowIfDisposed(); _player.SetPause(true); }
    public void Stop() { ThrowIfDisposed(); _player.Stop(); }
    public void SetMuted(bool muted) { ThrowIfDisposed(); _player.Mute = muted; }
    public bool Muted { get { ThrowIfDisposed(); return _player.Mute; } }
    public MediaMetrics Metrics
    {
        get
        {
            ThrowIfDisposed();
            var stats = _media?.Statistics ?? default;
            return new(Math.Max(0, _player.Time), stats.DecodedVideo, stats.DecodedAudio, _player.State.ToString());
        }
    }
    private void ThrowIfDisposed()
    {
        if (_disposed) throw new ObjectDisposedException(nameof(LocalMediaPlayer));
    }
    public void Dispose()
    {
        if (_disposed) return;
        _player.Stop(); _player.Media = null; _player.Dispose(); _media?.Dispose(); _vlc.Dispose();
        _disposed = true;
    }
}
