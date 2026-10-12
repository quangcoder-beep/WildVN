"""Payload safety, reproducibility and owned Mono session regression tests."""
import importlib.util
import json
from pathlib import Path
import sys
import os
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]

def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'build' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

class PackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tool = load('package_review')

    def test_windows_native_dependency_is_pinned_only_on_windows_target(self):
        project = ET.parse(ROOT / "src/WildVN.Desktop/WildVN.Desktop.csproj")
        refs = project.findall(".//PackageReference[@Include='VideoLAN.LibVLC.Windows']")
        self.assertEqual(len(refs), 1, "Windows native DLL/plugins not packaged")
        self.assertEqual(refs[0].get("Version"), "3.0.24")
        group = next(g for g in project.findall("ItemGroup") if refs[0] in list(g))
        self.assertIn("net10.0-windows", group.get("Condition", ""))

    def payload(self, root, windows=False):
        names = ['WildVN.Desktop.exe', 'LibVLCSharp.dll', 'WildVN.ApiClient.dll',
                 'WildVN.Contracts.dll', 'System.Text.Json.dll']
        if windows:
            names += ['WildVN.Desktop.dll', 'WildVN.Desktop.deps.json',
                      'WildVN.Desktop.runtimeconfig.json', 'coreclr.dll',
                      'System.Windows.Forms.dll', 'libvlc/win-x64/libvlc.dll',
                      'libvlc/win-x64/libvlccore.dll',
                      'libvlc/win-x64/plugins/codec/libavcodec_plugin.dll']
        for name in names:
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'fixture payload, NOT Windows execution proof')
        return names

    def test_windows_requires_native_plugins_and_self_contained_runtime(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            names = self.payload(root, True)
            self.assertEqual(set(self.tool.payload_files(root, 'win-x64')), set(names))
            for name in ('coreclr.dll', 'libvlc/win-x64/libvlc.dll',
                         'libvlc/win-x64/plugins/codec/libavcodec_plugin.dll'):
                path = root / name
                content = path.read_bytes(); path.unlink()
                with self.assertRaises(ValueError): self.tool.payload_files(root, 'win-x64')
                path.write_bytes(content)

    def test_sensitive_names_rejected_before_contents_are_opened(self):
        for name in ('.env', 'client_secret.json', 'OAuthCredentials.json', 'secrets.dll',
                     'appsettings.Development.json', 'user.config', 'key.pfx', 'obj/x.dll',
                     'other.json', 'unknown.html', 'other.exe'):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as d:
                root = Path(d); self.payload(root)
                bad = root / name; bad.parent.mkdir(parents=True, exist_ok=True)
                bad.write_bytes(b'DO NOT READ')
                with patch.object(Path, 'read_bytes', side_effect=AssertionError('read too early')):
                    with self.assertRaises(ValueError): self.tool.payload_files(root, 'mono-net472')

    def test_symlink_file_or_directory_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / 'payload'; root.mkdir(); self.payload(root)
            external = Path(d) / 'outside'; external.mkdir(); (external/'x.dll').write_bytes(b'private')
            for name, target in (('link.dll', external/'x.dll'), ('libvlc', external)):
                link = root/name; link.symlink_to(target)
                with self.assertRaises(ValueError): self.tool.payload_files(root, 'mono-net472')
                link.unlink()

    def test_missing_entry_point_or_unknown_flavour_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            with self.assertRaises(ValueError): self.tool.payload_files(root, 'mono-net472')
            self.payload(root)
            with self.assertRaises(ValueError): self.tool.payload_files(root, 'other')

    def test_manifest_and_zip_are_deterministic_and_detect_tampering(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)/'payload'; root.mkdir(); names = self.payload(root)
            first = self.tool.manifest(root, names, 'mono-net472', 'abc123')
            self.assertEqual(first, self.tool.manifest(root, names, 'mono-net472', 'abc123'))
            self.assertNotIn(d, json.dumps(first))
            self.assertEqual(first['windows_execution'], 'CHƯA KIỂM CHỨNG')
            for name in ('a.zip', 'b.zip'): self.tool.write_archive(root, first, Path(d)/name)
            self.assertEqual((Path(d)/'a.zip').read_bytes(), (Path(d)/'b.zip').read_bytes())
            with zipfile.ZipFile(Path(d)/'a.zip') as z:
                self.assertIn('manifest.json', z.namelist())
                self.assertFalse(any(n.startswith('/') or '..' in n.split('/') for n in z.namelist()))
            self.tool.verify(root, first)
            (root/names[0]).write_bytes(b'tampered')
            with self.assertRaises(ValueError): self.tool.verify(root, first)

    def test_archive_refuses_existing_output_and_manifest_path_traversal(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)/'payload'; root.mkdir(); names=self.payload(root)
            m=self.tool.manifest(root,names,'mono-net472','abc')
            out=Path(d)/'archive.zip'; out.write_bytes(b'existing')
            with self.assertRaises(FileExistsError): self.tool.write_archive(root,m,out)
            broken={**m,'files': [{'path':'../private','sha256':'0'*64,'size':1}]}
            with self.assertRaises(ValueError): self.tool.verify(root,broken)

    def test_manifest_requires_complete_unique_canonical_payload(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); names = self.payload(root)
            good = self.tool.manifest(root, names, 'mono-net472', 'abc')
            for broken in ({**good, 'files': []}, {**good, 'schema': 2},
                           {**good, 'flavour': 'other'},
                           {**good, 'files': good['files'] + [good['files'][0]]}):
                with self.subTest(broken=broken), self.assertRaises(ValueError):
                    self.tool.verify(root, broken)
            for name in ('./WildVN.Desktop.exe', 'libvlc//win-x64/x.dll',
                         'C:payload.dll', 'x.dll:stream', 'libvlc/win-x64/../x.dll',
                         'con.dll', 'AUX.dll', 'NUL.dll', 'a b.dll',
                         'libvlc/win-x64/plugins/COM1.dll'):
                with self.subTest(name=name): self.assertFalse(self.tool.allowed(name))

    def test_verification_rejects_unlisted_payload_or_linked_ancestor(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)/'payload'; root.mkdir(); names = self.payload(root)
            good = self.tool.manifest(root, names, 'mono-net472', 'abc')
            unexpected = root/'extra.dll'; unexpected.write_bytes(b'unlisted')
            with self.assertRaises(ValueError): self.tool.verify(root, good)
            unexpected.unlink()
            linked = Path(d)/'link'; linked.symlink_to(root, target_is_directory=True)
            with self.assertRaises(ValueError): self.tool.verify(linked, good)

    def test_extracted_archive_verifies_with_only_expected_runtime_state(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); names = self.payload(root)
            good = self.tool.manifest(root, names, 'mono-net472', 'abc')
            (root/'manifest.json').write_text(json.dumps(good))
            (root/'client.log').write_text('runtime diagnostics')
            (root/'.review-session.json').write_text('{}')
            self.tool.verify(root, good)

    def test_staging_and_full_builder_create_both_review_archives(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)/'repo'; (root/'build').mkdir(parents=True)
            for name in ('review_client.py','Review-Windows.ps1','NOTICE.md',
                         'Install-WindowsReview.ps1','Start-InstalledReview.ps1','Verify-WindowsReview.py'):
                (root/'build'/name).write_text('test runner/notice')
            media = root.parent/'wildvn-client/public/videos/home'; media.mkdir(parents=True)
            for name in ('hero-loop-poster.jpg','hero-loop.mp4'): (media/name).write_bytes(b'media')
            audio = root/'TestResults/winforms-wf02/derived-audio.wav'; audio.parent.mkdir(parents=True); audio.write_bytes(b'wav')
            output = root/'packages'
            def build(arguments):
                if '-o' not in arguments: return
                publish = Path(arguments[arguments.index('-o')+1]); publish.mkdir(parents=True)
                self.payload(publish, '-r' in arguments)
                (publish/'debug.pdb').write_bytes(b'omit symbols')
                (publish/'libvlc/win-x86').mkdir(parents=True); (publish/'libvlc/win-x86/x.dll').write_bytes(b'omit x86')
            with patch.object(self.tool,'ROOT',root), patch.object(self.tool,'run',side_effect=build), \
                 patch.object(self.tool.subprocess,'check_output',return_value='abc\n'), \
                 patch.object(self.tool,'provenance',return_value={'src/test.cs':'0'*64}), \
                 patch.object(sys,'argv',['package_review.py','--output',str(output)]):
                self.assertEqual(self.tool.main(),0)
            for flavour in self.tool.FLAVOURS:
                extracted = output/flavour
                document = json.loads((extracted/'manifest.json').read_text())
                self.tool.verify(extracted,document)
                with zipfile.ZipFile(output/(flavour+'.zip')) as archive:
                    self.assertIn('samples/video.mp4',archive.namelist())
                    self.assertNotIn('debug.pdb',archive.namelist())
                    self.assertNotIn('libvlc/win-x86/x.dll',archive.namelist())
                    self.assertEqual('Install-WindowsReview.ps1' in archive.namelist(), flavour=='win-x64')
                    self.assertEqual('Verify-WindowsReview.py' in archive.namelist(), flavour=='win-x64')

class SessionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.tool=load('review_client')

    def test_process_identity_uses_pid_start_ticks_and_exact_executable(self):
        state={'pid':42,'start_ticks':'123','executable':'/local/WildVN.Desktop.exe'}
        with patch.object(self.tool, 'ROOT', Path('/local')), patch.object(self.tool,'process_identity',return_value=('123','/local/WildVN.Desktop.exe')):
            self.assertTrue(self.tool.is_owned(state))
        for identity in (None,('124','/local/WildVN.Desktop.exe'),('123','/other/WildVN.Desktop.exe')):
            with patch.object(self.tool,'process_identity',return_value=identity):
                self.assertFalse(self.tool.is_owned(state))

    def test_stop_never_signals_a_recycled_or_unrelated_pid(self):
        with tempfile.TemporaryDirectory() as d:
            session=Path(d)/'session.json'
            session.write_text(json.dumps({'pid':42,'start_ticks':'123','executable':'/local/WildVN.Desktop.exe'}))
            with patch.object(self.tool,'is_owned',return_value=False), patch.object(self.tool.os,'pidfd_open',return_value=99), patch.object(self.tool.os,'close'), \
                 patch.object(self.tool.signal,'pidfd_send_signal') as kill:
                with self.assertRaises(ValueError): self.tool.stop(session)
                kill.assert_not_called()

    def test_environment_only_uses_explicit_review_options(self):
        with patch.dict(self.tool.os.environ,{'WILDVN_POC_VIDEO_PATH':'/unselected',
                  'WILDVN_API_BASE_URL':'https://real.example','WILDVN_ALLOW_LOOPBACK_HTTP':'1'}):
            env=self.tool.child_environment(None,False,None)
            self.assertFalse(any(k.startswith('WILDVN_') for k in env))
            env=self.tool.child_environment('http://127.0.0.1:5080/',True,Path('/selected'))
            self.assertEqual(env['WILDVN_API_BASE_URL'],'http://127.0.0.1:5080/')
            self.assertEqual(env['WILDVN_POC_VIDEO_PATH'],'/selected/video.mp4')

    def test_missing_and_non_mono_process_identity_is_none(self):
        self.assertIsNone(self.tool.process_identity(os.getpid()))
        self.assertIsNone(self.tool.process_identity(2147483647))

    def test_start_rejects_missing_display_entrypoint_or_existing_session(self):
        with tempfile.TemporaryDirectory() as d, patch.object(self.tool, 'ROOT', Path(d)):
            session=Path(d)/'session.json'
            with patch.dict(self.tool.os.environ, {}, clear=True):
                with self.assertRaises(ValueError): self.tool.start(session,None,False,False)
            with patch.dict(self.tool.os.environ, {'DISPLAY':':1'}):
                with self.assertRaises(ValueError): self.tool.start(session,None,False,False)
                (Path(d)/'WildVN.Desktop.exe').write_bytes(b'unit guard only')
                session.write_text('{}')
                with self.assertRaises(FileExistsError): self.tool.start(session,None,False,False)

    def test_state_file_symlink_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            target=Path(d)/'other'; target.write_text('{}')
            session=Path(d)/'session.json'; session.symlink_to(target)
            with self.assertRaises(ValueError): self.tool.stop(session)

if __name__=='__main__': unittest.main()
