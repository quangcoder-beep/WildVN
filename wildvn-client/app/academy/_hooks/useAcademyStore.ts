"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AcademyProgress } from "@/app/_shared/types/academy";
import { academyApi, isUnauthorizedError } from "@/app/_shared/services/api";

export interface FlashcardReview {
  interval: number; // in days
  easeFactor: number;
  nextReviewDate: string; // ISO string
}

export interface AcademyState extends AcademyProgress {
  onboardingCompleted: boolean;
  preferredHabitat: string | null;
  flashcardReviews: Record<string, FlashcardReview>;
  isHydrated: boolean;
  progressStatus: "idle" | "available" | "unauthenticated" | "unavailable";
  
  // Actions
  completeOnboarding: (habitat: string) => void;
  completeExpedition: (slug: string, speciesIds: string[]) => void;
  unlockSpecies: (slug: string) => void;
  reviewFlashcard: (speciesSlug: string, rating: "easy" | "good" | "hard") => void;
  setHydrated: (state: boolean) => void;
  fetchFromServer: () => Promise<void>;
  syncWithServer: () => Promise<void>;
}

const DEFAULT_STATE = {
  rpPoints: 0,
  streakDays: 0,
  unlockedSpecies: [],
  completedExpeditions: [],
  onboardingCompleted: false,
  preferredHabitat: null,
  flashcardReviews: {},
  isHydrated: false,
  progressStatus: "idle" as const,
};

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setHydrated: (state) => set({ isHydrated: state }),

      completeOnboarding: (habitat) => {
        set({
          onboardingCompleted: true,
          preferredHabitat: habitat,
        });
      },

      completeExpedition: (slug, speciesIds) => {
        const { completedExpeditions, unlockedSpecies } = get();
        const alreadyCompleted = completedExpeditions.includes(slug);
        
        const newCompleted = alreadyCompleted
          ? completedExpeditions
          : [...completedExpeditions, slug];
          
        const newUnlocked = [...unlockedSpecies];
        speciesIds.forEach((id) => {
          if (!newUnlocked.includes(id)) {
            newUnlocked.push(id);
          }
        });

        set({
          completedExpeditions: newCompleted,
          unlockedSpecies: newUnlocked,
        });

        // Background sync
        get().syncWithServer();
      },

      unlockSpecies: (slug) => {
        const { unlockedSpecies } = get();
        if (!unlockedSpecies.includes(slug)) {
          set({ unlockedSpecies: [...unlockedSpecies, slug] });
          // Background sync
          get().syncWithServer();
        }
      },

      reviewFlashcard: (speciesSlug, rating) => {
        const { flashcardReviews } = get();
        const current = flashcardReviews[speciesSlug] || {
          interval: 1,
          easeFactor: 2.5,
          nextReviewDate: new Date().toISOString(),
        };

        let nextInterval = current.interval;
        let nextEase = current.easeFactor;

        // Simplified SM-2 Algorithm
        if (rating === "easy") {
          nextInterval = Math.round(current.interval * current.easeFactor);
          nextEase = Math.min(nextEase + 0.15, 3.0);
        } else if (rating === "good") {
          nextInterval = Math.round(current.interval * 1.5);
          nextEase = Math.max(nextEase, 1.3);
        } else {
          // Hard / Forgot
          nextInterval = 1; // Reset to 1 day
          nextEase = Math.max(nextEase - 0.2, 1.3);
        }

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + nextInterval);

        set({
          flashcardReviews: {
            ...flashcardReviews,
            [speciesSlug]: {
              interval: nextInterval,
              easeFactor: nextEase,
              nextReviewDate: nextDate.toISOString(),
            },
          },
        });
      },

      fetchFromServer: async () => {
        try {
          const result = await academyApi.getProgress();
          if (result.success && result.data) {
            set({
              rpPoints: result.data.rpPoints ?? 0,
              streakDays: result.data.streakDays ?? 0,
              unlockedSpecies: result.data.unlockedSpecies || [],
              completedExpeditions: result.data.completedExpeditions || [],
              isHydrated: true,
              progressStatus: "available",
            });
          }
        } catch (error) {
          set({
            isHydrated: true,
            progressStatus: isUnauthorizedError(error) ? "unauthenticated" : "unavailable",
          });
        }
      },

      syncWithServer: async () => {
        try {
          const state = get();
          await academyApi.syncProgress(state.unlockedSpecies);
          set({ progressStatus: "available" });
        } catch (error) {
          set({
            progressStatus: isUnauthorizedError(error) ? "unauthenticated" : "unavailable",
          });
        }
      },
    }),
    {
      name: "wildvn-academy-progress",
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          return localStorage.getItem(name);
        },
        setItem: (name, value) => {
          const authStorage = localStorage.getItem('auth-storage');
          let isLoggedIn = false;
          if (authStorage) {
            try {
              isLoggedIn = JSON.parse(authStorage).state?.isLoggedIn;
            } catch (e) {}
          }
          
          if (!isLoggedIn) {
            localStorage.setItem(name, value);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      })),
      partialize: (state) => {
        const { isHydrated, ...rest } = state;
        return rest as unknown as AcademyState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
