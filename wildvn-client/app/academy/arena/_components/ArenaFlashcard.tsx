"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { CONSERVATION_LABELS, HABITAT_LABELS } from "@/app/_shared/constants/species";
import { getImageUrl } from "@/app/_shared/lib/media";
import { SpeciesSummary } from "@/app/_shared/services/api";
import { getSpeciesDescription } from "../../_lib/academy-data";

interface ArenaFlashcardProps {
  deck: SpeciesSummary[];
  currentCardIdx: number;
  isFlipped: boolean;
  onFlip: () => void;
  onRate: (rating: "easy" | "good" | "hard") => void;
}

export function ArenaFlashcard({
  deck,
  currentCardIdx,
  isFlipped,
  onFlip,
  onRate,
}: ArenaFlashcardProps) {
  if (deck.length === 0) return null;

  const currentCard = deck[currentCardIdx];
  const conservationStatus = currentCard.conservationStatus || "N/A";
  const conservationLabel = CONSERVATION_LABELS[conservationStatus]?.label || "Chưa cập nhật";
  const description = getSpeciesDescription(currentCard) || "Mô tả chưa có trong cơ sở dữ liệu.";
  const imageUrl = getImageUrl(currentCard.thumbnailUrl || currentCard.images?.[0]);
  const habitatValues = Array.isArray(currentCard.habitatType)
    ? currentCard.habitatType
    : currentCard.habitat
      ? [currentCard.habitat]
      : [];

  return (
    <motion.div
      key="flashcard"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-8 max-w-lg mx-auto py-8"
    >
      <div className="w-full flex justify-between items-center text-xs font-mono text-[#9A8F7E]">
        <span>THẺ BÀI: {currentCardIdx + 1} / {deck.length}</span>
        <span className="text-emerald-400">ÔN TẬP THỰC ĐỊA</span>
      </div>

      {/* 3D Flipping Card Container */}
      <div 
        onClick={onFlip}
        className="w-full h-96 relative cursor-pointer [perspective:1000px] select-none"
      >
        <div 
          className={`w-full h-full duration-500 [transform-style:preserve-3d] relative ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* Front Side */}
          <div className="absolute inset-0 w-full h-full rounded-2xl border border-white/5 bg-[#050505] p-8 flex flex-col justify-between items-center text-center [backface-visibility:hidden]">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(45,212,168,0.03),transparent)]" />
            <div className="font-mono text-[10px] text-[#9A8F7E] tracking-widest uppercase">
              // CLICK ĐỂ LẬT THẺ
            </div>
            
            <div className="flex flex-col items-center gap-4 z-10">
              {imageUrl ? (
                <div className="h-24 w-32 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  <img src={imageUrl} alt={currentCard.nameVn || currentCard.name || "Ảnh loài"} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                  <Sparkles className="w-8 h-8" />
                </div>
              )}
              <h2 className="font-serif text-3xl text-white font-light italic">
                {currentCard.nameVn || currentCard.name || "Chưa có tên"}
              </h2>
              <span className="font-mono text-xs italic text-[#9A8F7E]">
                {currentCard.scientificName}
              </span>
            </div>

            <span className="font-mono text-[9px] border border-white/10 bg-white/5 text-[#9A8F7E] px-3 py-1 rounded-full uppercase tracking-wider z-10">
              Động Vật
            </span>
          </div>

          {/* Back Side */}
          <div className="absolute inset-0 w-full h-full rounded-2xl border border-white/5 bg-[#070707] p-6 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-y-auto">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <span className="font-mono text-[9px] text-[#9A8F7E]">ĐẶC ĐIỂM SINH HỌC:</span>
                <span className="font-mono text-[9px] border border-red-500/30 text-red-500 bg-red-950/20 px-2 py-0.5 rounded-full uppercase">
                  {conservationStatus} · {conservationLabel}
                </span>
              </div>
              
              <p className="font-sans text-xs text-[#E8DCC8] leading-relaxed">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
              <span className="font-mono text-[9px] text-[#9A8F7E] uppercase">MÔI TRƯỜNG SỐNG:</span>
              <span className="font-sans text-xs text-white">
                {habitatValues.length > 0
                  ? habitatValues.map((habitat: string) => HABITAT_LABELS[habitat] || habitat).join(", ")
                  : "Chưa cập nhật"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Ratings (Only shown when flipped) */}
      <div className="w-full flex flex-col gap-4">
        <AnimatePresence>
          {isFlipped ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-col gap-2 w-full text-center"
            >
              <span className="font-mono text-[10px] text-[#9A8F7E] tracking-widest uppercase">
                BẠN THẤY MỨC ĐỘ GHI NHỚ THẾ NÀO?
              </span>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <button
                  onClick={() => onRate("hard")}
                  className="p-3 bg-red-950/10 hover:bg-red-950/30 border border-red-500/20 hover:border-red-500 text-red-400 rounded-xl text-xs font-sans font-medium transition-colors"
                >
                  Khó (Reset)
                </button>
                <button
                  onClick={() => onRate("good")}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white rounded-xl text-xs font-sans font-medium transition-colors"
                >
                  Tốt (1.5x)
                </button>
                <button
                  onClick={() => onRate("easy")}
                  className="p-3 bg-emerald-950/10 hover:bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 rounded-xl text-xs font-sans font-medium transition-colors"
                >
                  Dễ (2.5x)
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center font-mono text-[10px] text-[#9A8F7E] animate-pulse">
              Click vào thẻ bài để lật xem thông tin chi tiết
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
