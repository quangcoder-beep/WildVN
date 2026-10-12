"""Real Windows x64 UI acceptance of an explicitly selected WinForms review package."""
import argparse
import json
import os
from pathlib import Path
import platform
import re
import struct
import subprocess
import sys
import time
from urllib.parse import urlsplit


def validate_options(package, output, api_url, allow_http):
    for path in (package, output):
        if any(parent.is_symlink() or (parent.exists() and getattr(parent.lstat(), 'st_file_attributes', 0) & 0x400)
               for parent in (path, *path.parents)):
            raise ValueError('Linked package/output paths are refused')
    if output.exists():
        raise ValueError('Output must be a new directory; previous evidence is preserved')
    if not package.is_dir() or not (package/'Review-Windows.ps1').is_file():
        raise ValueError('Select a complete extracted win-x64 review package')
    if output.resolve().is_relative_to(package.resolve()):
        raise ValueError('Evidence output must be outside the verified package inventory')
    if api_url:
        parsed = urlsplit(api_url)
        if parsed.port == 0:
            raise ValueError('API port must be between 1 and 65535')
        if (parsed.username or parsed.password or parsed.query or parsed.fragment or
                not parsed.hostname or parsed.scheme not in ('https', 'http') or
                (parsed.scheme == 'http' and (not allow_http or parsed.hostname not in ('127.0.0.1', '::1')))):
            raise ValueError('API requires HTTPS or explicit numeric-loopback HTTP; no credentials/query/fragment')
    elif allow_http:
        raise ValueError('Loopback HTTP opt-in requires an explicit API URL')


def windows_x64():
    return (sys.platform == 'win32' and struct.calcsize('P') == 8 and
            platform.machine().upper() in ('AMD64', 'X86_64'))


def wait_until(predicate, timeout=20):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(.1)
    raise TimeoutError('Expected owned-window state did not appear')


def media_metrics(text):
    match = re.search(r'Native=(\w+); time=(\d+) ms; decoded video=(\d+); audio=(\d+); muted=(True|False)', text)
    if not match:
        return None
    return {'state': match[1], 'time_ms': int(match[2]), 'video_frames': int(match[3]),
            'audio_blocks': int(match[4]), 'muted': match[5] == 'True'}


def safe_child_environment():
    return {name: value for name, value in os.environ.items() if not name.upper().startswith('WILDVN_')}


