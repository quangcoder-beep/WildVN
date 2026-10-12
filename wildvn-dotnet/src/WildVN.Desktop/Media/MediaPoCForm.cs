using System.Drawing;
using System.IO;
using System.Windows.Forms;
using LibVLCSharp.Shared;

namespace WildVN.Desktop.Media;

/// <summary>Native WinForms replacement for the existing explicit-local-file media PoC.</summary>
public sealed class MediaPoCForm : Form
{
    private readonly MediaSamplePaths _paths;
    private readonly Func<IntPtr, LocalMediaPlayer> _createPlayer;
    private readonly CancellationTokenSource _closing = new();
    private readonly System.Windows.Forms.Timer _poll = new() { Interval = 100 };
    private readonly PictureBox _image = new() { Name = "MediaImage", SizeMode = PictureBoxSizeMode.Zoom, Width = 340, Height = 210 };
    private readonly Panel _surface = new() { Name = "VideoSurface", BackColor = Color.Black, Width = 640, Height = 360 };
    private readonly Label _status = new() { Name = "MediaStatus", AutoSize = true, Text = "Đang nạp mẫu cục bộ…" };
    private readonly Label _metrics = new() { Name = "MediaMetrics", AutoSize = true };
    private readonly ComboBox _selection = new() { Name = "MediaSelection", DropDownStyle = ComboBoxStyle.DropDownList, Width = 150 };
    private readonly CheckBox _muted = new() { Name = "Muted", Text = "Tắt tiếng", Checked = true, AutoSize = true };
    private readonly CheckBox _motion = new() { Name = "ReducedMotion", Text = "Giảm chuyển động", Checked = true, AutoSize = true };
    private readonly Button _play = new() { Name = "Play", Text = "Phát", AutoSize = true, Enabled = false };
    private readonly Button _pause = new() { Name = "Pause", Text = "Tạm dừng", AutoSize = true, Enabled = false };
    private readonly Button _stop = new() { Name = "Stop", Text = "Dừng", AutoSize = true, Enabled = false };
    private MediaSamples? _samples;
    private LocalMediaPlayer? _player;
    public MediaPlaybackState State { get; private set; } = new();
    public MediaMetrics Metrics { get; private set; } = new();
    public string? StagingDirectory => _samples?.DirectoryPath;
    public Task Loading { get; private set; } = Task.CompletedTask;

    public MediaPoCForm(MediaSamplePaths paths, Func<IntPtr, LocalMediaPlayer>? createPlayer = null)
    {
        _paths = paths ?? throw new ArgumentNullException(nameof(paths));
        _createPlayer = createPlayer ?? (surface => new LocalMediaPlayer(surface));
        Text = "WildVN — Media PoC WinForms (cục bộ)"; Name = "MediaPoCForm";
        ClientSize = new Size(1020, 570); MinimumSize = new Size(820, 550);
        StartPosition = FormStartPosition.CenterParent;
        var body = new FlowLayoutPanel { Dock = DockStyle.Fill, AutoScroll = true, Padding = new Padding(12) };
        var controls = new FlowLayoutPanel { Width = 980, Height = 45 };
        _selection.Items.AddRange(new object[] { "Video", "Audio" }); _selection.SelectedIndex = 0;
        controls.Controls.AddRange(new Control[] { _selection, _play, _pause, _stop, _muted, _motion });
        body.Controls.Add(controls); body.SetFlowBreak(controls, true);
        body.Controls.Add(_image); body.Controls.Add(_surface); body.SetFlowBreak(_surface, true);
        body.Controls.Add(_status); body.SetFlowBreak(_status, true);
        body.Controls.Add(_metrics); body.SetFlowBreak(_metrics, true);
        body.Controls.Add(new Label { Name = "WebStatus", AutoSize = true, Text = "WebView2 WinForms: CHƯA TRIỂN KHAI. Native renderer chỉ dùng mẫu cục bộ đã chọn." });
        Controls.Add(body);
        _selection.SelectedIndexChanged += (_, _) => SelectClip();
        _play.Click += (_, _) => ApplyPlayback(MediaAction.Play);
        _pause.Click += (_, _) => ApplyPlayback(MediaAction.Pause);
        _stop.Click += (_, _) => ApplyPlayback(MediaAction.Stop);
        _muted.CheckedChanged += (_, _) => { State = State.Apply(_muted.Checked ? MediaAction.Mute : MediaAction.Unmute); _player?.SetMuted(State.Muted); };
        _motion.CheckedChanged += (_, _) =>
        {
            State = State.Apply(_motion.Checked ? MediaAction.ReduceMotion : MediaAction.AllowMotion);
            if (_motion.Checked && _selection.SelectedIndex == 0 && State.Status == MediaPlaybackStatus.Playing) ApplyPlayback(MediaAction.Pause);
            RefreshControls();
        };
        _poll.Tick += (_, _) => PollPlayer();
    }

    protected override void OnShown(EventArgs e) { base.OnShown(e); Loading = LoadSamplesAsync(); }

    private async Task LoadSamplesAsync()
    {
        State = State.Apply(MediaAction.Load);
        var token = _closing.Token;
        MediaSamples? staged = null;
        try
        {
            staged = await Task.Run(() => MediaSamples.Stage(_paths, token)).ConfigureAwait(false);
            await OnUI(() => AttachSamples(staged), token).ConfigureAwait(false);
        }
        catch (OperationCanceledException) { /* Closing cancels staging and queued UI work. */ }
        catch (Exception error) when (error is ArgumentException or IOException or InvalidDataException or DllNotFoundException or VLCException or BadImageFormatException)
        {
            try { await OnUI(() => ReportLoadFailure(error), token).ConfigureAwait(false); }
            catch (OperationCanceledException) { /* Owner closed while reporting the failure. */ }
        }
        finally { if (staged is not null && !ReferenceEquals(staged, _samples)) staged.Dispose(); }
    }

