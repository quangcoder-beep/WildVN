"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { speciesApi, SpeciesSummary } from "@/app/_shared/services/api";
import { getFlashcardDeck } from "../../_lib/academy-data";
import { useAcademyStore } from "../../_hooks/useAcademyStore";
import { ArenaMenu } from "./ArenaMenu";
import { ArenaFlashcard } from "./ArenaFlashcard";

export function ArenaClient() {
  const {
    unlockedSpecies,
    isHydrated,
    progressStatus,
    fetchFromServer,
    reviewFlashcard,
  } = useAcademyStore();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"menu" | "flashcard">("menu");
  const [catalog, setCatalog] = useState<SpeciesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchFromServer();
  }, [fetchFromServer]);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setError(null);

    const catalogRequest = unlockedSpecies.length > 0
      ? Promise.all(unlockedSpecies.map((slug) => speciesApi.getSpeciesDetail(slug)))
          .then((responses) => ({
            success: true,
            data: responses.map((response) => response.data),
            message: "",
          }))
          .catch(() => speciesApi.getSpecies(1, 100))
      : speciesApi.getSpecies(1, 100);

    catalogRequest
      .then((response) => {
        if (!isCurrent) return;
        if (response.success) setCatalog(response.data || []);
        else setError(response.message || "Không thể tải catalog để ôn tập.");
      })
      .catch(() => {
        if (isCurrent) setError("Không thể kết nối tới catalog sinh vật học.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [unlockedSpecies]);

  const requestedDeck = getFlashcardDeck(catalog, unlockedSpecies);
  // Ignore stale local slugs from the removed mock onboarding and keep the
  // real catalog usable while the server snapshot is unavailable.
  const flashcardDeck = requestedDeck.length > 0 || unlockedSpecies.length === 0
    ? requestedDeck
    : catalog;

  if (!mounted || !isHydrated) return null;

  const handleStartFlashcards = () => {
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setMode("flashcard");
  };

  const handleRateFlashcard = (rating: "easy" | "good" | "hard") => {
    const card = flashcardDeck[currentCardIdx];
    if (card?.slug) reviewFlashcard(card.slug, rating);

    if (currentCardIdx < flashcardDeck.length - 1) {
      setIsFlipped(false);
      window.setTimeout(() => setCurrentCardIdx((index) => index + 1), 300);
    } else {
      setMode("menu");
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 md:px-12 bg-[#020202]">
      <div className="max-w-4xl mx-auto w-full">
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-8 text-center" role="alert">
            <p className="font-sans text-sm text-red-200">{error}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {mode === "menu" && (
              <ArenaMenu
                dueSpeciesCount={flashcardDeck.length}
                isLoading={loading}
                hasQuizContent={false}
                progressStatus={progressStatus}
                onStartFlashcards={handleStartFlashcards}
              />
            )}

            {mode === "flashcard" && flashcardDeck.length > 0 && (
              <ArenaFlashcard
                deck={flashcardDeck}
                currentCardIdx={currentCardIdx}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(true)}
                onRate={handleRateFlashcard}
              />
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
