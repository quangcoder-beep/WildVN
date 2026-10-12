"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useAIChatStore } from "../../stores/aiChatStore";
import styles from "../../styles/ai-chat.module.css";
import { cn } from "../../lib/utils";

export function AIChatFAB() {
  const { isOpen, togglePanel, unreadCount } = useAIChatStore();

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={togglePanel}
      className={cn(
        "fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center transition-shadow duration-300",
        styles.fab,
        isOpen ? "shadow-[0_0_20px_rgba(200,64,26,0.2)]" : "shadow-[0_0_20px_rgba(45,212,168,0.2)] hover:shadow-[0_0_30px_rgba(45,212,168,0.4)]"
      )}
      aria-label={isOpen ? "Đóng AI Chat" : "Mở AI Chat"}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X className="w-6 h-6 text-[#E8DCC8]" />
          </motion.div>
        ) : (
          <motion.div
            key="sparkles"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sparkles className="w-6 h-6 text-[#2DD4A8]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unread badge */}
      {!isOpen && unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-[#C8401A] rounded-full border-2 border-black flex items-center justify-center"
        >
          <span className="text-[9px] font-bold text-white font-mono leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        </motion.div>
      )}
    </motion.button>
  );
}