    private async Task OnUI(Action action, CancellationToken token)
    {
        token.ThrowIfCancellationRequested();
        var completion = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        using var registration = token.Register(() => completion.TrySetCanceled());
        try
        {
            BeginInvoke((MethodInvoker)(() =>
            {
                try { token.ThrowIfCancellationRequested(); action(); completion.TrySetResult(true); }
                catch (Exception error) { completion.TrySetException(error); }
            }));
        }
        catch (InvalidOperationException) when (token.IsCancellationRequested) { completion.TrySetCanceled(); }
        await completion.Task.ConfigureAwait(false);
    }

    private void AttachSamples(MediaSamples staged)
    {
        _samples = staged;
        if (staged.Paths.ImagePath is not null)
        {
            try
            {
                using var source = Image.FromFile(staged.Paths.ImagePath);
                _image.Image = new Bitmap(source);
            }
            catch (OutOfMemoryException error)
            {
                // GDI+ also uses this exception for corrupt/unsupported image data.
                throw new InvalidDataException("Không thể giải mã ảnh đã chọn.", error);
            }
        }
        if (staged.Paths.VideoPath is not null || staged.Paths.AudioPath is not null)
        {
            _player = _createPlayer(_surface.Handle);
            _selection.SelectedIndex = staged.Paths.VideoPath is not null ? 0 : 1;
            SelectClip(); _poll.Start();
        }
        State = State.Apply(MediaAction.Loaded);
        _status.Text = staged.Paths.HasSamples ? "Đã nạp mẫu cục bộ. Không tự phát; bỏ giảm chuyển động để phát video." : "Chưa chọn mẫu media cục bộ qua biến môi trường.";
        RefreshControls();
    }

    private void ReportLoadFailure(Exception error)
    {
        _player?.Dispose(); _player = null;
        ClearImage();
        _samples?.Dispose(); _samples = null;
        State = State.Apply(MediaAction.Fail);
        _status.Text = error is DllNotFoundException or VLCException or BadImageFormatException
            ? "Video/audio chưa khả dụng: cần LibVLC3 phù hợp runtime. CHƯA KIỂM CHỨNG trên máy này."
            : "Không thể nạp mẫu media cục bộ. Kiểm tra file, định dạng và giới hạn 128 MiB.";
        System.Diagnostics.Trace.TraceWarning("Media PoC load failed ({0}).", error.GetType().Name);
        RefreshControls();
    }

    private void SelectClip()
    {
        if (_player is null || _samples is null) return;
        _player.Stop(); Metrics = new();
        var path = _selection.SelectedIndex == 0 ? _samples.Paths.VideoPath : _samples.Paths.AudioPath;
        if (path is not null) _player.Open(path, _selection.SelectedIndex == 0 ? MediaKind.Video : MediaKind.Audio);
        State = State.Apply(MediaAction.Loaded).Apply(MediaAction.Mute); _muted.Checked = true;
        RefreshControls();
    }

    private void ApplyPlayback(MediaAction action)
    {
        if (_player is null) return;
        try
        {
            if (action == MediaAction.Play) _player.Play();
            else if (action == MediaAction.Pause) _player.Pause();
            else _player.Stop();
            State = State.Apply(action); _status.Text = "Native media: " + State.Status; RefreshControls();
        }
        catch (InvalidOperationException)
        { State = State.Apply(MediaAction.Fail); _status.Text = "Không thể phát mẫu media đã chọn."; RefreshControls(); }
    }

    private void PollPlayer()
    {
        if (_player is null || IsDisposed) return;
        Metrics = _player.Metrics;
        if (Metrics.NativeState == "Error") { State = State.Apply(MediaAction.Fail); _status.Text = "Không thể giải mã mẫu media đã chọn."; }
        else if (Metrics.NativeState == "Ended") State = State.Apply(MediaAction.Stop);
        _metrics.Text = $"Native={Metrics.NativeState}; time={Metrics.TimeMs} ms; decoded video={Metrics.DecodedVideo}; audio={Metrics.DecodedAudio}; muted={_player.Muted}";
        RefreshControls();
    }

    private void RefreshControls()
    {
        var selected = _selection.SelectedIndex == 0 ? _samples?.Paths.VideoPath : _samples?.Paths.AudioPath;
        var ready = _player is not null && selected is not null && State.Status is not (MediaPlaybackStatus.Failed or MediaPlaybackStatus.Disposed or MediaPlaybackStatus.Loading);
        _play.Enabled = ready && (_selection.SelectedIndex == 1 || !State.ReducedMotion);
        _pause.Enabled = ready && State.Status == MediaPlaybackStatus.Playing;
        _stop.Enabled = ready;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && !IsDisposed)
        {
            _closing.Cancel(); _poll.Stop(); _poll.Dispose();
            _player?.Dispose(); _player = null;
            ClearImage();
            _samples?.Dispose();
            State = State.Apply(MediaAction.Dispose); _closing.Dispose();
        }
        base.Dispose(disposing);
    }

    private void ClearImage()
    {
        var image = _image.Image; _image.Image = null; image?.Dispose();
    }
}
