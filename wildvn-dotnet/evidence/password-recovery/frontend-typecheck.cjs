const ts = require(process.cwd() + '/node_modules/typescript');
const options = { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
  lib: ['lib.dom.d.ts', 'lib.dom.iterable.d.ts', 'lib.esnext.d.ts'],
  strict: true, skipLibCheck: true, noEmit: true, esModuleInterop: true,
  baseUrl: process.cwd(), paths: { '@/*': ['./*'] } };
const roots = ['app/(auth)/forgot-password/page.tsx', 'app/(auth)/reset-password/page.tsx',
  'app/(auth)/_services/passwordRecovery.ts', 'node_modules/next/types/global.d.ts'];
const program = ts.createProgram(roots, options);
const diagnostics = ts.getPreEmitDiagnostics(program);
process.stdout.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: p => p, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n'
}));
process.stdout.write(JSON.stringify({ kind: 'scoped-semantic-TypeScript-compiler', roots, diagnostics: diagnostics.length }) + '\n');
process.exitCode = diagnostics.length ? 1 : 0;
