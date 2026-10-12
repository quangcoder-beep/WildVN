"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SuggestedPrompts } from "./SuggestedPrompts";
import styles from "../../styles/ai-chat.module.css";

export function AIChatEmpty({ onSelectPrompt }: { onSelectPrompt: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
        className="relative w-16 h-16 flex items-center justify-center mb-6"
      >
        <div className={`absolute inset-0 rounded-full blur-xl opacity-30 ${styles.thinkOrb}`} />
        <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(232,220,200,0.1)] flex items-center justify-center z-10">
          <Sparkles className="w-5 h-5 text-[#2DD4A8]" />
        </div>
      </motion.div>

      <motion.h3 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-[20px] font-serif italic text-[#E8DCC8] mb-2"
      >
        Xin chào, tôi là trợ lý WildVN.
      </motion.h3>
      
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="text-[14px] font-sans text-[#9A8F7E] max-w-[280px]"
      >
        Tôi có thể giúp bạn tra cứu thông tin sinh học, Sách Đỏ, hoặc đồng hành cùng bạn trong các cuộc viễn chinh.
      </motion.p>

      <SuggestedPrompts onSelect={onSelectPrompt} />
    </div>
  );
}
