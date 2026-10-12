using System.ComponentModel;
using WildVN.ApiClient;

namespace WildVN.Desktop;

public sealed class ShellViewModel : INotifyPropertyChanged, IDisposable
{
    private readonly Func<CancellationToken, Task> _checkConnection;
    private CancellationTokenSource? _request;
    private bool _disposed;

    public event PropertyChangedEventHandler? PropertyChanged;
    public ShellState State { get; private set; } = new(ShellSection.Catalog,
        ConnectionState.Unchecked, "Chưa kiểm tra kết nối API.");
    public string ConnectionMessage => State.ConnectionMessage;
    public string FeatureStatus => "Chưa khả dụng trong bản .NET: API và luồng dữ liệu của mục này chưa được chuyển.";
    public string PageTitle => SectionTitle(State.Section);
    internal static string SectionTitle(ShellSection section) => section switch
    {
        ShellSection.Catalog => "Danh mục loài",
        ShellSection.Ecosystems => "Hệ sinh thái",
        ShellSection.Favorites => "Yêu thích",
        ShellSection.Academy => "Học viện",
        ShellSection.Chat => "Trò chuyện",
        _ => throw new InvalidOperationException("Mục điều hướng không hợp lệ.")
    };
    public Command NavigateCommand { get; }
    public Command CheckConnectionCommand { get; }
    public Command CancelConnectionCommand { get; }

    public ShellViewModel(Func<CancellationToken, Task> checkConnection)
    {
        if (checkConnection is null) throw new ArgumentNullException(nameof(checkConnection));
        _checkConnection = checkConnection;
        NavigateCommand = new Command(parameter => Navigate((ShellSection)parameter!),
            parameter => !_disposed && parameter is ShellSection section && Enum.IsDefined(typeof(ShellSection), section));
        CheckConnectionCommand = new Command(_ => _ = CheckConnectionAsync(), _ => !_disposed && _request is null);
        CancelConnectionCommand = new Command(_ => CancelConnectionCheck(), _ => !_disposed && _request is not null);
    }

    public void Navigate(ShellSection section)
    {
        if (!Enum.IsDefined(typeof(ShellSection), section)) throw new ArgumentOutOfRangeException(nameof(section));
        if (_disposed) return;
        UpdateState(State with { Section = section });
    }

    public async Task CheckConnectionAsync()
    {
        if (_disposed || _request is not null) return;
        using var request = new CancellationTokenSource();
        _request = request;
        UpdateState(State with { Connection = ConnectionState.Checking, ConnectionMessage = "Đang kiểm tra kết nối API…" });
        NotifyCommands();
        try
        {
            await _checkConnection(request.Token);
            if (CanUpdate(request)) UpdateState(State with
            {
                Connection = ConnectionState.Connected,
                ConnectionMessage = "Đã kết nối API. Các chức năng còn chờ chuyển đổi."
            });
        }
        catch (Exception error)
        {
            if (CanUpdate(request)) UpdateState(State with
            {
                Connection = ConnectionState.Failed,
                ConnectionMessage = error is OperationCanceledException or ApiClientException { Error: ApiError.Timeout }
                    ? "Kết nối quá thời gian cho phép. Vui lòng thử lại."
                    : "Không thể kết nối API. Vui lòng kiểm tra mạng và địa chỉ API."
            });
        }
        finally
        {
            if (CanUpdate(request))
            {
                _request = null;
                NotifyCommands();
            }
        }
    }

    public void CancelConnectionCheck()
    {
        if (_disposed || _request is null) return;
        _request.Cancel();
        _request = null;
        UpdateState(State with { Connection = ConnectionState.Unchecked, ConnectionMessage = "Đã hủy kiểm tra kết nối API." });
        NotifyCommands();
    }

    private bool CanUpdate(CancellationTokenSource request) => !_disposed && ReferenceEquals(_request, request) && !request.IsCancellationRequested;

    private void UpdateState(ShellState state)
    {
        State = state;
        foreach (var name in new[] { nameof(State), nameof(PageTitle), nameof(ConnectionMessage), nameof(FeatureStatus) })
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    }

    private void NotifyCommands()
    {
        CheckConnectionCommand.NotifyCanExecuteChanged();
        CancelConnectionCommand.NotifyCanExecuteChanged();
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _request?.Cancel();
        _request = null;
        NotifyCommands();
        NavigateCommand.NotifyCanExecuteChanged();
    }
}
