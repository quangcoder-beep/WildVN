#!/usr/bin/env python3
"""Run recovery tests with disposable PostgreSQL, TLS SMTP and isolated Next pages.
Never reads project .env/config or connects to an existing application database.
Requires Node/npm, cached Chromium, OpenSSL, PostgreSQL binaries and .NET 10 SDK.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT.parent / "wildvn-client"


def command(args, cwd, env, log):
    with log.open("w") as output:
        result = subprocess.run([str(arg) for arg in args], cwd=cwd, env=env,
                                stdout=output, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError(f"{args[0]} failed; see {log}")


def port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def ready(number, process):
    for _ in range(300):
        if process.poll() is not None:
            raise RuntimeError("Fixture process exited before becoming ready")
        try:
            with socket.create_connection(("127.0.0.1", number), timeout=0.2):
                return
        except OSError:
            time.sleep(0.1)
    raise TimeoutError("Fixture listener did not become ready")


def stop(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def browser_path(explicit):
    if explicit:
        return Path(explicit).resolve()
    cached = sorted((Path.home() / ".cache/ms-playwright").glob("chromium-*/chrome-linux64/chrome"))
    if not cached:
        cached = sorted((ROOT.parent / "crawl4ai-project/.playwright").glob("chromium-*/chrome-linux64/chrome"))
    if not cached:
        raise FileNotFoundError("Pass --chromium with an installed Chromium executable")
    return cached[-1]


def web_fixture(runtime):
    web = runtime / "web"
    for page in ("forgot-password", "reset-password"):
        folder = web / "app" / page
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "page.tsx").write_text(f'export {{ default }} from "{CLIENT}/app/(auth)/{page}/page";\n')
    (web / "node_modules").symlink_to(CLIENT / "node_modules", target_is_directory=True)
    (web / "package.json").write_text(json.dumps({"name": "isolated-recovery-browser-fixture", "private": True,
        "dependencies": {"next": "16.3.3", "react": "19.2.4", "react-dom": "19.2.4"},
        "devDependencies": {"typescript": "^5", "@types/react": "^19", "@types/node": "^20"}}))
    (web / "tsconfig.json").write_text(json.dumps({"compilerOptions": {"target": "ES2017", "lib": ["dom", "dom.iterable", "esnext"],
        "skipLibCheck": True, "strict": True, "noEmit": True, "esModuleInterop": True, "module": "esnext",
        "moduleResolution": "bundler", "jsx": "react-jsx", "resolveJsonModule": True,
        "baseUrl": str(CLIENT), "paths": {"@/*": ["./*"]}}, "include": ["next-env.d.ts", "**/*.tsx", ".next/types/**/*.ts"]}))
    (web / "postcss.config.mjs").write_text((CLIENT / "postcss.config.mjs").read_text())
    (web / "next.config.mjs").write_text('export default { experimental: { externalDir: true } };\n')
    (web / "app/layout.tsx").write_text(f'import "{CLIENT}/app/globals.css";\nexport default function Layout({{children}}: {{children: React.ReactNode}}) {{return <html lang="vi"><body>{{children}}</body></html>}}\n')
    (web / "app/page.tsx").write_text('export default function Home(){return <a href="/forgot-password">Recovery fixture</a>}\n')
    return web


def certificate(runtime, env):
    cert, key = runtime / "smtp.pem", runtime / "smtp.key"
    command(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
             "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
             "-keyout", key, "-out", cert], ROOT, env, runtime / "cert-generation.log")
    key.chmod(0o600)
    roots = Path("/etc/ssl/certs/ca-certificates.crt")
    bundle = runtime / "test-ca.pem"
    bundle.write_bytes((roots.read_bytes() if roots.exists() else b"") + cert.read_bytes())
    env.update(SSL_CERT_FILE=str(bundle), WILDVN_RECOVERY_TEST_CERT=str(cert), WILDVN_RECOVERY_TEST_KEY=str(key))


def execute(args, runtime, env, state):
    dotnet = Path(args.dotnet).resolve()
    env["DOTNET_ROOT"] = str(dotnet.parent)
    next_cli = CLIENT / "node_modules/next/dist/bin/next"
    web = web_fixture(runtime)
    tools = runtime.parent / "browser-tools"
    if not (tools / "node_modules/playwright-core/package.json").exists():
        command(["npm", "install", "--prefix", tools, "--ignore-scripts", "--no-audit", "--no-fund",
                 "--save-exact", "playwright-core@1.64.0"], ROOT, env, runtime / "browser-tools.log")
    command(["node", "--experimental-test-coverage", "--test", "scripts/password-recovery-service.test.mjs",
             "scripts/password-recovery-pages.test.mjs"], CLIENT, env, runtime / "frontend.tap")
    command(["node", next_cli, "build", "--webpack"], web, env, runtime / "web-build.log")
    with (runtime / "web-server.log").open("w") as log:
        server = subprocess.Popen(["node", str(next_cli), "start", "--hostname", "127.0.0.1", "--port", str(state["web_port"])],
                                  cwd=web, env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            ready(state["web_port"], server)
            certificate(runtime, env)
            command([dotnet, "test", "tests/WildVN.Api.Tests/WildVN.Api.Tests.csproj", "-c", "Release",
                     "--settings", "tests/password-recovery.runsettings", "--collect", "XPlat Code Coverage",
                     "--logger", "trx;LogFileName=recovery.trx", "--results-directory", runtime / "results"],
                    ROOT, env, runtime / "backend.log")
        finally:
            stop(server)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--postgres-bin", default="/usr/lib/postgresql/16/bin")
    parser.add_argument("--dotnet", default=str(ROOT / "TestResults/winforms-wf03/tools/dotnet/dotnet"))
    parser.add_argument("--chromium")
    args = parser.parse_args()
    runtime = ROOT / "TestResults/password-recovery" / ("run-" + uuid.uuid4().hex[:12])
    runtime.mkdir(parents=True, mode=0o700)
    state = {"directory": str(runtime), "port": port(), "api_port": port(), "web_port": port()}
    (runtime / "state.json").write_text(json.dumps(state))
    env = {key: value for key, value in os.environ.items() if not key.startswith(("NEXT_PUBLIC_", "Auth__", "PasswordRecovery__"))}
    env.update(NEXT_TELEMETRY_DISABLED="1", NEXT_PUBLIC_API_BASE_URL=f"http://127.0.0.1:{state['api_port']}",
               RECOVERY_CHROMIUM=str(browser_path(args.chromium)), WILDVN_RECOVERY_BROWSER_RUNTIME=str(runtime),
               WILDVN_RECOVERY_TEST_DB=f"Host=127.0.0.1;Port={state['port']};Database=postgres;Username=recovery_test;Pooling=false")
    pg = Path(args.postgres_bin)
    command([pg / "initdb", "-D", runtime / "pgdata", "--auth-local=trust", "--auth-host=trust", "--username=recovery_test"],
            ROOT, env, runtime / "initdb.log")
    with (runtime / "postgres.log").open("w") as log:
        database = subprocess.Popen([str(pg / "postgres"), "-D", str(runtime / "pgdata"), "-h", "127.0.0.1", "-p", str(state["port"]),
                                     "-c", "unix_socket_directories=", "-c", "max_connections=40"], stdout=log, stderr=subprocess.STDOUT)
        try:
            ready(state["port"], database)
            execute(args, runtime, env, state)
            print(f"PASS: frontend, Next build, backend and browser; results: {runtime}")
        finally:
            stop(database)
            for name in ("smtp.key", "smtp.pem", "test-ca.pem", "captured-test-link.txt"):
                (runtime / name).unlink(missing_ok=True)


if __name__ == "__main__":
    main()
