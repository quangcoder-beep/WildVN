"""Union Coverlet source lines; never infer coverage for absent production files."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET


def counts(lines):
    covered = sum(lines.values())
    total = len(lines)
    return {'covered': covered, 'total': total,
            'percent': round(100 * covered / total, 2) if total else 0.0}


def branch_counts(branches):
    covered = sum(value[0] for value in branches.values())
    total = sum(value[1] for value in branches.values())
    return {'covered': covered, 'total': total,
            'percent': round(100 * covered / total, 2) if total else 100.0}


def resolve_source(filename, sources, root):
    for base in [*sources, str(root)]:
        candidate = (Path(base) / filename).resolve()
        if candidate.is_relative_to(root / 'src') and candidate.is_file():
            return candidate
    return None


def summarize(reports, root):
    root = root.resolve()
    lines, branches, unlocated = {}, {}, {}
    for report in reports:
        document = ET.parse(report).getroot()
        sources = [node.text for node in document.findall('sources/source') if node.text]
        raw_branches, identities = [], []
        for item in document.findall('.//class'):
            for node in item.findall('lines/line'):
                match = re.search(r'\((\d+)/(\d+)\)', node.get('condition-coverage', ''))
                if match:
                    raw_branches.append(tuple(map(int, match.groups())))
            source = resolve_source(item.attrib['filename'], sources, root)
            if source is None or {'obj', 'bin'} & set(source.relative_to(root).parts):
                continue
            name = source.relative_to(root).as_posix()
            identities.append((name, item.get('name', '')))
            for line in item.findall('lines/line'):
                key = (name, int(line.attrib['number']))
                lines[key] = lines.get(key, False) or int(line.attrib['hits']) > 0
                if line.get('branch', '').lower() == 'true':
                    match = re.search(r'\((\d+)/(\d+)\)', line.attrib['condition-coverage'])
                    if match is None:
                        raise ValueError('Missing branch counts; cannot certify coverage')
                    covered, total = map(int, match.groups())
                    branch = (name, item.get('name', ''), key[1])
                    previous = branches.get(branch, (0, total))
                    if previous[1] != total:
                        raise ValueError('Conflicting branch denominators across reports')
                    branches[branch] = (max(previous[0], covered), total)
        if 'branches-valid' in document.attrib:
            covered = int(document.attrib['branches-covered']) - sum(pair[0] for pair in raw_branches)
            total = int(document.attrib['branches-valid']) - sum(pair[1] for pair in raw_branches)
            if covered < 0 or total < covered:
                raise ValueError('Inconsistent Coverlet root/line branch counts')
            if total:
                key = tuple(sorted(identities))
                previous = unlocated.get(key, (0, total))
                if not key or previous[1] != total:
                    raise ValueError('Unresolved or conflicting root-only branch group')
                unlocated[key] = (max(previous[0], covered), total)
    return result_from_counts(lines, branches, unlocated, root)


def result_from_counts(lines, branches, unlocated, root):
    files = {}
    for name in sorted({key[0] for key in lines}):
        files[name] = {**counts({key: value for key, value in lines.items() if key[0] == name}),
                       'branches': branch_counts({key: value for key, value in branches.items() if key[0] == name})}
    production = {path.relative_to(root).as_posix() for path in (root / 'src').rglob('*.cs')
                  if not {'obj', 'bin'} & set(path.relative_to(root / 'src').parts)}
    unmeasured = sorted(production - files.keys())
    measured = counts(lines)
    passes = bool(files) and all(value['percent'] >= 80 and
                                (not value['branches']['total'] or value['branches']['percent'] >= 80)
                                for value in files.values()) and all(branch_counts({key: value})['percent'] >= 80
                                                                  for key, value in unlocated.items())
    return {'measured': measured, 'branches': branch_counts({**branches, **unlocated}),
            'unlocated_branch_groups': [{'classes': [list(item) for item in key], **branch_counts({key: value})}
                                       for key, value in unlocated.items()], 'files': files, 'unmeasured': unmeasured,
            'measured_gate': 'PASS' if passes else 'FAIL',
            'full_gate': ('CHƯA KIỂM CHỨNG' if unmeasured else 'PASS') if passes else 'FAIL',
            'metric': 'Executable C# source lines; duplicate reports merged by source/line. '
                      'Branch lower bound uses max covered count per class/line across reports, never assumes '
                      'distinct hits for partial reports. Root-only async branch groups are retained and '
                      'deduplicated by class set; no per-file attribution is invented. XAML/device behavior is not inferred.'}
