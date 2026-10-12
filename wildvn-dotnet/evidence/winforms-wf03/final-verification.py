"""Final deferred checks. Each process has a bound and its actual exit is retained."""
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
PW=ROOT/'TestResults/tooling/powershell-7.6.6/pwsh'
commands=[('completion-install-tests',['-NoProfile','-File','tests/install_windows_test.ps1'])]
for name,args in commands:
    with (OUT/(name+'.txt')).open('x') as log:
        log.write('COMMAND '+repr([str(PW),*args])+'\n');log.flush()
        try:
            result=subprocess.run([str(PW),*args],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,timeout=60)
            log.write(f'\nEXIT_CODE={result.returncode}\n')
        except subprocess.TimeoutExpired:
            log.write('\nTIMEOUT=60seconds\n');raise
    if result.returncode:
        print((OUT/(name+'.txt')).read_text()[-6000:]);raise SystemExit(result.returncode)
    print(name+' PASS',flush=True)
