"""Guarded local PostgreSQL fixture operations; never consumes project DB config."""

import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
EMPTY_QUERY = """
SELECT (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname NOT IN ('pg_catalog','information_schema')
          AND n.nspname NOT LIKE 'pg_toast%')
     + (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
        WHERE t.typtype IN ('e','d') AND n.nspname NOT IN ('pg_catalog','information_schema'))
     + (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname NOT IN ('pg_catalog','information_schema'))
     + (SELECT count(*) FROM pg_namespace
        WHERE nspname NOT IN ('public','pg_catalog','information_schema')
          AND nspname NOT LIKE 'pg_toast%' AND nspname NOT LIKE 'pg_temp%');
"""


def connection_environment(environ):
    connection = environ.get("WILDVN_FIXTURE_CONNECTION", "")
    if not connection:
        raise ValueError("WILDVN_FIXTURE_CONNECTION is required")
    try:
        uri = urlsplit(connection)
        valid = (uri.scheme in ("postgresql", "postgres")
                 and uri.hostname in ("127.0.0.1", "::1")
                 and uri.port is not None and 0 < uri.port <= 65535
                 and not uri.query and not uri.fragment
                 and re.fullmatch(r"/wildvn_fixture_[a-z0-9_]+", uri.path)
                 and uri.username and uri.password)
        user, password = unquote(uri.username or ""), unquote(uri.password or "")
        if not valid or any(ord(c) < 32 or ord(c) == 127 for c in user + password + connection):
            raise ValueError()
    except ValueError:
        raise ValueError("Refused: use an explicit numeric loopback URI, port, credentials, "
                         "and wildvn_fixture_* database; query overrides/fragments are forbidden") from None
    return {**{key: value for key, value in environ.items()
               if not key.startswith("PG") and key != "WILDVN_FIXTURE_CONNECTION"},
            "PGHOST": uri.hostname, "PGPORT": str(uri.port), "PGUSER": user,
            "PGPASSWORD": password, "PGDATABASE": uri.path[1:],
            "PGCONNECT_TIMEOUT": "5", "PGCLIENTENCODING": "UTF8", "PGPASSFILE": os.devnull}


def run_psql(environment, *arguments):
    result = subprocess.run(["psql", "-X", "--no-password", "-v", "ON_ERROR_STOP=1", *arguments],
                            env=environment, capture_output=True, text=True)
    if result.returncode:
        # Do not relay libpq diagnostics, which can contain connection details.
        raise RuntimeError("Fixture PostgreSQL operation failed; no changes committed")
    return result.stdout


def main(arguments):
    try:
        environment = connection_environment(os.environ)
        if arguments == ["verify", "--check-connection"]:
            print("Fixture connection accepted (no connection opened)")
        elif arguments == ["restore"]:
            if run_psql(environment, "-At", "-c", EMPTY_QUERY).strip() != "0":
                raise ValueError("Refused: fixture restore requires an empty disposable database")
            run_psql(environment, "--single-transaction", "-f", str(ROOT / "tests/Fixtures/schema.sql"),
                     "-f", str(ROOT / "tests/Fixtures/seed.sql"))
            print("Source-derived fixture restored atomically into empty disposable database")
        elif arguments == ["verify"]:
            # Tests validate again before psql and retain the original explicit URI.
            result = subprocess.run([sys.executable, str(ROOT / "tests/fixture_validation_test.py"), "--live"])
            return result.returncode
        else:
            raise ValueError("Refused: expected restore, verify, or verify --check-connection")
    except (ValueError, RuntimeError, OSError) as error:
        print(str(error) if not isinstance(error, OSError) else "Fixture tool unavailable", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
