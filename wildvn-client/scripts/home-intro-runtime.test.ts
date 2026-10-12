import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  INTRO_SESSION_KEY,
  claimIntroSession,
  resetIntroSessionForTests,
} from "../app/(home)/_components/Intro/intro-session";

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const createStorage = (initial?: Record<string, string>): MemoryStorage => {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

test.beforeEach(() => {
  resetIntroSessionForTests();
});

test("claims the intro once and persists the session marker", () => {
  const storage = createStorage();

  assert.equal(claimIntroSession(storage), true);
  assert.equal(storage.getItem(INTRO_SESSION_KEY), "started");
  assert.equal(claimIntroSession(storage), false);
});

test("does not play again when a previous session marker exists", () => {
  const storage = createStorage({ [INTRO_SESSION_KEY]: "started" });

  assert.equal(claimIntroSession(storage), false);
});

test("falls back to an in-memory claim when sessionStorage is unavailable", () => {
  const unavailableStorage: MemoryStorage = {
    getItem: () => {
      throw new Error("Storage is blocked");
    },
    setItem: () => {
      throw new Error("Storage is blocked");
    },
  };

  assert.equal(claimIntroSession(unavailableStorage), true);
  assert.equal(claimIntroSession(unavailableStorage), false);
});

test("homepage guards intro initialization against Strict Mode effect replay", () => {
  const clientHome = readFileSync(
    resolve(process.cwd(), "app/(home)/_components/Home/ClientHome.tsx"),
    "utf8",
  );

  assert.match(clientHome, /useRef/);
  assert.match(clientHome, /introInitializedRef/);
});

test("homepage video layer is isolated from featured-species updates", () => {
  const cinematicBackground = readFileSync(
    resolve(process.cwd(), "app/(home)/_components/Home/CinematicBackground.tsx"),
    "utf8",
  );

  assert.match(cinematicBackground, /export const CinematicBackground = memo\(/);
  assert.match(cinematicBackground, /key=\{`video-\$\{activeSlide\}`\}/);
  assert.doesNotMatch(cinematicBackground, /getFeaturedSpecies|SpeciesFan|slideSpecies/);
});
