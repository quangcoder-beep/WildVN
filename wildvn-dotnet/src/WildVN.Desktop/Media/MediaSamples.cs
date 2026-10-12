using System.IO;

namespace WildVN.Desktop.Media;

public sealed record MediaSamplePaths(string? ImagePath = null, string? VideoPath = null, string? AudioPath = null)
{
    public bool HasSamples => !string.IsNullOrWhiteSpace(ImagePath) || !string.IsNullOrWhiteSpace(VideoPath) || !string.IsNullOrWhiteSpace(AudioPath);
    public static MediaSamplePaths FromEnvironment(Func<string, string?> read)
    {
        if (read is null) throw new ArgumentNullException(nameof(read));
        return new(read("WILDVN_POC_IMAGE_PATH"), read("WILDVN_POC_VIDEO_PATH"), read("WILDVN_POC_AUDIO_PATH"));
    }
}

/// <summary>Owns only a private temporary copy of the explicitly selected local PoC samples.</summary>
public sealed class MediaSamples : IDisposable
{
    public const long MaxFileBytes = 128L * 1024 * 1024;
    public string DirectoryPath { get; }
    public MediaSamplePaths Paths { get; private set; } = new();
    private MediaSamples(string directory) => DirectoryPath = directory;

    public static MediaSamples Stage(MediaSamplePaths paths, CancellationToken token)
    {
        if (paths is null) throw new ArgumentNullException(nameof(paths));
        token.ThrowIfCancellationRequested();
        var samples = new MediaSamples(Path.Combine(Path.GetTempPath(), "wildvn-media-poc-" + Guid.NewGuid().ToString("N")));
        Directory.CreateDirectory(samples.DirectoryPath);
        try
        {
            samples.Paths = new(samples.Copy(paths.ImagePath, MediaKind.Image, token),
                samples.Copy(paths.VideoPath, MediaKind.Video, token), samples.Copy(paths.AudioPath, MediaKind.Audio, token));
            return samples;
        }
        catch { samples.Dispose(); throw; }
    }

    private string? Copy(string? path, MediaKind kind, CancellationToken token)
    {
        token.ThrowIfCancellationRequested();
        var source = MediaPolicy.ValidateLocalPath(path, kind);
        if (source is null) return null;
        using var input = new FileStream(source, FileMode.Open, FileAccess.Read, FileShare.Read);
        if (input.Length > MaxFileBytes) throw new InvalidDataException("Mẫu media vượt giới hạn 128 MiB.");
        var header = new byte[12]; var length = input.Read(header, 0, header.Length);
        if (!HasSignature(Path.GetExtension(source).ToLowerInvariant(), header, length))
            throw new InvalidDataException("Nội dung mẫu media không đúng định dạng đã chọn.");
        input.Position = 0;
        var target = Path.Combine(DirectoryPath, kind.ToString().ToLowerInvariant() + Path.GetExtension(source).ToLowerInvariant());
        using var output = new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        var buffer = new byte[81920]; long copied = 0; int read;
        while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
        {
            token.ThrowIfCancellationRequested(); copied += read;
            if (copied > MaxFileBytes) throw new InvalidDataException("Mẫu media vượt giới hạn 128 MiB.");
            output.Write(buffer, 0, read);
        }
        return target;
    }

    private static bool HasSignature(string extension, byte[] bytes, int length)
    {
        if (length < 12) return false;
        var ascii = System.Text.Encoding.ASCII.GetString(bytes);
        // Explicit comparisons keep each allowed container check directly auditable.
        // The compiler's string-switch trie had unreachable paths after the extension
        // allowlist; no coverage exclusions or relaxed acceptance rules are used.
        if (extension == ".jpg" || extension == ".jpeg") return bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff;
        if (extension == ".png") return bytes.Take(8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        if (extension == ".webp") return ascii.StartsWith("RIFF", StringComparison.Ordinal) && ascii.Substring(8) == "WEBP";
        if (extension == ".mp4") return ascii.Substring(4, 4) == "ftyp";
        if (extension == ".webm") return bytes.Take(4).SequenceEqual(new byte[] { 0x1a, 0x45, 0xdf, 0xa3 });
        if (extension == ".wav") return ascii.StartsWith("RIFF", StringComparison.Ordinal) && ascii.Substring(8) == "WAVE";
        if (extension == ".mp3") return ascii.StartsWith("ID3", StringComparison.Ordinal) || (bytes[0] == 0xff && (bytes[1] & 0xe0) == 0xe0);
        return extension == ".ogg" && ascii.StartsWith("OggS", StringComparison.Ordinal);
    }

    public void Dispose()
    {
        try { if (Directory.Exists(DirectoryPath)) Directory.Delete(DirectoryPath, true); }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException)
        { System.Diagnostics.Trace.TraceWarning("Media PoC temporary cleanup pending ({0}).", error.GetType().Name); }
    }
}
