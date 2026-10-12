import os, pathlib, re, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'winforms-wf01'))
from x11_owned import gui_environment, OwnWindow
root = pathlib.Path(__file__).resolve().parents[2]
out = root / 'evidence/winforms-wf02'
exe = root / 'src/WildVN.Desktop/bin/Release/net472/WildVN.Desktop.exe'
wrapper = root / 'TestResults/winforms-wf02/RunWithCoverageFlush.exe'
env = gui_environment()
logs = []
def root_tree():
    for _ in range(30):
        result = subprocess.run(['xwininfo', '-root', '-tree'], env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode == 0: return result.stdout
        time.sleep(.1)
    raise RuntimeError('X11 tree did not stabilize: ' + result.stderr)
for name, address, opt_in, expected_exit in [
    ('valid', 'http://127.0.0.1:5080/', '1', 0),
    ('bad-uri', 'not an absolute URI', '1', 1),
    ('remote-http', 'http://remote.example.invalid/', '1', 1),
    ('missing-opt-in', 'http://127.0.0.1:5080/', '0', 1)]:
    before = set(re.findall(r'0x[0-9a-f]+', root_tree()))
    samples = {'WILDVN_POC_IMAGE_PATH': str(root.parent / 'wildvn-client/public/videos/home/hero-loop-poster.jpg'),
               'WILDVN_POC_VIDEO_PATH': str(root.parent / 'wildvn-client/public/videos/home/hero-loop.mp4'),
               'WILDVN_POC_AUDIO_PATH': str(root / 'TestResults/winforms-wf02/derived-audio.wav')}
    process = subprocess.Popen(['mono', str(wrapper), str(exe)], env={**env, **samples, 'WILDVN_API_BASE_URL': address, 'WILDVN_ALLOW_LOOPBACK_HTTP': opt_in}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    owned = None
    try:
        for _ in range(100):
            tree = root_tree()
            title = 'WildVN .NET — WinForms (P0)' if name == 'valid' else 'WildVN — cấu hình'
            matches = re.findall(r'(0x[0-9a-f]+) "' + re.escape(title) + r'": \(\)', tree)
            new = [w for w in matches if w not in before]
            if len(new) == 1:
                owned = OwnWindow(int(new[0], 16), env);break
            if process.poll() is not None:raise RuntimeError('EXE exited before window appeared')
            time.sleep(.1)
        if owned is None:raise RuntimeError('Own window did not appear')
        for _ in range(50):
            state = subprocess.check_output(['xwininfo', '-id', hex(owned.window)], env=env, text=True)
            if 'Map State: IsViewable' in state: break
            time.sleep(.1)
        assert 'Map State: IsViewable' in state
        logs.append(f'{name}: PID={process.pid} WINDOW={hex(owned.window)} IsViewable')
        if name == 'valid':
            initial = owned.tree()
            assert 'Chưa kiểm tra kết nối API.' in initial
            for title in ['Danh mục loài', 'Hệ sinh thái', 'Yêu thích', 'Học viện', 'Trò chuyện']:
                owned.click(title);time.sleep(.05)
                current = owned.tree()
                assert current.count('"' + title + '"') == 2, 'Title did not change: ' + title
                assert 'Chưa khả dụng' in current
                logs.append('navigation PASS: ' + title)
            owned.click('Kiểm tra kết nối API')
            for _ in range(50):
                current = owned.tree()
                if 'Đã kết nối API. Các chức năng còn chờ chuyển đổi.' in current:break
                time.sleep(.1)
            assert 'Đã kết nối API.' in current
            assert 'Chưa khả dụng' in current
            logs.append('REAL GET /health/live -> UI connected; business stays unavailable PASS')
            logs.append(current)
            owned.click('PoC media (cục bộ)')
            media = None
            for _ in range(100):
                matches = re.findall(r'(0x[0-9a-f]+) "WildVN — Media PoC WinForms \(cục bộ\)": \(\)', root_tree())
                new = [w for w in matches if w not in before]
                if len(new) == 1:
                    media = OwnWindow(int(new[0], 16), env); break
                time.sleep(.05)
            assert media is not None
            for _ in range(100):
                current = media.tree()
                if 'Đã nạp mẫu cục bộ.' in current: break
                time.sleep(.05)
            assert 'Đã nạp mẫu cục bộ.' in current
            media.activate(); time.sleep(.5); media.capture(out / 'media-ready.png')
            media.click('Giảm chuyển động'); time.sleep(.1); media.click('Phát')
            for _ in range(100):
                current = media.tree()
                metrics = re.search(r'Native=Playing; time=(\d+) ms; decoded video=(\d+); audio=(\d+); muted=True', current)
                if metrics and int(metrics[1]) > 200 and int(metrics[2]) > 5: break
                time.sleep(.05)
            assert metrics and int(metrics[1]) > 200 and int(metrics[2]) > 5
            logs.append('NATIVE EXE REAL PLAYBACK ' + metrics[0])
            media.activate(); time.sleep(.2); media.capture(out / 'media-playing.png')
            media.click('Tạm dừng'); time.sleep(.3)
            assert 'Native=Paused' in media.tree()
            logs.append('NATIVE EXE PAUSE PASS\n' + media.tree())
            media.close(); time.sleep(.1)
        else:
            current = owned.tree()
            # Mono's MessageBox paints its message; xwininfo exposes the title,
            # not the message text. Preserve a screenshot for visual verification.
            logs.append('Configuration dialog title and mapped state PASS; message screenshot saved')
        owned.activate();time.sleep(.5)
        owned.capture(out / ('exe-' + name + '.png'))
        owned.close()
        output, _ = process.communicate(timeout=10)
        assert process.returncode == expected_exit, output
        logs.append(output + f'EXIT_CODE={process.returncode} expected={expected_exit} PASS')
    finally:
        if process.poll() is None:
            if owned:owned.close()
            try:process.wait(timeout=5)
            except subprocess.TimeoutExpired:process.terminate();process.wait(timeout=5)
    print(logs[-1], flush=True)
(out / 'exe-coverage-smoke.txt').write_text('\n'.join(logs) + '\n')
print('EXE SMOKE: all 4 startup cases PASS; 5 navigation + actual HTTP PASS')
