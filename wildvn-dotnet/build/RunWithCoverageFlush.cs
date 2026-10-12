using System;
using System.Reflection;

// Coverage tooling only: Mono 6.8 can fail to flush Coverlet trackers during
// ProcessExit. Invoke the unchanged entry point and flush its real hits while
// the AppDomain is still alive. No production code or hit counts are changed.
public static class RunWithCoverageFlush
{
    [STAThread]
    public static int Main(string[] arguments)
    {
        var assembly = Assembly.LoadFrom(arguments[0]);
        var rest = new string[arguments.Length - 1];
        Array.Copy(arguments, 1, rest, 0, rest.Length);
        var entry = assembly.EntryPoint;
        int result = (int)entry.Invoke(null, entry.GetParameters().Length == 0
            ? null : new object[] { rest });
        int trackers = 0;
        foreach (var loaded in AppDomain.CurrentDomain.GetAssemblies())
        {
            if (!loaded.GetName().Name.StartsWith("WildVN.", StringComparison.Ordinal)) continue;
            foreach (var type in loaded.GetTypes())
            {
                if (type.Namespace != "Coverlet.Core.Instrumentation.Tracker") continue;
                var flush = type.GetMethod("UnloadModule", BindingFlags.Static | BindingFlags.Public);
                if (flush == null) continue;
                flush.Invoke(null, new object[] { AppDomain.CurrentDomain, EventArgs.Empty });
                type.GetField("FlushHitFile").SetValue(null, false);
                trackers++;
            }
        }
        Console.WriteLine("Explicit pre-exit coverage flush: " + trackers + " tracker(s)");
        return result;
    }
}
