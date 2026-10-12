"""Portable boundary tests; these cannot certify Windows UIA/device execution."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('windows_review', Path(__file__).resolve().parents[1]/'build/Verify-WindowsReview.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class WindowsReviewBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.package = Path(self.temp.name)/'package'; self.package.mkdir()
        (self.package/'Review-Windows.ps1').write_text('boundary fixture only')
        self.output = Path(self.temp.name)/'new-output'

    def test_linux_returns_unverified_without_launch_or_uia_import(self):
        with patch.object(tool, 'windows_x64', return_value=False), patch.object(tool.Review, 'execute') as execute:
            self.assertEqual(tool.main(['--package', str(self.package), '--output', str(self.output)]), 2)
        execute.assert_not_called()
        self.assertEqual(json.loads((self.output/'result.json').read_text())['status'], 'CHƯA KIỂM CHỨNG')

    def test_existing_evidence_is_not_overwritten(self):
        self.output.mkdir(); marker=self.output/'keep';marker.write_text('original')
        self.assertEqual(tool.main(['--package',str(self.package),'--output',str(self.output)]),1)
        self.assertEqual(marker.read_text(),'original')

    def test_api_options_accept_https_or_numeric_loopback_only(self):
        for url, opt in [('https://api.example.invalid/',False),('http://127.0.0.1:5080/',True),('http://[::1]:5080/',True)]:
            tool.validate_options(self.package,self.output,url,opt)
        for url,opt in [('http://api.example.invalid/',True),('http://localhost:5080/',True),('http://127.0.0.1/',False),
                        ('https://user:password@api.example.invalid/',False),('file:///etc/passwd',False),
                        ('https://api.example.invalid/?token=x',False),('https://api.example.invalid:0/',False),
                        ('https://api.example.invalid:bad/',False),(None,True)]:
            with self.subTest(url=url),self.assertRaises(ValueError):tool.validate_options(self.package,self.output,url,opt)

    def test_selected_paths_reject_links(self):
        linked=Path(self.temp.name)/'linked';linked.symlink_to(self.package,target_is_directory=True)
        with self.assertRaises(ValueError):tool.validate_options(linked,self.output,None,False)

    def test_evidence_cannot_be_written_into_package_inventory(self):
        with self.assertRaises(ValueError):tool.validate_options(self.package,self.package/'new-evidence',None,False)

    def test_only_real_decoder_metrics_can_satisfy_playback_evidence(self):
        self.assertIsNone(tool.media_metrics('Ready; no decoder metrics'))
        self.assertEqual(tool.media_metrics('Native=Playing; time=400 ms; decoded video=55; audio=141; muted=True'),
                         {'state':'Playing','time_ms':400,'video_frames':55,'audio_blocks':141,'muted':True})

    def test_environment_uses_only_explicit_product_options(self):
        with patch.dict(tool.os.environ,{'WILDVN_API_BASE_URL':'https://private.invalid/','wildvn_poc_video_path':'private','OTHER':'keep'},clear=True):
            self.assertEqual(tool.safe_child_environment(),{'OTHER':'keep'})

    def test_runner_timeout_failure_does_not_claim_pass(self):
        self.output.mkdir(); review=tool.Review(self.package,self.output)
        with patch.object(tool.subprocess,'run',return_value=type('Result',(),{'returncode':1,'stdout':'','stderr':'error'})()):
            with self.assertRaises(RuntimeError):review.runner('Check')
        review.finish()
        self.assertEqual(json.loads((self.output/'result.json').read_text())['status'],'FAIL')

    def test_changed_session_identity_blocks_ui_and_cleanup(self):
        self.output.mkdir();review=tool.Review(self.package,self.output);review.state={'pid':42}
        (self.package/'.review-session.json').write_text(json.dumps({'pid':43}))
        with patch.object(review,'runner') as runner:
            with self.assertRaises(RuntimeError):review.owned()
            review.finish()
        runner.assert_not_called()
        self.assertIn('FAIL',review.result['cleanup'])

    def test_navigation_requires_page_title_label_not_the_navigation_button(self):
        self.output.mkdir();review=tool.Review(self.package,self.output)
        button=type('Button',(),{'element_info':type('Info',(),{'control_type':'Button'})(),
                                'window_text':lambda _: 'Hệ sinh thái'})()
        label=type('Label',(),{'element_info':type('Info',(),{'control_type':'Text'})(),
                              'window_text':lambda _: 'Hệ sinh thái'})()
        review.shell=type('Shell',(),{'descendants':lambda _: [button]})()
        with patch.object(review,'owned'):
            self.assertFalse(review.section_visible('Hệ sinh thái'))
            review.shell=type('Shell',(),{'descendants':lambda _: [button,label]})()
            self.assertTrue(review.section_visible('Hệ sinh thái'))


if __name__ == '__main__':
    unittest.main()
