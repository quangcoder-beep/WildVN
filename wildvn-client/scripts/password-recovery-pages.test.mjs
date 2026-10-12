import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pageHarness } from './password-recovery-test/harness.mjs';

const require = createRequire(import.meta.url);
const { createStore } = require('zustand/vanilla');
const { persist, createJSONStorage } = require('zustand/middleware');
const resetPath = 'app/(auth)/reset-password/page.tsx';
const forgotPath = 'app/(auth)/forgot-password/page.tsx';
const fakeRecovery = overrides => ({
  PasswordRecoveryError: class PasswordRecoveryError extends Error {},
  PASSWORD_RESET_MESSAGE: 'Changed', RECOVERY_ACCEPTED_MESSAGE: 'Accepted',
  resetPassword: async () => {}, requestPasswordRecovery: async () => {}, ...overrides,
});
const findForm = (h, tree) => h.find(tree, node => node.type === 'form');
const enter = (h, tree, label, value) => h.find(tree, node => node.props?.['aria-label'] === label).props.onChange({ target: { value } });
const submit = form => form.props.onSubmit({ preventDefault() {} });
const setupReset = (overrides, store) => {
  const h = pageHarness(resetPath, fakeRecovery(overrides), store);
  h.render(); let tree = h.render();
  enter(h, tree, 'Mật khẩu mới', 'safe password');
  enter(h, tree, 'Xác nhận mật khẩu', 'safe password');
  return { h, tree: h.render() };
};

test('forgot trims input, blocks duplicate submits and shows success only after API resolves', async () => {
  let resolve, calls = 0, email;
  const h = pageHarness(forgotPath, fakeRecovery({ requestPasswordRecovery: async address => {
    calls++; email = address; await new Promise(done => { resolve = done; });
  } }));
  enter(h, h.render(), 'Email', ' alice@example.test ');
  const form = findForm(h, h.render());
  const pending = submit(form);
  await submit(form);
  assert.equal(calls, 1);
  assert.equal(email, 'alice@example.test');
  assert.equal(findForm(h, h.render()).props['aria-busy'], true);
  resolve(); await pending;
  assert.ok(h.find(h.render(), node => node.type === 'h1' && node.props.children === 'Yêu cầu đã được tiếp nhận'));
});

test('forgot rejects malformed address without contacting API', async () => {
  let calls = 0;
  const h = pageHarness(forgotPath, fakeRecovery({ requestPasswordRecovery: async () => { calls++; } }));
  enter(h, h.render(), 'Email', 'invalid');
  await submit(findForm(h, h.render()));
  assert.equal(calls, 0);
  assert.ok(h.find(h.render(), node => node.props?.role === 'alert'));
});

test('reset captures token in memory and removes it from URL before submission', async () => {
  let submitted;
  const { h, tree } = setupReset({ resetPassword: async (...args) => { submitted = args; } });
  assert.equal(h.location.hash, '');
  assert.equal(JSON.stringify(tree).includes('a'.repeat(43)), false);
  await submit(findForm(h, tree));
  assert.equal(submitted[0], 'a'.repeat(43));
  assert.equal(submitted[1], 'safe password');
  assert.ok(h.find(h.render(), node => node.type === 'h1' && node.props.children === 'Đã cập nhật mật khẩu'));
});

test('reset validates confirmation and UTF-8 byte limit before contacting API', async () => {
  let calls = 0;
  const { h, tree } = setupReset({ resetPassword: async () => { calls++; } });
  enter(h, tree, 'Xác nhận mật khẩu', 'different');
  await submit(findForm(h, h.render()));
  assert.equal(calls, 0);
  assert.match(h.find(h.render(), node => node.props?.role === 'alert').props.children, /không khớp/);
  enter(h, h.render(), 'Mật khẩu mới', '😀'.repeat(257));
  enter(h, h.render(), 'Xác nhận mật khẩu', '😀'.repeat(257));
  await submit(findForm(h, h.render()));
  assert.equal(calls, 0);
  assert.match(h.find(h.render(), node => node.props?.role === 'alert').props.children, /1024 byte/);
});

