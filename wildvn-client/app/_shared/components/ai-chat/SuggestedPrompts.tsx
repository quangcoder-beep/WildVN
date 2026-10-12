"use client";

import { motion } from "framer-motion";
import { Sparkles, Compass, BookOpen, Map } from "lucide-react";
import { useAIChatStore } from "../../stores/aiChatStore";
import { cn } from "../../lib/utils";

interface Prompt {
  icon: React.ReactNode;
  text: string;
}

const CONTEXT_PROMPTS: Record<string, Prompt[]> = {
  GENERAL: [
    { icon: <Sparkles className="w-3.5 h-3.5" />, text: "Dự án WildVN là gì?" },
    { icon: <Compass className="w-3.5 h-3.5" />, text: "Gợi ý một cuộc viễn chinh" },
    { icon: <BookOpen className="w-3.5 h-3.5" />, text: "Có bao nhiêu loài Cực kỳ nguy cấp?" },
  ],
  EXPLORE_SPECIES: [
    { icon: <Sparkles className="w-3.5 h-3.5" />, text: "Tóm tắt thông tin loài này" },
    { icon: <Map className="w-3.5 h-3.5" />, text: "Loài này sống ở đâu?" },
    { icon: <BookOpen className="w-3.5 h-3.5" />, text: "Loài nào cùng họ với nó?" },
  ],
};

export function SuggestedPrompts({ onSelect }: { onSelect: (text: string) => void }) {
  const { contextType } = useAIChatStore();
  const prompts = CONTEXT_PROMPTS[contextType] || CONTEXT_PROMPTS.GENERAL;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-wrap gap-2 mt-6"
    >
      {prompts.map((prompt, index) => (
        <button
          key={index}
          onClick={() => onSelect(prompt.text)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(232,220,200,0.06)] hover:border-[rgba(232,220,200,0.15)] hover:bg-[rgba(255,255,255,0.06)] transition-all duration-300 group"
        >
          <span className="text-[#9A8F7E] group-hover:text-[#2DD4A8] transition-colors">
            {prompt.icon}
          </span>
          <span className="text-[13px] font-sans text-[#E8DCC8] whitespace-nowrap">
            {prompt.text}
          </span>
        </button>
      ))}
    </motion.div>
  );
}
