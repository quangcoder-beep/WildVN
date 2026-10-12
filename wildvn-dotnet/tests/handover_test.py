"""Regression tests for honest coverage gates and loopback curl evidence."""
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'handover' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CoverageReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tool = load('coverage_report')

    def report(self, directory, name, hits, filename='src/A.cs'):
        path = Path(directory) / name
        lines = ''.join(f'<line number="{line}" hits="{count}"/>' for line, count in hits.items())
        path.write_text(f'<coverage><sources><source>{directory}</source></sources>'
                        f'<packages><package><classes><class filename="{filename}">'
                        f'<lines>{lines}</lines></class></classes></package></packages></coverage>')
        return path

    def tree(self, directory, *names):
        for name in names:
            path = Path(directory) / 'src' / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('// test source\n')

    def test_merges_duplicate_source_lines_by_union_not_average(self):
        with tempfile.TemporaryDirectory() as directory:
            self.tree(directory, 'A.cs')
            first = self.report(directory, 'a.xml', {1: 1, 2: 0})
            second = self.report(directory, 'b.xml', {1: 0, 2: 3})
            result = self.tool.summarize([first, second], Path(directory))
            self.assertEqual(result['measured'], {'covered': 2, 'total': 2, 'percent': 100.0})
            self.assertEqual(result['full_gate'], 'PASS')

    def test_missing_production_file_never_passes_full_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            self.tree(directory, 'A.cs', 'Desktop/Presenter.cs')
            result = self.tool.summarize([self.report(directory, 'a.xml', {1: 1})], Path(directory))
            self.assertEqual(result['measured_gate'], 'PASS')
            self.assertEqual(result['full_gate'], 'CHƯA KIỂM CHỨNG')
            self.assertEqual(result['unmeasured'], ['src/Desktop/Presenter.cs'])

    def test_fails_below_80_and_accepts_exactly_80(self):
        with tempfile.TemporaryDirectory() as directory:
            self.tree(directory, 'A.cs')
            for covered, expected in ((3, 'FAIL'), (4, 'PASS')):
                with self.subTest(covered=covered):
                    report = self.report(directory, 'a.xml', {i: int(i <= covered) for i in range(1, 6)})
                    self.assertEqual(self.tool.summarize([report], Path(directory))['measured_gate'], expected)

    def test_empty_or_test_only_report_cannot_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            self.tree(directory, 'A.cs')
            for reports in ([], [self.report(directory, 'a.xml', {1: 1}, 'tests/FakeTests.cs')]):
                with self.subTest(reports=reports):
                    self.assertEqual(self.tool.summarize(reports, Path(directory))['measured_gate'], 'FAIL')

    def test_generated_sources_are_not_production_files(self):
        with tempfile.TemporaryDirectory() as directory:
            self.tree(directory, 'A.cs', 'obj/Generated.cs', 'bin/Generated.cs')
            result = self.tool.summarize([self.report(directory, 'a.xml', {1: 1})], Path(directory))
            self.assertEqual(result['unmeasured'], [])

    def test_per_file_below_80_cannot_hide_behind_global_average(self):
        with tempfile.TemporaryDirectory() as directory:
            self.tree(directory, 'A.cs', 'B.cs')
            a = self.report(directory, 'a.xml', {i: 1 for i in range(1, 101)})
            b = self.report(directory, 'b.xml', {1: 0}, 'src/B.cs')
            result = self.tool.summarize([a, b], Path(directory))
            self.assertGreater(result['measured']['percent'], 80)
            self.assertEqual(result['measured_gate'], 'FAIL')


    def test_branch_gate_cannot_be_hidden_by_100_percent_lines(self):
        with tempfile.TemporaryDirectory() as directory:
            self.tree(directory, 'A.cs')
            report = self.report(directory, 'a.xml', {1: 1})
            report.write_text(report.read_text().replace('hits="1"/>', 'hits="1" branch="True" condition-coverage="50% (1/2)"/>'))
            result = self.tool.summarize([report], Path(directory))
            self.assertEqual(result['measured_gate'], 'FAIL')
            self.assertEqual(result['branches']['percent'], 50.0)

    def test_branch_lower_bound_does_not_assume_two_partial_reports_cover_both_sides(self):
        with tempfile.TemporaryDirectory() as directory:
            self.tree(directory, 'A.cs')
            reports = [self.report(directory, f'{i}.xml', {1: 1}) for i in range(2)]
            for report in reports:
                report.write_text(report.read_text().replace('hits="1"/>', 'hits="1" branch="True" condition-coverage="50% (1/2)"/>'))
            result = self.tool.summarize(reports, Path(directory))
            self.assertEqual(result['branches'], {'covered': 1, 'total': 2, 'percent': 50.0})
            self.assertEqual(result['measured_gate'], 'FAIL')
            reports[1].write_text(reports[1].read_text().replace('50% (1/2)', '100% (2/2)'))
            result = self.tool.summarize(reports, Path(directory))
            self.assertEqual(result['branches']['percent'], 100.0)
            self.assertEqual(result['measured_gate'], 'PASS')

    def test_root_branch_counts_without_line_records_are_not_discarded(self):
        with tempfile.TemporaryDirectory() as directory:
            self.tree(directory, 'A.cs')
            report = self.report(directory, 'a.xml', {1: 1})
            report.write_text(report.read_text().replace('<coverage>', '<coverage branches-covered="1" branches-valid="2">'))
            result = self.tool.summarize([report, report], Path(directory))
            self.assertEqual(result['branches'], {'covered': 1, 'total': 2, 'percent': 50.0})
            self.assertEqual(result['measured_gate'], 'FAIL')
            self.assertEqual(len(result['unlocated_branch_groups']), 1)


class CurlEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tool = load('verify_p0')

    def test_checks_the_exact_expected_status_and_body(self):
        for name, status, body in (
            ('live', 200, {'status': 'alive'}), ('ready', 503, {'status': 'notReady'}),
            ('missing', 404, {'status': 404, 'error': 'Not Found', 'message': 'Chức năng chưa khả dụng',
                              'path': '/api/species', 'timestamp': '2026-10-09T10:00:00'}),
            ('method', 405, {'status': 405, 'error': 'Method Not Allowed', 'message': 'Yêu cầu không hợp lệ',
                             'path': '/health/live', 'timestamp': '2026-10-09T10:00:00'}),
        ):
            with self.subTest(name=name):
                self.tool.assert_response(name, status, json.dumps(body))
                with self.assertRaises(ValueError):
                    self.tool.assert_response(name, 500, json.dumps(body))
                with self.assertRaises(ValueError):
                    self.tool.assert_response(name, status, '{}')

    def test_non_json_or_fabricated_ready_success_is_rejected(self):
        for status, body in ((503, '<html>failure</html>'), (200, '{"status":"ready"}')):
            with self.subTest(body=body), self.assertRaises(ValueError):
                self.tool.assert_response('ready', status, body)

    def test_runner_does_not_accept_a_real_api_db_url_or_other_phase(self):
        for arguments in (['--url', 'https://production.invalid'], ['--db', 'postgresql://remote'], ['--phase', 'P1']):
            with self.subTest(arguments=arguments), self.assertRaises(SystemExit):
                self.tool.parse_arguments(arguments)


class RunnerFailureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tool = load('verify_p0')

    def test_incomplete_phase_returns_2_and_always_cleans_resources(self):
        with tempfile.TemporaryDirectory() as directory, \
             patch.object(self.tool, 'parse_arguments', return_value=SimpleNamespace(output=Path(directory) / 'new', serve=False)), \
             patch.object(self.tool, 'Run') as runner:
            self.assertEqual(self.tool.main(), 2)
            runner.return_value.cleanup.assert_called_once()

    def test_failed_task_stops_and_cleans_resources(self):
        with tempfile.TemporaryDirectory() as directory, \
             patch.object(self.tool, 'parse_arguments', return_value=SimpleNamespace(output=Path(directory) / 'new', serve=False)), \
             patch.object(self.tool, 'Run') as runner:
            runner.return_value.tasks.side_effect = RuntimeError('test failure')
            self.assertEqual(self.tool.main(), 1)
            runner.return_value.cleanup.assert_called_once()

    def test_existing_output_is_refused_before_any_resource_is_started(self):
        with tempfile.TemporaryDirectory() as directory, \
             patch.object(self.tool, 'parse_arguments', return_value=SimpleNamespace(output=Path(directory), serve=False)), \
             patch.object(self.tool, 'Run') as runner:
            with self.assertRaises(FileExistsError):
                self.tool.main()
            runner.assert_not_called()

    def test_false_role_constraint_equivalence_aborts_verification(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = self.tool.Run(Path(directory))
            before = "(ARRAY['user'::character varying, 'assistant'::character varying])::text[]"
            after = "ARRAY[('user'::character varying)::text, ('assistant'::character varying)::text]"
            with patch.object(runner, 'command', side_effect=[before, after]), \
                 patch.object(runner, 'note'), patch.object(runner, 'pg_environment', return_value={}), \
                 patch.object(runner, 'sql', return_value='f'):
                with self.assertRaisesRegex(RuntimeError, 'equivalence'):
                    runner.schema_diff('wildvn_fixture_source', 'wildvn_fixture_roundtrip')

    def test_error_timestamp_missing_invalid_or_offset_is_refused(self):
        body = {'status': 404, 'error': 'Not Found', 'message': 'Chức năng chưa khả dụng', 'path': '/api/species'}
        for stamp in (None, 'bad-date', '2026-10-09T10:00:00Z'):
            with self.subTest(stamp=stamp), self.assertRaises(ValueError):
                self.tool.assert_response('missing', 404, json.dumps({**body, 'timestamp': stamp}))

    def test_postgres_readiness_requires_tcp_not_bootstrap_unix_socket(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = self.tool.Run(Path(directory))
            with patch.object(runner, 'command', side_effect=['owned-container', '127.0.0.1:5432', '', '', '']), \
                 patch.object(runner, 'backup_roundtrip'), \
                 patch.object(self.tool.subprocess, 'run', return_value=SimpleNamespace(returncode=0)) as probe:
                runner.fixture()
                command = probe.call_args.args[0]
                self.assertIn('-h', command)
                self.assertEqual(command[command.index('-h') + 1], '127.0.0.1')
