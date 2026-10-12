"""Sequential local verification; own fixture credential is used only in memory."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'evidence/winforms-wf03'
SDK = '/tmp/wildvn-dotnet-sdk/dotnet'
sys.path.insert(0, str(ROOT/'evidence/winforms-wf01'))
from x11_owned import gui_environment
RUN = 'verify-' + uuid.uuid4().hex[:8]
ENV = {**gui_environment(), 'WILDVN_TEST_REPO': str(ROOT), 'DOTNET_ROOT': '/tmp/wildvn-dotnet-sdk',
       'DOTNET_ROLL_FORWARD': 'LatestMajor'}

def run(name, command, env=ENV):
    print(name, flush=True)
    with (OUT/(name+'.txt')).open('w') as output:
        output.write('COMMAND '+ ' '.join(command) + '\n');output.flush()
        result = subprocess.run(command, cwd=ROOT, env=env, stdout=output, stderr=subprocess.STDOUT)
        output.write(f'\nEXIT_CODE={result.returncode}\n')
    if result.returncode:
        print((OUT/(name+'.txt')).read_text()[-4000:], flush=True)
        raise RuntimeError(name+' failed')

run('build-api', [SDK,'build','src/WildVN.Api/WildVN.Api.csproj','-c','Release','--nologo'])
run('build-desktop', [SDK,'build','src/WildVN.Desktop/WildVN.Desktop.csproj','-c','Release','--nologo'])
for project in ('WildVN.Api.Tests','WildVN.ApiClient.Tests','WildVN.Desktop.Tests'):
    directory = ROOT/'TestResults/winforms-wf03'/RUN/project
    command=[SDK,'test',f'tests/{project}/{project}.csproj','-c','Release','--nologo',
             '--collect:XPlat Code Coverage','--results-directory',str(directory),
             '--logger','trx;LogFileName=tests.trx','--',
             'DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Include=[WildVN.*]*']
    if project=='WildVN.Desktop.Tests':
        command += ['DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.IncludeTestAssembly=true',
                    'DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.ExcludeByFile=**/*Tests.cs']
    run(project,command)
    reports=list(directory.glob('*/coverage.cobertura.xml'))
    assert len(reports)==1
    shutil.copyfile(reports[0], OUT/(project+'-coverage.xml'))
    shutil.copyfile(directory/'tests.trx', OUT/(project+'.trx'))
run('build-mono-tests',[SDK,'build','tests/WildVN.WinForms.Tests/WildVN.WinForms.Tests.csproj','-c','Release','--nologo'])
run('compile-coverage-wrapper',['mcs','-out:TestResults/winforms-wf03/RunWithCoverageFlush.exe','build/RunWithCoverageFlush.cs'])
run('mono-coverage', ['TestResults/winforms-tools/coverlet',
    'tests/WildVN.WinForms.Tests/bin/Release/net472/WildVN.WinForms.Tests.exe',
    '--target','mono','--targetargs',
    'TestResults/winforms-wf03/RunWithCoverageFlush.exe tests/WildVN.WinForms.Tests/bin/Release/net472/WildVN.WinForms.Tests.exe --workers=0 --result=evidence/winforms-wf03/mono-tests.xml',
    '--format','cobertura','--output','evidence/winforms-wf03/mono-coverage.xml','--include','[WildVN.*]*'])
run('exe-coverage',['TestResults/winforms-tools/coverlet','src/WildVN.Desktop/bin/Release/net472/WildVN.Desktop.exe',
    '--target','python3','--targetargs','evidence/winforms-wf03/exe_coverage_smoke.py',
    '--format','cobertura','--output','evidence/winforms-wf03/exe-coverage.xml',
    '--include','[WildVN.*]*','--include-test-assembly'])
# Inspect only the PostgreSQL container created by this review session, never project configuration.
container=json.loads(subprocess.check_output(['docker','inspect','wildvn-p0-f56efb2cc671']))[0]
port=container['NetworkSettings']['Ports']['5432/tcp'][0]
assert port['HostIp']=='127.0.0.1'
settings=dict(x.split('=',1) for x in container['Config']['Env'] if '=' in x)
uri=f"postgresql://fixture:{quote(settings['POSTGRES_PASSWORD'],safe='')}@127.0.0.1:{port['HostPort']}/wildvn_fixture_source"
run('python-tests', ['/tmp/wildvn-p0-tools/bin/python','-m','coverage','run','--append','--branch','--source=build',
    '-m','unittest','discover','-s','tests','-p','*_test.py','-v'],{**ENV,'WILDVN_FIXTURE_CONNECTION':uri})
spec=importlib.util.spec_from_file_location('cov',ROOT/'handover/coverage_report.py')
cov=importlib.util.module_from_spec(spec);spec.loader.exec_module(cov)
reports=[OUT/(p+'-coverage.xml') for p in ('WildVN.Api.Tests','WildVN.ApiClient.Tests','WildVN.Desktop.Tests')]
summary=cov.summarize(reports+[OUT/'mono-coverage.xml',OUT/'exe-coverage.xml'],ROOT)
(OUT/'coverage-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
assert summary['measured_gate']=='PASS'
print(json.dumps({k:summary[k] for k in ('measured','branches','measured_gate','full_gate','unmeasured')},ensure_ascii=False),flush=True)