class Review:
    def __init__(self, package, output, api_url=None, allow_http=False):
        self.package, self.output = package, output
        self.api_url, self.allow_http = api_url, allow_http
        self.state = None
        self.shell = None
        self.media = None
        self.checks = []
        self.log = output/'runner.log'
        self.result = {'status': 'FAIL', 'windows_execution': 'FAIL', 'checks': [],
                       'environment': {'os': platform.platform(), 'python': platform.python_version(),
                                       'architecture': platform.machine()},
                       'limits': ['DPI matrix, keyboard/accessibility audit, clean machine, signing, device audibility and codec breadth need separate acceptance.']}

    def runner(self, action, options=()):
        command = ['powershell.exe', '-NoProfile', '-NonInteractive', '-File',
                   str(self.package/'Review-Windows.ps1'), '-Action', action, *options]
        result = subprocess.run(command, cwd=self.package, env=safe_child_environment(),
                                text=True, capture_output=True, timeout=30)
        with self.log.open('a', encoding='utf-8') as log:
            log.write('ACTION '+action+'\n'+result.stdout+result.stderr+f'\nEXIT_CODE={result.returncode}\n')
        if result.returncode:
            raise RuntimeError('Owned package runner failed: '+action+'; see runner.log')
        return result.stdout

    def record(self, name, evidence):
        self.checks = [*self.checks, {'name': name, 'status': 'PASS', 'evidence': evidence}]

    def owned(self):
        current = json.loads((self.package/'.review-session.json').read_text(encoding='utf-8-sig'))
        if current != self.state or current.get('executable', '').casefold() != str(self.package/'WildVN.Desktop.exe').casefold():
            raise RuntimeError('Session identity changed; no UI action sent')
        self.runner('Status')

    def text(self, window):
        self.owned()
        if window.process_id() != self.state['pid']:
            raise RuntimeError('UI window does not belong to selected child')
        return '\n'.join(item.window_text() for item in window.descendants())

    def section_visible(self, name):
        self.owned()
        return any(item.element_info.control_type == 'Text' and item.window_text() == name
                   for item in self.shell.descendants())

    def control(self, window, name, kind):
        self.owned()
        target = window.child_window(title=name, control_type=kind)
        target.wait('exists visible enabled', timeout=20)
        wrapper = target.wrapper_object()
        if wrapper.process_id() != self.state['pid']:
            raise RuntimeError('Control is not owned by selected child')
        return wrapper

    def capture(self, window, name):
        self.owned()
        if window.process_id() != self.state['pid']:
            raise RuntimeError('Screenshot target is not owned')
        window.capture_as_image().save(self.output/name)

    def execute(self):
        # Imports are behind the Windows guard. Linux cannot emulate successful UIA evidence.
        from pywinauto.application import Application
        self.runner('Check')
        if (self.package/'.review-session.json').exists():
            raise RuntimeError('Existing session retained; select a fresh package or close its owned client first')
        options = ['-WithSamples']
        if self.api_url:
            options += ['-ApiUrl', self.api_url]
        if self.allow_http:
            options += ['-AllowLoopbackHttp']
        self.runner('Start', options)
        self.state = json.loads((self.package/'.review-session.json').read_text(encoding='utf-8-sig'))
        self.owned()
        app = Application(backend='uia').connect(process=self.state['pid'], timeout=20)
        self.shell = app.window(title='WildVN .NET — WinForms (P0)')
        self.shell.wait('exists visible enabled', timeout=20)
        initial = self.text(self.shell)
        if 'Chưa kiểm tra kết nối API.' not in initial:
            raise AssertionError('Startup connection state does not match explicit-check behavior')
        self.record('Startup', 'Owned window; connection remains unchecked at startup')
        self.capture(self.shell, 'shell-startup.png')
        self.navigate()
        self.prepare_media(app)
        self.play_media()
        self.runner('Stop')
        self.shell.wait_not('exists', timeout=20)
        if (self.package/'.review-session.json').exists():
            raise AssertionError('Runner session remains after graceful Stop')
        self.record('Graceful close', 'Owned shell/media exited; runner removed its session')
        self.state = None
        self.result = {**self.result, 'status': 'PASS', 'windows_execution': 'PASS for exercised shell/native media only'}

    def navigate(self):
        for name in ('Danh mục loài', 'Hệ sinh thái', 'Yêu thích', 'Học viện', 'Trò chuyện'):
            self.control(self.shell, name, 'Button').invoke()
            wait_until(lambda: self.section_visible(name) and 'Chưa khả dụng' in self.text(self.shell))
            self.record('Navigation '+name, 'Unavailable business state retained')
        if self.api_url:
            self.control(self.shell, 'Kiểm tra kết nối API', 'Button').invoke()
            wait_until(lambda: 'Đã kết nối API. Các chức năng còn chờ chuyển đổi.' in self.text(self.shell))
            self.record('Explicit health request', 'Real selected API health reflected in UI')

    def prepare_media(self, app):
        self.control(self.shell, 'PoC media (cục bộ)', 'Button').invoke()
        self.media = app.window(title='WildVN — Media PoC WinForms (cục bộ)')
        self.media.wait('exists visible enabled', timeout=20)
        wait_until(lambda: 'Đã nạp mẫu cục bộ.' in self.text(self.media))
        mute = self.control(self.media, 'Tắt tiếng', 'CheckBox')
        motion = self.control(self.media, 'Giảm chuyển động', 'CheckBox')
        if mute.get_toggle_state() != 1 or motion.get_toggle_state() != 1:
            raise AssertionError('Mute/reduced-motion checkboxes must start checked')
        before = media_metrics(self.text(self.media))
        if before is None or before['state'] == 'Playing' or before['time_ms'] != 0:
            raise AssertionError('Media must not autoplay')
        self.record('Media defaults', {'checkboxes_checked': True, 'metrics': before})
        self.capture(self.media, 'media-ready.png')
        motion.toggle()

    def play_media(self):
        self.control(self.media, 'Phát', 'Button').invoke()
        def playing_video():
            value = media_metrics(self.text(self.media))
            return value if value and value['state'] == 'Playing' and value['time_ms'] > 200 and value['video_frames'] > 5 and value['muted'] else None
        video = wait_until(playing_video)
        self.record('Native video decode', video)
        self.capture(self.media, 'video-playing.png')
        self.control(self.media, 'Tạm dừng', 'Button').invoke()
        wait_until(lambda: (media_metrics(self.text(self.media)) or {}).get('state') == 'Paused')
        self.record('Pause', 'Native state Paused')
        self.control(self.media, 'Dừng', 'Button').invoke()
        wait_until(lambda: (media_metrics(self.text(self.media)) or {}).get('state') == 'Stopped')
        self.record('Stop', 'Native state Stopped')
        selections = self.media.descendants(control_type='ComboBox')
        if len(selections) != 1 or selections[0].process_id() != self.state['pid']:
            raise AssertionError('Expected one owned media selector')
        selections[0].select('Audio')
        self.control(self.media, 'Phát', 'Button').invoke()
        def playing_audio():
            value = media_metrics(self.text(self.media))
            return value if value and value['state'] == 'Playing' and value['time_ms'] > 200 and value['audio_blocks'] > 0 and value['muted'] else None
        self.record('Derived WAV decode (audibility unverified)', wait_until(playing_audio))

    def finish(self):
        cleanup = 'No owned session remains'
        if self.state is None and (self.package/'.review-session.json').exists():
            cleanup = 'UNVERIFIED: session retained after startup failure or concurrent launch; inspect it manually'
            self.result = {**self.result, 'status': 'FAIL'}
        if self.state is not None:
            try:
                self.owned()
                self.runner('Stop')
                cleanup = 'Owned child closed by package runner after failure'
            except Exception as error:
                cleanup = 'FAIL: '+str(error)
                self.result = {**self.result, 'status': 'FAIL'}
        self.result = {**self.result, 'checks': self.checks, 'cleanup': cleanup}
        (self.output/'result.json').write_text(json.dumps(self.result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--api-url')
    parser.add_argument('--allow-loopback-http', action='store_true')
    args = parser.parse_args(arguments)
    package, output = args.package.absolute(), args.output.absolute()
    try:
        validate_options(package, output, args.api_url, args.allow_loopback_http)
        package, output = package.resolve(), output.resolve()
        output.mkdir(parents=True, exist_ok=False)
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1
    if not windows_x64():
        result = {'status': 'CHƯA KIỂM CHỨNG', 'windows_execution': 'CHƯA KIỂM CHỨNG',
                  'reason': 'Requires Python x64 on Windows x64 with an interactive desktop; no UI actions sent'}
        (output/'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        print(result['reason'])
        return 2
    review = Review(package, output, args.api_url, args.allow_loopback_http)
    try:
        review.execute()
    except Exception as error:
        review.result = {**review.result, 'error': str(error)}
        for window, name in ((review.shell, 'shell-failure.png'), (review.media, 'media-failure.png')):
            if window is not None and review.state is not None:
                try:
                    review.capture(window, name)
                except Exception as capture_error:
                    review.result = {**review.result, 'capture_error': str(capture_error)}
    finally:
        review.finish()
    print(review.result['status']+'; '+str(output/'result.json'))
    return 0 if review.result['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
