"use client";

import { motion } from "framer-motion";
import styles from "@/app/_shared/styles/glass.module.css";

interface AuthPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthPanel({ children, className = "" }: AuthPanelProps) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0, scale: 0.97 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 25,
        delay: 0.3,
      }}
      className={`
        relative w-full mx-auto
        ${styles.liquidGlassStrong}
        
        /* Mobile: Bottom Sheet Style */
        fixed bottom-0 left-0 right-0 rounded-t-[32px] rounded-b-none p-6 pb-12
        max-h-[85vh] overflow-y-auto
        
        /* Desktop: Centered Panel Style */
        md:static md:max-w-[440px] md:rounded-3xl md:p-10 md:max-h-none md:overflow-visible
        
        ${className}
      `}
    >
      {/* Inner glow effect */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top center, rgba(45,212,168,0.04) 0%, transparent 60%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
