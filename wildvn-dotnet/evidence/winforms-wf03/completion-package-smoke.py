"""Exercise only freshly extracted review packages and their owned X11 windows."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import signal
import subprocess
import sys
import time
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent/'completion-smoke'
OUT.mkdir(exist_ok=False)
sys.path.insert(0, str(ROOT/'evidence/winforms-wf01'))
from x11_owned import OwnWindow, gui_environment

def desktop_environment():
    env = gui_environment()
    if env.get('DISPLAY') and env.get('XAUTHORITY'):
        return env
    for line in subprocess.check_output(['ps', '-eo', 'uid,args'], text=True).splitlines():
        fields = shlex.split(line)
        if len(fields) > 3 and fields[0] == str(os.getuid()) and Path(fields[1]).name == 'Xwayland':
            assert re.fullmatch(r':\d+', fields[2]) and '-auth' in fields
            return {**env, 'DISPLAY': fields[2], 'XAUTHORITY': fields[fields.index('-auth')+1]}
    raise RuntimeError('No owned X11/Xwayland session')

def tree(env):
    return subprocess.check_output(['xwininfo', '-root', '-tree'], env=env, text=True)

def run(command, env):
    result = subprocess.run(command, env=env, cwd=ROOT, text=True, capture_output=True)
    logs.append('COMMAND '+shlex.join(map(str,command))+'\n'+result.stdout+result.stderr+f'EXIT_CODE={result.returncode}')
    if result.returncode: raise RuntimeError('Runner check failed')
    return result.stdout

def window(env, title, before):
    for _ in range(100):
        matches = re.findall(r'(0x[0-9a-f]+) "'+re.escape(title)+r'": \(\)', tree(env))
        new = [w for w in matches if w not in before]
        if len(new) == 1:
            owned = OwnWindow(int(new[0],16),env)
            mapped = subprocess.check_output(['xwininfo','-id',new[0]],env=env,text=True)
            if 'Map State: IsViewable' in mapped: return owned
        time.sleep(.1)
    raise RuntimeError('Owned window did not map: '+title)

def wait_text(owned, expected):
    for _ in range(100):
        current=owned.tree()
        if expected in current: return current
        time.sleep(.05)
    raise RuntimeError('Owned UI did not show '+expected)

logs=[]
packages=Path(sys.argv[1]).resolve()
extracted=ROOT/'TestResults/winforms-wf03/extracted-complete-20261011'
extracted.mkdir(exist_ok=False)
summaries=[]
for flavour in ('mono-net472','win-x64'):
    source=packages/(flavour+'.zip'); target=extracted/flavour; target.mkdir()
    with zipfile.ZipFile(source) as archive:
        for item in archive.infolist():
            path=PurePosixPath(item.filename)
            assert not path.is_absolute() and '..' not in path.parts and '\\' not in item.filename
            assert (item.external_attr>>16)&0o170000==0o100000
        archive.extractall(target)
    document=json.loads((target/'manifest.json').read_text())
    for entry in document['files']:
        actual=target/entry['path']; assert actual.stat().st_size==entry['size']
        with actual.open('rb') as stream: assert hashlib.file_digest(stream,'sha256').hexdigest()==entry['sha256']
    with source.open('rb') as stream: digest=hashlib.file_digest(stream,'sha256').hexdigest()
    summaries.append({'flavour':flavour,'zip':str(source.relative_to(ROOT)),'size':source.stat().st_size,
                      'sha256':digest,'payload_files':len(document['files']),
                      'source_revision':document['source_revision'],'source_revision_is_base':document['source_revision_is_base']})
    if flavour=='win-x64':
        plugins=list((target/'libvlc/win-x64/plugins').rglob('*.dll'));assert len(plugins)==321
        for name in ('WildVN.Desktop.exe','libvlc/win-x64/libvlc.dll','libvlc/win-x64/libvlccore.dll'):
            with (target/name).open('rb') as stream:
                assert stream.read(2)==b'MZ';stream.seek(0x3c);offset=int.from_bytes(stream.read(4),'little')
                stream.seek(offset);assert stream.read(4)==b'PE\0\0';assert int.from_bytes(stream.read(2),'little')==0x8664
        run([str(ROOT/'TestResults/tooling/powershell-7.6.6/pwsh'),'-NoProfile','-File',str(target/'Review-Windows.ps1'),'-Action','Check'],os.environ.copy())
        summaries[-1]['native_plugins']=321
        summaries[-1]['windows_execution']='CHƯA KIỂM CHỨNG'

mono=extracted/'mono-net472';env=desktop_environment()
command=[sys.executable,str(mono/'review_client.py')]
run(command+['check','--with-samples'],env)
# Forced stop path is checked before the complete UI/media run.
before=set(re.findall(r'0x[0-9a-f]+',tree(env)))
forced=json.loads(run(command+['start','--with-samples'],env))
first=window(env,'WildVN .NET — WinForms (P0)',before)
run(command+['status'],env)
run(command+['stop'],env)
for _ in range(100):
    if hex(first.window) not in tree(env):break
    time.sleep(.05)
else:raise RuntimeError('Owned forced-stop window remains')
assert not (mono/'.review-session.json').exists()
logs.append('EXTRACTED RUNNER START/STATUS/SIGTERM STOP PASS (no media loaded before forced stop)')

before=set(re.findall(r'0x[0-9a-f]+',tree(env)))
state=json.loads(run(command+['start','--with-samples','--api-url','http://127.0.0.1:5080/','--allow-loopback-http'],env))
shell=window(env,'WildVN .NET — WinForms (P0)',before)
try:
    assert 'Chưa kiểm tra kết nối API.' in shell.tree()
    for title in ('Danh mục loài','Hệ sinh thái','Yêu thích','Học viện','Trò chuyện'):
        shell.click(title);time.sleep(.05)
        current=shell.tree();assert current.count('"'+title+'"')==2 and 'Chưa khả dụng' in current
    shell.click('Kiểm tra kết nối API');wait_text(shell,'Đã kết nối API. Các chức năng còn chờ chuyển đổi.')
    shell.click('PoC media (cục bộ)')
    media=window(env,'WildVN — Media PoC WinForms (cục bộ)',before)
    wait_text(media,'Đã nạp mẫu cục bộ.')
    media.activate();time.sleep(.3);media.capture(OUT/'package-media-ready.png')
    media.click('Giảm chuyển động');time.sleep(.1);media.click('Phát')
    for _ in range(100):
        current=media.tree();metrics=re.search(r'Native=Playing; time=(\d+) ms; decoded video=(\d+); audio=(\d+); muted=True',current)
        if metrics and int(metrics[1])>200 and int(metrics[2])>5:break
        time.sleep(.05)
    assert metrics and int(metrics[1])>200 and int(metrics[2])>5
    logs.append('EXTRACTED NATIVE PLAYBACK '+metrics[0])
    media.activate();time.sleep(.2);media.capture(OUT/'package-media-playing.png')
    media.click('Tạm dừng');wait_text(media,'Native=Paused')
    media.click('Dừng');wait_text(media,'Native=Stopped')
    logs.append('EXTRACTED five-section UI / real API health / Play-Pause-Stop PASS\n'+media.tree())
    media.close();time.sleep(.2);shell.close()
    for _ in range(100):
        if hex(shell.window) not in tree(env):break
        time.sleep(.05)
    else:raise RuntimeError('Owned graceful-close window remains')
    current=json.loads(run(command+['status'],env));assert not current['owned_running']
    (mono/'.review-session.json').unlink()
    logs.append('EXTRACTED graceful close PASS; stale session removed only after status false')
except BaseException:
    run(command+['stop'],env)
    raise

# Leave a fresh verified instance ready, muted and reduced-motion for review.
before=set(re.findall(r'0x[0-9a-f]+',tree(env)))
state=json.loads(run(command+['start','--with-samples','--api-url','http://127.0.0.1:5080/','--allow-loopback-http'],env))
shell=window(env,'WildVN .NET — WinForms (P0)',before)
shell.click('Kiểm tra kết nối API');wait_text(shell,'Đã kết nối API. Các chức năng còn chờ chuyển đổi.')
shell.click('PoC media (cục bộ)');media=window(env,'WildVN — Media PoC WinForms (cục bộ)',before)
current=wait_text(media,'Đã nạp mẫu cục bộ.');assert 'Native=Playing' not in current
media.activate();time.sleep(.3);media.capture(OUT/'package-review.png')
logs.append(f'LIVE REVIEW PID={state["pid"]} start_ticks={state["start_ticks"]} DISPLAY={env["DISPLAY"]} SHELL={hex(shell.window)} MEDIA={hex(media.window)}\n'+shell.tree()+'\n'+media.tree())
(OUT/'package-smoke-final.txt').write_text('\n\n'.join(logs)+'\n')
(OUT/'packages-final.json').write_text(json.dumps({'artifacts':summaries,'live_client':{**state,'display':env['DISPLAY'],'shell_window':hex(shell.window),'media_window':hex(media.window)}},ensure_ascii=False,indent=2)+'\n')
print('Extracted package checks, Mono UI/media, stop and review instance PASS')
print(json.dumps(summaries,ensure_ascii=False,indent=2))
