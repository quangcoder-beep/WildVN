using System.Net.Http;
using System.Windows.Forms;
using NUnit.Framework;
using WildVN.Desktop;

namespace WildVN.WinForms.Tests;

[TestFixture, Apartment(ApartmentState.STA)]
public sealed class MainFormTests
{
    private RecordingHandler _handler = null!;
    private MainForm _form = null!;

    [SetUp]
    public void Open_real_form_without_network()
    {
        _handler = new RecordingHandler();
        _form = DesktopStartup.CreateForm(_ => null, _handler);
        _form.Show();
        Application.DoEvents();
    }

    [TearDown]
    public void Close_only_test_form()
    {
        _form.Dispose();
        Application.DoEvents();
    }

    private Control Named(string name) => _form.Controls.Find(name, true).Single();
    private Button Button(string name) => (Button)Named(name);

    [Test]
    public void Startup_is_visible_has_no_automatic_API_request_and_reports_pending_media()
    {
        Assert.That(_form.Visible, Is.True);
        Assert.That(_form.Text, Does.Contain("WildVN").And.Contain("WinForms"));
        Assert.That(Named("PageTitle").Text, Is.EqualTo("Danh mục loài"));
        Assert.That(Named("FeatureStatus").Text, Does.Contain("Chưa khả dụng"));
        Assert.That(Named("ConnectionMessage").Text, Does.Contain("Chưa kiểm tra"));
        Assert.That(_handler.Requests, Is.Empty);
        Assert.That(Button("CancelConnection").Enabled, Is.False);
        Assert.That(Button("MediaPoC").Enabled, Is.False);
        Assert.That(Button("MediaPoC").Text, Does.Contain("chờ chuyển"));
    }

    [TestCase("Catalog", "Danh mục loài")]
    [TestCase("Ecosystems", "Hệ sinh thái")]
    [TestCase("Favorites", "Yêu thích")]
    [TestCase("Academy", "Học viện")]
    [TestCase("Chat", "Trò chuyện")]
    public void All_navigation_buttons_change_title_without_inventing_data_or_HTTP(string button, string title)
    {
        Button(button).PerformClick();
        Assert.That(Named("PageTitle").Text, Is.EqualTo(title));
        Assert.That(Named("FeatureStatus").Text, Does.Contain("Chưa khả dụng"));
        Assert.That(_handler.Requests, Is.Empty);
    }

    [Test]
    public void Explicit_health_click_updates_UI_and_disposes_response()
    {
        var content = new ProbeContent();
        _handler.Response = _ => Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = content });
        Button("CheckConnection").PerformClick();
        PumpUntil(() => Named("ConnectionMessage").Text.Contains("Đã kết nối"));
        Assert.That(_handler.Requests, Is.EqualTo(new[] { "GET https://localhost:5123/health/live" }));
        Assert.That(Button("CheckConnection").Enabled, Is.True);
        Assert.That(Button("CancelConnection").Enabled, Is.False);
        Assert.That(Named("FeatureStatus").Text, Does.Contain("Chưa khả dụng"));
        Assert.That(content.WasDisposed, Is.True);
    }

    [Test]
    public void UI_remains_navigable_during_request_and_cancel_ignores_old_response()
    {
        var completion = new TaskCompletionSource<HttpResponseMessage>();
        _handler.Response = _ => completion.Task;
        Button("CheckConnection").PerformClick();
        Assert.That(Button("CheckConnection").Enabled, Is.False);
        Assert.That(Button("CancelConnection").Enabled, Is.True);
        Button("Academy").PerformClick();
        Assert.That(Named("PageTitle").Text, Is.EqualTo("Học viện"));
        Button("CancelConnection").PerformClick();
        Assert.That(Named("ConnectionMessage").Text, Does.Contain("Đã hủy"));
        completion.SetResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        Application.DoEvents();
        Assert.That(Named("ConnectionMessage").Text, Does.Contain("Đã hủy"));
    }

    [Test]
    public void Background_completion_updates_form_without_cross_thread_access()
    {
        Control.CheckForIllegalCrossThreadCalls = true;
        var completion = new TaskCompletionSource<HttpResponseMessage>(TaskCreationOptions.RunContinuationsAsynchronously);
        _handler.Response = _ => completion.Task;
        Button("CheckConnection").PerformClick();
        Task.Run(() => completion.SetResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK))).GetAwaiter().GetResult();
        PumpUntil(() => Named("ConnectionMessage").Text.Contains("Đã kết nối"));
    }

    [Test]
    public void Network_error_is_safe_and_rechecking_works()
    {
        _handler.Response = _ => Task.FromException<HttpResponseMessage>(new HttpRequestException("private diagnostic"));
        Button("CheckConnection").PerformClick();
        PumpUntil(() => Named("ConnectionMessage").Text.Contains("Không thể kết nối"));
        Assert.That(Named("ConnectionMessage").Text, Does.Not.Contain("private"));
        _handler.Response = _ => Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        Button("CheckConnection").PerformClick();
        PumpUntil(() => Named("ConnectionMessage").Text.Contains("Đã kết nối"));
    }

    [Test]
    public void Closing_form_cancels_pending_request_and_disposes_transport()
    {
        var completion = new TaskCompletionSource<HttpResponseMessage>();
        var cancelled = false;
        _handler.Response = token =>
        {
            token.Register(() => { cancelled = true; completion.TrySetCanceled(); });
            return completion.Task;
        };
        Button("CheckConnection").PerformClick();
        _form.Close();
        Application.DoEvents();
        Assert.That(cancelled, Is.True);
        Assert.That(_handler.WasDisposed, Is.True);
        Assert.That(_form.IsDisposed, Is.True);
    }

    [Test]
    public void Late_background_completion_after_close_does_not_touch_disposed_controls()
    {
        var completion = new TaskCompletionSource<HttpResponseMessage>(TaskCreationOptions.RunContinuationsAsynchronously);
        _handler.Response = _ => completion.Task;
        Button("CheckConnection").PerformClick();
        _form.Close();
        Task.Run(() => completion.SetResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK))).GetAwaiter().GetResult();
        Application.DoEvents();
        Assert.That(_form.IsDisposed, Is.True);
        Assert.That(_handler.WasDisposed, Is.True);
    }

    [Test]
    public void Null_transport_is_rejected()
    {
        Assert.Throws<ArgumentNullException>(() => new MainForm(null!));
    }

    private static void PumpUntil(Func<bool> ready)
    {
        var deadline = DateTime.UtcNow.AddSeconds(3);
        while (!ready() && DateTime.UtcNow < deadline)
        {
            Application.DoEvents();
            Thread.Sleep(5);
        }
        Assert.That(ready(), Is.True, "UI state not updated within 3 seconds");
    }
}

internal sealed class ProbeContent() : ByteArrayContent(Array.Empty<byte>())
{
    public bool WasDisposed { get; private set; }
    protected override void Dispose(bool disposing)
    {
        WasDisposed = true;
        base.Dispose(disposing);
    }
}