test('successful reset remains successful when persisted local auth storage throws', async () => {
  // Zustand updates memory first, then persistence can fail due to quota/privacy
  // restrictions. This uses the installed real middleware, not a simulated throw.
  const store = createStore(persist(() => ({ user: { id: 'old' }, isLoggedIn: true }), {
    name: 'test-auth', storage: createJSONStorage(() => ({
      getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem() {},
    })),
  }));
  const { h, tree } = setupReset({}, store);
  await submit(findForm(h, tree));
  assert.equal(store.getState().user, null);
  assert.equal(store.getState().isLoggedIn, false);
  assert.ok(h.find(h.render(), node => node.type === 'h1' && node.props.children === 'Đã cập nhật mật khẩu'),
    'Server reset is complete even if local storage cannot persist');
  assert.equal(findForm(h, h.render()), null, 'Used token/password cannot be resubmitted');
  assert.match(h.find(h.render(), node => node.props?.role === 'alert').props.children, /không thể lưu trạng thái đăng xuất/);
});

test('new same-document email fragment replaces old in-memory reset token', async () => {
  let submitted;
  const { h } = setupReset({ resetPassword: async token => { submitted = token; } });
  h.location.hash = `#token=${'b'.repeat(43)}`;
  h.hashchange();
  let tree = h.render();
  assert.equal(h.location.hash, '', 'Every new token fragment must be cleared from the URL');
  enter(h, tree, 'Mật khẩu mới', 'another password');
  enter(h, tree, 'Xác nhận mật khẩu', 'another password');
  await submit(findForm(h, h.render()));
  assert.equal(submitted, 'b'.repeat(43));
});

test('fragment reentry cancels pending submission and does not let stale completion overwrite new token', async () => {
  let resolve, abortedSignal, calls = 0, secondToken;
  const { h, tree } = setupReset({ resetPassword: async (token, _password, signal) => {
    calls++;
    if (calls === 1) {
      abortedSignal = signal;
      await new Promise(done => { resolve = done; });
    } else secondToken = token;
  } });
  const oldSubmission = submit(findForm(h, tree));
  assert.equal(findForm(h, h.render()).props['aria-busy'], true);
  h.location.hash = `#token=${'c'.repeat(43)}`;
  h.hashchange();
  assert.equal(abortedSignal.aborted, true);
  resolve(); await oldSubmission;
  let current = h.render();
  assert.equal(findForm(h, current).props['aria-busy'], false);
  assert.equal(h.find(current, node => node.props?.['aria-label'] === 'Mật khẩu mới').props.value, '');
  enter(h, current, 'Mật khẩu mới', 'next password');
  enter(h, current, 'Xác nhận mật khẩu', 'next password');
  await submit(findForm(h, h.render()));
  assert.equal(secondToken, 'c'.repeat(43));
});

test('new fragment after completed reset reopens a clean form', async () => {
  const { h, tree } = setupReset({});
  await submit(findForm(h, tree));
  assert.equal(findForm(h, h.render()), null);
  h.location.hash = `#token=${'d'.repeat(43)}`;
  h.hashchange();
  const current = h.render();
  assert.ok(findForm(h, current));
  assert.equal(h.find(current, node => node.props?.['aria-label'] === 'Mật khẩu mới').props.value, '');
  assert.equal(h.location.hash, '');
});

test('reset service failure keeps retry form and never shows success', async () => {
  const recovery = fakeRecovery();
  const h = pageHarness(resetPath, { ...recovery, resetPassword: async () => {
    throw new recovery.PasswordRecoveryError('Expired token');
  } });
  h.render(); const tree = h.render();
  enter(h, tree, 'Mật khẩu mới', 'safe password');
  enter(h, tree, 'Xác nhận mật khẩu', 'safe password');
  await submit(findForm(h, h.render()));
  assert.ok(findForm(h, h.render()));
  assert.equal(h.find(h.render(), node => node.props?.role === 'alert').props.children, 'Expired token');
  assert.equal(findForm(h, h.render()).props['aria-busy'], false);
});
