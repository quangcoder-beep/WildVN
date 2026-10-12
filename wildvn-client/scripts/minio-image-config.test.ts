import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_MINIO_URL,
  getMinioRemotePattern,
  isPrivateMinioHostname,
  shouldAllowLocalMinio,
} from "../app/_shared/lib/minio-config";

test("builds a remote pattern from the local MinIO URL and preserves the bucket path", () => {
  assert.deepEqual(getMinioRemotePattern(DEFAULT_MINIO_URL), {
    protocol: "http",
    hostname: "localhost",
    port: "9000",
    pathname: "/wildvn/**",
  });
});

test("builds a remote pattern from a public HTTPS MinIO URL", () => {
  assert.deepEqual(getMinioRemotePattern("https://storage.wildvn.vn/wildvn/"), {
    protocol: "https",
    hostname: "storage.wildvn.vn",
    port: "",
    pathname: "/wildvn/**",
  });
});

test("recognizes loopback and private IP hosts without treating public domains as local", () => {
  assert.equal(isPrivateMinioHostname("localhost"), true);
  assert.equal(isPrivateMinioHostname("127.0.0.1"), true);
  assert.equal(isPrivateMinioHostname("192.168.1.25"), true);
  assert.equal(isPrivateMinioHostname("10.0.0.12"), true);
  assert.equal(isPrivateMinioHostname("storage.wildvn.vn"), false);
});

test("allows local MinIO only outside production", () => {
  assert.equal(shouldAllowLocalMinio("http://localhost:9000/wildvn", "development"), true);
  assert.equal(shouldAllowLocalMinio("http://localhost:9000/wildvn", "production"), false);
  assert.equal(shouldAllowLocalMinio("https://storage.wildvn.vn/wildvn", "development"), false);
});
