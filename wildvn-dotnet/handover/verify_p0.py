"""Sequential P0 re-run on Linux: own fixture/container/API, actual curl and output."""
import argparse
from datetime import datetime
import difflib
import hashlib
import json
import os
from pathlib import Path
import re
import runpy
import secrets
import shlex
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]


def parse_arguments(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serve', action='store_true', help='Keep only our loopback API running after checks; Ctrl-C stops it')
    parser.add_argument('--output', type=Path, help='New output directory; existing paths are refused')
    return parser.parse_args(arguments)


def assert_response(name, status, body):
    expected = {'live': (200, {'status': 'alive'}), 'ready': (503, {'status': 'notReady'}),
                'missing': (404, {'status': 404, 'error': 'Not Found', 'message': 'Chức năng chưa khả dụng', 'path': '/api/species'}),
                'method': (405, {'status': 405, 'error': 'Method Not Allowed', 'message': 'Yêu cầu không hợp lệ', 'path': '/health/live'})}
    wanted_status, wanted_body = expected[name]
    actual = json.loads(body)
    if status != wanted_status or not isinstance(actual, dict) or any(actual.get(key) != value for key, value in wanted_body.items()):
        raise ValueError(f'curl {name}: unexpected status or JSON body')
    if name in ('missing', 'method'):
        try:
            timestamp = datetime.fromisoformat(actual['timestamp'])
        except (KeyError, TypeError, ValueError):
            raise ValueError(f'curl {name}: invalid error timestamp') from None
        if timestamp.tzinfo is not None:
            raise ValueError(f'curl {name}: expected legacy local timestamp without offset')


class Run:
    def __init__(self, output):
        self.output = output
        self.environment = {key: value for key, value in os.environ.items()
                            if not key.startswith(('PG', 'ASPNETCORE_', 'DOTNET_'))
                            and key != 'WILDVN_FIXTURE_CONNECTION'}
        self.dotnet = os.environ.get('DOTNET', 'dotnet')
        self.container = None
        self.api = None
        self.api_log = None
        self.url = None
        self.reports = []
        self.log = output / 'prerequisites.txt'

    def note(self, value):
        print(value, flush=True)
        with self.log.open('a', encoding='utf-8') as log:
            log.write(value + '\n')

    def command(self, arguments, *, environment=None, expected=0):
        self.note('$ ' + shlex.join(map(str, arguments)))
        result = subprocess.run(list(map(str, arguments)), cwd=ROOT,
                                env=environment or self.environment, capture_output=True, text=True)
        self.note(result.stdout.rstrip())
        if result.stderr:
            self.note(result.stderr.rstrip())
        self.note(f'exit={result.returncode}')
        if result.returncode != expected:
            raise RuntimeError(f'Command failed; see {self.log.name}')
        return result.stdout.strip()

    def prerequisites(self):
        if sys.platform != 'linux':
            raise RuntimeError('This tested runner requires Linux; Windows checks remain in CHECKLIST-WINDOWS.md')
        for tool in (self.dotnet, 'docker', 'psql', 'pg_dump', 'pg_restore', 'createdb', 'curl', 'node'):
            if shutil.which(tool) is None:
                raise RuntimeError(f'Missing prerequisite: {tool}')
        self.command([sys.executable, '-m', 'coverage', '--version'])
        version = self.command([self.dotnet, '--version'])
        pinned = json.loads((ROOT / 'global.json').read_text())['sdk']['version']
        if version != pinned:
            raise RuntimeError(f'SDK {pinned} required; set DOTNET to its executable')
        self.command(['docker', 'image', 'inspect', 'postgres:15-alpine', '--format', '{{.Id}}'])
        self.note('Only a new empty source fixture and our loopback Kestrel are used. No credentials/config files read.')

    def build(self, project):
        self.command([self.dotnet, 'build', f'src/{project}/{project}.csproj', '-c', 'Release', '--nologo'])

    def test(self, project, *, desktop=False, name=None):
        results = self.output / (name or project)
        args = [self.dotnet, 'test', f'tests/{project}/{project}.csproj', '-c', 'Release', '--nologo',
                '--collect:XPlat Code Coverage', '--results-directory', str(results), '--logger', 'trx']
        if desktop:
            args += ['--', 'DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.IncludeTestAssembly=true',
                     'DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.ExcludeByFile=**/*Tests.cs']
        self.command(args)
        self.reports += sorted(results.rglob('coverage.cobertura.xml'))

    def start_api(self):
        self.api_log = (self.output / 'kestrel.txt').open('w', encoding='utf-8')
        self.api = subprocess.Popen([self.dotnet, str(ROOT / 'src/WildVN.Api/bin/Release/net10.0/WildVN.Api.dll'),
                                     '--urls', 'http://127.0.0.1:0'], cwd=self.output,
                                    env={**self.environment, 'ASPNETCORE_ENVIRONMENT': 'Production'},
                                    stdout=self.api_log, stderr=subprocess.STDOUT)
        for _ in range(100):
            match = re.search(r'Now listening on: (http://127\.0\.0\.1:\d+)', (self.output / 'kestrel.txt').read_text())
            if match:
                self.url = match.group(1)
                self.note(f'Own Kestrel pid={self.api.pid}, origin={self.url}')
                return
            if self.api.poll() is not None:
                raise RuntimeError('Own Kestrel exited; see kestrel.txt')
            time.sleep(.1)
        raise RuntimeError('Own Kestrel startup timed out')

    def curl(self):
        if self.api.poll() is not None:
            raise RuntimeError('Own Kestrel is no longer running')
        for name, method, path in (('live', 'GET', '/health/live'), ('ready', 'GET', '/health/ready'),
                                   ('missing', 'GET', '/api/species'), ('method', 'POST', '/health/live')):
            result = self.command(['curl', '--noproxy', '*', '--silent', '--show-error', '--max-time', '5',
                                   '--include', '--request', method, '--write-out', '\nHTTP_CODE:%{http_code}\n', self.url + path])
            response, code = result.rsplit('\nHTTP_CODE:', 1)
            body = re.split(r'\r?\n\r?\n', response, maxsplit=1)[1]
            assert_response(name, int(code), body)
        self.note('CURL PASS: real loopback process: 200 alive / 503 notReady / 404 unavailable / 405 wrong method')

    def fixture_environment(self, database):
        connection = f'postgresql://fixture:{self.password}@127.0.0.1:{self.port}/{database}'
        return {**self.environment, 'WILDVN_FIXTURE_CONNECTION': connection}

    def pg_environment(self, database):
        guard = runpy.run_path(str(ROOT / 'build/fixture_connection.py'))['connection_environment']
        return guard(self.fixture_environment(database))

    def fixture(self):
        container_name = 'wildvn-p0-' + secrets.token_hex(6)
        self.password = secrets.token_hex(20)
        container_id = self.command(['docker', 'run', '--detach', '--rm', '--pull=never', '--name', container_name,
                      '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_USER=fixture', '--env', 'POSTGRES_PASSWORD',
                      '--env', 'POSTGRES_DB=wildvn_fixture_source', 'postgres:15-alpine'],
                     environment={**self.environment, 'POSTGRES_PASSWORD': self.password})
        self.container = container_id
        self.port = int(self.command(['docker', 'port', self.container, '5432/tcp']).rsplit(':', 1)[1])
        for _ in range(60):
            result = subprocess.run(['docker', 'exec', self.container, 'pg_isready', '-h', '127.0.0.1', '-U', 'fixture', '-d', 'wildvn_fixture_source'],
                                    capture_output=True, env=self.environment)
            if not result.returncode:
                break
            time.sleep(.25)
        else:
            raise RuntimeError('Own disposable PostgreSQL startup timed out')
        self.command(['psql', '-X', '--no-password', '-Atc', 'SELECT version();'], environment=self.pg_environment('wildvn_fixture_source'))
        self.command(['bash', 'build/restore-fixture.sh'], environment=self.fixture_environment('wildvn_fixture_source'))
        self.command(['bash', 'build/verify-fixture.sh'], environment=self.fixture_environment('wildvn_fixture_source'))
        self.backup_roundtrip()

    def sql(self, database, statement):
        return self.command(['psql', '-X', '--no-password', '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement],
                            environment=self.pg_environment(database))

    def snapshot(self, database):
        tables = self.sql(database, "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").splitlines()
        values = {}
        for table in tables:
            if re.fullmatch('[a-z_]+', table) is None:
                raise RuntimeError('Unexpected fixture table identifier')
            query = ("SELECT count(*),encode(digest(COALESCE(string_agg(to_jsonb(t)::text,E'\\n' "
                     f"ORDER BY to_jsonb(t)::text),''),'sha256'),'hex') FROM \"{table}\" t")
            values[table] = self.sql(database, query)
        return values

    def backup_roundtrip(self):
        source, restored = 'wildvn_fixture_source', 'wildvn_fixture_roundtrip'
        backup = self.output / 'synthetic-fixture.dump'
        self.command(['pg_dump', '--format=custom', '--no-owner', '--no-privileges', '--file', str(backup)], environment=self.pg_environment(source))
        self.command(['createdb', '--template=template0', restored], environment=self.pg_environment(source))
        empty = runpy.run_path(str(ROOT / 'build/fixture_connection.py'))['EMPTY_QUERY']
        if self.sql(restored, empty) != '0':
            raise RuntimeError('Independent restore target is not empty')
        self.command(['pg_restore', '--exit-on-error', '--no-owner', '--no-privileges', '--dbname', restored, str(backup)], environment=self.pg_environment(restored))
        self.command(['bash', 'build/verify-fixture.sh'], environment=self.fixture_environment(restored))
        before, after = self.snapshot(source), self.snapshot(restored)
        if len(before) != 18 or before != after:
            raise RuntimeError('Independent restore changed table counts/content hashes')
        digest = hashlib.sha256(json.dumps(before, sort_keys=True).encode()).hexdigest()
        self.note(f'Independent restore: all 18 table counts + SHA256 row-content digests equal; aggregate={digest}')
        self.schema_diff(source, restored)

    def schema_diff(self, source, restored):
        schemas = []
        for database in (source, restored):
            raw = self.command(['pg_dump', '--schema-only', '--no-owner', '--no-privileges'], environment=self.pg_environment(database))
            schemas.append('\n'.join(line.rstrip() for line in raw.splitlines() if not line.startswith(('\\restrict ', '\\unrestrict '))))
        diff = '\n'.join(difflib.unified_diff(schemas[0].splitlines(), schemas[1].splitlines(), fromfile=source, tofile=restored))
        (self.output / 'fixture-schema.diff').write_text(diff + '\n', encoding='utf-8')
        known_from = "(ARRAY['user'::character varying, 'assistant'::character varying])::text[]"
        known_to = "ARRAY[('user'::character varying)::text, ('assistant'::character varying)::text]"
        if schemas[0].replace(known_from, known_to) != schemas[1]:
            raise RuntimeError('Unexpected schema difference; inspect fixture-schema.diff')
        self.note('Schema textual diff is nonzero: only known chat role array-cast rendering; other schema text equal.')
        self.note(diff)
        equivalent = self.sql(source, "SELECT bool_and((v = ANY ((ARRAY['user'::varchar,'assistant'::varchar])::text[])) IS NOT DISTINCT FROM "
                 "(v = ANY (ARRAY[('user'::varchar)::text,('assistant'::varchar)::text]))) FROM "
                 "(VALUES (NULL::text),('user'),('assistant'),('system'),(''),('USER')) AS inputs(v)")
        if equivalent != 't':
            raise RuntimeError('Role constraint equivalence failed')

    def python_coverage(self):
        environment = {**self.environment, 'COVERAGE_FILE': str(self.output / 'fixture.coverage')}
        self.command([sys.executable, '-m', 'coverage', 'run', '--branch', '--source=build', '-m', 'unittest',
                      'discover', '-s', 'tests', '-p', 'fixture_connection_test.py', '-v'], environment=environment)
        # T02 measures the fixture guard. WF03 package/session tooling has its own
        # suites and per-file coverage; discovering it must not change this scope.
        scope = '*/build/fixture_connection.py'
        self.command([sys.executable, '-m', 'coverage', 'report', '--include=' + scope, '--fail-under=80'], environment=environment)
        self.command([sys.executable, '-m', 'coverage', 'json', '--include=' + scope,
                      '-o', str(self.output / 'fixture-coverage.json')], environment=environment)

    def coverage(self):
        summarize = runpy.run_path(str(ROOT / 'handover/coverage_report.py'))['summarize']
        report = summarize(self.reports, ROOT)
        (self.output / 'coverage-summary.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        self.note(json.dumps(report, ensure_ascii=False, indent=2))
        if report['measured_gate'] != 'PASS':
            raise RuntimeError('Measured executable-source coverage below 80% or absent')
        self.note('All-production coverage and Windows acceptance: ' + report['full_gate'])

    def tasks(self):
        self.log = self.output / 't01.txt'
        self.command([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'contract_snapshot_test.py', '-v'])
        self.command([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'handover_test.py', '-v'])
        self.note('T01 docs/source fixtures: production coverage N/A; no runtime feature implemented.')
        self.log = self.output / 't02.txt'
        self.command([sys.executable, '-m', 'py_compile', 'build/fixture_connection.py'])
        self.python_coverage()
        self.build('WildVN.Api')
        self.fixture()
        self.start_api()
        self.curl()
        self.note('T02 real approved baseline/Flyway/extensions: CHƯA KIỂM CHỨNG')
        self.log = self.output / 't03.txt'
        self.build('WildVN.Api')
        self.test('WildVN.Api.Tests')
        self.curl()
        self.coverage()
        self.log = self.output / 't04.txt'
        self.build('WildVN.Desktop')
        self.test('WildVN.ApiClient.Tests')
        self.test('WildVN.Desktop.Tests', desktop=True, name='T04-Desktop')
        self.curl()
        self.coverage()
        self.note('T04 Windows UI/dispatcher/clean-machine runtime: CHƯA KIỂM CHỨNG')
        self.log = self.output / 't05.txt'
        self.build('WildVN.Desktop')
        self.test('WildVN.Desktop.Tests', desktop=True, name='T05-Desktop')
        self.command([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'media_asset_test.py', '-v'])
        self.curl()
        self.coverage()
        self.note('T05 Windows codecs/DPI/lifecycle/performance/MinIO: CHƯA KIỂM CHỨNG')

    def cleanup(self):
        if self.api is not None and self.api.poll() is None:
            self.api.terminate()
            try:
                self.api.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.api.kill()
                self.api.wait(timeout=5)
        if self.api_log:
            self.api_log.close()
        if self.container:
            self.command(['docker', 'stop', '--timeout', '5', self.container])
            self.container = None


def main():
    arguments = parse_arguments()
    if arguments.output:
        output = arguments.output.resolve()
        output.mkdir(parents=True, exist_ok=False)
    else:
        (ROOT / 'TestResults').mkdir(exist_ok=True)
        output = Path(tempfile.mkdtemp(prefix='P0-', dir=ROOT / 'TestResults'))
    print(f'Actual output: {output}', flush=True)
    run = Run(output)
    try:
        run.prerequisites()
        run.tasks()
        run.log = output / 'summary.txt'
        run.note('Portable checks PASS; phase P0 is NOT accepted: real baseline, all-production coverage and Windows are CHƯA KIỂM CHỨNG.')
        if arguments.serve:
            run.note(f'Own API remains at {run.url}; press Ctrl-C to stop/clean our resources. No real environment configured.')
            run.api.wait()
        # Portable checks passed, but this fixture/Linux runner cannot accept full P0.
        return 2
    except KeyboardInterrupt:
        return 130
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
        run.note(f'FAIL: {error}')
        return 1
    finally:
        run.log = output / 'cleanup.txt'
        run.cleanup()


if __name__ == '__main__':
    sys.exit(main())
