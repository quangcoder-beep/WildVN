using System.Windows.Forms;

namespace WildVN.Desktop;

internal static class Program
{
    [STAThread]
    public static int Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        try
        {
            using var form = DesktopStartup.CreateForm(Environment.GetEnvironmentVariable);
            Application.Run(form);
            return 0;
        }
        catch (Exception error) when (error is ArgumentException or UriFormatException)
        {
            MessageBox.Show("Cấu hình API không hợp lệ. Dùng HTTPS; HTTP chỉ được bật rõ ràng cho fixture loopback.",
                "WildVN — cấu hình", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
