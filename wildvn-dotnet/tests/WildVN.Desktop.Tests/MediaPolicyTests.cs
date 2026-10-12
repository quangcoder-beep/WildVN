using WildVN.Desktop.Media;
using Xunit;

namespace WildVN.Desktop.Tests;

public sealed class MediaPolicyTests
{
    [Theory]
    [InlineData("https://media.wildvn.invalid/media-poc.html", true)]
    [InlineData("https://media.wildvn.invalid/image.jpg", false)]
    [InlineData("https://evil.invalid/media-poc.html", false)]
    [InlineData("http://media.wildvn.invalid/media-poc.html", false)]
    [InlineData("file:///C:/private.json", false)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("https://media.wildvn.invalid:444/media-poc.html", false)]
    [InlineData("https://user@media.wildvn.invalid/media-poc.html", false)]
    [InlineData("https://media.wildvn.invalid/media-poc.html?token=secret", false)]
    [InlineData("https://media.wildvn.invalid/media-poc.html#fragment", false)]
    [InlineData("https://media.wildvn.invalid/x/../media-poc.html", false)]
    [InlineData("https://media.wildvn.invalid/%6dedia-poc.html", false)]
    [InlineData("https://media.wildvn.invalid/../media-poc.html", false)]
    [InlineData("https://media.wildvn.invalid\\media-poc.html", false)]
    [InlineData("not a url", false)]
    [InlineData("", false)]
    public void Navigation_accepts_only_exact_local_document(string url, bool expected)
    {
        var policy = new MediaPolicy(["image.jpg", "video.mp4"]);
        Assert.Equal(expected, policy.IsAllowedNavigation(url));
    }

    [Theory]
    [InlineData("https://media.wildvn.invalid/image.jpg", true)]
    [InlineData("https://media.wildvn.invalid/video.mp4", true)]
    [InlineData("https://media.wildvn.invalid/media-poc.html", true)]
    [InlineData("https://media.wildvn.invalid/private.json", false)]
    [InlineData("https://media.wildvn.invalid/image.jpg?expires=1", false)]
    [InlineData("https://media.wildvn.invalid/sub/image.jpg", false)]
    [InlineData("https://media.wildvn.invalid/audio.wav", false)]
    public void Requests_expose_only_named_staged_assets(string url, bool expected)
    {
        var policy = new MediaPolicy(["image.jpg", "video.mp4"]);
        Assert.Equal(expected, policy.IsAllowedRequest(url));
    }

    [Theory]
    [InlineData("private.json")]
    [InlineData("../image.jpg")]
    [InlineData("nested/image.jpg")]
    [InlineData("image.jpg?x=1")]
    [InlineData("image.jpg%00")]
    [InlineData("IMAGE.JPG")]
    [InlineData("image.jpg\n")]
    public void Constructor_rejects_unapproved_asset_names(string asset)
    {
        Assert.Throws<ArgumentException>(() => new MediaPolicy([asset]));
    }

    [Fact]
    public void Policy_copies_input_allowlist()
    {
        var assets = new[] { "image.jpg" };
        var policy = new MediaPolicy(assets);
        assets[0] = "audio.wav";
        Assert.True(policy.IsAllowedRequest("https://media.wildvn.invalid/image.jpg"));
        Assert.False(policy.IsAllowedRequest("https://media.wildvn.invalid/audio.wav"));
    }

