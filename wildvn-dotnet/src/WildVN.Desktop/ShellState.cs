namespace WildVN.Desktop;

public enum ShellSection { Catalog, Ecosystems, Favorites, Academy, Chat }
public enum ConnectionState { Unchecked, Checking, Connected, Failed }

public sealed record ShellState(ShellSection Section, ConnectionState Connection, string ConnectionMessage);
