using System.Windows.Forms;
using LibVLCSharp.Shared;
internal static class Program
{
    [STAThread] private static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        using var form = new Form { Text = "WildVN owned renderer spike", Width = 800, Height = 500 };
        var surface = new Panel { Dock = DockStyle.Fill };
        form.Controls.Add(surface);
        form.Show();
        Console.WriteLine("FORM=" + form.Handle.ToInt64().ToString("x") + " PANEL=" + surface.Handle.ToInt64().ToString("x"));
        Core.Initialize();
        using var vlc = new LibVLC("--no-metadata-network-access", "--no-lua", "--no-video-title-show", "--vout=xcb_x11");
        using var media = new Media(vlc, args[0], FromType.FromPath);
        using var player = new MediaPlayer(vlc) { XWindow = (uint)surface.Handle.ToInt64(), Mute = true };
        Console.WriteLine("VLC=" + vlc.Version + " START=" + player.Play(media));
        using var timer = new System.Windows.Forms.Timer { Interval = 500 };
        var ticks = 0;
        timer.Tick += (_, _) =>
        {
            var stats = media.Statistics;
            Console.WriteLine("STATE=" + player.State + " TIME=" + player.Time + " MUTE=" + player.Mute + " VIDEO=" + stats.DecodedVideo + " AUDIO=" + stats.DecodedAudio);
            if (++ticks == 10) { timer.Stop(); player.Stop(); form.Close(); }
        };
        timer.Start();
        Application.Run(form);
    }
}