    [Theory]
    [InlineData(MediaKind.Image, "sample.jpg")]
    [InlineData(MediaKind.Image, "sample.png")]
    [InlineData(MediaKind.Image, "sample.webp")]
    [InlineData(MediaKind.Video, "sample.mp4")]
    [InlineData(MediaKind.Video, "sample.webm")]
    [InlineData(MediaKind.Audio, "sample.wav")]
    [InlineData(MediaKind.Audio, "sample.mp3")]
    [InlineData(MediaKind.Audio, "sample.ogg")]
    public void Local_sample_accepts_existing_explicit_media_file(MediaKind kind, string filename)
    {
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + filename);
        File.WriteAllBytes(path, [0]);
        try { Assert.Equal(Path.GetFullPath(path), MediaPolicy.ValidateLocalPath(path, kind)); }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Local_sample_rejects_missing_wrong_kind_remote_and_unknown_kind()
    {
        Assert.Null(MediaPolicy.ValidateLocalPath(null, MediaKind.Image));
        Assert.Null(MediaPolicy.ValidateLocalPath(" ", MediaKind.Video));
        Assert.Throws<ArgumentException>(() => MediaPolicy.ValidateLocalPath("https://example.invalid/a.jpg", MediaKind.Image));
        Assert.Throws<ArgumentException>(() => MediaPolicy.ValidateLocalPath("relative.jpg", MediaKind.Image));
        Assert.Throws<ArgumentException>(() => MediaPolicy.ValidateLocalPath("/nonexistent.jpg", MediaKind.Audio));
        Assert.Throws<FileNotFoundException>(() => MediaPolicy.ValidateLocalPath(Path.GetFullPath("missing.jpg"), MediaKind.Image));
        Assert.Throws<ArgumentOutOfRangeException>(() => MediaPolicy.ValidateLocalPath(Path.GetFullPath("image.jpg"), (MediaKind)123));
    }

    [Fact]
    public void Local_sample_rejects_symbolic_links()
    {
        var target = Path.GetTempFileName();
        var link = target + ".jpg";
        try
        {
            File.CreateSymbolicLink(link, target);
            Assert.Throws<ArgumentException>(() => MediaPolicy.ValidateLocalPath(link, MediaKind.Image));
        }
        finally { File.Delete(link); File.Delete(target); }
    }

    [Fact]
    public void Lifecycle_defaults_to_muted_reduced_motion_and_uses_new_snapshots()
    {
        var initial = new MediaPlaybackState();
        var loaded = initial.Apply(MediaAction.Loaded);
        var playing = loaded.Apply(MediaAction.Play);
        Assert.Equal(MediaPlaybackStatus.Idle, initial.Status);
        Assert.True(initial.Muted);
        Assert.True(initial.ReducedMotion);
        Assert.Equal(MediaPlaybackStatus.Ready, loaded.Status);
        Assert.Equal(MediaPlaybackStatus.Playing, playing.Status);
        Assert.Equal(MediaPlaybackStatus.Paused, playing.Apply(MediaAction.Pause).Status);
        Assert.Equal(MediaPlaybackStatus.Stopped, playing.Apply(MediaAction.Stop).Status);
        Assert.False(playing.Apply(MediaAction.Unmute).Muted);
        Assert.True(playing.Apply(MediaAction.Unmute).Apply(MediaAction.Mute).Muted);
        Assert.False(playing.Apply(MediaAction.AllowMotion).ReducedMotion);
        Assert.True(playing.Apply(MediaAction.AllowMotion).Apply(MediaAction.ReduceMotion).ReducedMotion);
        Assert.Equal(MediaPlaybackStatus.Loading, initial.Apply(MediaAction.Load).Status);
        Assert.Equal(MediaPlaybackStatus.Failed, playing.Apply(MediaAction.Fail).Status);
    }

    [Fact]
    public void Lifecycle_disposal_is_terminal_and_unknown_actions_are_rejected()
    {
        var disposed = new MediaPlaybackState().Apply(MediaAction.Dispose);
        foreach (var action in Enum.GetValues<MediaAction>())
            Assert.Same(disposed, disposed.Apply(action));
        Assert.Equal(MediaPlaybackStatus.Disposed, disposed.Status);
        Assert.Throws<ArgumentOutOfRangeException>(() => new MediaPlaybackState().Apply((MediaAction)999));
    }
    [Fact]
    public void Local_samples_reject_stream_paths_and_symbolic_link_parents()
    {
        Assert.Throws<ArgumentException>(() => MediaPolicy.ValidateLocalPath(Path.Combine(Path.GetTempPath(), "file:stream.jpg"), MediaKind.Image));
        var directory = Path.Combine(Path.GetTempPath(), "media-policy-" + Guid.NewGuid());
        var link = directory + "-link";
        Directory.CreateDirectory(directory);
        File.WriteAllBytes(Path.Combine(directory, "sample.jpg"), [0]);
        try
        {
            Directory.CreateSymbolicLink(link, directory);
            Assert.Throws<ArgumentException>(() => MediaPolicy.ValidateLocalPath(Path.Combine(link, "sample.jpg"), MediaKind.Image));
        }
        finally { Directory.Delete(link); Directory.Delete(directory, true); }
    }

}
