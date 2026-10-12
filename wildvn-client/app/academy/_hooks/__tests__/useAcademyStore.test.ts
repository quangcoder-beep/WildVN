import { useAcademyStore } from "../useAcademyStore";

// Mock localStorage for Zustand persist middleware
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: function (key: string) {
      return store[key] || null;
    },
    setItem: function (key: string, value: string) {
      store[key] = value.toString();
    },
    clear: function () {
      store = {};
    },
    removeItem: function (key: string) {
      delete store[key];
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useAcademyStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAcademyStore.setState({
      unlockedSpecies: [],
      completedExpeditions: [],
      onboardingCompleted: false,
      isHydrated: true, // Bypass hydration mock
      preferredHabitat: null,
      flashcardReviews: {},
    });
    window.localStorage.clear();
  });

  describe("completeExpedition (Idempotency Fix)", () => {
    it("should add species on first completion", () => {
      useAcademyStore.getState().completeExpedition("ky-lan-truong-son", ["sao-la"]);

      const state = useAcademyStore.getState();
      expect(state.completedExpeditions).toContain("ky-lan-truong-son");
      expect(state.unlockedSpecies).toContain("sao-la");
    });

    it("should NOT duplicate species if expedition was already completed", () => {
      // First completion
      useAcademyStore.getState().completeExpedition("ky-lan-truong-son", ["sao-la"]);
      
      // Second completion attempt (e.g. user refreshed or scrolled back)
      useAcademyStore.getState().completeExpedition("ky-lan-truong-son", ["sao-la"]);

      const state = useAcademyStore.getState();
      expect(state.completedExpeditions.length).toBe(1);
      expect(state.unlockedSpecies.length).toBe(1);
    });
  });
});
