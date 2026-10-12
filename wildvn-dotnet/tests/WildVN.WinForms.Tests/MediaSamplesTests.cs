using System.Diagnostics;
using NUnit.Framework;
using WildVN.Desktop.Media;

namespace WildVN.WinForms.Tests;

[TestFixture]
public sealed class MediaSamplesTests
{
    internal static string Repo => Environment.GetEnvironmentVariable("WILDVN_TEST_REPO")
        ?? throw new InvalidOperationException("Set WILDVN_TEST_REPO to repository root for real media fixture tests.");
    internal static string Image => Path.GetFullPath(Path.Combine(Repo, "../wildvn-client/public/videos/home/hero-loop-poster.jpg"));
    internal static string Video => Path.GetFullPath(Path.Combine(Repo, "../wildvn-client/public/videos/home/hero-loop.mp4"));
    internal static string Audio => Path.Combine(Repo, "TestResults/winforms-wf02/derived-audio.wav");

    [Test]
    public void Reads_only_three_existing_media_environment_keys()
    {
        var keys = new List<string>();
        var paths = MediaSamplePaths.FromEnvironment(key => { keys.Add(key); return null; });
        Assert.That(keys, Is.EquivalentTo(new[] { "WILDVN_POC_IMAGE_PATH", "WILDVN_POC_VIDEO_PATH", "WILDVN_POC_AUDIO_PATH" }));
        Assert.That(paths.HasSamples, Is.False);
        Assert.Throws<ArgumentNullException>(() => MediaSamplePaths.FromEnvironment(null!));
    }

    [Test]
    public void Copies_real_repository_samples_without_changing_source_and_cleans_only_owned_directory()
    {
        var paths = new MediaSamplePaths(Image, Video, Audio);
        using var samples = MediaSamples.Stage(paths, CancellationToken.None);
        var directory = samples.DirectoryPath;
        Assert.That(File.ReadAllBytes(samples.Paths.ImagePath!), Is.EqualTo(File.ReadAllBytes(Image)));
        Assert.That(File.ReadAllBytes(samples.Paths.VideoPath!), Is.EqualTo(File.ReadAllBytes(Video)));
        Assert.That(File.ReadAllBytes(samples.Paths.AudioPath!), Is.EqualTo(File.ReadAllBytes(Audio)));
        Assert.That(Path.GetDirectoryName(samples.Paths.ImagePath), Is.EqualTo(directory));
        samples.Dispose(); samples.Dispose();
        Assert.That(Directory.Exists(directory), Is.False);
        Assert.That(File.Exists(Image) && File.Exists(Video) && File.Exists(Audio), Is.True);
    }

    [Test]
    public void Empty_selection_cancel_and_null_are_explicit()
    {
        using var empty = MediaSamples.Stage(new(), CancellationToken.None);
        Assert.That(empty.Paths.HasSamples, Is.False);
        Assert.Throws<ArgumentNullException>(() => MediaSamples.Stage(null!, CancellationToken.None));
        Assert.Throws<OperationCanceledException>(() => MediaSamples.Stage(new(Image), new CancellationToken(true)));
    }

    [TestCase("https://example.invalid/sample.jpg")]
    [TestCase("//host/sample.jpg")]
    [TestCase(@"\\host\sample.jpg")]
    [TestCase("sample.jpg")]
    [TestCase("C:sample.jpg")]
    [TestCase("/tmp/file:stream.jpg")]
    public void Rejects_network_relative_and_stream_paths(string path)
        => Assert.Throws<ArgumentException>(() => MediaPolicy.ValidateLocalPath(path, MediaKind.Image));

    [Test]
    public void Portable_policy_preserves_allowlist_ownership_and_lifecycle()
    {
        var names = new[] { "image.jpg" };
        var policy = new MediaPolicy(names); names[0] = "other.jpg";
        Assert.That(policy.IsAllowedRequest(MediaPolicy.Origin + "image.jpg"), Is.True);
        Assert.That(policy.IsAllowedRequest(MediaPolicy.Origin + "other.jpg"), Is.False);
        Assert.That(policy.IsAllowedRequest(MediaPolicy.Origin + "../image.jpg"), Is.False);
        Assert.That(policy.IsAllowedRequest(null!), Is.False);
        Assert.That(policy.IsAllowedNavigation(MediaPolicy.Document), Is.True);
        Assert.Throws<ArgumentNullException>(() => new MediaPolicy(null!));
        Assert.Throws<ArgumentException>(() => new MediaPolicy(new[] { "bad/path.jpg" }));
        Assert.That(MediaPolicy.ValidateLocalPath(" ", MediaKind.Image), Is.Null);
        Assert.Throws<FileNotFoundException>(() => MediaPolicy.ValidateLocalPath(Path.Combine(Repo, "missing.jpg"), MediaKind.Image));
        Assert.Throws<ArgumentOutOfRangeException>(() => MediaPolicy.ValidateLocalPath(Image, (MediaKind)55));
        var initial = new MediaPlaybackState();
        var state = initial;
        foreach (MediaAction action in Enum.GetValues(typeof(MediaAction))) state = state.Apply(action);
        Assert.That(initial.Status, Is.EqualTo(MediaPlaybackStatus.Idle));
        Assert.That(state.Status, Is.EqualTo(MediaPlaybackStatus.Disposed));
        Assert.That(state.Apply(MediaAction.Play), Is.SameAs(state));
        Assert.Throws<ArgumentOutOfRangeException>(() => initial.Apply((MediaAction)999));
    }

