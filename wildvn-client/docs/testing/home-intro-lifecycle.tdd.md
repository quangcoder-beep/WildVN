# Homepage intro lifecycle — TDD evidence

## Source plan

Derived from the approved plan to prevent the homepage intro/background video
from replaying when homepage API data is requested or the client subtree is
remounted.

## User journey

As a visitor, I want the homepage intro to play only once per browser session,
so that loading featured species or returning to the homepage does not interrupt
the experience.

## RED → GREEN evidence

- RED: `npx --no-install tsx --test scripts/home-intro-runtime.test.ts`
  failed because the intro session gate did not exist.
- GREEN: the focused test passed with 5/5 tests after adding the session gate,
  Strict Mode guard, and memoized video layer.
- Full regression: the existing frontend suite passed with 32/32 tests.
- Production validation: `npm run build` completed successfully, including
  TypeScript validation and static page generation.

## Guarantees

| Guarantee | Test/verification | Result |
|---|---|---|
| Intro is claimed once and persisted for the current session | `scripts/home-intro-runtime.test.ts` | PASS |
| Existing session marker prevents replay after remount/reload | `scripts/home-intro-runtime.test.ts` | PASS |
| Storage-blocked browsers get a deterministic in-memory fallback | `scripts/home-intro-runtime.test.ts` | PASS |
| React Strict Mode effect replay cannot claim the intro twice | `scripts/home-intro-runtime.test.ts` | PASS |
| Video layer is isolated from featured-species API state and keyed only by active slide | `scripts/home-intro-runtime.test.ts` | PASS |
| Existing frontend runtime contracts remain green | Full `tsx --test` suite | PASS (32/32) |
| Frontend production bundle and TypeScript compile | `npm run build` | PASS |

## Behavior contract

The intro marker is versioned as `wildvn.home.intro.v1` and stored in
`sessionStorage`, so a new tab/session can show the intro again. The marker is
written when playback starts, which prevents a remount during playback from
starting a second animation. The intro itself is not coupled to the featured
species request.

## Known gap

Browser-level visual E2E was not run in this environment. The next manual check
should open `/`, observe the intro once, trigger `/api/species/featured` while it
is loading, and confirm that the overlay does not reappear and the current video
element is not recreated.
