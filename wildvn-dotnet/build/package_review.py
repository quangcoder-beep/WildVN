"""Build local review ZIPs from publish output; never copy checkout/config trees."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FLAVOURS = ('mono-net472', 'win-x64')
PRIVATE = re.compile(r'oauth|credential|secret|token|^\.env', re.I)


def allowed(name):
    if not isinstance(name, str) or ':' in name or any(p in ('', '.', '..') for p in name.split('/')):
        return False
    for part in name.split('/'):
        if (not re.fullmatch(r'[A-Za-z0-9_.-]+', part) or part.endswith('.') or
                re.match(r'^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)', part, re.I)):
            return False
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or '\\' in name:
        return False
    if any(PRIVATE.search(part) or part in ('obj', 'bin') for part in path.parts):
        return False
    if name in ('WildVN.Desktop.exe', 'createdump.exe', 'WildVN.Desktop.exe.config', 'WildVN.Desktop.dll.config',
                'WildVN.Desktop.deps.json', 'WildVN.Desktop.runtimeconfig.json',
                'LibVLCSharp.dll.config', 'Media/Assets/media-poc.html',
                'LICENSE.txt', 'ThirdPartyNotices.txt', 'NOTICE.md',
                'review_client.py', 'Review-Windows.ps1', 'Install-WindowsReview.ps1',
                'Start-InstalledReview.ps1', 'Verify-WindowsReview.py', 'samples/image.jpg',
                'samples/video.mp4', 'samples/audio.wav'):
        return True
    if len(path.parts) == 1 and path.suffix.lower() == '.dll':
        return True
    if len(path.parts) == 2 and re.fullmatch(r'[a-z]{2}(-[A-Za-z]{2,4})?', path.parts[0]) and path.name.endswith('.resources.dll'):
        return True
    return (path.parts[:2] == ('libvlc', 'win-x64') and
            (path.suffix.lower() == '.dll' or name == 'libvlc/win-x64/plugins/plugins.dat'))


def payload_files(root, flavour):
    if flavour not in FLAVOURS or any(p.is_symlink() for p in (root, *root.parents)):
        raise ValueError('Unsupported package/root')
    files = []
    for path in sorted(root.rglob('*')):
        name = path.relative_to(root).as_posix()
        if path.is_symlink():
            raise ValueError('Symlink in package: ' + name)
        if path.is_dir():
            if any(PRIVATE.search(part) or part in ('bin', 'obj') for part in path.relative_to(root).parts):
                raise ValueError('Private directory in package')
            continue
        if name in ('manifest.json', 'client.log', '.review-session.json'):
            continue
        if not allowed(name):
            raise ValueError('Unexpected package file: ' + name)
        files.append(name)
    required = {'WildVN.Desktop.exe', 'LibVLCSharp.dll', 'WildVN.ApiClient.dll', 'WildVN.Contracts.dll'}
    if flavour == 'win-x64':
        required |= {'WildVN.Desktop.dll', 'coreclr.dll', 'System.Windows.Forms.dll',
                     'WildVN.Desktop.deps.json', 'WildVN.Desktop.runtimeconfig.json',
                     'libvlc/win-x64/libvlc.dll', 'libvlc/win-x64/libvlccore.dll'}
        if not any(n.startswith('libvlc/win-x64/plugins/') and n.endswith('.dll') for n in files):
            raise ValueError('Missing native VLC plugins')
    if not required <= set(files):
        raise ValueError('Incomplete payload: ' + ', '.join(sorted(required - set(files))))
    return files


def manifest(root, names, flavour, revision):
    return {'schema': 1, 'flavour': flavour, 'source_revision': revision,
            'signed': False, 'windows_execution': 'CHƯA KIỂM CHỨNG',
            'native_windows': 'VideoLAN.LibVLC.Windows 3.0.24' if flavour == 'win-x64' else None,
            'files': [{'path': n, 'size': (root/n).stat().st_size,
                       'sha256': file_hash(root/n)}
                      for n in sorted(names)]}


def file_hash(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def verify(root, document):
    if document.get('schema') != 1 or document.get('flavour') not in FLAVOURS:
        raise ValueError('Unsupported manifest schema/flavour')
    entries = document.get('files')
    if not isinstance(entries, list) or not entries:
        raise ValueError('Empty/malformed manifest')
    names = [e.get('path') for e in entries if isinstance(e, dict)]
    if len(names) != len(entries) or any(not allowed(n) for n in names):
        raise ValueError('Unsafe manifest path')
    if len({n.casefold() for n in names}) != len(names):
        raise ValueError('Duplicate manifest path')
    actual = payload_files(root, document['flavour'])
    if set(names) != set(actual):
        raise ValueError('Manifest inventory mismatch')
    for entry in document['files']:
        name = entry['path']
        if not allowed(name) or (root/name).is_symlink() or not (root/name).resolve().is_relative_to(root.resolve()):
            raise ValueError('Unsafe manifest path')
        with (root/name).open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        if not isinstance(entry.get('size'), int) or isinstance(entry['size'], bool) or entry['size'] < 0:
            raise ValueError('Invalid manifest size')
        if not isinstance(entry.get('sha256'), str) or not re.fullmatch(r'[0-9a-f]{64}', entry['sha256']):
            raise ValueError('Invalid manifest hash')
        if digest != entry['sha256'] or (root/name).stat().st_size != entry['size']:
            raise ValueError('Package hash/size mismatch: ' + name)


def write_archive(root, document, output):
    verify(root, document)
    with output.open('xb') as stream, zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED) as archive:
        content = json.dumps(document, ensure_ascii=False, indent=2).encode() + b'\n'
        for name in ['manifest.json'] + [e['path'] for e in document['files']]:
            item = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            item.compress_type = zipfile.ZIP_DEFLATED
            item.external_attr = 0o100644 << 16
            if name == 'manifest.json':
                archive.writestr(item, content)
            else:
                with (root/name).open('rb') as source, archive.open(item, 'w') as target:
                    shutil.copyfileobj(source, target)


def run(arguments):
    print('+ ' + ' '.join(map(str, arguments)), flush=True)
    subprocess.run(list(map(str, arguments)), cwd=ROOT, check=True)


def stage(publish, destination):
    # Only generated publish output; PDBs and unused x86 native binaries are omitted.
    for path in sorted(publish.rglob('*')):
        name = path.relative_to(publish).as_posix()
        if path.is_symlink():
            raise ValueError('Symlink in publish output')
        if path.is_dir() or name.endswith('.pdb') or name.startswith('libvlc/win-x86/'):
            continue
        if not allowed(name):
            raise ValueError('Unexpected publish file: ' + name)
        target = destination/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)


def provenance():
    paths = [p for p in (ROOT/'src').rglob('*') if p.suffix in ('.cs', '.csproj')
             and not {'bin', 'obj'} & set(p.relative_to(ROOT).parts)]
    paths += [ROOT/n for n in ('Directory.Build.props', 'global.json', 'build/IsExternalInit.cs',
                              'build/LibVLCSharp.dll.config', 'build/package_review.py',
                              'build/review_client.py', 'build/Review-Windows.ps1', 'build/NOTICE.md',
                              'src/WildVN.Desktop/Media/Assets/media-poc.html',
                              'build/prepare-media-fixture.sh', 'build/Install-WindowsReview.ps1',
                              'build/Start-InstalledReview.ps1', 'build/Verify-WindowsReview.py')]
    return {p.relative_to(ROOT).as_posix(): file_hash(p) for p in sorted(paths)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dotnet', default='dotnet')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    # Existing repository media only; ffmpeg extraction retains source hash in its log.
    run(['bash', ROOT/'build/prepare-media-fixture.sh'])
    for flavour in FLAVOURS:
        publish, payload = args.output/('publish-'+flavour), args.output/flavour
        payload.mkdir()
        command = [args.dotnet, 'publish', ROOT/'src/WildVN.Desktop/WildVN.Desktop.csproj',
                   '-c', 'Release', '-f', 'net472' if flavour == 'mono-net472' else 'net10.0-windows',
                   '--nologo', '-o', publish]
        if flavour == 'win-x64':
            command += ['-r', 'win-x64', '--self-contained', 'true', '-p:PlatformTarget=x64',
                        '-p:PublishTrimmed=false', '-p:PublishSingleFile=false',
                        '-p:VlcWindowsX86Enabled=false', '-p:VlcWindowsArm64Enabled=false']
        run(command)
        stage(publish, payload)
        for name in ('review_client.py', 'Review-Windows.ps1', 'NOTICE.md'):
            shutil.copyfile(ROOT/'build'/name, payload/name)
        if flavour == 'win-x64':
            for name in ('Install-WindowsReview.ps1', 'Start-InstalledReview.ps1', 'Verify-WindowsReview.py'):
                shutil.copyfile(ROOT/'build'/name, payload/name)
        samples = payload/'samples'; samples.mkdir()
        for source, name in [(ROOT.parent/'wildvn-client/public/videos/home/hero-loop-poster.jpg', 'image.jpg'),
                             (ROOT.parent/'wildvn-client/public/videos/home/hero-loop.mp4', 'video.mp4'),
                             (ROOT/'TestResults/winforms-wf02/derived-audio.wav', 'audio.wav')]:
            if source.is_symlink(): raise ValueError('Linked media fixture')
            shutil.copyfile(source, samples/name)
        document = manifest(payload, payload_files(payload, flavour), flavour, revision)
        document = {**document, 'source_revision_is_base': True, 'source_tree_status': subprocess.check_output(
            ['git', 'status', '--porcelain', '--untracked-files=normal'], cwd=ROOT, text=True).splitlines(),
            'source_files_sha256': provenance()}
        write_archive(payload, document, args.output/(flavour+'.zip'))
        (payload/'manifest.json').write_text(json.dumps(document, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        print(f'PACKAGE {flavour}: {len(document["files"])} files; unsigned; Windows execution CHƯA KIỂM CHỨNG', flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
