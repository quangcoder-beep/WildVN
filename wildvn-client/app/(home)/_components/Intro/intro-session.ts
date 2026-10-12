export const INTRO_SESSION_KEY = "wildvn.home.intro.v1";

type IntroStorage = Pick<Storage, "getItem" | "setItem">;

let memoryClaimed = false;

function getSessionStorage(): IntroStorage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.sessionStorage;
  } catch {
    // Private browsing policies can make sessionStorage inaccessible.
    return undefined;
  }
}

/**
 * Claims the intro for the current browser session.
 *
 * The claim is made when the intro starts (rather than when it finishes), so a
 * remount caused by a refresh or an API update cannot start the animation a
 * second time while it is already visible.
 */
export function claimIntroSession(storage: IntroStorage | undefined = getSessionStorage()): boolean {
  if (memoryClaimed) return false;

  try {
    if (storage?.getItem(INTRO_SESSION_KEY) === "started") {
      memoryClaimed = true;
      return false;
    }

    storage?.setItem(INTRO_SESSION_KEY, "started");
  } catch {
    // Keep the UX deterministic for browsers that block web storage.
  }

  memoryClaimed = true;
  return true;
}

/** Test-only reset; production code never clears the session claim. */
export function resetIntroSessionForTests(): void {
  memoryClaimed = false;
}
