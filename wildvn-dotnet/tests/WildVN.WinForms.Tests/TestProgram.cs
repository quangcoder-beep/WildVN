using NUnitLite;

// Mono WinForms has a process-wide synchronization invoke control. All GUI
// fixtures must share the assembly's STA worker, rather than distinct fixture threads.
[assembly: NUnit.Framework.Apartment(System.Threading.ApartmentState.STA)]

namespace WildVN.WinForms.Tests;

internal static class TestProgram
{
    [STAThread]
    public static int Main(string[] args) => new AutoRun().Execute(args);
}
