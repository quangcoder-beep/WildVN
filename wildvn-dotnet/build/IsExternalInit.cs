// Compiler marker for immutable records on the Mono/.NET Framework review target.
#if NETSTANDARD2_0 || NETFRAMEWORK
namespace System.Runtime.CompilerServices;

internal static class IsExternalInit { }
#endif
