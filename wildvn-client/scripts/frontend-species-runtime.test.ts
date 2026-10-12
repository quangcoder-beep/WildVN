import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";

const clientRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
const readClientFile = (relativePath: string) =>
  readFileSync(resolve(clientRoot, relativePath), "utf8");

test("species detail has no offline mock and uses the Spring API", () => {
  const page = readClientFile("app/species/[slug]/page.tsx");

  assert.doesNotMatch(page, /SAOLA_MOCK/);
  assert.doesNotMatch(page, /upload\.wikimedia\.org/);
  assert.match(page, /speciesApi\.getSpeciesDetail\(slug\)/);
  assert.match(page, /notFound\(\)/);
});

test("homepage species fan does not ship a species image fallback", () => {
  const fan = readClientFile("app/(home)/_components/Home/SpeciesFan.tsx");

  assert.doesNotMatch(fan, /upload\.wikimedia\.org/);
  assert.match(fan, /getImageUrl\(s\.thumbnailUrl \|\| mediaUrl\)/);
});

test("homepage species cards link to the encoded database slug", () => {
  const fan = readClientFile("app/(home)/_components/Home/SpeciesFan.tsx");

  assert.match(fan, /import Link from ["']next\/link["']/);
  assert.match(fan, /href=\{`\/species\/\$\{encodeURIComponent\(slug\)\}`\}/);
  assert.match(fan, /aria-label=\{`Mở hồ sơ/);
});

test("species search hero does not ship a hardcoded animal", () => {
  const searchClient = readClientFile("app/search/_components/SearchClient.tsx");

  assert.doesNotMatch(searchClient, /upload\.wikimedia\.org/);
  assert.doesNotMatch(searchClient, /Sao La - Kỳ lân Việt Nam/);
  assert.match(searchClient, /speciesApi\.getFeaturedSpecies\(\)/);
});

test("Next image allowlist is derived from the MinIO environment variable", () => {
  const nextConfig = readClientFile("next.config.ts");

  assert.doesNotMatch(nextConfig, /wikimedia|unsplash|inaturalist|nmnh|data\.nhm/);
  assert.match(nextConfig, /NEXT_PUBLIC_MINIO_URL/);
  assert.match(nextConfig, /getMinioRemotePattern/);
  assert.match(nextConfig, /dangerouslyAllowLocalIP/);
});

test("species data has no Next.js Prisma route handlers", () => {
  assert.equal(existsSync(resolve(clientRoot, "app/api/species/route.ts")), false);
  assert.equal(existsSync(resolve(clientRoot, "app/api/species/featured/route.ts")), false);
  assert.equal(existsSync(resolve(clientRoot, "app/api/species/[slug]/route.ts")), false);
});
