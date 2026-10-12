import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(__dirname, "..");
const readClientFile = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

test("chat submission does not use a global form selector", () => {
  const panel = readClientFile("app/_shared/components/ai-chat/AIChatPanel.tsx");

  assert.doesNotMatch(panel, /document\.querySelector\(['"]form['"]\)/);
});

test("chat store persists only non-expired local history", () => {
  const store = readClientFile("app/_shared/stores/aiChatStore.ts");

  assert.match(store, /localStorage/);
  assert.match(store, /expiresAt/);
  assert.match(store, /5\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
});

test("chat API keeps an optional session id and citations in its response contract", () => {
  const api = readClientFile("app/_shared/services/api.ts");

  assert.match(api, /sessionId/);
  assert.match(api, /citations/);
});
