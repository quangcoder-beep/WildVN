"""Local Mono package verification and process ownership regression tests."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import signal
import tempfile
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('review_client_regression', ROOT/'build/review_client.py')
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)


class MonoRunnerTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.addCleanup(patch.stopall)
        patch.object(client, 'ROOT', self.root).start()
        self.session = self.root/'.review-session.json'
        names = ['WildVN.Desktop.exe', 'LibVLCSharp.dll', 'WildVN.ApiClient.dll',
                 'WildVN.Contracts.dll', 'System.Text.Json.dll',
                 'WildVN.Desktop.exe.config', 'LibVLCSharp.dll.config',
                 'review_client.py', 'Review-Windows.ps1', 'NOTICE.md']
        self.document = {'schema': 1, 'flavour': 'mono-net472', 'files': []}
        for name in names:
            self.add_payload(name)
        self.write_manifest()

    def add_payload(self, name):
        payload = b'unit fixture; no native execution proof'
        path = self.root/name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        self.document = {**self.document, 'files': [*self.document['files'],
            {'path': name, 'size': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}]}

    def write_manifest(self):
        (self.root/'manifest.json').write_text(json.dumps(self.document))

    def state(self, **changes):
        return {'pid': 42, 'start_ticks': '123',
                'executable': str(self.root/'WildVN.Desktop.exe'), **changes}

    def child_mocks(self):
        child = Mock(pid=42)
        child.poll.return_value = None
        child.wait.return_value = 0
        patch.dict(client.os.environ, {'DISPLAY': ':1'}).start()
        patch.object(client.subprocess, 'Popen', return_value=child).start()
        patch.object(client.os, 'pidfd_open', return_value=99).start()
        patch.object(client.os, 'close').start()
        patch.object(client.signal, 'pidfd_send_signal').start()
        patch.object(client, 'process_start_ticks', return_value='123', create=True).start()
        patch.object(client, 'process_identity', return_value=('123', self.state()['executable'])).start()
        return child

    def test_owned_identity_is_bound_to_package_not_session_supplied_executable(self):
        foreign = self.state(executable='/other/WildVN.Desktop.exe')
        with patch.object(client, 'process_identity', return_value=('123', foreign['executable'])):
            self.assertFalse(client.is_owned(foreign))
        with patch.object(client, 'process_identity', return_value=('123', self.state()['executable'])):
            self.assertTrue(client.is_owned(self.state()))

    def test_check_verifies_complete_mono_package_and_ignores_runtime_files(self):
        (self.root/'client.log').write_text('runtime output')
        self.session.write_text('{}')
        client.verify_package()

    def test_check_rejects_wrong_schema_flavour_empty_duplicate_and_unsafe_entries(self):
        valid = self.document
        invalid = [None, [], {**valid, 'schema': True}, {**valid, 'schema': 2},
                   {**valid, 'flavour': 'win-x64'}, {**valid, 'files': []},
                   {**valid, 'files': [*valid['files'], valid['files'][0]]}]
        for path in ('../private', '/tmp/private', 'samples/../private', 'sample\\x', './x'):
            invalid.append({**valid, 'files': [*valid['files'],
                {'path': path, 'size': 1, 'sha256': '0'*64}]})
        for document in invalid:
            with self.subTest(document=document):
                (self.root/'manifest.json').write_text(json.dumps(document))
                with self.assertRaises(ValueError):
                    client.verify_package()

    def test_check_rejects_tampering_unlisted_payload_and_invalid_entry_metadata(self):
        for field, value in (('size', True), ('size', -1), ('sha256', 'invalid')):
            with self.subTest(field=field, value=value):
                broken = {**self.document, 'files': [
                    {**self.document['files'][0], field: value}, *self.document['files'][1:]]}
                (self.root/'manifest.json').write_text(json.dumps(broken))
                with self.assertRaises(ValueError): client.verify_package()
        self.write_manifest()
        (self.root/'unlisted.dll').write_bytes(b'additional assembly')
        with self.assertRaises(ValueError): client.verify_package()
        (self.root/'unlisted.dll').unlink()
        (self.root/'WildVN.Desktop.exe').write_bytes(b'tampered')
        with self.assertRaises(ValueError): client.verify_package()

    def test_check_rejects_manifest_symlink_and_payload_ancestor_symlink(self):
        target = self.root/'elsewhere'
        target.write_text(json.dumps(self.document))
        (self.root/'manifest.json').unlink()
        (self.root/'manifest.json').symlink_to(target)
        with self.assertRaises(ValueError): client.verify_package()
        (self.root/'manifest.json').unlink()
        target.unlink()
        self.add_payload('samples/image.jpg')
        self.write_manifest()
        (self.root/'samples/image.jpg').unlink()
        (self.root/'samples').rmdir()
        with tempfile.TemporaryDirectory() as d:
            (Path(d)/'image.jpg').write_bytes(b'unit fixture; no native execution proof')
            (self.root/'samples').symlink_to(d, target_is_directory=True)
            with self.assertRaises(ValueError): client.verify_package()

    def test_check_rejects_linked_root_ancestor_and_unknown_empty_directory(self):
        (self.root/'unknown').mkdir()
        with self.assertRaises(ValueError): client.verify_package()
        (self.root/'unknown').rmdir()
        with tempfile.TemporaryDirectory() as d:
            link = Path(d)/'linked'
            link.symlink_to(self.root.parent, target_is_directory=True)
            with patch.object(client, 'ROOT', link/self.root.name):
                with self.assertRaises(ValueError): client.verify_package()

    def test_check_rejects_colon_paths_and_case_conflicting_entries(self):
        for name in ('C:x.dll', 'WildVN.Contracts.DLL'):
            with self.subTest(name=name):
                self.add_payload(name)
                self.write_manifest()
                with self.assertRaises(ValueError): client.verify_package()
                (self.root/name).unlink()
                self.document = {**self.document, 'files': self.document['files'][:-1]}

    def test_runtime_named_fifo_is_rejected_before_launch(self):
        os.mkfifo(self.root/'client.log')
        with self.assertRaises(ValueError): client.verify_package()

    def test_start_verifies_hashes_before_launch_and_releases_reservation_on_failure(self):
        (self.root/'WildVN.Desktop.exe').write_bytes(b'tampered')
        with patch.dict(client.os.environ, {'DISPLAY': ':1'}), \
                patch.object(client.subprocess, 'Popen') as launch:
            with self.assertRaises(ValueError): client.start(self.session, None, False, False)
            launch.assert_not_called()
            self.assertFalse(self.session.exists())

    def test_samples_require_all_three_manifest_listed_media(self):
        with patch.dict(client.os.environ, {'DISPLAY': ':1'}), \
                patch.object(client.subprocess, 'Popen') as launch:
            with self.assertRaises(ValueError): client.start(self.session, None, False, True)
            launch.assert_not_called()

    def test_start_reserves_session_before_child_and_publishes_owned_state(self):
        child = self.child_mocks()
        def launch(*args, **kwargs):
            self.assertTrue(self.session.exists(), 'reservation must precede child launch')
            self.assertEqual(args[0], ['mono', str(self.root/'WildVN.Desktop.exe')])
            return child
        client.subprocess.Popen.side_effect = launch
        with contextlib.redirect_stdout(io.StringIO()):
            client.start(self.session, None, False, False)
        self.assertEqual(json.loads(self.session.read_text()), self.state())
        client.signal.pidfd_send_signal.assert_not_called()
        child.terminate.assert_not_called()
        child.kill.assert_not_called()

    def test_launch_failure_releases_exclusive_session(self):
        self.child_mocks()
        client.subprocess.Popen.side_effect = OSError('missing mono')
        with self.assertRaises(OSError): client.start(self.session, None, False, False)
        self.assertFalse(self.session.exists())

    def test_pidfd_acquisition_failure_retains_recoverable_child_state(self):
        child = self.child_mocks()
        client.os.pidfd_open.side_effect = [99, OSError('pidfd resource unavailable')]
        with self.assertRaises((ValueError, OSError)):
            client.start(self.session, None, False, False)
        self.assertEqual(json.loads(self.session.read_text()), self.state())
        client.signal.pidfd_send_signal.assert_not_called()
        child.terminate.assert_not_called()
        child.kill.assert_not_called()

    def test_publication_failure_stops_spawned_child_by_pidfd_and_releases_session(self):
        child = self.child_mocks()
        with patch.object(client.json, 'dump', side_effect=OSError('cannot publish session')):
            with self.assertRaises(OSError): client.start(self.session, None, False, False)
        client.signal.pidfd_send_signal.assert_called_once_with(99, signal.SIGTERM)
        child.wait.assert_called()
        child.terminate.assert_not_called()
        child.kill.assert_not_called()
        self.assertFalse(self.session.exists())

    def test_unverified_child_cleanup_uses_start_time_and_pidfd(self):
        child = self.child_mocks()
        client.process_identity.return_value = None
        with patch.object(client.time, 'sleep'):
            with self.assertRaises(RuntimeError): client.start(self.session, None, False, False)
        client.signal.pidfd_send_signal.assert_called_once_with(99, signal.SIGTERM)
        child.terminate.assert_not_called()
        self.assertFalse(self.session.exists())

    def test_cleanup_never_signals_when_pid_start_ticks_change(self):
        self.child_mocks()
        client.process_start_ticks.side_effect = ['123', '124']
        with patch.object(client.json, 'dump', side_effect=OSError('cannot publish session')):
            with self.assertRaises((ValueError, OSError)): client.start(self.session, None, False, False)
        client.signal.pidfd_send_signal.assert_not_called()

    def test_malformed_session_is_rejected_before_opening_pidfd_or_signalling(self):
        invalid = [None, [], {}, self.state(pid=True), self.state(pid=0),
                   self.state(pid='42'), self.state(start_ticks='x'),
                   self.state(executable='/foreign/WildVN.Desktop.exe')]
        for state in invalid:
            with self.subTest(state=state):
                self.session.write_text(json.dumps(state))
                with patch.object(client.os, 'pidfd_open') as open_pidfd, \
                        patch.object(client.signal, 'pidfd_send_signal') as send:
                    with self.assertRaises(ValueError): client.stop(self.session)
                    open_pidfd.assert_not_called()
                    send.assert_not_called()

    def test_stale_or_recycled_session_never_signals(self):
        self.session.write_text(json.dumps(self.state()))
        with patch.object(client, 'process_identity', return_value=('124', self.state()['executable'])), \
                patch.object(client.os, 'pidfd_open', return_value=99), \
                patch.object(client.os, 'close'), \
                patch.object(client.signal, 'pidfd_send_signal') as send:
            with self.assertRaises(ValueError): client.stop(self.session)
            send.assert_not_called()
            self.assertTrue(self.session.exists(), 'retain stale state for inspection')

    def test_existing_or_linked_session_is_never_overwritten_or_launched(self):
        self.session.write_text('existing')
        with patch.dict(client.os.environ, {'DISPLAY': ':1'}), \
                patch.object(client.subprocess, 'Popen') as launch:
            with self.assertRaises(FileExistsError): client.start(self.session, None, False, False)
            self.assertEqual(self.session.read_text(), 'existing')
            self.session.unlink()
            self.session.symlink_to(self.root/'missing')
            with self.assertRaises(FileExistsError): client.start(self.session, None, False, False)
            launch.assert_not_called()

    def test_stop_owned_child_uses_pidfd_and_removes_session(self):
        self.session.write_text(json.dumps(self.state()))
        with patch.object(client, 'process_identity', return_value=('123', self.state()['executable'])), \
                patch.object(client.os, 'pidfd_open', return_value=99), \
                patch.object(client.os, 'close') as close, \
                patch.object(client.signal, 'pidfd_send_signal') as send, \
                contextlib.redirect_stdout(io.StringIO()):
            client.stop(self.session)
            send.assert_called_once_with(99, signal.SIGTERM)
            close.assert_called_once_with(99)
            self.assertFalse(self.session.exists())

    def test_identity_handles_malformed_proc_stat(self):
        with patch.object(Path, 'read_text', return_value='malformed'):
            self.assertIsNone(client.process_identity(42))

    def test_process_identity_parses_mono_command_and_ignores_non_mono(self):
        with patch.object(client, 'process_start_ticks', return_value='123'), \
                patch.object(Path, 'read_bytes', return_value=b'mono\0'+os.fsencode(self.state()['executable'])+b'\0'):
            self.assertEqual(client.process_identity(42), ('123', self.state()['executable']))
        with patch.object(client, 'process_start_ticks', return_value='123'), \
                patch.object(Path, 'read_bytes', side_effect=PermissionError):
            self.assertIsNone(client.process_identity(42))

    def test_cleanup_reaps_exited_child_or_escalates_owned_unresponsive_child(self):
        child = Mock(pid=42)
        child.poll.return_value = 1
        with patch.object(client.signal, 'pidfd_send_signal') as send:
            client._cleanup_child(child, 99, '123')
            send.assert_not_called()
            child.wait.assert_called_once_with()
        child.poll.return_value = None
        child.wait.side_effect = [client.subprocess.TimeoutExpired('mono', 5), 0]
        with patch.object(client, 'process_start_ticks', return_value='123'), \
                patch.object(client.signal, 'pidfd_send_signal') as send:
            client._cleanup_child(child, 99, '123')
            self.assertEqual(send.call_args_list, [unittest.mock.call(99, signal.SIGTERM),
                                                  unittest.mock.call(99, signal.SIGKILL)])

    def test_main_check_status_start_stop_and_readable_error(self):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            with patch.object(client.sys, 'argv', ['review_client.py', 'check']):
                self.assertEqual(client.main(), 0)
            self.session.write_text(json.dumps(self.state()))
            with patch.object(client.sys, 'argv', ['review_client.py', 'status']):
                self.assertEqual(client.main(), 0)
            with patch.object(client.sys, 'argv', ['review_client.py', 'start']), \
                    patch.object(client, 'start') as start:
                self.assertEqual(client.main(), 0)
                start.assert_called_once_with(self.session, None, False, False)
            with patch.object(client.sys, 'argv', ['review_client.py', 'stop']), \
                    patch.object(client, 'stop') as stop:
                self.assertEqual(client.main(), 0)
                stop.assert_called_once_with(self.session)
            self.session.write_text('invalid')
            with patch.object(client.sys, 'argv', ['review_client.py', 'status']):
                self.assertEqual(client.main(), 1)

    def test_environment_requires_explicit_api_and_media_options(self):
        with patch.dict(client.os.environ, {'WILDVN_API_BASE_URL': 'https://private.example',
                                            'WILDVN_POC_VIDEO_PATH': '/private/movie'}, clear=True):
            self.assertEqual(client.child_environment(None, False, None), {})
            selected = client.child_environment('http://127.0.0.1:5080/', True, self.root/'samples')
            self.assertEqual(selected['WILDVN_API_BASE_URL'], 'http://127.0.0.1:5080/')
            self.assertEqual(selected['WILDVN_POC_VIDEO_PATH'], str(self.root/'samples/video.mp4'))


if __name__ == '__main__':
    unittest.main()