    [Test]
    public void Rejects_linked_files_and_parent_directories_on_Mono()
    {
        var directory = Path.Combine(Path.GetTempPath(), "wildvn-link-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        var fileLink = Path.Combine(directory, "link.jpg"); var parentLink = directory + "-parent";
        File.Copy(Image, Path.Combine(directory, "image.jpg"));
        try
        {
            using var file = Process.Start("ln", "-s " + Image + " " + fileLink)!; file.WaitForExit(); Assert.That(file.ExitCode, Is.Zero);
            using var parent = Process.Start("ln", "-s " + directory + " " + parentLink)!; parent.WaitForExit(); Assert.That(parent.ExitCode, Is.Zero);
            Assert.Throws<ArgumentException>(() => MediaPolicy.ValidateLocalPath(fileLink, MediaKind.Image));
            Assert.Throws<ArgumentException>(() => MediaPolicy.ValidateLocalPath(Path.Combine(parentLink, "image.jpg"), MediaKind.Image));
        }
        finally { File.Delete(fileLink); Directory.Delete(parentLink); Directory.Delete(directory, true); }
    }

    [TestCase(".jpg", MediaKind.Image)]
    [TestCase(".mp4", MediaKind.Video)]
    [TestCase(".wav", MediaKind.Audio)]
    public void Rejects_disguised_playlist_and_rolls_back_partial_staging(string extension, MediaKind kind)
    {
        var file = Path.Combine(Path.GetTempPath(), "wildvn-bad-" + Guid.NewGuid().ToString("N") + extension);
        File.WriteAllText(file, "#EXTM3U\nhttps://example.invalid/remote.mp4");
        try
        {
            var paths = kind == MediaKind.Image ? new MediaSamplePaths(file) : kind == MediaKind.Video ? new(Image, file) : new(Image, null, file);
            Assert.Throws<InvalidDataException>(() => MediaSamples.Stage(paths, CancellationToken.None));
        }
        finally { File.Delete(file); }
    }

    [Test]
    public void Oversize_file_is_rejected_before_copy()
    {
        var file = Path.Combine(Path.GetTempPath(), "wildvn-size-" + Guid.NewGuid().ToString("N") + ".mp4");
        using (var stream = File.Create(file)) stream.SetLength(MediaSamples.MaxFileBytes + 1);
        try { Assert.Throws<InvalidDataException>(() => MediaSamples.Stage(new(null, file), CancellationToken.None)); }
        finally { File.Delete(file); }
    }

    [TestCase(".jpeg", MediaKind.Image, "FFD8FF000000000000000000")]
    [TestCase(".png", MediaKind.Image, "89504E470D0A1A0A00000000")]
    [TestCase(".webp", MediaKind.Image, "524946460000000057454250")]
    [TestCase(".webm", MediaKind.Video, "1A45DFA30000000000000000")]
    [TestCase(".mp3", MediaKind.Audio, "494433000000000000000000")]
    [TestCase(".mp3", MediaKind.Audio, "FFE000000000000000000000")]
    [TestCase(".ogg", MediaKind.Audio, "4F6767530000000000000000")]
    public void Container_header_allowlist_is_checked_but_does_not_claim_decoder_support(string extension, MediaKind kind, string hex)
    {
        var bytes = Enumerable.Range(0, hex.Length / 2).Select(i => Convert.ToByte(hex.Substring(i * 2, 2), 16)).ToArray();
        var file = Path.Combine(Path.GetTempPath(), "wildvn-header-" + Guid.NewGuid().ToString("N") + extension);
        try
        {
            File.WriteAllBytes(file, bytes);
            var paths = kind == MediaKind.Image ? new MediaSamplePaths(file) : kind == MediaKind.Video ? new(null, file) : new(null, null, file);
            using var staged = MediaSamples.Stage(paths, CancellationToken.None);
            Assert.That(staged.Paths.HasSamples, Is.True);
            // Header-valid unit fixtures are deliberately not rendered or reported as playback PASS.
            File.WriteAllBytes(file, new byte[12]);
            Assert.Throws<InvalidDataException>(() => MediaSamples.Stage(paths, CancellationToken.None));
            File.WriteAllBytes(file, new byte[2]);
            Assert.Throws<InvalidDataException>(() => MediaSamples.Stage(paths, CancellationToken.None));
        }
        finally { File.Delete(file); }
    }

    [TestCase(".jpg", MediaKind.Image, "FF00FF000000000000000000")]
    [TestCase(".jpg", MediaKind.Image, "FFD800000000000000000000")]
    [TestCase(".webp", MediaKind.Image, "524946460000000057454258")]
    [TestCase(".wav", MediaKind.Audio, "524946460000000057415658")]
    [TestCase(".mp3", MediaKind.Audio, "FF0000000000000000000000")]
    public void Near_matching_header_is_not_accepted(string extension, MediaKind kind, string hex)
    {
        var file = Path.Combine(Path.GetTempPath(), "wildvn-near-header-" + Guid.NewGuid().ToString("N") + extension);
        File.WriteAllBytes(file, Enumerable.Range(0, hex.Length / 2).Select(i => Convert.ToByte(hex.Substring(i * 2, 2), 16)).ToArray());
        try
        {
            var paths = kind == MediaKind.Image ? new MediaSamplePaths(file) : new(null, null, file);
            Assert.Throws<InvalidDataException>(() => MediaSamples.Stage(paths, CancellationToken.None));
        }
        finally { File.Delete(file); }
    }
}
