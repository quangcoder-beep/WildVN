using WildVN.Desktop;
using Xunit;

namespace WildVN.Desktop.Tests;

public sealed class ShellViewModelTests
{
    [Fact]
    public void Navigation_preserves_connection_and_does_not_mark_feature_available()
    {
        using var model = new ShellViewModel(_ => Task.CompletedTask);

        model.Navigate(ShellSection.Favorites);

        Assert.Equal(ShellSection.Favorites, model.State.Section);
        Assert.Equal(ConnectionState.Unchecked, model.State.Connection);
        Assert.Contains("Chưa khả dụng", model.FeatureStatus);
        Assert.Contains("Yêu thích", model.PageTitle);
    }

    [Fact]
    public async Task Connection_request_is_asynchronous_and_navigation_remains_available()
    {
        var response = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var model = new ShellViewModel(_ => response.Task);

        var request = model.CheckConnectionAsync();
        Assert.Equal(ConnectionState.Checking, model.State.Connection);
        Assert.False(model.CheckConnectionCommand.CanExecute(null));
        model.Navigate(ShellSection.Academy);
        response.SetResult();
        await request;

        Assert.Equal(ConnectionState.Connected, model.State.Connection);
        Assert.Equal(ShellSection.Academy, model.State.Section);
        Assert.True(model.CheckConnectionCommand.CanExecute(null));
        Assert.Contains("Chưa khả dụng", model.FeatureStatus);
    }

    [Fact]
    public async Task Double_click_does_not_start_a_second_request()
    {
        var response = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var requests = 0;
        using var model = new ShellViewModel(_ => { requests++; return response.Task; });

        var first = model.CheckConnectionAsync();
        await model.CheckConnectionAsync();
        Assert.Equal(1, requests);
        response.SetResult();
        await first;
    }

    [Fact]
    public async Task Network_failure_has_safe_Vietnamese_message_and_can_be_retried()
    {
        var requests = 0;
        using var model = new ShellViewModel(_ => ++requests == 1
            ? Task.FromException(new HttpRequestException("private upstream diagnostic"))
            : Task.CompletedTask);

        await model.CheckConnectionAsync();

        Assert.Equal(ConnectionState.Failed, model.State.Connection);
        Assert.Contains("Không thể kết nối", model.ConnectionMessage);
        Assert.DoesNotContain("private", model.ConnectionMessage);
        Assert.True(model.CheckConnectionCommand.CanExecute(null));

        await model.CheckConnectionAsync();
        Assert.Equal(ConnectionState.Connected, model.State.Connection);
    }

    [Fact]
    public async Task Timeout_has_separate_message_from_user_cancellation()
    {
        using var model = new ShellViewModel(_ => Task.FromException(new TaskCanceledException()));

        await model.CheckConnectionAsync();

        Assert.Equal(ConnectionState.Failed, model.State.Connection);
        Assert.Contains("quá thời gian", model.ConnectionMessage);
    }

    [Fact]
    public async Task Cancellation_prevents_late_success_from_overwriting_state()
    {
        var response = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var model = new ShellViewModel(_ => response.Task);

        var request = model.CheckConnectionAsync();
        model.CancelConnectionCheck();
        Assert.Equal(ConnectionState.Unchecked, model.State.Connection);
        response.SetResult();
        await request;

        Assert.Equal(ConnectionState.Unchecked, model.State.Connection);
        Assert.Contains("Đã hủy", model.ConnectionMessage);
    }

    [Fact]
    public async Task Disposal_cancels_request_and_prevents_updates_after_window_closes()
    {
        var response = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        CancellationToken requestToken = default;
        var model = new ShellViewModel(token => { requestToken = token; return response.Task; });
        var changes = 0;
        model.PropertyChanged += (_, _) => changes++;

        var request = model.CheckConnectionAsync();
        model.Dispose();
        var changesAtClose = changes;
        response.SetResult();
        await request;

        Assert.True(requestToken.IsCancellationRequested);
        Assert.Equal(changesAtClose, changes);
        Assert.False(model.CheckConnectionCommand.CanExecute(null));
    }

