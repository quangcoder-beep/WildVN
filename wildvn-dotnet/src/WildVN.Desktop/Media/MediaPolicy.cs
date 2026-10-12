using System.IO;
using System.Text.RegularExpressions;

namespace WildVN.Desktop.Media;

public enum MediaKind { Image, Video, Audio }
public enum MediaPlaybackStatus { Idle, Loading, Ready, Playing, Paused, Stopped, Failed, Disposed }
public enum MediaAction { Load, Loaded, Play, Pause, Stop, Mute, Unmute, ReduceMotion, AllowMotion, Fail, Dispose }

public sealed record MediaPlaybackState(MediaPlaybackStatus Status = MediaPlaybackStatus.Idle,
    bool Muted = true, bool ReducedMotion = true)
{
    public MediaPlaybackState Apply(MediaAction action) => Status == MediaPlaybackStatus.Disposed ? this : action switch
    {
        MediaAction.Load => this with { Status = MediaPlaybackStatus.Loading },
        MediaAction.Loaded => this with { Status = MediaPlaybackStatus.Ready },
        MediaAction.Play => this with { Status = MediaPlaybackStatus.Playing },
        MediaAction.Pause => this with { Status = MediaPlaybackStatus.Paused },
        MediaAction.Stop => this with { Status = MediaPlaybackStatus.Stopped },
        MediaAction.Mute => this with { Muted = true },
        MediaAction.Unmute => this with { Muted = false },
        MediaAction.ReduceMotion => this with { ReducedMotion = true },
        MediaAction.AllowMotion => this with { ReducedMotion = false },
        MediaAction.Fail => this with { Status = MediaPlaybackStatus.Failed },
        MediaAction.Dispose => this with { Status = MediaPlaybackStatus.Disposed },
        _ => throw new ArgumentOutOfRangeException(nameof(action))
    };
}

public sealed class MediaPolicy
{
    public const string Origin = "https://media.wildvn.invalid/";
    public const string Document = Origin + "media-poc.html";
    private readonly HashSet<string> _assets;

    public MediaPolicy(IEnumerable<string> assetNames)
    {
        if (assetNames is null) throw new ArgumentNullException(nameof(assetNames));
        var names = assetNames.ToArray();
        if (names.Any(name => name is null || !Regex.IsMatch(name, @"^[a-z0-9][a-z0-9_-]*\.(jpg|jpeg|png|webp|mp4|webm|wav|mp3|ogg)\z")))
            throw new ArgumentException("Chỉ cho phép tên media cục bộ đã chọn.", nameof(assetNames));
        // Own the copied set; it is never mutated after construction.
        _assets = new HashSet<string>(names.Concat(new[] { "media-poc.html" }), StringComparer.Ordinal);
    }

    public bool IsAllowedNavigation(string url) => string.Equals(url, Document, StringComparison.Ordinal);

    public bool IsAllowedRequest(string url) => url is not null && url.StartsWith(Origin, StringComparison.Ordinal)
        && _assets.Contains(url.Substring(Origin.Length));

    public static string? ValidateLocalPath(string? path, MediaKind kind)
    {
        var extensions = kind switch
        {
            MediaKind.Image => new[] { ".jpg", ".jpeg", ".png", ".webp" },
            MediaKind.Video => new[] { ".mp4", ".webm" },
            MediaKind.Audio => new[] { ".wav", ".mp3", ".ogg" },
            _ => throw new ArgumentOutOfRangeException(nameof(kind))
        };
        if (path is null || string.IsNullOrWhiteSpace(path)) return null;
        if (path.StartsWith("//", StringComparison.Ordinal) || path.StartsWith(@"\\", StringComparison.Ordinal)
            || path.Substring(path.Length > 1 && path[1] == ':' ? 2 : 0).IndexOf(':') >= 0
            || !IsAbsolutePath(path) || !extensions.Contains(Path.GetExtension(path).ToLowerInvariant()))
            throw new ArgumentException("Chọn file media cục bộ đúng định dạng; URL từ xa chưa được bật.", nameof(path));
        var fullPath = Path.GetFullPath(path);
        if (!File.Exists(fullPath)) throw new FileNotFoundException("Không tìm thấy file media đã chọn.");
        for (var parent = Directory.GetParent(fullPath); parent is not null; parent = parent.Parent)
            if (IsLink(parent.FullName))
                throw new ArgumentException("Không dùng đường dẫn qua symbolic link.", nameof(path));
        if (IsLink(fullPath))
            throw new ArgumentException("Không dùng symbolic link cho mẫu media.", nameof(path));
        return fullPath;
    }

    private static bool IsAbsolutePath(string path)
    {
#if NETFRAMEWORK
        return Path.IsPathRooted(path) && (Path.DirectorySeparatorChar == '/'
            || (path.Length > 2 && path[1] == ':' && (path[2] == '\\' || path[2] == '/')));
#else
        return Path.IsPathFullyQualified(path);
#endif
    }

    private static bool IsLink(string path) => (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0;
}
