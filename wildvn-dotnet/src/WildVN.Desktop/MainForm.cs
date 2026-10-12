using System.Drawing;
using System.Windows.Forms;
using Client = WildVN.ApiClient.ApiClient;

namespace WildVN.Desktop;

/// <summary>WinForms view of the existing P0 shell; form owns its transport and pending work.</summary>
public sealed class MainForm : Form
{
    private readonly Client _client;
    private readonly ShellViewModel _shell;
    private readonly Media.MediaSamplePaths _mediaPaths;
    private readonly Font _bodyFont;
    private readonly Font _titleFont;
    private readonly Font _brandFont;
    private readonly Label _title = new() { Name = "PageTitle", AutoSize = true };
    private readonly Label _feature = new() { Name = "FeatureStatus", AutoSize = true };
    private readonly Label _connection = new() { Name = "ConnectionMessage", AutoSize = true };
    private readonly Button _check = new() { Name = "CheckConnection", Text = "Kiểm tra kết nối API", AutoSize = true };
    private readonly Button _cancel = new() { Name = "CancelConnection", Text = "Hủy kiểm tra", AutoSize = true };

    public MainForm(Client client, Media.MediaSamplePaths? mediaPaths = null)
    {
        if (client is null) throw new ArgumentNullException(nameof(client));
        _client = client;
        _mediaPaths = mediaPaths ?? new();
        _shell = new ShellViewModel(client.CheckHealthAsync);
        Name = "WildVNMainForm";
        Text = "WildVN .NET — WinForms (P0)";
        ClientSize = new Size(1040, 660);
        MinimumSize = new Size(800, 540);
        StartPosition = FormStartPosition.CenterScreen;
        AutoScaleMode = AutoScaleMode.Font;
        _bodyFont = new Font(FontFamily.GenericSansSerif, 11);
        _titleFont = new Font(_bodyFont.FontFamily, 22, FontStyle.Bold);
        _brandFont = new Font(_bodyFont, FontStyle.Bold);
        Font = _bodyFont;
        BuildLayout();
        _check.Click += (_, _) => _shell.CheckConnectionCommand.Execute(null);
        _cancel.Click += (_, _) => _shell.CancelConnectionCommand.Execute(null);
        _shell.PropertyChanged += ShellChanged;
        _shell.CheckConnectionCommand.CanExecuteChanged += ShellChanged;
        _shell.CancelConnectionCommand.CanExecuteChanged += ShellChanged;
        RefreshView();
    }

    private void BuildLayout()
    {
        var layout = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 1, Padding = new Padding(20) };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 240));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        layout.Controls.Add(BuildNavigation(), 0, 0);
        layout.Controls.Add(BuildContent(), 1, 0);
        Controls.Add(layout);
    }

    private FlowLayoutPanel BuildNavigation()
    {
        var navigation = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true };
        navigation.Controls.Add(new Label { Text = "WildVN", AutoSize = true, Font = _brandFont, Margin = new Padding(3, 3, 3, 18) });
        foreach (ShellSection section in Enum.GetValues(typeof(ShellSection)))
        {
            var title = ShellViewModel.SectionTitle(section);
            var button = new Button { Name = section.ToString(), Text = title, Width = 210, Height = 40, AccessibleName = title };
            button.Click += (_, _) => _shell.NavigateCommand.Execute(section);
            navigation.Controls.Add(button);
        }
        _check.Width = _cancel.Width = 210;
        _check.Margin = new Padding(3, 20, 3, 3);
        navigation.Controls.Add(_check);
        navigation.Controls.Add(_cancel);
        _connection.MaximumSize = new Size(210, 0);
        _connection.Margin = new Padding(3, 10, 3, 10);
        navigation.Controls.Add(_connection);
        var media = new Button { Name = "MediaPoC", Text = _mediaPaths.HasSamples ? "PoC media (cục bộ)" : "PoC media (chờ chuyển mẫu)", Width = 210, Height = 40, Enabled = _mediaPaths.HasSamples };
        media.Click += (_, _) =>
        {
            var existing = OwnedForms.OfType<Media.MediaPoCForm>().FirstOrDefault();
            if (existing is not null) existing.Activate();
            else new Media.MediaPoCForm(_mediaPaths).Show(this);
        };
        navigation.Controls.Add(media);
        return navigation;
    }

    private FlowLayoutPanel BuildContent()
    {
        var content = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true, Padding = new Padding(20, 0, 0, 0) };
        _title.Font = _titleFont;
        _title.Margin = new Padding(3, 3, 3, 20);
        _feature.MaximumSize = new Size(600, 0);
        _feature.Margin = new Padding(3, 3, 3, 20);
        content.Controls.Add(_title);
        content.Controls.Add(_feature);
        content.Controls.Add(new Label { AutoSize = true, MaximumSize = new Size(600, 0), Text = "Bản P0 kiểm chứng shell WinForms. Chưa có dữ liệu loài, xác thực hoặc nghiệp vụ trên giao diện .NET. Kiểm tra kết nối chỉ chạy khi bạn bấm nút. Media PoC dùng mẫu cục bộ được chọn rõ qua biến môi trường." });
        return content;
    }

    private void ShellChanged(object? sender, EventArgs args)
    {
        // Actions originate on this form's UI thread; the shell's await retains its
        // WinForms SynchronizationContext. Do not queue extra callbacks past Close.
        RefreshView();
    }

    private void RefreshView()
    {
        if (IsDisposed || Disposing) return;
        _title.Text = _shell.PageTitle;
        _feature.Text = _shell.FeatureStatus;
        _connection.Text = _shell.ConnectionMessage;
        _check.Enabled = _shell.CheckConnectionCommand.CanExecute(null);
        _cancel.Enabled = _shell.CancelConnectionCommand.CanExecute(null);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && !IsDisposed && _shell is not null)
        {
            // Mono does not consistently dispose owned forms when the owner closes.
            foreach (var owned in OwnedForms) owned.Dispose();
            _shell.PropertyChanged -= ShellChanged;
            _shell.CheckConnectionCommand.CanExecuteChanged -= ShellChanged;
            _shell.CancelConnectionCommand.CanExecuteChanged -= ShellChanged;
            _shell.Dispose();
            _client.Dispose();
        }
        base.Dispose(disposing);
        if (disposing)
        {
            // A form explicitly disposed by its owner has completed construction;
            // finalization of a failed constructor uses disposing=false.
            _brandFont.Dispose();
            _titleFont.Dispose();
            _bodyFont.Dispose();
        }
    }
}
