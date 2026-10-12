"use client";

import { motion } from "framer-motion";
import styles from "../../styles/ai-chat.module.css";

export function AIThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Animated Orb */}
      <div className="flex-shrink-0 mt-1">
        <div className={`w-6 h-6 rounded-full ${styles.thinkOrb}`} />
      </div>

      {/* Thinking dots */}
      <div className="flex items-center gap-1.5 pt-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#9A8F7E]"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
        <span className="ml-2 text-xs text-[#9A8F7E] font-mono tracking-wider">
          Đang suy nghĩ...
        </span>
      </div>
    </div>
  );
}
