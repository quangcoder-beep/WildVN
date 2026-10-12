"""Verify/start/inspect/stop this local Mono package; no API/config discovery."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import signal
import stat
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
REQUIRED = frozenset(('WildVN.Desktop.exe', 'LibVLCSharp.dll', 'WildVN.ApiClient.dll',
    'WildVN.Contracts.dll', 'System.Text.Json.dll', 'WildVN.Desktop.exe.config',
    'LibVLCSharp.dll.config', 'review_client.py', 'Review-Windows.ps1', 'NOTICE.md'))
SAMPLES = ('samples/image.jpg', 'samples/video.mp4', 'samples/audio.wav')
RUNTIME_FILES = frozenset(('manifest.json', 'client.log', '.review-session.json'))


def executable():
    return ROOT.resolve()/'WildVN.Desktop.exe'


def _safe_payload_name(name):
    if not isinstance(name, str) or not name or '\\' in name or ':' in name:
        return False
    path = PurePosixPath(name)
    if path.is_absolute() or path.as_posix() != name or {'..', '.'} & set(path.parts):
        return False
    if any(re.search(r'oauth|credential|secret|token|^\.env', p, re.I) or
           p in ('bin', 'obj') for p in path.parts):
        return False
    return (name in REQUIRED or name in SAMPLES or
            name in ('Media/Assets/media-poc.html', 'LICENSE.txt', 'ThirdPartyNotices.txt') or
            (len(path.parts) == 1 and path.suffix.lower() == '.dll') or
            (len(path.parts) == 2 and
             re.fullmatch(r'[a-z]{2}(-[A-Za-z]{2,4})?', path.parts[0]) is not None and
             path.name.endswith('.resources.dll')))


def _regular_package_file(name):
    path = ROOT/name
    for item in (path, *path.parents):
        if item.is_symlink():
            raise ValueError('Linked package path: ' + name)
    if not path.is_file() or not path.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError('Missing/unsafe package file: ' + name)
    return path


def verify_package(with_samples=False):
    """Hash the listed Mono payload and reject extra files before any launch."""
    if any(item.is_symlink() for item in (ROOT, *ROOT.parents)):
        raise ValueError('Linked package root/ancestor')
    try:
        document = json.loads(_regular_package_file('manifest.json').read_text())
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValueError('Cannot read package manifest') from error
    if (not isinstance(document, dict) or type(document.get('schema')) is not int or
            document['schema'] != 1 or document.get('flavour') != 'mono-net472' or
            not isinstance(document.get('files'), list) or not document['files']):
        raise ValueError('Requires a complete schema1 mono-net472 manifest')
    entries, names = {}, frozenset()
    for entry in document['files']:
        if not isinstance(entry, dict):
            raise ValueError('Malformed manifest entry')
        name, size, digest = (entry.get(key) for key in ('path', 'size', 'sha256'))
        if (not _safe_payload_name(name) or name.casefold() in names or type(size) is not int or
                size < 0 or not isinstance(digest, str) or
                re.fullmatch('[0-9a-f]{64}', digest) is None):
            raise ValueError('Unsafe/duplicate/malformed manifest entry')
        entries = {**entries, name: entry}
        names = names | {name.casefold()}
    required = REQUIRED | (frozenset(SAMPLES) if with_samples else frozenset())
    if not required <= entries.keys():
        raise ValueError('Incomplete Mono payload: ' + ', '.join(sorted(required - entries.keys())))
    directories = {parent.as_posix() for name in entries for parent in PurePosixPath(name).parents
                   if parent != PurePosixPath('.')}
    for path in ROOT.rglob('*'):
        name = path.relative_to(ROOT).as_posix()
        if (path.is_symlink() or (not path.is_dir() and not path.is_file()) or
                (path.is_dir() and name not in directories) or
                (not path.is_dir() and name not in entries and name not in RUNTIME_FILES)):
            raise ValueError('Unexpected/linked package file: ' + name)
    for name, entry in entries.items():
        path = _regular_package_file(name)
        with path.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        if digest != entry['sha256'] or path.stat().st_size != entry['size']:
            raise ValueError('Package hash/size mismatch: ' + name)
    return document


def process_start_ticks(pid):
    try:
        text = Path(f'/proc/{pid}/stat').read_text()
        ticks = text[text.rfind(')')+2:].split()[19]
        return ticks if ticks.isdigit() else None
    except (OSError, IndexError, UnicodeError):
        return None


def process_identity(pid):
    ticks = process_start_ticks(pid)
    if ticks is None:
        return None
    try:
        command = Path(f'/proc/{pid}/cmdline').read_bytes().split(b'\0')
        if len(command) < 2 or Path(os.fsdecode(command[0])).name != 'mono':
            return None
        return ticks, str(Path(os.fsdecode(command[1])).resolve())
    except (OSError, ValueError):
        return None


def _valid_state(state):
    return (isinstance(state, dict) and set(state) == {'pid', 'start_ticks', 'executable'} and
            type(state['pid']) is int and 0 < state['pid'] <= 2147483647 and
            isinstance(state['start_ticks'], str) and state['start_ticks'].isdigit() and
            int(state['start_ticks']) > 0 and state['executable'] == str(executable()))


def is_owned(state):
    return (_valid_state(state) and
            process_identity(state['pid']) == (state['start_ticks'], str(executable())))


def _read_session(session):
    try:
        descriptor = os.open(session, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except FileNotFoundError:
        raise ValueError('No session file; client is not managed here') from None
    except OSError as error:
        raise ValueError('Cannot open session file; links are refused') from error
    with os.fdopen(descriptor) as source:
        info = os.fstat(source.fileno())
        if not stat.S_ISREG(info.st_mode):
            raise ValueError('Session must be a regular file')
        try:
            state = json.loads(source.read(4097))
        except (UnicodeError, json.JSONDecodeError) as error:
            raise ValueError('Session is pending or malformed; no signal sent') from error
    if not _valid_state(state):
        raise ValueError('Malformed or foreign session; no signal sent')
    return state, (info.st_dev, info.st_ino)


def read_state(session):
    return _read_session(session)[0]


def _remove_reservation(session, identity):
    try:
        info = session.lstat()
        if (info.st_dev, info.st_ino) == identity:
            session.unlink()
    except FileNotFoundError:
        pass


def stop(session):
    state, reservation = _read_session(session)
    try:
        descriptor = os.pidfd_open(state['pid'])
    except ProcessLookupError:
        raise ValueError('PID is stale; no signal sent') from None
    try:
        if not is_owned(state):
            raise ValueError('PID is stale/unrelated; no signal sent')
        signal.pidfd_send_signal(descriptor, signal.SIGTERM)
    finally:
        os.close(descriptor)
    _remove_reservation(session, reservation)
    print('STOP sent to owned client only; prefer window X for media cleanup.')


def child_environment(address, allow_http, samples):
    env = {k: v for k, v in os.environ.items() if not k.startswith('WILDVN_')}
    if address is not None:
        env['WILDVN_API_BASE_URL'] = address
    if allow_http:
        env['WILDVN_ALLOW_LOOPBACK_HTTP'] = '1'
    if samples is not None:
        for kind, name in [('IMAGE', 'image.jpg'), ('VIDEO', 'video.mp4'), ('AUDIO', 'audio.wav')]:
            env[f'WILDVN_POC_{kind}_PATH'] = str(samples/name)
    return env


def _cleanup_child(process, descriptor, ticks):
    if process.poll() is not None:
        process.wait()
        return
    if descriptor is None or ticks is None or process_start_ticks(process.pid) != ticks:
        raise ValueError('Cannot safely stop launched child; no unrelated PID signalled')
    signal.pidfd_send_signal(descriptor, signal.SIGTERM)
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        if process_start_ticks(process.pid) != ticks:
            raise ValueError('Child identity changed; no further signal sent') from None
        signal.pidfd_send_signal(descriptor, signal.SIGKILL)
        process.wait(timeout=5)


def _launch_verified_child(output, env):
    process = subprocess.Popen(['mono', str(executable())], cwd=ROOT, env=env,
        stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
    return process


def _write_state(output, state):
    json.dump(state, output)
    output.flush()
    os.fsync(output.fileno())


def start(session, address, allow_http, with_samples):
    if not os.environ.get('DISPLAY'):
        raise ValueError('No DISPLAY; run in an X11 desktop terminal')
    descriptor = os.open(session, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    info = os.fstat(descriptor)
    reservation = (info.st_dev, info.st_ino)
    process, child_descriptor, ticks = None, None, None
    published = False
    try:
        with os.fdopen(descriptor, 'w') as state_output:
            verify_package(with_samples)
            # Probe support before starting: PID-based terminate/kill is never a fallback.
            probe = os.pidfd_open(os.getpid())
            os.close(probe)
            env = child_environment(address, allow_http, ROOT/'samples' if with_samples else None)
            flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND | os.O_NOFOLLOW
            with os.fdopen(os.open(ROOT/'client.log', flags, 0o600), 'ab') as output:
                process = _launch_verified_child(output, env)
            ticks = process_start_ticks(process.pid)
            try:
                child_descriptor = os.pidfd_open(process.pid)
            except OSError:
                if ticks is not None:
                    _write_state(state_output, {'pid': process.pid, 'start_ticks': ticks,
                                               'executable': str(executable())})
                raise
            state = _wait_for_identity(process, ticks)
            if session.lstat().st_ino != reservation[1] or session.lstat().st_dev != reservation[0]:
                raise ValueError('Session reservation changed while launching')
            _write_state(state_output, state)
            published = True
        print(json.dumps(state))
    finally:
        try:
            if not published:
                if process is not None:
                    _cleanup_child(process, child_descriptor, ticks)
                _remove_reservation(session, reservation)
        finally:
            if child_descriptor is not None:
                os.close(child_descriptor)


def _wait_for_identity(process, ticks):
    for _ in range(50):
        identity = process_identity(process.pid)
        if identity == (ticks, str(executable())):
            return {'pid': process.pid, 'start_ticks': ticks, 'executable': str(executable())}
        if process.poll() is not None:
            raise RuntimeError('Client exited; see client.log')
        time.sleep(.02)
    raise RuntimeError('Could not verify child identity')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('check', 'start', 'status', 'stop'))
    parser.add_argument('--api-url')
    parser.add_argument('--allow-loopback-http', action='store_true')
    parser.add_argument('--with-samples', action='store_true')
    args = parser.parse_args()
    session = ROOT/'.review-session.json'
    try:
        if args.action == 'check':
            verify_package(args.with_samples)
            print('Mono package hashes verified; manifest is unsigned.')
        elif args.action == 'start':
            start(session, args.api_url, args.allow_loopback_http, args.with_samples)
        elif args.action == 'stop':
            stop(session)
        else:
            state = read_state(session)
            print(json.dumps({**state, 'owned_running': is_owned(state)}))
    except (ValueError, OSError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