    [Fact]
    public void Navigation_rejects_unknown_section_without_changing_state()
    {
        using var model = new ShellViewModel(_ => Task.CompletedTask);
        var initial = model.State;

        Assert.Throws<ArgumentOutOfRangeException>(() => model.Navigate((ShellSection)900));
        Assert.Same(initial, model.State);
    }

    [Fact]
    public void Navigation_replaces_state_snapshot_and_notifies_bound_properties()
    {
        using var model = new ShellViewModel(_ => Task.CompletedTask);
        var initial = model.State;
        var changed = new List<string?>();
        model.PropertyChanged += (_, eventArgs) => changed.Add(eventArgs.PropertyName);

        model.Navigate(ShellSection.Chat);

        Assert.NotSame(initial, model.State);
        Assert.Equal(ShellSection.Catalog, initial.Section);
        Assert.Contains(nameof(ShellViewModel.PageTitle), changed);
        Assert.Contains(nameof(ShellViewModel.State), changed);
    }
    [Theory]
    [InlineData(ShellSection.Catalog, "Danh mục loài")]
    [InlineData(ShellSection.Ecosystems, "Hệ sinh thái")]
    [InlineData(ShellSection.Favorites, "Yêu thích")]
    [InlineData(ShellSection.Academy, "Học viện")]
    [InlineData(ShellSection.Chat, "Trò chuyện")]
    public void Navigation_command_updates_bound_title_and_rejects_bad_parameters(ShellSection section, string title)
    {
        using var model = new ShellViewModel(_ => Task.CompletedTask);
        Assert.False(model.NavigateCommand.CanExecute(null));
        Assert.False(model.NavigateCommand.CanExecute("Catalog"));
        Assert.False(model.NavigateCommand.CanExecute((ShellSection)999));
        model.NavigateCommand.Execute(section);
        Assert.Equal(title, model.PageTitle);
        model.NavigateCommand.Execute("invalid");
        Assert.Equal(section, model.State.Section);
    }

    [Fact]
    public async Task Cancelled_old_request_cannot_replace_a_new_request_state()
    {
        var old = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var current = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var count = 0;
        using var model = new ShellViewModel(_ => ++count == 1 ? old.Task : current.Task);
        var first = model.CheckConnectionAsync();
        model.CancelConnectionCommand.Execute(null);
        var second = model.CheckConnectionAsync();
        old.SetException(new HttpRequestException("old response"));
        await first;
        Assert.Equal(ConnectionState.Checking, model.State.Connection);
        current.SetResult();
        await second;
        Assert.Equal(ConnectionState.Connected, model.State.Connection);
    }

    [Fact]
    public async Task Commands_disable_after_close_and_notifies_listeners()
    {
        var model = new ShellViewModel(_ => Task.CompletedTask);
        var changes = 0;
        model.NavigateCommand.CanExecuteChanged += (_, _) => changes++;
        model.CheckConnectionCommand.Execute(null);
        Assert.Equal(ConnectionState.Connected, model.State.Connection);
        model.Dispose();
        model.Dispose();
        model.CancelConnectionCheck();
        await model.CheckConnectionAsync();
        var state = model.State;
        model.Navigate(ShellSection.Chat);
        Assert.Same(state, model.State);
        Assert.False(model.NavigateCommand.CanExecute(ShellSection.Chat));
        Assert.False(model.CancelConnectionCommand.CanExecute(null));
        Assert.Equal(1, changes);
    }

    [Fact]
    public void Command_without_predicate_runs_and_notifies_without_subscribers()
    {
        var executed = false;
        var command = new Command(_ => executed = true);
        command.NotifyCanExecuteChanged();
        command.Execute(null);
        Assert.True(executed);
        Assert.Throws<ArgumentNullException>(() => new ShellViewModel(null!));
    }

    [Fact]
    public async Task Api_timeout_is_mapped_and_cancel_without_request_is_noop()
    {
        using var model = new ShellViewModel(_ => Task.FromException(
            new WildVN.ApiClient.ApiClientException(WildVN.ApiClient.ApiError.Timeout, "safe")));
        model.CancelConnectionCheck();
        await model.CheckConnectionAsync();
        Assert.Contains("quá thời gian", model.ConnectionMessage);
    }

}
