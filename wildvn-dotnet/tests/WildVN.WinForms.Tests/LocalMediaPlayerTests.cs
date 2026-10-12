using System.Windows.Forms;
using NUnit.Framework;
using WildVN.Desktop.Media;

namespace WildVN.WinForms.Tests;

[TestFixture, Apartment(ApartmentState.STA)]
public sealed class LocalMediaPlayerTests
{
    private SynchronizationContext? _previousContext;
    [SetUp] public void Preserve_test_thread_context() => _previousContext = SynchronizationContext.Current;
    [TearDown] public void Restore_test_thread_context() => SynchronizationContext.SetSynchronizationContext(_previousContext);
    [Test]
    public void Real_native_player_guards_local_paths_unopened_play_and_disposal()
    {
        using var surface = new Form(); surface.Show(); Application.DoEvents();
        Assert.Throws<ArgumentException>(() => new LocalMediaPlayer(IntPtr.Zero));
        using var player = new LocalMediaPlayer(surface.Handle);
        Assert.That(player.Metrics.DecodedVideo, Is.Zero);
        Assert.That(player.Muted, Is.True);
        Assert.Throws<InvalidOperationException>(() => player.Play());
        Assert.Throws<ArgumentException>(() => player.Open(MediaSamplesTests.Image, MediaKind.Image));
        Assert.Throws<ArgumentException>(() => player.Open("https://example.invalid/video.mp4", MediaKind.Video));
        Assert.Throws<ArgumentException>(() => player.Open(" ", MediaKind.Video));
        Assert.Throws<ArgumentOutOfRangeException>(() => player.Open(MediaSamplesTests.Video, (MediaKind)999));
        player.Open(MediaSamplesTests.Video, MediaKind.Video);
        player.Open(Path.ChangeExtension(MediaSamplesTests.Video, ".webm"), MediaKind.Video);
        player.Play();
        MediaFormTests.PumpUntil(() => player.Metrics.DecodedVideo > 5 && player.Metrics.TimeMs > 100);
        TestContext.WriteLine("WEBM REAL " + player.Metrics);
        // Also exercise replacement with the MP4's AAC stream; both containers have audio.
        player.Stop(); player.Open(MediaSamplesTests.Video, MediaKind.Video); player.Play();
        MediaFormTests.PumpUntil(() => player.Metrics.DecodedAudio > 5 && player.Metrics.TimeMs > 100);
        player.Pause(); player.SetMuted(false);
        MediaFormTests.PumpUntil(() => !player.Muted, 3);
        Assert.That(player.Muted, Is.False); player.SetMuted(true); player.Stop();
        player.Dispose(); player.Dispose();
        Assert.Throws<ObjectDisposedException>(() => player.Play());
        Assert.Throws<ObjectDisposedException>(() => player.Open(MediaSamplesTests.Video, MediaKind.Video));
        Assert.Throws<ObjectDisposedException>(() => player.Pause());
        Assert.Throws<ObjectDisposedException>(() => player.Stop());
        Assert.Throws<ObjectDisposedException>(() => player.SetMuted(true));
        Assert.Throws<ObjectDisposedException>(() => _ = player.Metrics);
        Assert.Throws<ObjectDisposedException>(() => _ = player.Muted);
        surface.Close(); Application.DoEvents();
    }
}
