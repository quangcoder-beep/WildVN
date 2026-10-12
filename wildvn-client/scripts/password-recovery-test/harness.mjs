import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = new URL('../../', import.meta.url);

export function compile(relativePath, globals = {}, imports = {}) {
  const file = new URL(relativePath, root);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    fileName: file.pathname,
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: name => name in imports ? imports[name] : require(name),
    URL, AbortController, DOMException, TextEncoder, setTimeout, clearTimeout,
    process: { env: { NEXT_PUBLIC_API_BASE_URL: 'http://localhost:9876' } },
    ...globals,
  }, { filename: file.pathname });
  return exports;
}

export function service(fetch, globals = {}) {
  return compile('app/(auth)/_services/passwordRecovery.ts', { fetch, ...globals });
}

export const accepted = { success: true, message: 'Accepted' };
export const response = (body = accepted, status = 200) => ({
  ok: status >= 200 && status < 300, status, json: async () => body,
});

export function abortedFetch(_url, options) {
  return new Promise((_, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (options.signal.aborted) abort();
    else options.signal.addEventListener('abort', abort, { once: true });
  });
}

// Executes actual page handlers/effects with deterministic hook state. The browser
// suite separately checks DOM, real React effects, focus and StrictMode behavior.
export function pageHarness(path, recovery, store = { setState() {} }) {
  let cursor = 0;
  const slots = [];
  const effects = [];
  const listeners = new Map();
  const location = { hash: `#token=${'a'.repeat(43)}`, pathname: '/reset-password', search: '' };
  const window = {
    location,
    history: { state: {}, replaceState() { location.hash = ''; } },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
  };
  const hooks = {
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: initial };
      return [slots[index].value, value => { slots[index].value = value; }];
    },
    useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
    useEffect(callback, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((item, offset) => item !== previous[offset])) effects.push(callback);
      slots[index] = deps;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const component = () => null;
  const components = new Proxy({}, { get: () => component });
  const imports = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/link': { default: component }, 'lucide-react': components,
    '@/app/_shared/stores/authStore': { useAuthStore: store },
    '../_services/passwordRecovery': recovery,
    '../_components/AuthBackground': components, '../_components/AuthPanel': components,
    '../_components/AuthInput': components, '../_components/AuthButton': components,
    '../_components/PasswordStrengthBar': components,
  };
  const Page = compile(path, { window }, imports).default;
  const render = () => { cursor = 0; const tree = Page(); while (effects.length) effects.shift()(); return tree; };
  const find = (tree, predicate) => {
    if (!tree || typeof tree !== 'object') return null;
    if (predicate(tree)) return tree;
    for (const child of [tree.props?.children].flat(Infinity)) {
      const found = find(child, predicate); if (found) return found;
    }
    return null;
  };
  return { render, find, location, hashchange: () => listeners.get('hashchange')?.(), slots };
}
