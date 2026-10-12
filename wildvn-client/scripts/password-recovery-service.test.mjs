import { test } from 'node:test';
import assert from 'node:assert/strict';
import { service, response, accepted, abortedFetch } from './password-recovery-test/harness.mjs';

const signal = () => new AbortController().signal;
const rejectMessage = async (promise, text) => assert.rejects(promise, error => error.name === 'PasswordRecoveryError' && error.message.includes(text));

test('forgot posts only email, omits cookies and prevents caching/referrer/redirects', async () => {
  const calls = [];
  const api = service(async (...args) => { calls.push(args); return response(); });
  await api.requestPasswordRecovery('alice@example.test', signal());
  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.equal(url, 'http://localhost:9876/api/auth/forgot-password');
  assert.equal(options.method, 'POST');
  assert.deepEqual(JSON.parse(options.body), { email: 'alice@example.test' });
  assert.equal(options.credentials, 'omit');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers['Content-Type'], 'application/json');
});

test('reset posts token/password and includes cookies to accept server cookie deletion', async () => {
  let call;
  const api = service(async (...args) => { call = args; return response(); });
  await api.resetPassword('a'.repeat(43), 'new password', signal());
  assert.equal(call[0], 'http://localhost:9876/api/auth/reset-password');
  assert.equal(call[1].credentials, 'include');
  assert.deepEqual(JSON.parse(call[1].body), { token: 'a'.repeat(43), password: 'new password' });
});

for (const body of [null, {}, { success: false, message: 'server says no' }, { success: 'true', message: 'bad' }, { success: true }, { success: true, message: 12 }]) {
  test(`HTTP 200 rejects invalid success envelope ${JSON.stringify(body)}`, async () => {
    const api = service(async () => response(body));
    await rejectMessage(api.requestPasswordRecovery('a@example.test', signal()), 'phản hồi không hợp lệ');
  });
}

test('malformed JSON cannot produce a successful result or expose response text', async () => {
  const api = service(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('secret server content'); } }));
  await assert.rejects(api.requestPasswordRecovery('a@example.test', signal()), error => !error.message.includes('secret') && error.name === 'PasswordRecoveryError');
});

for (const [status, action, text] of [[400, 'requestPasswordRecovery', 'địa chỉ email'], [400, 'resetPassword', 'đã được sử dụng'], [429, 'requestPasswordRecovery', 'quá nhiều'], [503, 'requestPasswordRecovery', 'chưa khả dụng'], [500, 'requestPasswordRecovery', 'Không thể xử lý']]) {
  test(`${status} ${action} maps to safe error without parsing raw response`, async () => {
    let calls = 0;
    const api = service(async () => { calls++; return { ...response(accepted, status), json() { throw new Error('Must not parse raw errors'); } }; });
    const args = action === 'resetPassword' ? ['a'.repeat(43), 'new password', signal()] : ['a@example.test', signal()];
    await rejectMessage(api[action](...args), text);
    assert.equal(calls, 1, 'No automatic retries');
  });
}

test('network failure is redacted and never retried', async () => {
  let count = 0;
  const api = service(async () => { count++; throw new Error('Internal credentials'); });
  await rejectMessage(api.requestPasswordRecovery('a@example.test', signal()), 'Không thể kết nối');
  assert.equal(count, 1);
});

test('20 second timeout aborts transport, reports timeout and removes timer/listener', async () => {
  let expire, timerDelay, cleared = false, removed = false;
  const parent = new AbortController();
  const remove = parent.signal.removeEventListener.bind(parent.signal);
  parent.signal.removeEventListener = (...args) => { removed = true; remove(...args); };
  const api = service(abortedFetch, {
    setTimeout(callback, delay) { expire = callback; timerDelay = delay; return 42; },
    clearTimeout(id) { assert.equal(id, 42); cleared = true; },
  });
  const pending = api.requestPasswordRecovery('a@example.test', parent.signal);
  assert.equal(timerDelay, 20_000);
  expire();
  await rejectMessage(pending, 'quá nhiều thời gian');
  assert.equal(cleared, true);
  assert.equal(removed, true);
});

test('parent abort before request remains AbortError', async () => {
  const parent = new AbortController(); parent.abort();
  const api = service(abortedFetch);
  await assert.rejects(api.requestPasswordRecovery('a@example.test', parent.signal), error => error.name === 'AbortError');
});

test('parent abort during request remains AbortError rather than displaying an error', async () => {
  const parent = new AbortController();
  const api = service(abortedFetch);
  const pending = api.requestPasswordRecovery('a@example.test', parent.signal);
  parent.abort();
  await assert.rejects(pending, error => error.name === 'AbortError');
});

for (const base of ['javascript:alert(1)', 'https://user:password@example.test', 'https://example.test?key=secret', 'https://example.test#token=secret', 'not a URL']) {
  test(`invalid API base is rejected before fetch (${base.split(':')[0]})`, async () => {
    let calls = 0;
    const api = service(async () => { calls++; return response(); }, { process: { env: { NEXT_PUBLIC_API_BASE_URL: base } } });
    await rejectMessage(api.requestPasswordRecovery('a@example.test', signal()), 'chưa được cấu hình');
    assert.equal(calls, 0);
  });
}
