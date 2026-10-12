import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";

const clientRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
const componentPath = resolve(
  clientRoot,
  "app/(auth)/_components/SocialAuthButtons.tsx",
);

test("social auth buttons target the Spring OAuth registrations", () => {
  const source = readFileSync(componentPath, "utf8");

  assert.doesNotMatch(source, /return null/);
  assert.match(source, /NEXT_PUBLIC_API_BASE_URL/);
  assert.match(source, /oauth2\/authorization\/google/);
  assert.match(source, /oauth2\/authorization\/facebook/);
  assert.match(source, /label:\s*"Google"/);
  assert.match(source, /label:\s*"Facebook"/);
});
