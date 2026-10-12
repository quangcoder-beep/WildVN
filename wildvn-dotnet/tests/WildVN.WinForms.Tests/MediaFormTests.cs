using System.Windows.Forms;
using NUnit.Framework;
using WildVN.Desktop;
using WildVN.Desktop.Media;

namespace WildVN.WinForms.Tests;

[TestFixture, Apartment(ApartmentState.STA)]
public sealed class MediaFormTests
{
    internal static void PumpUntil(Func<bool> ready, int seconds = 10)
    {
        var deadline = DateTime.UtcNow.AddSeconds(seconds);
        while (!ready() && DateTime.UtcNow < deadline) { Application.DoEvents(); Thread.Sleep(10); }
        Assert.That(ready(), Is.True, "Media UI did not reach expected state.");
    }
    private static T Named<T>(Control form, string name) where T : Control => (T)form.Controls.Find(name, true).Single();

    [Test]
    public void Real_picture_is_loaded_detached_and_disposed_and_no_autoplay_occurs()
    {
        using var form = new MediaPoCForm(new(MediaSamplesTests.Image, MediaSamplesTests.Video, MediaSamplesTests.Audio));
        form.Show(); Application.DoEvents();
        TestContext.WriteLine("After Show state=" + form.State.Status + " loading=" + form.Loading.Status);
        PumpUntil(() => form.State.Status == MediaPlaybackStatus.Ready);
        var picture = Named<PictureBox>(form, "MediaImage");
        Assert.That(picture.Image.Width, Is.GreaterThan(0));
        Assert.That(form.State.Muted && form.State.ReducedMotion, Is.True);
        Assert.That(form.Metrics.TimeMs, Is.Zero);
        Assert.That(Named<Label>(form, "WebStatus").Text, Does.Contain("CHƯA TRIỂN KHAI"));
        var directory = form.StagingDirectory!;
        form.Close(); Application.DoEvents();
        Assert.That(form.IsDisposed, Is.True);
        Assert.That(form.State.Status, Is.EqualTo(MediaPlaybackStatus.Disposed));
        Assert.That(picture.Image, Is.Null);
        Assert.That(Directory.Exists(directory), Is.False);
    }

    [Test]
    public void Real_video_play_pause_motion_mute_stop_and_switch_to_derived_audio()
    {
        Control.CheckForIllegalCrossThreadCalls = true;
        using var form = new MediaPoCForm(new(MediaSamplesTests.Image, MediaSamplesTests.Video, MediaSamplesTests.Audio));
        form.Show(); PumpUntil(() => form.State.Status == MediaPlaybackStatus.Ready);
        var motion = Named<CheckBox>(form, "ReducedMotion");
        Assert.That(Named<Button>(form, "Play").Enabled, Is.False);
        motion.Checked = false;
        Named<Button>(form, "Play").PerformClick();
        PumpUntil(() => form.Metrics.DecodedVideo > 5 && form.Metrics.TimeMs > 100);
        TestContext.WriteLine("VIDEO REAL " + form.Metrics);
        Named<Button>(form, "Pause").PerformClick();
        PumpUntil(() => form.State.Status == MediaPlaybackStatus.Paused);
        var before = form.Metrics.TimeMs;
        for (var i = 0; i < 20; i++) { Application.DoEvents(); Thread.Sleep(20); }
        Assert.That(form.Metrics.TimeMs, Is.InRange(before, before + 100));
        Named<CheckBox>(form, "Muted").Checked = false;
        Assert.That(form.State.Muted, Is.False);
        Named<CheckBox>(form, "Muted").Checked = true;
        Named<Button>(form, "Play").PerformClick();
        PumpUntil(() => form.State.Status == MediaPlaybackStatus.Playing);
        motion.Checked = true;
        PumpUntil(() => form.State.Status == MediaPlaybackStatus.Paused);
        Named<Button>(form, "Stop").PerformClick();
        Assert.That(form.State.Status, Is.EqualTo(MediaPlaybackStatus.Stopped));
        Named<ComboBox>(form, "MediaSelection").SelectedIndex = 1;
        Named<Button>(form, "Play").PerformClick();
        PumpUntil(() => form.Metrics.DecodedAudio > 5 && form.Metrics.TimeMs > 100);
        TestContext.WriteLine("AUDIO REAL (repo AAC -> WAV; no audibility claim) " + form.Metrics);
        Assert.That(form.State.Muted, Is.True);
    }

