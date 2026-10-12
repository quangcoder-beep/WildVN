"""Direct tests measure the fixture guard/dispatch, without a real DB."""
import importlib.util
import io
import os
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('fixture_connection', Path(__file__).resolve().parents[1] / 'build/fixture_connection.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)
VALID = 'postgresql://fixture:synthetic-only@127.0.0.1:5432/wildvn_fixture_test'


class FixtureConnectionTests(unittest.TestCase):
    def test_connection_validation_and_no_environment_mutation(self):
        original = {'WILDVN_FIXTURE_CONNECTION': VALID, 'PGHOST': 'remote.invalid', 'PGSERVICE': 'live', 'OTHER': 'keep'}
        result = tool.connection_environment(original)
        self.assertEqual(original['PGHOST'], 'remote.invalid')
        self.assertEqual(result['PGHOST'], '127.0.0.1')
        self.assertEqual(result['OTHER'], 'keep')
        self.assertNotIn('PGSERVICE', result)
        self.assertNotIn('WILDVN_FIXTURE_CONNECTION', result)
        self.assertEqual(result['PGPASSFILE'], os.devnull)

    def test_absent_malformed_or_unsafe_connection_is_refused(self):
        for connection in ('', 'http://fixture:p@127.0.0.1:5432/wildvn_fixture_test',
                           VALID + '?host=remote.invalid', VALID.replace('5432', 'bad'),
                           VALID.replace('5432', '0'), VALID.replace('5432', '65536'),
                           VALID.replace('127.0.0.1', 'remote.invalid'),
                           VALID.replace('synthetic-only', 'synthetic%7Fonly')):
            with self.subTest(connection=connection), self.assertRaises(ValueError):
                tool.connection_environment({'WILDVN_FIXTURE_CONNECTION': connection})

    def test_psql_success_and_safe_failure(self):
        for code in (0, 1):
            result = SimpleNamespace(returncode=code, stdout='safe output', stderr='private diagnostic')
            with patch.object(tool.subprocess, 'run', return_value=result) as run:
                if code:
                    with self.assertRaisesRegex(RuntimeError, 'no changes committed') as error:
                        tool.run_psql({'PGHOST': '127.0.0.1'}, '-c', 'SELECT 1')
                    self.assertNotIn('private', str(error.exception))
                else:
                    self.assertEqual(tool.run_psql({'PGHOST': '127.0.0.1'}, '-c', 'SELECT 1'), 'safe output')
                self.assertEqual(run.call_args.args[0][:3], ['psql', '-X', '--no-password'])

    def call(self, args, *, rows='0', exception=None, code=0):
        with patch.dict(os.environ, {'WILDVN_FIXTURE_CONNECTION': VALID}, clear=True), \
             patch.object(tool, 'run_psql', side_effect=exception, return_value=rows) as psql, \
             patch.object(tool.subprocess, 'run', return_value=SimpleNamespace(returncode=code)) as run, \
             patch('sys.stdout', new_callable=io.StringIO) as out, patch('sys.stderr', new_callable=io.StringIO) as err:
            return tool.main(args), psql.call_args_list, run.call_args_list, out.getvalue(), err.getvalue()

    def test_check_connection_opens_no_connection(self):
        code, psql, run, out, _ = self.call(['verify', '--check-connection'])
        self.assertEqual(code, 0)
        self.assertEqual(psql + run, [])
        self.assertIn('no connection opened', out)

    def test_restore_empty_database_is_atomic_and_nonempty_is_refused(self):
        for rows in ('0', '1'):
            code, calls, _, _, err = self.call(['restore'], rows=rows)
            self.assertEqual(code, int(rows))
            if rows == '0':
                self.assertEqual(len(calls), 2)
                self.assertIn('--single-transaction', calls[1].args)
            else:
                self.assertEqual(len(calls), 1)
                self.assertIn('empty disposable', err)

    def test_verify_propagates_test_failure_and_only_runs_live_fixture_suite(self):
        for code in (0, 1):
            actual, psql, run, _, _ = self.call(['verify'], code=code)
            self.assertEqual(actual, code)
            self.assertEqual(psql, [])
            self.assertEqual(run[0].args[0][-1], '--live')

    def test_bad_arguments_or_unavailable_tool_return_failure_without_secrets(self):
        for args, exception, message in ((['drop'], None, 'expected restore'),
                                         (['restore'], OSError('private diagnostic'), 'tool unavailable'),
                                         (['restore'], RuntimeError('fixture operation failed'), 'operation failed')):
            code, _, _, out, err = self.call(args, exception=exception)
            self.assertEqual(code, 1)
            self.assertIn(message, err)
            self.assertNotIn('private diagnostic', out + err)
            self.assertNotIn('synthetic-only', out + err)
