import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";

import {
  getSpeciesDescription,
  getAvailableFacetOptions,
  getFlashcardDeck,
  getTotalPages,
} from "../app/academy/_lib/academy-data";
import { ApiError, isUnauthorizedError } from "../app/_shared/services/api";

const clientRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
const readClientFile = (relativePath: string) => readFileSync(resolve(clientRoot, relativePath), "utf8");

test("species descriptions prefer database fields and never invent fallback copy", () => {
  assert.equal(
    getSpeciesDescription({ identificationDesc: "Nhận dạng thật", biologyDesc: "Sinh học thật" }),
    "Nhận dạng thật",
  );
  assert.equal(
    getSpeciesDescription({ identificationDesc: "", biologyDesc: "Sinh học thật", description: "Mô tả cũ" }),
    "Sinh học thật",
  );
  assert.equal(getSpeciesDescription({ description: "Mô tả cũ" }), "Mô tả cũ");
  assert.equal(getSpeciesDescription({ shortDescription: "Tóm tắt từ DB" }), "Tóm tắt từ DB");
  assert.equal(getSpeciesDescription({}), null);
});

test("facet options only expose values that have database results", () => {
  assert.deepEqual(
    getAvailableFacetOptions([
      { value: "FOREST", count: 4 },
      { value: "", count: 12 },
      { value: "WETLAND", count: 0 },
      { value: "MANGROVE", count: 2 },
    ]),
    [
      { value: "FOREST", count: 4 },
      { value: "MANGROVE", count: 2 },
    ],
  );
});

test("flashcard deck uses API species and never substitutes showcase mocks", () => {
  const species = [
    { id: 1, slug: "sao-la", name: "Sao la" },
    { id: 2, slug: "vooc-cat-ba", name: "Voọc Cát Bà" },
  ];

  assert.deepEqual(getFlashcardDeck(species, ["vooc-cat-ba"]), [species[1]]);
  assert.deepEqual(getFlashcardDeck(species, []), species);
  assert.deepEqual(getFlashcardDeck(species, ["unknown-slug"]), []);
});

test("pagination is calculated from the API total and page size", () => {
  assert.equal(getTotalPages(1176, 24), 49);
  assert.equal(getTotalPages(0, 24), 1);
  assert.equal(getTotalPages(10, 0), 1);
});

test("API errors preserve status so academy can explain an unauthenticated progress request", () => {
  assert.equal(isUnauthorizedError(new ApiError("Unauthorized", 401)), true);
  assert.equal(isUnauthorizedError(new ApiError("Forbidden", 403)), false);
  assert.equal(isUnauthorizedError(new Error("Unauthorized")), false);
});

test("academy runtime has no static expedition, quiz, or showcase data", () => {
  const academyPage = readClientFile("app/academy/page.tsx");
  const academyClient = readClientFile("app/academy/_components/AcademyClient.tsx");
  const arena = readClientFile("app/academy/arena/_components/ArenaClient.tsx");
  const expeditionPage = readClientFile("app/academy/expeditions/[slug]/page.tsx");

  assert.doesNotMatch(academyPage, /getExpeditions|SAMPLE_EXPEDITIONS/);
  assert.doesNotMatch(academyClient, /SAMPLE_EXPEDITIONS|SoundHelix/);
  assert.doesNotMatch(arena, /QUIZ_QUESTIONS|SHOWCASE_ANIMALS/);
  assert.doesNotMatch(expeditionPage, /getExpeditionBySlug|SAMPLE_EXPEDITIONS/);
  assert.equal(existsSync(resolve(clientRoot, "app/_shared/data/expeditions.ts")), false);
});

test("field notes use server pagination, populated facets, and species detail links", () => {
  const fieldNotes = readClientFile("app/academy/field-notes/_components/FieldNotesClient.tsx");

  assert.match(fieldNotes, /const PAGE_SIZE = 24/);
  assert.match(fieldNotes, /getSpecies\(page, PAGE_SIZE/);
  assert.match(fieldNotes, /getFacets\(\)/);
  assert.match(fieldNotes, /getAvailableFacetOptions/);
  assert.match(fieldNotes, /getSpeciesDescription/);
  assert.match(fieldNotes, /\/species\/\$\{encodeURIComponent\(species\.slug\)\}/);
});

test("arena sends flashcard ratings to the persisted academy store", () => {
  const arena = readClientFile("app/academy/arena/_components/ArenaClient.tsx");
  const store = readClientFile("app/academy/_hooks/useAcademyStore.ts");

  assert.match(arena, /reviewFlashcard\(card\.slug, rating\)/);
  assert.match(arena, /fetchFromServer\(\)/);
  assert.match(store, /progressStatus/);
  assert.doesNotMatch(store, /sao-la.*vooc-cat-ba.*cu-li-nho/);
  assert.match(readClientFile("app/_shared/services/api.ts"), /payload: \{ unlockedSpecies \}/);
});