    [Test]
    public void Empty_missing_invalid_and_close_during_staging_are_safe()
    {
        using var empty = new MediaPoCForm(new());
        empty.Show(); PumpUntil(() => Named<Label>(empty, "MediaStatus").Text.Contains("Chưa chọn"));
        Assert.That(Named<Button>(empty, "Play").Enabled, Is.False);
        using var bad = new MediaPoCForm(new("https://example.invalid/image.jpg"));
        bad.Show(); PumpUntil(() => bad.State.Status == MediaPlaybackStatus.Failed);
        Assert.That(Named<Label>(bad, "MediaStatus").Text, Does.Not.Contain("example.invalid"));
        using var closing = new MediaPoCForm(new(MediaSamplesTests.Image, MediaSamplesTests.Video));
        closing.Show(); closing.Close(); Application.DoEvents();
        PumpUntil(() => closing.Loading.IsCompleted);
        Assert.That(closing.Loading.IsFaulted, Is.False);
        Assert.That(closing.StagingDirectory is null || !Directory.Exists(closing.StagingDirectory), Is.True);
        Assert.That(closing.State.Status, Is.EqualTo(MediaPlaybackStatus.Disposed));
        Assert.Throws<ArgumentNullException>(() => new MediaPoCForm(null!));
    }

    [Test]
    public void Configured_shell_opens_only_its_media_form_and_closes_it_with_owner()
    {
        using var handler = new RecordingHandler();
        using var shell = DesktopStartup.CreateForm(key => key == "WILDVN_POC_IMAGE_PATH" ? MediaSamplesTests.Image : null, handler);
        shell.Show(); Application.DoEvents();
        var button = Named<Button>(shell, "MediaPoC"); Assert.That(button.Enabled, Is.True);
        button.PerformClick(); Application.DoEvents();
        var media = shell.OwnedForms.OfType<MediaPoCForm>().Single();
        button.PerformClick(); Assert.That(shell.OwnedForms.OfType<MediaPoCForm>().Count(), Is.EqualTo(1));
        Assert.That(handler.Requests, Is.Empty);
        shell.Close(); Application.DoEvents(); Assert.That(media.IsDisposed, Is.True);
    }

    [Test]
    public void Corrupt_header_valid_image_reports_safe_decode_failure()
    {
        var path = Path.Combine(Path.GetTempPath(), "wildvn-corrupt-" + Guid.NewGuid().ToString("N") + ".jpg");
        File.WriteAllBytes(path, new byte[] { 0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0 });
        try
        {
            using var form = new MediaPoCForm(new(path)); form.Show();
            PumpUntil(() => form.State.Status == MediaPlaybackStatus.Failed || form.Loading.IsFaulted);
            TestContext.WriteLine("Corrupt decode: state=" + form.State.Status + "; task=" + form.Loading.Status + "; exception=" + form.Loading.Exception);
            Assert.That(form.State.Status, Is.EqualTo(MediaPlaybackStatus.Failed));
            Assert.That(form.Loading.IsFaulted, Is.False);
            Assert.That(Named<Label>(form, "MediaStatus").Text, Does.Not.Contain(path));
            Assert.That(Named<Button>(form, "Play").Enabled, Is.False);
        }
        finally { File.Delete(path); }
    }

    [Test]
    public void Audio_only_starts_muted_and_unavailable_video_selection_cannot_replay_audio()
    {
        using var form = new MediaPoCForm(new(null, null, MediaSamplesTests.Audio)); form.Show();
        PumpUntil(() => form.State.Status == MediaPlaybackStatus.Ready);
        Assert.That(Named<ComboBox>(form, "MediaSelection").SelectedIndex, Is.EqualTo(1));
        Named<Button>(form, "Play").PerformClick();
        PumpUntil(() => form.Metrics.TimeMs > 100);
        Named<Button>(form, "Stop").PerformClick();
        Named<ComboBox>(form, "MediaSelection").SelectedIndex = 0;
        Assert.That(Named<Button>(form, "Play").Enabled, Is.False);
        Assert.That(Named<Button>(form, "Pause").Enabled, Is.False);
    }

    [Test]
    public void Native_initialization_failure_clears_preloaded_picture_and_staging()
    {
        using var form = new MediaPoCForm(new(MediaSamplesTests.Image, MediaSamplesTests.Video),
            _ => throw new DllNotFoundException("private native path"));
        form.Show(); PumpUntil(() => form.State.Status == MediaPlaybackStatus.Failed);
        Assert.That(Named<PictureBox>(form, "MediaImage").Image, Is.Null);
        Assert.That(form.StagingDirectory, Is.Null);
        Assert.That(Named<Button>(form, "Play").Enabled, Is.False);
        Assert.That(Named<Label>(form, "MediaStatus").Text, Does.Contain("LibVLC3").And.Not.Contain("private"));
    }
}
